import { useState } from "react";
import { ArrowRight, BusFront, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useVan } from "../context/VanContext";

export function AuthView() {
  const { login, registerUser } = useVan();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [thaiId, setThaiId] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      if (mode === "login") await login(username, password);
      else {
        await registerUser(username, password, "passenger", {
          name,
          phone,
          email,
          dob,
          thaiId,
        });
        setMode("login");
        setSuccess("สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบด้วยบัญชีใหม่");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "ดำเนินการไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };
  const demo = (user: string) => {
    setUsername(user);
    setPassword(user);
    setMode("login");
    setError("");
    setSuccess("");
  };
  return (
    <div className="auth-shell">
      <div className="auth-visual">
        <div className="auth-brand">
          <span className="brand-mark">
            <BusFront size={21} />
          </span>
          <span className="auth-brand-name">
            Every<span>Van</span>
          </span>
        </div>
        <div className="auth-copy">
          <p className="eyebrow">SMART VAN TICKETING</p>
          <h1>
            เดินทางทุกวัน
            <br />
            <em>ง่ายกว่าเดิม</em>
          </h1>
          <p>
            ระบบจองรถตู้สำหรับผู้โดยสาร คนขับ ทีมจัดคิว และฝ่ายบัญชีในที่เดียว
          </p>
        </div>
        <div className="auth-route">
          <span>กรุงเทพฯ</span>
          <i />
          <span>ทุกปลายทาง</span>
        </div>
      </div>
      <div className="auth-form-wrap">
        <div className="auth-card">
          <div className="auth-card-head">
            <p className="eyebrow accent">WELCOME BACK</p>
            <h2>{mode === "login" ? "เข้าสู่ระบบ" : "สร้างบัญชีใหม่"}</h2>
            <p className="muted">
              {mode === "login"
                ? "เข้าสู่ EveryVan เพื่อจัดการการเดินทางของคุณ"
                : "สมัครสมาชิกเพื่อเริ่มจองตั๋วรถตู้"}
            </p>
          </div>
          <div className="auth-tabs">
            <button
              type="button"
              className={mode === "login" ? "active" : ""}
              onClick={() => {
                setMode("login");
                setError("");
                setSuccess("");
              }}
            >
              เข้าสู่ระบบ
            </button>
            <button
              type="button"
              className={mode === "register" ? "active" : ""}
              onClick={() => {
                setMode("register");
                setError("");
                setSuccess("");
              }}
            >
              สมัครสมาชิก
            </button>
          </div>
          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}
          {success && (
            <div className="auth-success" role="status">
              {success}
            </div>
          )}
          <form onSubmit={submit} className="auth-form">
            {mode === "register" && (
              <>
                <div className="field">
                  <label>ชื่อ-นามสกุล</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    required
                  />
                </div>
                <div className="auth-two">
                  <div className="field">
                    <label>เบอร์โทรศัพท์</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) =>
                        setPhone(e.target.value.replace(/\D/g, ""))
                      }
                      autoComplete="tel"
                      minLength={9}
                      maxLength={10}
                      required
                    />
                  </div>
                  <div className="field">
                    <label>วันเกิด</label>
                  <input
                    type="date"
                    max={new Intl.DateTimeFormat("en-CA", {
                      timeZone: "Asia/Bangkok",
                    }).format(new Date())}
                    value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="field">
                  <label>อีเมล</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
                <div className="field">
                  <label>เลขบัตรประชาชน 13 หลัก</label>
                  <input
                    inputMode="numeric"
                    pattern="[0-9]{13}"
                    value={thaiId}
                    onChange={(e) =>
                      setThaiId(e.target.value.replace(/\D/g, ""))
                    }
                    maxLength={13}
                    title="กรุณากรอกเลขบัตรประชาชน 13 หลัก"
                    required
                  />
                </div>
              </>
            )}
            <div className="field">
              <label>ชื่อผู้ใช้งาน</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="เช่น pax"
                autoComplete="username"
                required
              />
            </div>
            <div className="field">
              <label>รหัสผ่าน</label>
              <div className="password-input">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  minLength={4}
                  required
                />
                <button
                  type="button"
                  aria-label={showPass ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                  onClick={() => setShowPass(!showPass)}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button className="btn primary auth-submit" disabled={busy}>
              {busy
                ? "กำลังดำเนินการ..."
                : mode === "login"
                  ? "เข้าสู่ระบบ"
                  : "สร้างบัญชี"}{" "}
              <ArrowRight size={16} />
            </button>
          </form>
          {mode === "login" && (
            <div className="demo-login">
              <div>
                <ShieldCheck size={16} />
                <span>บัญชีทดลอง</span>
              </div>
              <div className="demo-buttons">
                <button type="button" onClick={() => demo("pax")}>
                  ผู้โดยสาร
                </button>
                <button type="button" onClick={() => demo("driver")}>
                  คนขับ
                </button>
                <button type="button" onClick={() => demo("staff")}>
                  จัดคิวรถ
                </button>
                <button type="button" onClick={() => demo("accountant")}>
                  ฝ่ายบัญชี
                </button>
                <button type="button" onClick={() => demo("admin")}>
                  แอดมิน
                </button>
              </div>
              <small>ใช้ชื่อผู้ใช้และรหัสผ่านเดียวกัน เช่น pax / pax</small>
            </div>
          )}
        </div>
        <p className="auth-footer">
          © {new Date().getFullYear()} EveryVan · ระบบจองรถตู้ที่คุณไว้ใจ
        </p>
      </div>
    </div>
  );
}
