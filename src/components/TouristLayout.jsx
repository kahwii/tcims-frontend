import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiList } from "../api/api";
import { toast } from "../utils/toast";
import { EVENTS_SEEN_KEY } from "./TouristEvents";
import AccountModal from "./AccountModal";

export default function TouristLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [newEvents, setNewEvents] = useState(0);
  const [showAccount, setShowAccount] = useState(false);

  const handleLogout = () => { logout(); localStorage.removeItem("user"); navigate("/login"); };

  // check for newly-posted events (by admin) and notify the tourist
  useEffect(() => {
    let cancelled = false;
    apiList("events").then(list => {
      if (cancelled || !Array.isArray(list)) return;
      const maxId = list.reduce((mx, e) => Math.max(mx, Number(e.id) || 0), 0);
      const seenRaw = localStorage.getItem(EVENTS_SEEN_KEY);
      if (seenRaw === null) {
        // first visit: set a baseline so existing events aren't flagged as new
        localStorage.setItem(EVENTS_SEEN_KEY, String(maxId));
        return;
      }
      const seen = Number(seenRaw);
      const fresh = list.filter(e => Number(e.id) > seen);
      if (fresh.length > 0) {
        setNewEvents(fresh.length);
        toast.info(`${fresh.length} new event${fresh.length > 1 ? "s" : ""} posted! Check the Events tab.`);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const tabs = [
    { to: "/tourist", label: "Explore", end: true },
    { to: "/tourist/trail", label: "Trail" },
    { to: "/tourist/events", label: "Events" },
    { to: "/tourist/feedback", label: "Feedback" }
  ];

  return (
    <div style={page}>
      <header style={topbar}>
        <div style={inner}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src="/mandaluyong-logo.png" alt="Mandaluyong" style={{ width: 38, height: 38, objectFit: "contain" }} />
            <div>
              <div style={{ fontWeight: 700, color: "#fff", lineHeight: 1.1, fontSize: 18 }}>Be@Mandaluyong</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)" }}>Tourist Trail & Guide</div>
            </div>
          </div>

          <nav style={navWrap}>
            {tabs.map(t => {
              const isEvents = t.to === "/tourist/events";
              return (
                <NavLink key={t.to} to={t.to} end={t.end}
                  onClick={isEvents ? () => setNewEvents(0) : undefined}
                  style={({ isActive }) => ({ ...navItem, ...(isActive ? navActive : {}), position: "relative" })}>
                  <span>{t.label}</span>
                  {isEvents && newEvents > 0 && <span style={badge}>{newEvents}</span>}
                </NavLink>
              );
            })}
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ color: "#fff", fontSize: 14 }}>{user?.username || "Tourist"}</span>
            <button style={acctBtn} onClick={() => setShowAccount(true)}>Account</button>
            <button style={logoutBtn} onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </header>

      <main style={content}>
        <Outlet />
      </main>

      {showAccount && <AccountModal user={user} onClose={() => setShowAccount(false)} />}
    </div>
  );
}

const page = { minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Inter', 'Segoe UI', sans-serif" };
const topbar = { background: "linear-gradient(135deg, #1d4ed8, #2563eb)", position: "sticky", top: 0, zIndex: 10, boxShadow: "0 2px 10px rgba(0,0,0,0.1)" };
const inner = { maxWidth: 1140, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" };
const navWrap = { display: "flex", gap: 6 };
const navItem = { display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.9)", textDecoration: "none", padding: "8px 16px", borderRadius: 10, fontSize: 15, fontWeight: 500 };
const navActive = { background: "rgba(255,255,255,0.2)", color: "#fff", fontWeight: 700 };
const badge = { position: "absolute", top: -4, right: -4, minWidth: 18, height: 18, padding: "0 5px", background: "#f59e0b", color: "#1f2937", borderRadius: 999, fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 2px #2563eb" };
const logoutBtn = { background: "rgba(255,255,255,0.2)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 14, cursor: "pointer" };
const acctBtn = { background: "rgba(255,255,255,0.14)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, padding: "8px 14px", fontSize: 14, cursor: "pointer" };
const content = { maxWidth: 1140, margin: "0 auto", padding: "28px 24px" };
