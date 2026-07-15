import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BASE, apiFirebaseLogin } from '../api/api';
import Icon from './Icon';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

// Firebase web config (from .env). Google sign-in shows only when configured.
const FB = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
const firebaseConfigured = !!(FB.apiKey && FB.projectId && !String(FB.apiKey).startsWith("PASTE"));

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [googleBusy, setGoogleBusy] = useState(false);
  const [roleModal, setRoleModal] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Google sign-in via popup (works on desktop and in-app browsers like Messenger).
  // On mobile Chrome/Safari where popups/redirects are restricted, use the email + password
  // login below (set a password once via the Account button). `role` applies to new accounts only.
  const handleGoogle = async (role) => {
    setRoleModal(false);
    setError(''); setGoogleBusy(true);
    try {
      const app = getApps().length ? getApps()[0] : initializeApp(FB);
      const auth = getAuth(app);
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      const idToken = await result.user.getIdToken();
      const data = await apiFirebaseLogin(idToken, role);
      login(data.user);
      navigate('/dashboard');
    } catch (err) {
      const code = err?.code || "";
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        // user closed the popup — no message
      } else if (code === "auth/popup-blocked") {
        setError("Pop-up blocked. Allow pop-ups, or log in with your email and password below.");
      } else {
        setError(err.message || "Google sign-in failed");
      }
      setGoogleBusy(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${BASE}/login.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        login(data.user);
        navigate('/dashboard');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Could not connect to server');
    }
  };

  return (
    <div style={page}>
      <div style={wrap}>
        {/* Brand */}
        <div style={brand}>
          <img src="/mandaluyong-logo.png" alt="City of Mandaluyong" style={{ width: 88, height: 88, objectFit: "contain" }} />
          <h1 style={title}>TCIMS</h1>
          <p style={subtitle}>Tourism &amp; Cultural Information Management System</p>
        </div>

        {/* Card */}
        <div style={card}>
          {error && <div style={errorBox}>{error}</div>}

          {/* Google Sign-In via Firebase */}
          {firebaseConfigured ? (
            <button type="button" style={googleBtn} onClick={() => setRoleModal(true)} disabled={googleBusy}>
              <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 5.1 29.5 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.6 20-21 0-1.2-.1-2.3-.4-3.5z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 5.1 29.5 3 24 3 16 3 9.1 7.6 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 45c5.2 0 9.9-2 13.5-5.2l-6.2-5.1C29.2 36.3 26.7 37 24 37c-5.3 0-9.7-2.6-11.3-7l-6.5 5C9 40.4 16 45 24 45z"/>
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.6l6.2 5.1C39.6 41 44 37 44 24c0-1.2-.1-2.3-.4-3.5z"/>
              </svg>
              {googleBusy ? "Signing in…" : "Continue with Google"}
            </button>
          ) : (
            <div style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", padding: "10px 0" }}>
              Google sign-in not configured yet.
            </div>
          )}

          {/* divider */}
          <div style={divider}><span style={dividerLine} /><span style={dividerText}>or</span><span style={dividerLine} /></div>

          <form onSubmit={handleSubmit} autoComplete="off">
            <label style={fieldLabel}>Username</label>
            <div style={inputWrap}>
              <span style={inputIcon}></span>
              <input style={input} type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>

            <label style={{ ...fieldLabel, marginTop: 14 }}>Password</label>
            <div style={inputWrap}>
              <span style={inputIcon}></span>
              <input style={input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
            </div>

            <div style={row}>
              <label style={remember}>
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                Remember me
              </label>
              <a href="#" style={forgot}>Forgot your password?</a>
            </div>

            <button type="submit" style={signInBtn}>Sign in</button>
          </form>

          <div style={footer}>
            Don't have an account? <Link to="/register" style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>Register</Link>
          </div>
        </div>

        <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 12, marginTop: 18 }}>
           {new Date().getFullYear()} City of Mandaluyong — CCAT
        </div>
      </div>

      {/* Account-type picker for Google sign-in */}
      {roleModal && (
        <div style={overlay} onClick={() => setRoleModal(false)}>
          <div style={roleCard} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: "0 0 4px", fontSize: 20, color: "#0f172a", textAlign: "center" }}>Continue as</h2>
            <p style={{ margin: "0 0 20px", fontSize: 14, color: "#6b7280", textAlign: "center" }}>Choose the type of account to sign in with Google.</p>

            <button style={roleOption} onClick={() => handleGoogle("Tourist")}>
              <div style={{ ...roleIcon, background: "#eff6ff", color: "#2563eb" }}>
                <Icon name="pin" size={22} />
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={roleTitle}>Tourist</div>
                <div style={roleDesc}>Explore places, check in, and leave reviews.</div>
              </div>
            </button>

            <button style={{ ...roleOption, marginTop: 12 }} onClick={() => handleGoogle("Establishment")}>
              <div style={{ ...roleIcon, background: "#fef3c7", color: "#b45309" }}>
                <Icon name="store" size={22} />
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={roleTitle}>Establishment</div>
                <div style={roleDesc}>Apply for accreditation and upload requirements.</div>
              </div>
            </button>

            <button style={roleCancel} onClick={() => setRoleModal(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= STYLES ================= */
const page = { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Inter', 'Segoe UI', sans-serif", background: "linear-gradient(135deg,#eef4ff 0%, #f8fafc 50%, #fef6e6 100%)" };
const wrap = { width: "100%", maxWidth: 410 };
const brand = { textAlign: "center", marginBottom: 22 };
const title = { margin: "12px 0 4px", fontSize: 30, fontWeight: 800, color: "#0f172a", letterSpacing: 1 };
const subtitle = { margin: 0, color: "#6b7280", fontSize: 14 };

const card = { background: "#fff", borderRadius: 18, padding: 28, boxShadow: "0 20px 50px rgba(2,6,23,0.10)", border: "1px solid #eef2f8" };
const errorBox = { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", fontSize: 14, marginBottom: 16 };

const googleBtn = { width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "#fff", border: "1px solid #d1d5db", borderRadius: 10, padding: "12px", fontSize: 15, fontWeight: 600, color: "#374151", cursor: "pointer" };

const divider = { display: "flex", alignItems: "center", gap: 12, margin: "18px 0" };
const dividerLine = { flex: 1, height: 1, background: "#e6ecf5" };
const dividerText = { color: "#9ca3af", fontSize: 13 };

const fieldLabel = { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 };
const inputWrap = { display: "flex", alignItems: "center", gap: 8, border: "1px solid #d1d5db", borderRadius: 10, padding: "0 12px", background: "#fff" };
const inputIcon = { opacity: 0.5, fontSize: 14 };
const input = { flex: 1, border: "none", outline: "none", background: "transparent", padding: "12px 0", fontSize: 14 };

const row = { display: "flex", justifyContent: "space-between", alignItems: "center", margin: "16px 0" };
const remember = { display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#374151" };
const forgot = { color: "#2563eb", fontSize: 13, fontWeight: 600, textDecoration: "none" };

const signInBtn = { width: "100%", background: "linear-gradient(135deg,#2563eb,#1d4ed8)", color: "#fff", border: "none", borderRadius: 10, padding: "13px", fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: "0 6px 16px rgba(37,99,235,0.30)" };
const footer = { textAlign: "center", marginTop: 18, fontSize: 14, color: "#6b7280" };

/* role picker modal */
const overlay = { position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 20 };
const roleCard = { background: "#fff", borderRadius: 18, padding: 26, width: 400, maxWidth: "100%", boxShadow: "0 20px 50px rgba(2,6,23,0.25)" };
const roleOption = { width: "100%", display: "flex", alignItems: "center", gap: 14, background: "#fff", border: "1px solid #e6ecf5", borderRadius: 12, padding: "14px 16px", cursor: "pointer", textAlign: "left" };
const roleIcon = { width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
const roleTitle = { fontSize: 16, fontWeight: 700, color: "#0f172a" };
const roleDesc = { fontSize: 12.5, color: "#6b7280", marginTop: 2 };
const roleCancel = { width: "100%", marginTop: 16, background: "#f1f5f9", border: "none", borderRadius: 10, padding: "11px", fontSize: 14, fontWeight: 600, color: "#374151", cursor: "pointer" };

export default Login;
