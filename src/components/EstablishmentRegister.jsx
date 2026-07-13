import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { BASE } from "../api/api";

const BARANGAYS = [
  "Addition Hills", "Bagong Silang", "Barangka Drive", "Barangka Ibaba", "Barangka Ilaya",
  "Barangka Itaas", "Buayang Bato", "Burol", "Daang Bakal", "Hagdang Bato Itaas",
  "Hagdang Bato Libis", "Harapin Ang Bukas", "Highway Hills", "Hulo", "Mabini-J. Rizal",
  "Malamig", "Mauway", "Namayan", "New Zañiga", "Old Zañiga", "Pag-asa", "Plainview",
  "Pleasant Hills", "Poblacion", "San Jose", "Vergara", "Wack-Wack Greenhills",
];
const EST_TYPES = ["Hotel", "Restaurant", "Shopping Mall", "Tourism Business", "Travel Agency", "Event Venue", "Resort", "Others"];

const EMPTY = {
  first_name: "", middle_name: "", last_name: "", sex: "Male", account_type: "Owner",
  business_name: "", establishment_type: "Hotel",
  region: "National Capital Region (NCR)", province: "Metro Manila", city: "Mandaluyong City",
  barangay: BARANGAYS[0], business_address: "", zip_code: "1550",
  email: "", password: "", confirm_password: "",
  mobile: "", telephone: "",
};

export default function EstablishmentRegister({ onSwitchToTourist }) {
  const [f, setF] = useState(EMPTY);
  const [certified, setCertified] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const set = (k) => (e) => setF((prev) => ({ ...prev, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!f.business_name.trim()) return setError("Business Name is required.");
    if (!f.email.trim()) return setError("Email Address is required.");
    if (!f.business_address.trim()) return setError("Business Address is required.");
    if (f.password.length < 6) return setError("Password must be at least 6 characters.");
    if (f.password !== f.confirm_password) return setError("Passwords do not match.");
    if (!certified) return setError("Please certify the declaration before registering.");

    setSaving(true);
    try {
      const res = await fetch(`${BASE}/register.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, role: "establishment" }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(" Account created and application submitted for review! Sign in with your email. Redirecting…");
        setTimeout(() => navigate("/login"), 1800);
      } else {
        setError(data.error || "Registration failed.");
      }
    } catch {
      setError("Could not connect to server.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={page}>
      <div style={card}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <img src="/mandaluyong-logo.png" alt="Mandaluyong" style={{ width: 64, height: 64, objectFit: "contain" }} />
          <h1 style={{ margin: "10px 0 2px", fontSize: 24, color: "#111827" }}>Create your Accreditation Account</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>City Cultural Affairs & Tourism — Mandaluyong</p>
        </div>

        {error && <div style={errorBox}>{error}</div>}
        {success && <div style={successBox}>{success}</div>}

        <form onSubmit={submit}>
          {/* PERSONAL INFORMATION */}
          <div style={sectionHead}>Personal Information</div>
          <div style={row3}>
            <Field label="First Name"><input style={inp} value={f.first_name} onChange={set("first_name")} /></Field>
            <Field label="Middle Name"><input style={inp} value={f.middle_name} onChange={set("middle_name")} /></Field>
            <Field label="Last Name"><input style={inp} value={f.last_name} onChange={set("last_name")} /></Field>
          </div>
          <div style={row2}>
            <Field label="Sex">
              <select style={inp} value={f.sex} onChange={set("sex")}><option>Male</option><option>Female</option></select>
            </Field>
            <Field label="Account Type">
              <select style={inp} value={f.account_type} onChange={set("account_type")}>
                <option>Owner</option><option>Authorized Representative</option><option>Frontliner</option>
              </select>
            </Field>
          </div>

          {/* BUSINESS INFORMATION */}
          <div style={sectionHead}>Business Information</div>
          <div style={row2}>
            <Field label="Business Name (as on Business Permit) *"><input style={inp} value={f.business_name} onChange={set("business_name")} /></Field>
            <Field label="Establishment Type">
              <select style={inp} value={f.establishment_type} onChange={set("establishment_type")}>
                {EST_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
          </div>
          <div style={row3}>
            <Field label="Region"><input style={inp} value={f.region} onChange={set("region")} /></Field>
            <Field label="Province"><input style={inp} value={f.province} onChange={set("province")} /></Field>
            <Field label="City / Municipality"><input style={inp} value={f.city} onChange={set("city")} /></Field>
          </div>
          <div style={row2}>
            <Field label="Barangay">
              <select style={inp} value={f.barangay} onChange={set("barangay")}>
                {BARANGAYS.map((b) => <option key={b}>{b}</option>)}
              </select>
            </Field>
            <Field label="Zip Code"><input style={inp} value={f.zip_code} onChange={set("zip_code")} /></Field>
          </div>
          <Field label="Business Address (Bldg / House / Block / Lot No., Street) *">
            <input style={inp} value={f.business_address} onChange={set("business_address")} />
          </Field>

          {/* ACCOUNT INFORMATION */}
          <div style={sectionHead}>Account Information</div>
          <Field label="Email Address *"><input style={inp} type="email" value={f.email} onChange={set("email")} /></Field>
          <p style={noteBox}>Use a valid, active email — official communications and notifications will be sent here. This is also your sign-in username.</p>
          <div style={row2}>
            <Field label="Password *"><input style={inp} type="password" value={f.password} onChange={set("password")} /></Field>
            <Field label="Confirm Password *"><input style={inp} type="password" value={f.confirm_password} onChange={set("confirm_password")} /></Field>
          </div>

          {/* CONTACT INFORMATION */}
          <div style={sectionHead}>Contact Information</div>
          <div style={row2}>
            <Field label="Mobile No."><input style={inp} value={f.mobile} onChange={set("mobile")} placeholder="0917 123 4567" /></Field>
            <Field label="Telephone No."><input style={inp} value={f.telephone} onChange={set("telephone")} placeholder="(02) 8XXX XXXX" /></Field>
          </div>

          {/* CERTIFICATION */}
          <label style={certRow}>
            <input type="checkbox" checked={certified} onChange={(e) => setCertified(e.target.checked)} style={{ marginTop: 3 }} />
            <span style={{ fontSize: 13, color: "#374151", lineHeight: 1.5 }}>
              I certify that I am duly authorized to accomplish this application form and that the information provided
              herein are true, correct and complete to the best of my knowledge, in compliance with pertinent laws,
              rules, and regulations of the Republic of the Philippines.
            </span>
          </label>

          <button type="submit" style={submitBtn} disabled={saving}>{saving ? "Registering…" : "Register Account"}</button>

          <div style={{ textAlign: "center", marginTop: 16, fontSize: 14, color: "#6b7280" }}>
            <button type="button" onClick={onSwitchToTourist} style={linkBtn}>← Register as Tourist instead</button>
            <span style={{ margin: "0 8px" }}>·</span>
            <Link to="/login" style={{ color: "#0d9488", fontWeight: 600 }}>Go to sign in</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={lbl}>{label}</label>
      {children}
    </div>
  );
}

/* ================= STYLES ================= */
const page = { minHeight: "100vh", background: "#f1f5f9", padding: "32px 16px", fontFamily: "'Inter', 'Segoe UI', sans-serif" };
const card = { maxWidth: 760, margin: "0 auto", background: "#fff", borderRadius: 16, padding: "32px", boxShadow: "0 10px 40px rgba(0,0,0,0.08)", border: "1px solid #eef2f8" };
const sectionHead = { margin: "22px 0 12px", fontSize: 15, fontWeight: 700, color: "#0d9488", borderBottom: "2px solid #ccfbf1", paddingBottom: 6 };
const row2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 };
const row3 = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 };
const lbl = { display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 5 };
const inp = { width: "100%", padding: "9px 11px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box", fontFamily: "inherit" };
const noteBox = { background: "#f0fdfa", border: "1px solid #ccfbf1", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#0f766e", margin: "0 0 12px", lineHeight: 1.5 };
const certRow = { display: "flex", gap: 10, alignItems: "flex-start", margin: "20px 0 6px", padding: "12px", background: "#fafbff", border: "1px solid #eef2f8", borderRadius: 10, cursor: "pointer" };
const submitBtn = { width: "100%", marginTop: 16, background: "#0d9488", color: "#fff", border: "none", borderRadius: 10, padding: "13px", fontSize: 15, fontWeight: 700, cursor: "pointer" };
const linkBtn = { background: "none", border: "none", color: "#2563eb", fontWeight: 600, cursor: "pointer", fontSize: 14, padding: 0 };
const errorBox = { background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 8, padding: "10px 14px", fontSize: 14, marginBottom: 14 };
const successBox = { background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#16a34a", borderRadius: 8, padding: "10px 14px", fontSize: 14, marginBottom: 14 };
