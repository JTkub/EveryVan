"""Launch an isolated local PostgreSQL cluster, run integration tests, then stop it."""
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import tempfile

root = Path(__file__).resolve().parents[1]
pg_bin = Path(os.getenv("PG_BIN", "C:/Program Files/PostgreSQL/18/bin"))
if not (pg_bin / "initdb.exe").exists():
    raise SystemExit("Set PG_BIN to the directory containing PostgreSQL initdb.exe and pg_ctl.exe")
runtime = Path(tempfile.mkdtemp(prefix="everyvan-test-postgres-"))
cluster = runtime / "data"
with socket.socket() as sock:
    sock.bind(("127.0.0.1", 0))
    port = sock.getsockname()[1]
flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
def run(args, **kwargs):
    return subprocess.run(args, check=True, creationflags=flags, **kwargs)

started = False
preview = None
try:
    run([str(pg_bin / "initdb.exe"), "-D", str(cluster), "-U", "everyvan_test", "--auth=trust", "--encoding=UTF8", "--locale=C"], stdout=subprocess.DEVNULL)
    run([str(pg_bin / "pg_ctl.exe"), "-D", str(cluster), "-l", str(runtime / "postgres.log"), "-o", f"-h 127.0.0.1 -p {port}", "-w", "start"], stdout=subprocess.DEVNULL)
    started = True
    env = {**os.environ, "EVERYVAN_TEST_DATABASE_URL": f"postgresql://everyvan_test@127.0.0.1:{port}/postgres", "PYTHONUTF8": "1"}
    result = subprocess.run([sys.executable, "-m", "unittest", "discover", "-s", "api/tests", "-v"], cwd=root, env=env, creationflags=flags, capture_output=True, text=True, encoding="utf-8")
    print(result.stdout, end="")
    print(result.stderr, end="", file=sys.stderr)
    if result.returncode == 0 and "--preview" in sys.argv:
        os.environ["EVERYVAN_TEST_DATABASE_URL"] = env["EVERYVAN_TEST_DATABASE_URL"]
        sys.path.insert(0, str(root))
        from api.tests.test_runtime_integration import RuntimeTests
        RuntimeTests.setUpClass()
        fixture = RuntimeTests()
        fixture.setUp()
        booking_id, qr_code = fixture.paid_ticket(fixture.trip())
        print(f"Preview login: dispatcher or driver / integration-password; test ticket QR: {qr_code}", flush=True)
        preview = subprocess.Popen([sys.executable, "api/app.py"], cwd=root,
                                   env={**env, "DATABASE_URL": env["EVERYVAN_TEST_DATABASE_URL"], "PORT": "5000"},
                                   creationflags=flags, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print("Isolated API preview running on port 5000. Ctrl+C stops it and removes the test cluster.", flush=True)
        preview.wait()
    sys.exit(result.returncode)
finally:
    if preview and preview.poll() is None:
        preview.terminate()
        preview.wait(timeout=15)
    if started:
        run([str(pg_bin / "pg_ctl.exe"), "-D", str(cluster), "-m", "fast", "-w", "stop"], stdout=subprocess.DEVNULL)
    # This directory is exclusively created by this script under the OS temp root.
    if runtime.parent == Path(tempfile.gettempdir()) and runtime.name.startswith("everyvan-test-postgres-"):
        shutil.rmtree(runtime)
