import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function EstablishmentLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); localStorage.removeItem("user"); navigate("/login"); };

  return (
    <div style={page}>
      <header style={topbar}>
        <div style={inner}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src="/mandaluyong-logo.png" alt="Mandaluyong" style={{ width: 38, height: 38, objectFit: "contain" }} />
            <div>
              <div style={{ fontWeight: 700, color: "#fff", lineHeight: 1.1, fontSize: 18 }}>CCAT Accreditation Portal</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)" }}>Tourism Establishment Registration</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ color: "#fff", fontSize: 14 }}>{user?.username || "Establishment"}</span>
            <button style={logoutBtn} onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </header>

      <main style={content}>
        <Outlet />
      </main>
    </div>
  );
}

const page = { minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Inter', 'Segoe UI', sans-serif" };
const topbar = { background: "linear-gradient(135deg, #0f766e, #0d9488)", position: "sticky", top: 0, zIndex: 10, boxShadow: "0 2px 10px rgba(0,0,0,0.1)" };
const inner = { maxWidth: 1040, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" };
const logoutBtn = { background: "rgba(255,255,255,0.2)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 14, cursor: "pointer" };
const content = { maxWidth: 1040, margin: "0 auto", padding: "28px 24px" };
