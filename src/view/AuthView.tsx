import { useState } from "react";
import {
  ArrowRight,
  BusFront,
  Eye,
  EyeOff,
  Smartphone,
} from "lucide-react";
import { useVan } from "../context/VanContext";

export function AuthView() {
  const { login, registerUser, pendingOtpUser, verifyOtp, cancelOtp } = useVan();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [thaiId, setThaiId] = useState("");
  const [passportNo, setPassportNo] = useState("");
  const [identityType, setIdentityType] = useState<"thaiId" | "passport">("thaiId");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [otp, setOtp] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      if (mode === "login") {
        await login(username, password);
        setPassword("");
        setOtp("");
      }
      else {
        await registerUser(username, password, "passenger", {
          name,
          phone,
          email,
          dob,
          thaiId: identityType === "thaiId" ? thaiId : "",
          passportNo: identityType === "passport" ? passportNo : "",
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
  const submitOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      await verifyOtp(otp);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ยืนยัน OTP ไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };
  const backToLogin = async () => {
    setBusy(true);
    setError("");
    try {
      await cancelOtp();
      setOtp("");
      setPassword("");
      setSuccess("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "กลับไปหน้าเข้าสู่ระบบไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
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
        <div className={`auth-card${pendingOtpUser ? " otp-card" : ""}`}>
          {pendingOtpUser && <div className="otp-icon"><Smartphone size={28} /></div>}
          <div className="auth-card-head">
            <p className="eyebrow accent">{pendingOtpUser ? "OTP VERIFICATION" : "WELCOME BACK"}</p>
            <h2>{pendingOtpUser ? "กรอกรหัส OTP" : mode === "login" ? "เข้าสู่ระบบ" : "สร้างบัญชีใหม่"}</h2>
            <p className="muted">
              {pendingOtpUser
                ? "กรุณากรอกรหัสตัวเลข 6 หลักเพื่อเข้าสู่ระบบ"
                : mode === "login"
                ? "เข้าสู่ EveryVan เพื่อจัดการการเดินทางของคุณ"
                : "สมัครสมาชิกเพื่อเริ่มจองตั๋วรถตู้"}
            </p>
          </div>
          {!pendingOtpUser && <div className="auth-tabs">
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
          </div>}
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
          {pendingOtpUser ? (
            <form onSubmit={submitOtp} className="auth-form">
              <div className="field">
                <label htmlFor="otp-code">รหัส OTP 6 หลัก</label>
                <input
                  id="otp-code"
                  className="otp-input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  pattern="[0-9]{6}"
                  minLength={6}
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                  placeholder="กรอกรหัส 6 หลัก"
                  disabled={busy}
                  required
                />
              </div>
              <button className="btn primary auth-submit" disabled={busy || otp.length !== 6}>
                {busy ? "กำลังยืนยัน..." : "ยืนยันและเข้าสู่ระบบ"} <ArrowRight size={16} />
              </button>
              <button type="button" className="text-button otp-cancel" disabled={busy} onClick={() => void backToLogin()}>
                กลับไปหน้าเข้าสู่ระบบ
              </button>
            </form>
          ) : <form onSubmit={submit} className="auth-form">
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
                  <label>เอกสารยืนยันตัวตน</label>
                  <select value={identityType} onChange={(e) => setIdentityType(e.target.value as "thaiId" | "passport")}>
                    <option value="thaiId">เลขบัตรประชาชน 13 หลัก</option>
                    <option value="passport">Passport</option>
                  </select>
                </div>
                {identityType === "thaiId" ? <div className="field"><label>เลขบัตรประชาชน 13 หลัก</label><input inputMode="numeric" pattern="[0-9]{13}" value={thaiId} onChange={(e) => setThaiId(e.target.value.replace(/\D/g, ""))} maxLength={13} required /></div> : <div className="field"><label>เลข Passport</label><input value={passportNo} onChange={(e) => setPassportNo(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} maxLength={30} placeholder="เช่น AB1234567" required /></div>}
              </>
            )}
            <div className="field">
              <label>ชื่อผู้ใช้งาน</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="กรอกชื่อผู้ใช้ของคุณ"
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
          </form>}
        </div>
        <p className="auth-footer">
          © {new Date().getFullYear()} EveryVan · ระบบจองรถตู้ที่คุณไว้ใจ
        </p>
      </div>
    </div>
  );
}
