import { useState, useEffect, useCallback } from "react";
import { apiList } from "../api/api";

// mark the newest event as "seen" so the notification badge clears
export const EVENTS_SEEN_KEY = "tcims_events_seen";

// category -> bucket + color
const META = (c = "") => {
  if (/religious|lenten|marian|saints|sto|cruzan|flores|iglesia|peñafrancia|soul|abandoned/i.test(c)) return { bucket: "Religious", color: "#7c3aed" };
  if (/historical|history|bayani|liberation|kagitingan|rizal|bonifacio|anniversary/i.test(c)) return { bucket: "Historical", color: "#b45309" };
  if (/festival|christmas|maytime|daluyong|paskuhan|pistang|fashion/i.test(c)) return { bucket: "Festival", color: "#dc2626" };
  if (/pageant/i.test(c)) return { bucket: "Pageant", color: "#db2777" };
  if (/arts|cultural|music|literature|heritage|community/i.test(c)) return { bucket: "Arts & Culture", color: "#16a34a" };
  if (/trade|food/i.test(c)) return { bucket: "Trade & Food", color: "#0e7490" };
  if (/observance|week|nutrition|literacy|tourism|archives|museums|library|conference|morning/i.test(c)) return { bucket: "Observance", color: "#2563eb" };
  return { bucket: "Other", color: "#475569" };
};

const fmtDate = (d) => {
  if (!d) return "";
  const dt = new Date(String(d) + "T00:00:00");
  return isNaN(dt) ? d : dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};
const fmtTime = (t) => {
  if (!t) return "";
  const [h, m] = String(t).split(":");
  const hh = parseInt(h, 10); if (isNaN(hh)) return "";
  const ap = hh >= 12 ? "PM" : "AM";
  return `${((hh + 11) % 12) + 1}:${m ?? "00"} ${ap}`;
};
const timeRange = (e) => {
  const s = fmtTime(e.start_time), en = fmtTime(e.end_time);
  if (s && en) return `${s} – ${en}`;
  if (s) return `${s} onwards`;
  return en || "";
};

export default function TouristEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const [bucket, setBucket] = useState("All");

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const data = await apiList("events");
      const list = Array.isArray(data) ? data : [];
      setEvents(list);
      // mark newest event id as seen -> clears the nav notification badge
      const maxId = list.reduce((mx, e) => Math.max(mx, Number(e.id) || 0), 0);
      localStorage.setItem(EVENTS_SEEN_KEY, String(maxId));
    } catch (e) {
      setErr(e.message || "Failed to load events.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const BUCKETS = ["All", ...Array.from(new Set(events.map(e => META(e.category).bucket)))];

  const filtered = events.filter(e => {
    const s = [e.name, e.category, e.venue, e.month, fmtDate(e.event_date)].join(" ").toLowerCase().includes(search.toLowerCase());
    const b = bucket === "All" || META(e.category).bucket === bucket;
    return s && b;
  });

  // group by month (from the real date if present, else the stored month)
  const grouped = (() => {
    const map = {};
    filtered.forEach(e => {
      const dt = e.event_date ? new Date(e.event_date + "T00:00:00") : null;
      const valid = dt && !isNaN(dt);
      const key = valid ? dt.toLocaleDateString("en-US", { month: "long", year: "numeric" }) : (e.month || "Scheduled");
      const ts = valid ? new Date(dt.getFullYear(), dt.getMonth(), 1).getTime() : Number.MAX_SAFE_INTEGER;
      if (!map[key]) map[key] = { month: key, ts, items: [] };
      map[key].items.push(e);
    });
    return Object.values(map).sort((a, b) => a.ts - b.ts);
  })();

  return (
    <>
      <style>{`
        .ev-card { transition: transform .15s ease, box-shadow .15s ease; }
        .ev-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.10); }
      `}</style>

      <div style={hero}>
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 26, fontWeight: 800 }}>Events & Festivals</div>
          <div style={{ opacity: 0.92, marginTop: 6 }}>Discover upcoming cultural events & festivals in Mandaluyong City.</div>
        </div>
        <div style={heroGlow} />
      </div>

      <div style={searchBox}>
        <input style={searchInput} placeholder="Search events..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div style={chips}>
        {BUCKETS.map(b => (
          <button key={b} onClick={() => setBucket(b)} style={{ ...chip, ...(bucket === b ? chipActive : {}) }}>{b}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: "#9ca3af", textAlign: "center", marginTop: 30 }}>Loading events…</div>
      ) : err ? (
        <div style={{ color: "#dc2626", textAlign: "center", marginTop: 30 }}>{err}<div><button style={retryBtn} onClick={load}>Retry</button></div></div>
      ) : (
        <>
          {grouped.map((g) => (
            <div key={g.month} style={{ marginTop: 8 }}>
              <div style={monthHead}>{g.month}</div>
              <div style={grid}>
                {g.items.map((e) => {
                  const m = META(e.category);
                  return (
                    <div key={e.id} className="ev-card" style={card}>
                      <div style={{
                        ...cardHead,
                        background: e.image
                          ? `linear-gradient(rgba(0,0,0,.30),rgba(0,0,0,.45)), url("${e.image}") center/cover no-repeat`
                          : `linear-gradient(135deg, ${m.color}, ${m.color}cc)`
                      }}>
                        <span style={monthTag}>{fmtDate(e.event_date) || g.month}</span>
                      </div>
                      <div style={{ padding: 16 }}>
                        <div style={{ fontWeight: 700, color: "#111827", marginBottom: 6, minHeight: 42 }}>{e.name}</div>
                        {timeRange(e) && <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{timeRange(e)}</div>}
                        {e.venue && <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>{e.venue}</div>}
                        {e.description && <div style={{ fontSize: 12.5, color: "#4b5563", marginBottom: 8, lineHeight: 1.45 }}>{e.description}</div>}
                        {e.category && <span style={{ ...catChip, background: m.color + "1a", color: m.color }}>{e.category}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {grouped.length === 0 && <div style={{ color: "#9ca3af", textAlign: "center", marginTop: 30 }}>No events found.</div>}
        </>
      )}
    </>
  );
}

/* ================= STYLES ================= */
const hero = { position: "relative", overflow: "hidden", background: "linear-gradient(135deg,#1d4ed8,#2563eb)", color: "#fff", borderRadius: 18, padding: "26px 24px", marginBottom: 18 };
const heroGlow = { position: "absolute", right: -40, top: -40, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.12)" };

const searchBox = { display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #e6ecf5", borderRadius: 12, padding: "12px 14px" };
const searchInput = { border: "none", outline: "none", background: "transparent", width: "100%", fontSize: 14 };

const chips = { display: "flex", flexWrap: "wrap", gap: 8, margin: "16px 0 6px" };
const chip = { background: "#fff", border: "1px solid #e6ecf5", color: "#374151", borderRadius: 999, padding: "8px 16px", fontSize: 14, cursor: "pointer", fontWeight: 500 };
const chipActive = { background: "#2563eb", color: "#fff", borderColor: "#2563eb", fontWeight: 700 };
const retryBtn = { marginTop: 10, background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 13 };

const monthHead = { fontSize: 18, fontWeight: 700, color: "#2563eb", margin: "22px 0 14px" };
const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 };
const card = { background: "#fff", borderRadius: 16, border: "1px solid #eef2f8", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", overflow: "hidden" };
const cardHead = { height: 96, padding: 14, display: "flex", justifyContent: "space-between", alignItems: "flex-start", color: "#fff" };
const monthTag = { background: "rgba(255,255,255,0.25)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999 };
const catChip = { display: "inline-block", padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600 };
