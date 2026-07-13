import { useState, useEffect } from "react";
import { TOURIST_SPOTS, HERITAGE_SITES } from "../data/tcimsData";
import { apiFeedbackCreate, apiFeedbackMine, apiVisitsMine, apiVisitToggle } from "../api/api";
import { verifyAtLocation, CHECKIN_RADIUS_M } from "../utils/geo";
import { computePoints, tierFor } from "../utils/gamification";
import { toast } from "../utils/toast";

/* ---- image filename from a place name: "San Felipe Neri Church" -> "san-felipe-neri-church" ---- */
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const imgFor = (name) => `/places/${slug(name)}.jpg`;

/* ---- merge spots + heritage, dedupe by normalized name ---- */
const normalize = (s) => s.toLowerCase().replace(/\bparish\b/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const PLACES = (() => {
  const raw = [
    ...HERITAGE_SITES.map(h => ({ name: h.name, category: h.category, location: h.location, description: h.description, coordinates: h.coordinates, est: h.est })),
    ...TOURIST_SPOTS.map(s => ({ name: s.name, category: s.type, location: `${s.brgy}, ${s.city}`, description: `A popular ${s.type.toLowerCase()} destination in ${s.city}.`, coordinates: "14.5794, 121.0359", est: "—" }))
  ];
  const seen = new Set(); const out = [];
  for (const p of raw) { const k = normalize(p.name); if (seen.has(k)) continue; seen.add(k); out.push(p); }
  return out;
})();

/* ---- category buckets + colors ---- */
const bucketOf = (c) => {
  if (/church|abbey|chapel|shrine|parish/i.test(c)) return "Churches";
  if (/landmark|monument|structure|history|cultural/i.test(c)) return "Landmarks";
  if (/institution|health|bank|correctional/i.test(c)) return "Institutions";
  if (/school|university|college/i.test(c)) return "Schools";
  if (/park|special|recreation|sports/i.test(c)) return "Parks & Rec";
  if (/shopping|mall/i.test(c)) return "Shopping";
  return "Others";
};
const GRAD = {
  "Churches": "linear-gradient(135deg,#1e3a8a,#3b82f6)",
  "Landmarks": "linear-gradient(135deg,#7c2d12,#d97706)",
  "Institutions": "linear-gradient(135deg,#334155,#64748b)",
  "Schools": "linear-gradient(135deg,#0e7490,#06b6d4)",
  "Parks & Rec": "linear-gradient(135deg,#166534,#22c55e)",
  "Shopping": "linear-gradient(135deg,#7e22ce,#a855f7)",
  "Others": "linear-gradient(135deg,#475569,#94a3b8)"
};
const BUCKETS = ["All", ...Array.from(new Set(PLACES.map(p => bucketOf(p.category))))];

export default function TouristExplore() {
  const [search, setSearch] = useState("");
  const [bucket, setBucket] = useState("All");
  const [visited, setVisited] = useState([]);
  const [detail, setDetail] = useState(null);
  const [fb, setFb] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fbAll, setFbAll] = useState([]);

  // load the tourist's own submitted feedback from the DB
  const loadFeedback = () => {
    apiFeedbackMine().then(d => setFbAll(Array.isArray(d) ? d : [])).catch(() => setFbAll([]));
  };
  const loadVisited = () => {
    apiVisitsMine().then(d => setVisited(Array.isArray(d) ? d : [])).catch(() => setVisited([]));
  };
  useEffect(() => { loadFeedback(); loadVisited(); }, []);

  const isVisited = (name) => visited.includes(name);

  const ratingFor = (name) => {
    const list = fbAll.filter(f => f.place === name);
    if (!list.length) return null;
    return { avg: (list.reduce((a, b) => a + Number(b.rating), 0) / list.length).toFixed(1), count: list.length };
  };

  const filtered = PLACES.filter(p => {
    const s = [p.name, p.category, p.location].join(" ").toLowerCase().includes(search.toLowerCase());
    const b = bucket === "All" || bucketOf(p.category) === bucket;
    return s && b;
  });

  const visitedCount = visited.filter(v => PLACES.some(p => p.name === v)).length;
  const [checkingIn, setCheckingIn] = useState("");

  // gamification: points + tier from total check-ins & reviews
  const points = computePoints({ checkins: visited.length, reviews: fbAll.length });
  const tier = tierFor(visited.length);

  const checkIn = async (name) => {
    // toggling OFF (un-visit) needs no location check
    if (isVisited(name)) {
      try { await apiVisitToggle(name); loadVisited(); }
      catch (e) { toast.error(e.message || "Failed."); }
      return;
    }
    // checking IN: verify the user is physically at the place, then trivia challenge
    const place = PLACES.find(p => p.name === name);
    setCheckingIn(name);
    try {
      const res = await verifyAtLocation(place?.coordinates, CHECKIN_RADIUS_M);
      if (!res.ok) {
        toast.error(`You're too far from "${name}" — about ${res.distance} m away. You need to be within ${CHECKIN_RADIUS_M} m to check in.`);
        return;
      }
      await apiVisitToggle(name);
      loadVisited();
      toast.success(`Checked in at "${name}"! +10 points${res.distance != null ? ` (${res.distance} m away)` : ""}`);
    } catch (e) {
      toast.error(e.message || "Could not verify your location.");
    } finally {
      setCheckingIn("");
    }
  };
  const openFb = (place) => { setFb(place); setRating(5); setComment(""); setDetail(null); };
  const submitFeedback = async () => {
    setSubmitting(true);
    try {
      const res = await apiFeedbackCreate({ place: fb.name, rating, comment });
      setFb(null);
      loadFeedback();
      toast.success(`Thank you for your feedback! Detected sentiment: ${res?.sentiment || "Neutral"}`);
    } catch (e) {
      toast.error(e.message || "Failed to submit feedback.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* HERO */}
      <div style={hero}>
        <div style={heroGlow} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 27, fontWeight: 800, letterSpacing: "-0.4px" }}>Explore Mandaluyong</div>
          <div style={{ opacity: 0.9, marginTop: 6, fontSize: 14.5 }}>Discover {PLACES.length} tourist spots & heritage sites. Check in when you visit.</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div style={heroStat}><b style={{ fontSize: 15 }}>{tier.current.name}</b> · <b>{points}</b> pts</div>
            <div style={heroStat}><b>{visitedCount}</b> of {PLACES.length} places visited</div>
          </div>
          <div style={heroProgress}>
            <div style={{ ...heroProgressFill, width: `${PLACES.length ? (visitedCount / PLACES.length) * 100 : 0}%` }} />
          </div>
        </div>
      </div>

      {/* SEARCH */}
      <div style={searchBox}>
        <input style={searchInput} placeholder="Search places..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* CATEGORY CHIPS */}
      <div style={chips}>
        {BUCKETS.map(b => (
          <button key={b} onClick={() => setBucket(b)} style={{ ...chip, ...(bucket === b ? chipActive : {}) }}>{b}</button>
        ))}
      </div>

      {/* CARDS */}
      <div style={grid}>
        {filtered.map((p, i) => {
          const b = bucketOf(p.category);
          const isV = isVisited(p.name);
          const r = ratingFor(p.name);
          return (
            <div key={i} style={card} className="card-hover" onClick={() => setDetail(p)}>
              <div style={{ ...cardHead, background: GRAD[b] }}>
                <img src={imgFor(p.name)} alt="" style={headImg} onError={(e) => { e.currentTarget.style.display = "none"; }} />
                <div style={headScrim} />
                {p.est && p.est !== "—" && <span style={{ ...estBadge, zIndex: 2 }}>Est. {p.est}</span>}
                {isV && <span style={{ ...visitedBadge, zIndex: 2 }}>✓ Visited</span>}
                <div style={{ ...cardHeadTitle, zIndex: 2 }}>{p.name}</div>
              </div>
              <div style={{ padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "#2563eb", fontWeight: 600 }}>{p.category}</span>
                  {r && <span style={{ fontSize: 13, color: "#b45309", fontWeight: 600 }}>★ {r.avg} ({r.count})</span>}
                </div>
                <div style={{ fontSize: 13, color: "#6b7280", margin: "6px 0 12px" }}>{p.location}</div>
                <div style={{ display: "flex", gap: 8 }} onClick={(e) => e.stopPropagation()}>
                  <button style={isV ? checkedBtn : checkBtn} onClick={() => checkIn(p.name)} disabled={checkingIn === p.name}>{checkingIn === p.name ? "Locating…" : isV ? "Visited" : "Check in"}</button>
                  <button style={fbBtn} onClick={() => openFb(p)}>Feedback</button>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div style={{ color: "#9ca3af", textAlign: "center", gridColumn: "1/-1" }}>No places found.</div>}
      </div>

      {/* DETAIL MODAL */}
      {detail && (
        <div style={overlay} onClick={() => setDetail(null)}>
          <div style={detailModal} onClick={(e) => e.stopPropagation()}>
            <div style={{ ...detailHero, background: GRAD[bucketOf(detail.category)] }}>
              <img src={imgFor(detail.name)} alt="" style={headImg} onError={(e) => { e.currentTarget.style.display = "none"; }} />
              <div style={headScrim} />
              <button style={{ ...closeBtn, zIndex: 2 }} onClick={() => setDetail(null)}>✕</button>
              <div style={{ marginTop: "auto", zIndex: 2 }}>
                {detail.est && detail.est !== "—" && <span style={estBadge}>Est. {detail.est}</span>}
                <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>{detail.name}</div>
                <div style={{ opacity: 0.92, fontSize: 14, marginTop: 4 }}>{detail.location}</div>
              </div>
            </div>
            <div style={{ padding: 22 }}>
              <span style={{ ...chip, ...chipActive, cursor: "default" }}>{detail.category}</span>
              {ratingFor(detail.name) && <span style={{ marginLeft: 10, color: "#b45309", fontWeight: 600 }}>★ {ratingFor(detail.name).avg} · {ratingFor(detail.name).count} review(s)</span>}

              <h3 style={secH}>About</h3>
              <p style={secP}>{detail.description}</p>

              {fbAll.filter(f => f.place === detail.name).length > 0 && (
                <>
                  <h3 style={secH}>Recent Reviews</h3>
                  {fbAll.filter(f => f.place === detail.name).slice(0, 3).map(f => (
                    <div key={f.id} style={reviewItem}>
                      <div style={{ color: "#f59e0b" }}>{"★".repeat(f.rating)}</div>
                      {f.comment && <div style={{ fontSize: 14, color: "#374151" }}>{f.comment}</div>}
                      <div style={{ fontSize: 12, color: "#9ca3af" }}>{f.reviewer}{f.created_at ? " · " + new Date(String(f.created_at).replace(" ", "T")).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}</div>
                    </div>
                  ))}
                </>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
                <button style={isVisited(detail.name) ? checkedBtn : checkBtn} onClick={() => checkIn(detail.name)} disabled={checkingIn === detail.name}>
                  {checkingIn === detail.name ? "Locating…" : isVisited(detail.name) ? "Visited" : "Check in"}
                </button>
                <button style={fbBtn} onClick={() => openFb(detail)}>Leave Feedback</button>
                <button style={mapBtn} onClick={() => window.open(`https://www.google.com/maps/search/${encodeURIComponent(detail.name + " Mandaluyong")}`, "_blank")}>View on Map</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FEEDBACK MODAL */}
      {fb && (
        <div style={overlay} onClick={() => setFb(null)}>
          <div style={modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 4px", color: "#111827" }}>Rate {fb.name}</h3>
            <p style={{ margin: "0 0 14px", fontSize: 13, color: "#6b7280" }}>How was your visit?</p>
            <div style={{ fontSize: 30, textAlign: "center", marginBottom: 14, cursor: "pointer" }}>
              {[1, 2, 3, 4, 5].map(n => (
                <span key={n} onClick={() => setRating(n)} style={{ color: "#f59e0b", opacity: n <= rating ? 1 : 0.3 }}>★</span>
              ))}
            </div>
            <textarea style={textarea} placeholder="Share your experience (optional)..." value={comment} onChange={(e) => setComment(e.target.value)} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
              <button style={cancelBtn} onClick={() => setFb(null)} disabled={submitting}>Cancel</button>
              <button style={submitBtn} onClick={submitFeedback} disabled={submitting}>{submitting ? "Submitting…" : "Submit"}</button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}

/* ================= STYLES ================= */
const hero = { position: "relative", background: "linear-gradient(135deg,#1e40af,#2563eb 60%,#3b82f6)", color: "#fff", borderRadius: 20, padding: "28px 26px", marginBottom: 18, overflow: "hidden", boxShadow: "0 10px 30px rgba(37,99,235,0.25)" };
const heroGlow = { position: "absolute", top: -60, right: -40, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle, rgba(250,204,21,0.35), transparent 70%)", zIndex: 0 };
const heroStat = { marginTop: 14, display: "inline-block", background: "rgba(255,255,255,0.16)", border: "1px solid rgba(255,255,255,0.22)", padding: "8px 14px", borderRadius: 999, fontSize: 14, backdropFilter: "blur(4px)" };
const heroProgress = { marginTop: 16, height: 8, width: "100%", maxWidth: 420, background: "rgba(255,255,255,0.22)", borderRadius: 999, overflow: "hidden" };
const heroProgressFill = { height: "100%", background: "linear-gradient(90deg,#facc15,#fde047)", borderRadius: 999, transition: "width .5s ease" };

const searchBox = { display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #e6ecf5", borderRadius: 12, padding: "12px 14px" };
const searchInput = { border: "none", outline: "none", background: "transparent", width: "100%", fontSize: 14 };

const chips = { display: "flex", flexWrap: "wrap", gap: 8, margin: "16px 0 18px" };
const chip = { background: "#fff", border: "1px solid #e6ecf5", color: "#374151", borderRadius: 999, padding: "8px 16px", fontSize: 14, cursor: "pointer", fontWeight: 500 };
const chipActive = { background: "#2563eb", color: "#fff", borderColor: "#2563eb", fontWeight: 700 };

const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 };
const card = { background: "#fff", borderRadius: 16, border: "1px solid #eef2f8", boxShadow: "0 1px 3px rgba(15,23,42,0.04)", overflow: "hidden", cursor: "pointer" };
const cardHead = { height: 96, padding: 14, display: "flex", flexDirection: "column", justifyContent: "space-between", color: "#fff", position: "relative", overflow: "hidden" };
const headImg = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 };
const headScrim = { position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.15), rgba(0,0,0,0.55))", zIndex: 1 };
const cardHeadTitle = { fontSize: 17, fontWeight: 700, textShadow: "0 1px 4px rgba(0,0,0,0.4)" };
const estBadge = { alignSelf: "flex-start", background: "rgba(255,255,255,0.25)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 6 };
const visitedBadge = { position: "absolute", top: 12, right: 12, background: "#16a34a", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 6 };

const checkBtn = { background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" };
const checkedBtn = { background: "#dcfce7", color: "#16a34a", border: "1px solid #bbf7d0", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" };
const fbBtn = { background: "#f1f5f9", color: "#374151", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" };
const mapBtn = { background: "#fef3c7", color: "#b45309", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" };

const overlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 };
const detailModal = { background: "#fff", borderRadius: 18, width: 560, maxWidth: "100%", maxHeight: "92vh", overflowY: "auto", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" };
const detailHero = { minHeight: 150, padding: 18, display: "flex", flexDirection: "column", color: "#fff", position: "relative" };
const closeBtn = { position: "absolute", top: 12, right: 12, background: "rgba(255,255,255,0.25)", color: "#fff", border: "none", borderRadius: 8, width: 30, height: 30, cursor: "pointer", fontSize: 14 };
const secH = { margin: "18px 0 6px", fontSize: 16, color: "#111827" };
const secP = { margin: 0, fontSize: 14, color: "#4b5563", lineHeight: 1.6 };
const reviewItem = { background: "#f8fafc", border: "1px solid #eef2f8", borderRadius: 10, padding: 12, marginBottom: 8 };

const modal = { background: "#fff", borderRadius: 16, padding: 22, width: 360, maxWidth: "100%", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" };
const textarea = { width: "100%", minHeight: 80, padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" };
const cancelBtn = { background: "#f1f5f9", border: "none", borderRadius: 8, padding: "10px 16px", cursor: "pointer", fontSize: 14, color: "#374151" };
const submitBtn = { background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", cursor: "pointer", fontSize: 14, fontWeight: 600 };
