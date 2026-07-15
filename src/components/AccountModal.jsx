import { useState } from "react";
import { apiSetPassword } from "../api/api";
import { toast } from "../utils/toast";

// Lets a signed-in user (including Google-registered ones) set a login password,
// so they can also sign in with their email (as username) + password.
export default function AccountModal({ user, onClose }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [saving, setSaving] = useState(false);

  const emailAsUsername = user?.email || user?.username || "";

  const save = async () => {
    if (pw.length < 6) { toast.error("Password must be at least 6 characters."); return; }
    if (pw !== pw2) { toast.error("Passwords do not match."); return; }
    setSaving(true);
    try {
      await apiSetPassword(pw);
      toast.success("Password saved! You can now log in with your email and password.");
      onClose();
    } catch (e) {
      toast.error(e.message || "Failed to set password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={card} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: "0 0 4px", fontSize: 20, color: "#0f172a" }}>Account Settings</h2>
        <p style={{ margin: "0 0 18px", fontSize: 14, color: "#6b7280" }}>
          Set a login password so you can also sign in with your email and password — not only with Google.
        </p>

        <label style={label}>Your username (email)</label>
        <input style={{ ...input, background: "#f8fafc", color: "#6b7280" }} value={emailAsUsername} disabled />

        <label style={label}>New password</label>
        <input style={input} type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 6 characters" />

        <label style={label}>Confirm password</label>
        <input style={input} type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Re-type your password" />

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <button style={cancelBtn} onClick={onClose} disabled={saving}>Cancel</button>
          <button style={saveBtn} onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Password"}</button>
        </div>
      </div>
    </div>
  );
}

const overlay = { position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 20 };
const card = { background: "#fff", borderRadius: 16, padding: 26, width: 420, maxWidth: "100%", boxShadow: "0 20px 50px rgba(2,6,23,0.25)" };
const label = { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", margin: "12px 0 6px" };
const input = { width: "100%", padding: "11px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box" };
const cancelBtn = { background: "#f1f5f9", border: "none", borderRadius: 8, padding: "10px 18px", cursor: "pointer", fontSize: 14, color: "#374151", fontWeight: 600 };
const saveBtn = { background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", cursor: "pointer", fontSize: 14, fontWeight: 700 };
