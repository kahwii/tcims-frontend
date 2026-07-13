import { useState, useEffect, useCallback } from "react";
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";
import { apiList, apiRemove } from "../api/api";
import { toast } from "../utils/toast";
import Icon from "./Icon";

/* ---- Topic detection: keyword groups counted across real comments ---- */
const TOPIC_KEYWORDS = {
  "Cleanliness":   ["clean", "malinis", "dirty", "marumi", "baho", "smell"],
  "Staff Service": ["staff", "service", "mabait", "bastos", "rude", "friendly", "helpful", "tulong"],
  "Accessibility": ["accessible", "access", "malapit", "layo", "transport", "commute", "sakay"],
  "Food Quality":  ["food", "masarap", "pagkain", "taste", "lasa"],
  "Parking":       ["parking", "park"],
  "Safety":        ["safe", "unsafe", "ligtas", "delikado"],
  "Price / Value": ["expensive", "mahal", "affordable", "sulit", "mura", "presyo"],
};

export default function SentimentAnalysis() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const data = await apiList("reviews");
      setReviews((Array.isArray(data) ? data : []).map(r => ({ ...r, rating: Number(r.rating) || 0 })));
    } catch (e) {
      setErr(e.message || "Failed to load reviews.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const fmtDate = (d) => {
    if (!d) return "—";
    const dt = new Date(String(d).replace(" ", "T"));
    return isNaN(dt) ? d : dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const total = reviews.length;
  const avg = total ? (reviews.reduce((s, r) => s + r.rating, 0) / total).toFixed(1) : 0;

  const positive = reviews.filter(r => r.sentiment === "Positive").length;
  const neutral  = reviews.filter(r => r.sentiment === "Neutral").length;
  const negative = reviews.filter(r => r.sentiment === "Negative").length;
  const positivePct = total ? Math.round((positive / total) * 100) : 0;
  const overall = positivePct >= 60 ? "Positive" : positivePct >= 40 ? "Neutral" : "Negative";

  const sentimentData = [
    { name: "Positive", value: positive, color: "#22c55e" },
    { name: "Neutral",  value: neutral,  color: "#facc15" },
    { name: "Negative", value: negative, color: "#ef4444" }
  ];

  // count how many reviews mention each topic (keyword match)
  const TOPICS = Object.entries(TOPIC_KEYWORDS).map(([topic, kws]) => ({
    topic,
    count: reviews.filter(r => {
      const c = (r.comment || "").toLowerCase();
      return kws.some(k => c.includes(k));
    }).length,
  })).sort((a, b) => b.count - a.count);

  const filtered = reviews.filter(r =>
    [r.reviewer, r.comment, r.sentiment].join(" ").toLowerCase().includes(search.toLowerCase())
  );

  const deleteReview = async (id) => {
    if (!window.confirm("Delete this review?")) return;
    try {
      await apiRemove("reviews", id);
      await load();
    } catch (e) {
      toast.error(e.message || "Failed to delete review.");
    }
  };

  const sentimentBadge = (s) =>
    s === "Positive" ? badgeGreen : s === "Negative" ? badgeRed : badgeAmber;

  return (
    <>
      {/* BREADCRUMB */}
      <div style={breadcrumb}>
        <span style={{ opacity: 0.5 }}>›</span>
        <span style={{ fontWeight: 600, color: "#374151" }}>Sentiment</span>
      </div>

      {/* HEADER */}
      <div style={pageHeader}>
        <div style={headerIcon}><Icon name="message" size={26} /></div>
        <div>
          <h1 style={pageTitle}>Sentiment Analysis</h1>
          <p style={pageSub}>Analyze tourist feedback and reviews using automated NLP categorization.</p>
        </div>
      </div>

      {loading ? (
        <div style={{ ...card, textAlign: "center", color: "#6b7280", padding: 40 }}>Loading reviews…</div>
      ) : err ? (
        <div style={{ ...card, textAlign: "center", color: "#dc2626", padding: 40 }}>
          {err}
          <div><button style={iconAction} onClick={load}>Retry</button></div>
        </div>
      ) : total === 0 ? (
        <div style={{ ...card, textAlign: "center", color: "#6b7280", padding: 40 }}>
          No reviews yet. They will appear here once tourists submit feedback through the Be@Mandaluyong app.
        </div>
      ) : (
      <>
      {/* KPI CARDS */}
      <div style={kpiGrid}>
        <div style={kpiCard}>
          <div>
            <div style={kpiLabel}>Total Reviews Analyzed</div>
            <div style={kpiValue}>{total}</div>
          </div>
          <div style={{ ...kpiIcon, background: "#2563eb" }}></div>
        </div>
        <div style={kpiCard}>
          <div>
            <div style={kpiLabel}>Average Rating</div>
            <div style={kpiValue}>{avg} / 5.0</div>
          </div>
          <div style={{ ...kpiIcon, background: "#f59e0b" }}></div>
        </div>
        <div style={kpiCard}>
          <div>
            <div style={kpiLabel}>Overall Sentiment</div>
            <div style={kpiValue}>{overall}</div>
            <div style={{ fontSize: 13, color: "#22c55e", marginTop: 6, fontWeight: 600 }}>↑ {positivePct}% positive</div>
          </div>
          <div style={{ ...kpiIcon, background: "#22c55e" }}></div>
        </div>
      </div>

      {/* CHARTS */}
      <div style={chartGrid}>
        <div style={card}>
          <h3 style={cardTitle}>Sentiment Distribution</h3>
          <div style={{ position: "relative" }}>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={sentimentData} dataKey="value" innerRadius={75} outerRadius={105} paddingAngle={2}>
                  {sentimentData.map((s, i) => <Cell key={i} fill={s.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div style={donutCenter}>
              <div style={{ fontSize: 30, fontWeight: 700, color: "#111827" }}>{positivePct}%</div>
              <div style={{ fontSize: 13, color: "#6b7280" }}>Positive</div>
            </div>
          </div>
          <div style={legendRow}>
            <span><span style={{ ...dot, background: "#ef4444" }} /> Negative</span>
            <span><span style={{ ...dot, background: "#facc15" }} /> Neutral</span>
            <span><span style={{ ...dot, background: "#22c55e" }} /> Positive</span>
          </div>
        </div>

        <div style={card}>
          <h3 style={cardTitle}>Most Mentioned Topics</h3>
          <ResponsiveContainer width="100%" height={290}>
            <BarChart data={TOPICS} layout="vertical" margin={{ left: 30, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 120]} />
              <YAxis dataKey="topic" type="category" width={90} />
              <Tooltip />
              <Bar dataKey="count" fill="#2563eb" radius={[0, 6, 6, 0]} barSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* REVIEW MANAGEMENT */}
      <h2 style={sectionTitle}>Review Management</h2>
      <div style={card}>
        <div style={{ marginBottom: 16 }}>
          <div style={searchBox}>
            <input style={searchInput} placeholder="Search reviews..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>REVIEWER</th>
              <th style={thStyle}>RATING</th>
              <th style={thStyle}>SENTIMENT</th>
              <th style={thStyle}>DATE</th>
              <th style={{ ...thStyle, textAlign: "center" }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td style={{ ...tdStyle, fontWeight: 600, color: "#111827" }}>{r.reviewer}</td>
                <td style={tdStyle}>{r.rating} ★</td>
                <td style={tdStyle}><span style={sentimentBadge(r.sentiment)}>{r.sentiment}</span></td>
                <td style={tdStyle}>{fmtDate(r.created_at)}</td>
                <td style={{ ...tdStyle, textAlign: "center" }}>
                  <button style={iconAction} title="Delete" onClick={() => deleteReview(r.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td style={{ ...tdStyle, textAlign: "center", color: "#9ca3af" }} colSpan={5}>No reviews found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      </>
      )}
    </>
  );
}

/* ================= STYLES ================= */
const breadcrumb = { display: "flex", alignItems: "center", gap: "8px", color: "#6b7280", fontSize: "14px", marginBottom: "16px" };
const pageHeader = { display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "24px" };
const headerIcon = { width: "52px", height: "52px", borderRadius: "12px", background: "#2563eb", color: "#fff", fontSize: "24px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
const pageTitle = { margin: 0, fontSize: "26px", color: "#111827" };
const pageSub = { margin: "4px 0 0", color: "#6b7280", fontSize: "15px" };

const kpiGrid = { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "20px", marginBottom: "24px" };
const kpiCard = { background: "#fff", padding: "22px", borderRadius: "16px", border: "1px solid #eef2f8", boxShadow: "0 4px 12px rgba(0,0,0,0.04)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", minHeight: "120px" };
const kpiLabel = { fontSize: 14, color: "#6b7280", marginBottom: 10 };
const kpiValue = { fontSize: 28, fontWeight: 700, color: "#111827" };
const kpiIcon = { width: "48px", height: "48px", borderRadius: "12px", color: "#fff", fontSize: "20px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };

const chartGrid = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "20px", marginBottom: "24px", alignItems: "stretch" };
const card = { background: "#fff", padding: "22px", borderRadius: "16px", border: "1px solid #eef2f8", boxShadow: "0 4px 12px rgba(0,0,0,0.04)", marginBottom: "20px" };
const cardTitle = { margin: "0 0 16px", fontSize: "18px", fontWeight: 700, color: "#111827" };
const donutCenter = { position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center", pointerEvents: "none" };
const legendRow = { display: "flex", justifyContent: "center", gap: "20px", marginTop: "12px", fontSize: "14px", color: "#374151" };
const dot = { display: "inline-block", width: "10px", height: "10px", borderRadius: "50%", marginRight: "6px" };

const sectionTitle = { fontSize: "20px", color: "#111827", margin: "8px 0 16px" };

const searchBox = { display: "flex", alignItems: "center", gap: "8px", background: "#f8fafc", border: "1px solid #e6ecf5", borderRadius: "10px", padding: "10px 14px", maxWidth: 460 };
const searchInput = { border: "none", outline: "none", background: "transparent", width: "100%", fontSize: "14px", color: "#374151" };

const tableStyle = { width: "100%", borderCollapse: "collapse" };
const thStyle = { padding: "12px 14px", textAlign: "left", fontSize: "12px", letterSpacing: "0.5px", color: "#9ca3af", borderBottom: "1px solid #eef2f8" };
const tdStyle = { padding: "16px 14px", borderBottom: "1px solid #f1f5f9", fontSize: "14px", color: "#374151" };

const badgeBase = { padding: "4px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: 600, display: "inline-block" };
const badgeGreen = { ...badgeBase, background: "#dcfce7", color: "#16a34a" };
const badgeAmber = { ...badgeBase, background: "#fef3c7", color: "#b45309" };
const badgeRed = { ...badgeBase, background: "#fee2e2", color: "#dc2626" };
const iconAction = { background: "none", border: "none", cursor: "pointer", fontSize: "16px", color: "#dc2626" };
