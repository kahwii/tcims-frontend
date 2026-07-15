import { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Icon from "./Icon";

export default function AdminLayout() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Mobile detection (phones/tablets ≤ 768px). Desktop layout is unchanged.
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches
  );
  // Sidebar starts open on desktop, closed on mobile.
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const onChange = (e) => { setIsMobile(e.matches); setSidebarOpen(!e.matches); };
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, []);

  const [openGroups, setOpenGroups] = useState({
    "Tourism Directory": location.pathname.startsWith("/admin/tourism")
      || ["/admin/tourist-spots", "/admin/restaurants", "/admin/hotels", "/admin/tourism-businesses"]
        .includes(location.pathname)
  });

  const toggleGroup = (label) =>
    setOpenGroups(g => ({ ...g, [label]: !g[label] }));

  // On mobile, tapping a link should close the drawer.
  const closeOnMobile = () => { if (isMobile) setSidebarOpen(false); };

  const handleLogout = () => {
    logout();
    localStorage.clear();
    navigate("/login");
  };

  const menu = [
    { label: "Dashboard", icon: "dashboard", to: "/admin" },
    {
      label: "Tourism Directory", icon: "pin",
      children: [
        { label: "Tourist Spots", icon: "pin", to: "/admin/tourist-spots" },
        { label: "Restaurants", icon: "utensils", to: "/admin/restaurants" },
        { label: "Hotels", icon: "bed", to: "/admin/hotels" },
        { label: "Tourism Businesses", icon: "store", to: "/admin/tourism-businesses" }
      ]
    },
    { label: "Certificates", icon: "file", to: "/admin/certificates" },
    { label: "Events", icon: "calendar", to: "/admin/events" },
    { label: "Heritage Sites", icon: "landmark", to: "/admin/heritage-sites" },
    { label: "Sentiment Analysis", icon: "message", to: "/admin/sentiment" },
    { label: "Reports & Analytics", icon: "chart", to: "/admin/reports" },
    { label: "Rewards", icon: "gift", to: "/admin/rewards" },
    { label: "User Management", icon: "users", to: "/admin/users" }
  ];

  // Sidebar styling differs by device: desktop = in-flow collapsible column;
  // mobile = fixed slide-in drawer over the content.
  const sidebarStyle = isMobile
    ? { ...sidebarBase, position: "fixed", top: 0, left: 0, height: "100vh", width: 262,
        zIndex: 50, transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.25s ease" }
    : { ...sidebarBase, position: "sticky", top: 0, height: "100vh",
        width: sidebarOpen ? 260 : 0, transition: "width 0.25s ease" };

  return (
    <div style={layout}>

      {/* Mobile backdrop */}
      {isMobile && sidebarOpen && (
        <div style={backdrop} onClick={() => setSidebarOpen(false)} />
      )}

      {/* ================= SIDEBAR ================= */}
      <aside style={sidebarStyle}>
        <div style={brand}>
          <img
            src="/mandaluyong-logo.png"
            alt="City of Mandaluyong"
            style={{ width: 44, height: 44, objectFit: "contain", flexShrink: 0 }}
          />
          <div>
            <div style={brandTitle}>TCIMS</div>
            <div style={brandSub}>Mandaluyong City</div>
          </div>
        </div>

        <nav style={nav}>
          {menu.map((item) => {
            const hasChildren = !!item.children;
            const expanded = !!openGroups[item.label];

            if (!hasChildren) {
              return (
                <NavLink
                  key={item.label}
                  to={item.to}
                  end={item.to === "/admin"}
                  onClick={closeOnMobile}
                  style={({ isActive }) => ({ ...navItem, ...(isActive ? navItemActive : {}) })}
                >
                  <Icon name={item.icon} size={18} />
                  <span>{item.label}</span>
                </NavLink>
              );
            }

            return (
              <div key={item.label}>
                <div style={navItem} onClick={() => toggleGroup(item.label)}>
                  <Icon name={item.icon} size={18} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  <span style={{ ...chevron, transform: expanded ? "rotate(180deg)" : "rotate(0deg)", display: "inline-flex" }}><Icon name="chevron" size={16} /></span>
                </div>
                {expanded && (
                  <div style={subNav}>
                    {item.children.map((child) => (
                      <NavLink
                        key={child.label}
                        to={child.to}
                        onClick={closeOnMobile}
                        style={({ isActive }) => ({ ...subItem, ...(isActive ? navItemActive : {}) })}
                      >
                        <Icon name={child.icon} size={16} />
                        <span>{child.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      {/* ================= MAIN ================= */}
      <main style={main}>
        <div style={topbar}>
          <button style={toggleBtn} onClick={() => setSidebarOpen(o => !o)}><Icon name="menu" size={18} /></button>
          {!isMobile && (
            <div style={searchBox}>
              <span style={{ color: "#94a3b8", display: "inline-flex" }}><Icon name="search" size={16} /></span>
              <input style={searchInput} placeholder="Search tourist spots, events, establishments..." />
            </div>
          )}
          <div style={topRight}>
            <div style={userBox}>
              <div style={avatar}>{(user?.username || "S").charAt(0).toUpperCase()}</div>
              {!isMobile && (
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{user?.username || "Super Admin"}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>Super Admin</div>
                </div>
              )}
            </div>
            <button style={logoutBtn} onClick={handleLogout}>Logout</button>
          </div>
        </div>

        <div style={isMobile ? contentMobile : content}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}

/* ================= SHARED STYLES ================= */
const layout = { display: "flex", minHeight: "100vh", fontFamily: "'Inter', 'Segoe UI', sans-serif", background: "#f8fafc" };

const sidebarBase = { background: "#ffffff", borderRight: "1px solid #e6ecf5", boxShadow: "2px 0 10px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0 };
const backdrop = { position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 40 };
const brand = { display: "flex", alignItems: "center", gap: "12px", padding: "20px 18px", borderBottom: "1px solid #eef2f8" };
const brandIcon = { width: "44px", height: "44px", borderRadius: "12px", background: "#1d4ed8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "22px" };
const brandTitle = { fontWeight: 700, fontSize: "18px", color: "#111827" };
const brandSub = { fontSize: "12px", color: "#6b7280" };

const nav = { display: "flex", flexDirection: "column", gap: "4px", padding: "14px 12px" };
const navItem = { display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", borderRadius: "10px", cursor: "pointer", color: "#374151", fontSize: "15px", whiteSpace: "nowrap", textDecoration: "none", transition: "background 0.15s ease, color 0.15s ease" };
const navItemActive = { background: "#2563eb", color: "#ffffff", fontWeight: 600, boxShadow: "inset 4px 0 0 #f59e0b, 0 6px 14px rgba(37,99,235,0.35)" };
const navIcon = { fontSize: "16px", width: "20px", textAlign: "center" };
const chevron = { fontSize: "16px", transition: "transform 0.2s ease", opacity: 0.7 };
const subNav = { display: "flex", flexDirection: "column", gap: "2px", marginTop: "2px", paddingLeft: "18px" };
const subItem = { display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", borderRadius: "10px", cursor: "pointer", color: "#374151", fontSize: "14px", whiteSpace: "nowrap", textDecoration: "none", transition: "background 0.15s ease, color 0.15s ease" };

const main = { flex: 1, minWidth: 0, display: "flex", flexDirection: "column" };
const topbar = { display: "flex", alignItems: "center", gap: "16px", background: "#fff", borderBottom: "1px solid #e6ecf5", padding: "12px 24px", position: "sticky", top: 0, zIndex: 10 };
const toggleBtn = { background: "#f1f5f9", border: "none", borderRadius: "8px", width: "38px", height: "38px", color: "#475569", cursor: "pointer", flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" };
const searchBox = { flex: 1, maxWidth: 620, display: "flex", alignItems: "center", gap: "8px", background: "#f1f5f9", borderRadius: "10px", padding: "10px 14px" };
const searchInput = { border: "none", outline: "none", background: "transparent", width: "100%", fontSize: "14px", color: "#374151" };
const topRight = { marginLeft: "auto", display: "flex", alignItems: "center", gap: "16px" };
const bellWrap = { position: "relative", cursor: "pointer" };
const bellDot = { position: "absolute", top: 0, right: 0, width: "8px", height: "8px", background: "#ef4444", borderRadius: "50%" };
const userBox = { display: "flex", alignItems: "center", gap: "10px" };
const avatar = { width: "38px", height: "38px", borderRadius: "50%", background: "#2563eb", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 };
const logoutBtn = { padding: "8px 14px", background: "#dc2626", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px" };
const content = { padding: "24px 32px" };
const contentMobile = { padding: "16px 14px" };
