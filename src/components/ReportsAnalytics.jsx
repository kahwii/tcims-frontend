import { useState, useEffect, useCallback } from "react";
import jsPDF from "jspdf";
import {
  AreaChart, Area, PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";
import { apiList } from "../api/api";
import Icon from "./Icon";

const DATE_RANGES = ["This Week", "This Month", "This Quarter", "This Year", "All Time"];

const TOPIC_KEYWORDS = {
  "Cleanliness":   ["clean", "malinis", "dirty", "marumi", "baho"],
  "Staff Service": ["staff", "service", "mabait", "bastos", "rude", "friendly", "helpful"],
  "Accessibility": ["accessible", "access", "malapit", "layo", "transport", "commute"],
  "Food Quality":  ["food", "masarap", "pagkain", "lasa"],
  "Parking":       ["parking", "park"],
  "Safety":        ["safe", "unsafe", "ligtas", "delikado"],
  "Price / Value": ["expensive", "mahal", "affordable", "sulit", "mura"],
};

const parseDate = (d) => { const dt = new Date(String(d).replace(" ", "T")); return isNaN(dt) ? null : dt; };

export default function ReportsAnalytics() {
  const [range, setRange] = useState("This Year");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [db, setDb] = useState({ reviews: [], certificates: [], events: [], tourist_spots: [], restaurants: [], hotels: [], tourism_businesses: [], heritage_sites: [] });

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const tables = ["reviews", "certificates", "events", "tourist_spots", "restaurants", "hotels", "tourism_businesses", "heritage_sites"];
      const results = await Promise.all(tables.map(t => apiList(t).catch(() => [])));
      const next = {};
      tables.forEach((t, i) => { next[t] = Array.isArray(results[i]) ? results[i] : []; });
      setDb(next);
    } catch (e) {
      setErr(e.message || "Failed to load analytics data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ---- date-range filter (applied to reviews) ----
  const inRange = (dateStr) => {
    if (range === "All Time") return true;
    const d = parseDate(dateStr); if (!d) return true;
    const now = new Date();
    if (range === "This Week")    { const w = new Date(now); w.setDate(now.getDate() - 7); return d >= w; }
    if (range === "This Month")   return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (range === "This Quarter") return Math.floor(d.getMonth() / 3) === Math.floor(now.getMonth() / 3) && d.getFullYear() === now.getFullYear();
    if (range === "This Year")    return d.getFullYear() === now.getFullYear();
    return true;
  };

  const reviews = db.reviews.map(r => ({ ...r, rating: Number(r.rating) || 0 })).filter(r => inRange(r.created_at));

  // ---- KPIs ----
  const totalReviews = reviews.length;
  const avgRating = totalReviews ? (reviews.reduce((s, r) => s + r.rating, 0) / totalReviews).toFixed(1) : "0.0";
  const positive = reviews.filter(r => r.sentiment === "Positive").length;
  const neutral  = reviews.filter(r => r.sentiment === "Neutral").length;
  const negative = reviews.filter(r => r.sentiment === "Negative").length;
  const positivePct = totalReviews ? Math.round((positive / totalReviews) * 100) : 0;
  const neutralPct  = totalReviews ? Math.round((neutral / totalReviews) * 100) : 0;
  const negativePct = totalReviews ? Math.round((negative / totalReviews) * 100) : 0;

  const approvedCerts = db.certificates.filter(c => c.status === "Approved").length;
  const pendingCerts  = db.certificates.filter(c => c.status === "Under Review").length;
  const rejectedCerts = db.certificates.filter(c => c.status === "Rejected").length;
  const totalEvents   = db.events.length;
  const dirTotal = db.tourist_spots.length + db.restaurants.length + db.hotels.length + db.tourism_businesses.length + db.heritage_sites.length;

  const SUMMARY = [
    { label: "Total Reviews", value: totalReviews.toLocaleString(), icon: "", color: "#2563eb" },
    { label: "Average Rating", value: `${avgRating} / 5.0`, icon: "", color: "#f59e0b" },
    { label: "Accredited Establishments", value: approvedCerts.toLocaleString(), icon: "", color: "#22c55e" },
    { label: "Total Events", value: totalEvents.toLocaleString(), icon: "", color: "#2563eb" },
  ];

  const SENTIMENT = [
    { name: "Positive", value: positive, color: "#22c55e" },
    { name: "Neutral",  value: neutral,  color: "#facc15" },
    { name: "Negative", value: negative, color: "#ef4444" },
  ];

  // ---- feedback trend (reviews per month) ----
  const trendMap = {};
  reviews.forEach(r => {
    const d = parseDate(r.created_at); if (!d) return;
    const key = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    trendMap[key] = trendMap[key] || { key, ts: new Date(d.getFullYear(), d.getMonth(), 1).getTime(), reviews: 0 };
    trendMap[key].reviews++;
  });
  const TREND = Object.values(trendMap).sort((a, b) => a.ts - b.ts).map(({ key, reviews }) => ({ month: key, reviews }));

  // ---- rankings from reviews ----
  const byPlace = {};
  reviews.forEach(r => {
    const p = r.place || "Unknown";
    byPlace[p] = byPlace[p] || { name: p, count: 0, sum: 0 };
    byPlace[p].count++; byPlace[p].sum += r.rating;
  });
  const places = Object.values(byPlace);
  const mostReviewed = [...places].sort((a, b) => b.count - a.count).slice(0, 8).map(p => ({ name: p.name, value: p.count }));
  const highestRated = [...places].filter(p => p.count >= 1).map(p => ({ name: p.name, value: +(p.sum / p.count).toFixed(1) })).sort((a, b) => b.value - a.value).slice(0, 5);

  const directoryBreakdown = [
    { name: "Tourist Spots", value: db.tourist_spots.length },
    { name: "Restaurants", value: db.restaurants.length },
    { name: "Hotels", value: db.hotels.length },
    { name: "Tourism Businesses", value: db.tourism_businesses.length },
    { name: "Heritage Sites", value: db.heritage_sites.length },
    { name: "Events", value: db.events.length },
  ].sort((a, b) => b.value - a.value);

  // ---- topics ----
  const topics = Object.entries(TOPIC_KEYWORDS).map(([topic, kws]) => ({
    topic, count: reviews.filter(r => { const c = (r.comment || "").toLowerCase(); return kws.some(k => c.includes(k)); }).length,
  })).sort((a, b) => b.count - a.count);
  const topTopics = topics.filter(t => t.count > 0).slice(0, 3).map(t => t.topic).join(", ") || "—";

  // ---- exportable reports (real metrics) ----
  const REPORTS = [
    {
      key: "feedback", title: "Visitor Feedback Analytics", icon: "", color: "#2563eb",
      desc: "Tourist review volume, ratings, and top-reviewed destinations.",
      metrics: [
        { label: "Total Reviews", value: String(totalReviews) },
        { label: "Average Rating", value: `${avgRating} / 5.0` },
        { label: "Positive Sentiment", value: `${positivePct}%` },
        { label: "Top Destination", value: mostReviewed[0]?.name || "—" },
      ],
    },
    {
      key: "compliance", title: "Establishment Compliance", icon: "", color: "#f59e0b",
      desc: "Accreditation status of tourism establishments.",
      metrics: [
        { label: "Approved", value: String(approvedCerts) },
        { label: "Under Review", value: String(pendingCerts) },
        { label: "Rejected", value: String(rejectedCerts) },
        { label: "Directory Listings", value: String(dirTotal) },
      ],
    },
    {
      key: "events", title: "Events & Cultural Activities", icon: "", color: "#f59e0b",
      desc: "Calendar of activities and heritage inventory.",
      metrics: [
        { label: "Total Events", value: String(totalEvents) },
        { label: "Heritage Sites", value: String(db.heritage_sites.length) },
        { label: "Tourist Spots", value: String(db.tourist_spots.length) },
      ],
    },
    {
      key: "sentiment", title: "Sentiment & Feedback Analysis", icon: "", color: "#22c55e",
      desc: "Aggregated NLP sentiment scores and common topics.",
      metrics: [
        { label: "Positive", value: `${positivePct}%` },
        { label: "Neutral", value: `${neutralPct}%` },
        { label: "Negative", value: `${negativePct}%` },
        { label: "Top Topics", value: topTopics },
      ],
    },
  ];

  // ---- exporters ----
  const download = (filename, content, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };
  const exportCSV = (r) => download(`${r.key}_report.csv`, "Metric,Value\n" + r.metrics.map(m => `"${m.label}","${m.value}"`).join("\n"), "text/csv");
  const exportExcel = (r) => download(`${r.key}_report.xls`, `<table border="1"><tr><th>Metric</th><th>Value</th></tr>${r.metrics.map(m => `<tr><td>${m.label}</td><td>${m.value}</td></tr>`).join("")}</table>`, "application/vnd.ms-excel");
  const exportPDF = (r) => {
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text("TCIMS — " + r.title, 14, 18);
    doc.setFontSize(10); doc.setTextColor(120);
    doc.text(`Date Range: ${range}   |   Generated: ${new Date().toLocaleString()}`, 14, 26);
    doc.setTextColor(0); doc.setFontSize(11);
    let y = 40; doc.text(r.desc, 14, y, { maxWidth: 180 }); y += 14;
    r.metrics.forEach(m => { doc.setFont(undefined, "bold"); doc.text(`${m.label}:`, 14, y); doc.setFont(undefined, "normal"); doc.text(`${m.value}`, 80, y); y += 9; });
    doc.save(`${r.key}_report.pdf`);
  };

  const RankTable = ({ title, rows, suffix = "" }) => {
    const max = Math.max(1, ...rows.map(r => r.value));
    return (
      <div style={card}>
        <h3 style={cardTitle}>{title}</h3>
        {rows.length === 0 && <div style={{ color: "#9ca3af", fontSize: 14 }}>No data yet.</div>}
        {rows.map((r, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 14 }}>
              <span style={{ color: "#374151" }}><b style={{ color: "#9ca3af" }}>{i + 1}.</b> {r.name}</span>
              <span style={{ fontWeight: 600, color: "#111827" }}>{r.value.toLocaleString()}{suffix}</span>
            </div>
            <div style={barTrack}><div style={{ ...barFill, width: `${(r.value / max) * 100}%` }} /></div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <div style={breadcrumb}>
        <span style={{ opacity: 0.5 }}>›</span>
        <span style={{ fontWeight: 600, color: "#374151" }}>Reports</span>
      </div>

      <div style={pageHeader}>
        <div style={headerIcon}><Icon name="chart" size={26} /></div>
        <div>
          <h1 style={pageTitle}>Reports &amp; Analytics</h1>
          <p style={pageSub}>Live tourism data — reviews, accreditation, events, and directory.</p>
        </div>
      </div>

      <div style={filterBar}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontWeight: 600, color: "#374151" }}>Date Range:</span>
          <select style={select} value={range} onChange={(e) => setRange(e.target.value)}>
            {DATE_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <span style={{ fontSize: 12, color: "#9ca3af" }}>(applies to review-based metrics)</span>
        </div>
        <button style={filterBtn} onClick={load}>↻ Refresh</button>
      </div>

      {loading ? (
        <div style={{ ...card, textAlign: "center", color: "#6b7280", padding: 40 }}>Loading analytics…</div>
      ) : err ? (
        <div style={{ ...card, textAlign: "center", color: "#dc2626", padding: 40 }}>{err}<div><button style={filterBtn} onClick={load}>Retry</button></div></div>
      ) : (
      <>
      {/* SUMMARY KPIs */}
      <div style={kpiGrid}>
        {SUMMARY.map((s, i) => (
          <div key={i} style={kpiCard}>
            <div>
              <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: "#111827" }}>{s.value}</div>
            </div>
            <div style={{ ...kpiIcon, background: s.color }}>{s.icon}</div>
          </div>
        ))}
      </div>

      {/* CHARTS */}
      <div style={chartGrid}>
        <div style={card}>
          <h3 style={cardTitle}>Feedback Trend (reviews / month)</h3>
          {TREND.length === 0 ? <div style={{ color: "#9ca3af", fontSize: 14 }}>No reviews in this range.</div> : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={TREND} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="vt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="reviews" stroke="#2563eb" strokeWidth={3} fill="url(#vt)" />
            </AreaChart>
          </ResponsiveContainer>
          )}
        </div>

        <div style={card}>
          <h3 style={cardTitle}>Sentiment Distribution</h3>
          {totalReviews === 0 ? <div style={{ color: "#9ca3af", fontSize: 14 }}>No reviews in this range.</div> : (
          <div style={{ position: "relative" }}>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={SENTIMENT} dataKey="value" innerRadius={75} outerRadius={105} paddingAngle={2}>
                  {SENTIMENT.map((s, i) => <Cell key={i} fill={s.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div style={donutCenter}>
              <div style={{ fontSize: 30, fontWeight: 700, color: "#111827" }}>{positivePct}%</div>
              <div style={{ fontSize: 13, color: "#6b7280" }}>Positive</div>
            </div>
          </div>
          )}
        </div>
      </div>

      {/* MOST REVIEWED PLACES (bar) */}
      <div style={card}>
        <h3 style={cardTitle}>Most Reviewed Places</h3>
        {mostReviewed.length === 0 ? <div style={{ color: "#9ca3af", fontSize: 14 }}>No reviews in this range.</div> : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={mostReviewed} layout="vertical" margin={{ left: 40, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" allowDecimals={false} />
            <YAxis dataKey="name" type="category" width={170} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="value" fill="#2563eb" radius={[0, 6, 6, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
        )}
      </div>

      {/* RANK TABLES */}
      <div style={chartGrid}>
        <RankTable title="Highest Rated Places" rows={highestRated} suffix=" ★" />
        <RankTable title="Tourism Directory Breakdown" rows={directoryBreakdown} />
      </div>

      {/* EXPORTABLE REPORTS */}
      <h2 style={sectionTitle}>Generate &amp; Export Reports</h2>
      <div style={chartGrid}>
        {REPORTS.map((r) => (
          <div key={r.key} style={card}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
              <div style={{ ...cardIcon, background: r.color }}>{r.icon}</div>
              <div>
                <h3 style={cardTitle}>{r.title}</h3>
                <p style={cardDesc}>{r.desc}</p>
              </div>
            </div>
            <div style={metricsLabel}>INCLUDED METRICS:</div>
            <ul style={metricsList}>
              {r.metrics.map((m, i) => (
                <li key={i} style={metricItem}><span style={{ color: r.color, marginRight: 8 }}>•</span>{m.label}: <b style={{ marginLeft: 4 }}>{m.value}</b></li>
              ))}
            </ul>
            <div style={btnRow}>
              <button style={pdfBtn} onClick={() => exportPDF(r)}>PDF</button>
              <button style={excelBtn} onClick={() => exportExcel(r)}>Excel</button>
              <button style={csvBtn} onClick={() => exportCSV(r)}>CSV</button>
            </div>
          </div>
        ))}
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

const filterBar = { background: "#fff", border: "1px solid #eef2f8", borderRadius: "12px", padding: "14px 18px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.04)" };
const select = { padding: "8px 12px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "14px", cursor: "pointer", fontWeight: 600, color: "#b45309" };
const filterBtn = { background: "#fff", border: "1px solid #d1d5db", borderRadius: "10px", padding: "10px 16px", fontSize: "14px", cursor: "pointer", color: "#374151" };

const kpiGrid = { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "20px", marginBottom: "24px" };
const kpiCard = { background: "#fff", padding: "20px", borderRadius: "16px", border: "1px solid #eef2f8", boxShadow: "0 4px 12px rgba(0,0,0,0.04)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" };
const kpiIcon = { width: "44px", height: "44px", borderRadius: "10px", color: "#fff", fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };

const chartGrid = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "20px", marginBottom: "24px", alignItems: "stretch" };
const card = { background: "#fff", padding: "22px", borderRadius: "16px", border: "1px solid #eef2f8", boxShadow: "0 4px 12px rgba(0,0,0,0.04)", marginBottom: "20px", display: "flex", flexDirection: "column" };
const cardTitle = { margin: "0 0 16px", fontSize: "17px", fontWeight: 700, color: "#111827" };
const cardIcon = { width: "44px", height: "44px", borderRadius: "10px", color: "#fff", fontSize: "20px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
const cardDesc = { margin: "4px 0 0", fontSize: "14px", color: "#6b7280", lineHeight: 1.5 };

const donutCenter = { position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center", pointerEvents: "none" };

const barTrack = { width: "100%", height: "9px", background: "#eef2f8", borderRadius: "6px", overflow: "hidden" };
const barFill = { height: "100%", background: "#2563eb", borderRadius: "6px" };

const sectionTitle = { fontSize: "20px", color: "#111827", margin: "8px 0 16px" };

const metricsLabel = { fontSize: "12px", letterSpacing: "0.5px", color: "#9ca3af", fontWeight: 600, marginBottom: 8 };
const metricsList = { listStyle: "none", padding: 0, margin: "0 0 18px", flex: 1 };
const metricItem = { fontSize: "14px", color: "#374151", padding: "3px 0", display: "flex", alignItems: "center" };
const btnRow = { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" };
const baseBtn = { border: "none", borderRadius: "8px", padding: "10px", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontWeight: 600 };
const pdfBtn = { ...baseBtn, background: "#fef2f2", color: "#dc2626" };
const excelBtn = { ...baseBtn, background: "#f0fdf4", color: "#16a34a" };
const csvBtn = { ...baseBtn, background: "#f1f5f9", color: "#475569" };
