import { useState, useEffect, useCallback } from "react";
import { HERITAGE_SITES } from "../data/tcimsData";
import { apiVisitsMine, apiVisitToggle, apiFeedbackMine, apiCheckinWithPhotos, apiRewardMine, apiRewardClaim } from "../api/api";
import { verifyAtLocation, CHECKIN_RADIUS_M } from "../utils/geo";
import { computePoints, tierFor } from "../utils/gamification";
import CheckInPhotos from "./CheckInPhotos";
import { toast } from "../utils/toast";

// Trail = Heritage Sites/Structures + Historical Landmarks/Monuments
const TRAIL_CATEGORIES = ["Church", "Abbey", "Heritage Structure", "Historical Landmark"];
const TRAIL = HERITAGE_SITES
  .filter(h => TRAIL_CATEGORIES.includes(h.category))
  .map(h => ({ name: h.name, category: h.category, hint: h.location, coordinates: h.coordinates }));

const CAT = {
  "Church": { color: "#2563eb", icon: "" },
  "Abbey": { color: "#2563eb", icon: "" },
  "Heritage Structure": { color: "#64748b", icon: "" },
  "Historical Landmark": { color: "#f59e0b", icon: "" }
};

export default function TouristTrail() {
  const [visited, setVisited] = useState([]);
  const [reviewsCount, setReviewsCount] = useState(0);
  const [busy, setBusy] = useState("");
  const [photoFor, setPhotoFor] = useState(null); // place awaiting photo proof
  const [photoCoords, setPhotoCoords] = useState(null); // verified GPS coords for the stamp
  const [reward, setReward] = useState(null);
  const [claiming, setClaiming] = useState(false);

  const load = useCallback(() => {
    apiVisitsMine().then(d => setVisited(Array.isArray(d) ? d : [])).catch(() => setVisited([]));
    apiFeedbackMine().then(d => setReviewsCount(Array.isArray(d) ? d.length : 0)).catch(() => {});
    apiRewardMine().then(d => setReward(d || null)).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  const isVisited = (name) => visited.includes(name);
  const done = TRAIL.filter(t => visited.includes(t.name)).length;
  const pct = TRAIL.length ? Math.round((done / TRAIL.length) * 100) : 0;
  const completed = done === TRAIL.length && TRAIL.length > 0;

  // gamification: points + tier from total check-ins & reviews
  const points = computePoints({ checkins: visited.length, reviews: reviewsCount });
  const tier = tierFor(visited.length);

  const check = async (name) => {
    // un-visit needs no location check or trivia
    if (isVisited(name)) {
      setBusy(name);
      try { await apiVisitToggle(name); load(); }
      catch (e) { toast.error(e.message || "Failed."); }
      finally { setBusy(""); }
      return;
    }
    // checking in: must be physically at the site, then pass the trivia challenge
    const stop = TRAIL.find(t => t.name === name);
    setBusy(name);
    try {
      const res = await verifyAtLocation(stop?.coordinates, CHECKIN_RADIUS_M);
      if (!res.ok) {
        toast.error(`You're too far from "${name}" — about ${res.distance} m away. You need to be within ${CHECKIN_RADIUS_M} m to check in.`);
        return;
      }
      setPhotoCoords({ lat: res.lat, lon: res.lon });
      setPhotoFor(name); // open photo-proof; check-in completes after live camera capture
    } catch (e) {
      toast.error(e.message || "Could not verify your location.");
    } finally {
      setBusy("");
    }
  };

  const submitPhotos = async (selfie, site) => {
    const name = photoFor;
    await apiCheckinWithPhotos(name, selfie, site); // throws on error -> shown in modal
    setPhotoFor(null);
    load();
    toast.success(`Checked in at "${name}"! +10 points`);
  };

  const claimReward = async () => {
    setClaiming(true);
    try {
      const r = await apiRewardClaim();
      setReward(r);
      toast.success("Congratulations! You've claimed your Heritage Mug. Present the code at the CCAT office.");
    } catch (e) {
      toast.error(e.message || "Trail not yet complete.");
    } finally {
      setClaiming(false);
    }
  };

  // index of the next unvisited stop (to highlight)
  const nextIdx = TRAIL.findIndex(t => !isVisited(t.name));

  const R = 34, C = 2 * Math.PI * R;

  return (
    <>
      <style>{`
        .trail-card { transition: transform .15s ease, box-shadow .15s ease; }
        .trail-card:hover { transform: translateY(-3px); box-shadow: 0 10px 22px rgba(0,0,0,0.10); }
        .trail-next { animation: pulse 1.6s ease-in-out infinite; }
        @keyframes pulse { 0%,100%{ box-shadow:0 0 0 0 rgba(37,99,235,.45);} 50%{ box-shadow:0 0 0 8px rgba(37,99,235,0);} }
      `}</style>

      {/* HERO with progress ring */}
      <div style={hero}>
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 26, fontWeight: 800 }}>Heritage Trail</div>
          <div style={{ opacity: 0.92, marginTop: 6, maxWidth: 460 }}>
            Visit all {TRAIL.length} heritage sites & historical landmarks to earn your Digital Tourist Badge!
          </div>
          <div style={heroStat}>
            {completed ? "Badge unlocked — congratulations!" : `${TRAIL.length - done} more site(s) to unlock your badge`}
          </div>
        </div>
        <svg width="96" height="96" style={{ flexShrink: 0, position: "relative", zIndex: 1 }}>
          <circle cx="48" cy="48" r={R} stroke="rgba(255,255,255,0.25)" strokeWidth="9" fill="none" />
          <circle cx="48" cy="48" r={R} stroke="#fff" strokeWidth="9" fill="none"
            strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)} strokeLinecap="round"
            transform="rotate(-90 48 48)" style={{ transition: "stroke-dashoffset .4s ease" }} />
          <text x="48" y="44" textAnchor="middle" fill="#fff" fontSize="18" fontWeight="800">{done}/{TRAIL.length}</text>
          <text x="48" y="62" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="11">visited</text>
        </svg>
        <div style={heroGlow} />
      </div>

      {/* BADGE */}
      <div style={{ ...badgeCard, ...(completed ? badgeDone : {}) }}>
        <div style={{ fontSize: 46, fontWeight: 800, color: completed ? "#f59e0b" : "#9ca3af" }}>{completed ? "★" : "○"}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 17, color: completed ? "#92400e" : "#374151" }}>
            {completed ? "Digital Tourist Badge Unlocked!" : "Digital Tourist Badge"}
          </div>
          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
            {completed ? "You completed the Mandaluyong Heritage Trail." : `Progress: ${pct}% complete`}
          </div>
        </div>
        {completed && <span style={completeTag}>COMPLETED</span>}
      </div>

      {/* PHYSICAL REWARD — Heritage Mug (on 100% completion) */}
      {completed && (
        <div style={mugCard}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 17, color: "#7c2d12" }}>Free Mandaluyong Heritage Mug!</div>
            {reward ? (
              <>
                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
                  Present this code at the <b>CCAT office</b> to claim your mug:
                </div>
                <div style={mugCode}>{reward.code}</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  Status: <b style={{ color: reward.status === "Claimed" ? "#16a34a" : "#b45309" }}>{reward.status}</b>
                </div>
              </>
            ) : (
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
                You completed the entire trail — claim your reward now!
              </div>
            )}
          </div>
          {!reward && (
            <button style={claimBtn} onClick={claimReward} disabled={claiming}>
              {claiming ? "Claiming…" : "Claim Mug"}
            </button>
          )}
        </div>
      )}

      {/* REWARDS / POINTS + TIER */}
      <div style={rewardsCard}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ ...tierIcon, background: tier.current.color + "22", color: tier.current.color }}>{tier.current.icon}</div>
          <div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>Your Tier</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>{tier.current.name}</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 13, color: "#6b7280" }}>Points</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#2563eb" }}>{points}</div>
        </div>
        <div style={{ flexBasis: "100%", marginTop: 4 }}>
          {tier.next ? (
            <>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 5 }}>
                {tier.toNext} more check-in(s) to reach <b>{tier.next.icon} {tier.next.name}</b>
              </div>
              <div style={rewTrack}><div style={{ ...rewFill, width: `${tier.progress}%` }} /></div>
            </>
          ) : (
            <div style={{ fontSize: 12, color: "#f59e0b", fontWeight: 700 }}>Highest tier reached — legend!</div>
          )}
        </div>
      </div>

      {/* TIMELINE */}
      <h2 style={timelineHead}>Your Heritage Journey</h2>
      <div>
        {TRAIL.map((t, i) => {
          const v = isVisited(t.name);
          const meta = CAT[t.category] || { color: "#2563eb", icon: "" };
          const isNext = i === nextIdx;
          const last = i === TRAIL.length - 1;
          return (
            <div key={i} style={tlRow}>
              {/* rail */}
              <div style={railCol}>
                {!last && <div style={{ ...railLine, background: v ? "#22c55e" : "#e6ecf5" }} />}
                <div className={isNext ? "trail-next" : ""}
                  style={{ ...node, background: v ? "#16a34a" : "#fff", borderColor: v ? "#16a34a" : meta.color, color: v ? "#fff" : meta.color }}>
                  {v ? "✓" : i + 1}
                </div>
              </div>
              {/* card */}
              <div className="trail-card" style={{ ...tlCard, ...(v ? tlCardDone : {}), ...(isNext ? tlCardNext : {}) }}>
                <div style={{ ...iconBox, background: meta.color + "1a" }}>{meta.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, color: "#111827" }}>{t.name}</span>
                    {isNext && <span style={nextTag}>Next stop</span>}
                  </div>
                  <span style={{ ...catChip, background: meta.color + "1a", color: meta.color }}>{t.category}</span>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>{t.hint}</div>
                </div>
                <button style={v ? checkedBtn : checkBtn} onClick={() => check(t.name)} disabled={busy === t.name}>
                  {busy === t.name ? "Locating…" : v ? "Visited" : "Check in"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {completed && (
        <div style={celebrate}>Congratulations! You’ve finished the full Heritage Trail. Thank you for discovering Mandaluyong.</div>
      )}

      {photoFor && (
        <CheckInPhotos place={photoFor} coords={photoCoords} onSubmit={submitPhotos} onClose={() => setPhotoFor(null)} />
      )}
    </>
  );
}

/* ================= STYLES ================= */
const hero = { position: "relative", overflow: "hidden", background: "linear-gradient(135deg,#1d4ed8,#2563eb)", color: "#fff", borderRadius: 18, padding: "24px 26px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap" };
const heroGlow = { position: "absolute", right: -40, top: -40, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.10)" };
const heroStat = { marginTop: 14, display: "inline-block", background: "rgba(255,255,255,0.18)", padding: "8px 14px", borderRadius: 999, fontSize: 14 };

const badgeCard = { display: "flex", alignItems: "center", gap: 16, background: "#fff", border: "1px solid #eef2f8", borderRadius: 16, padding: 18, marginBottom: 22, boxShadow: "0 2px 10px rgba(0,0,0,0.04)" };
const badgeDone = { background: "linear-gradient(135deg,#fffbeb,#fef3c7)", border: "1px solid #fde68a" };
const completeTag = { background: "#f59e0b", color: "#fff", fontSize: 11, fontWeight: 800, padding: "5px 12px", borderRadius: 999, letterSpacing: 0.5 };

const mugCard = { display: "flex", alignItems: "center", gap: 16, background: "linear-gradient(135deg,#fff7ed,#ffedd5)", border: "1px solid #fdba74", borderRadius: 16, padding: 18, marginBottom: 22, boxShadow: "0 2px 10px rgba(0,0,0,0.04)" };
const mugCode = { display: "inline-block", marginTop: 6, background: "#7c2d12", color: "#fff", fontWeight: 800, letterSpacing: 1, fontSize: 18, padding: "6px 14px", borderRadius: 8, fontFamily: "monospace" };
const claimBtn = { background: "#ea580c", color: "#fff", border: "none", borderRadius: 10, padding: "12px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" };

const rewardsCard = { display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, background: "#fff", border: "1px solid #eef2f8", borderRadius: 16, padding: 18, marginBottom: 22, boxShadow: "0 2px 10px rgba(0,0,0,0.04)" };
const tierIcon = { width: 52, height: 52, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 };
const rewTrack = { width: "100%", height: 9, background: "#eef2f8", borderRadius: 6, overflow: "hidden" };
const rewFill = { height: "100%", background: "linear-gradient(90deg,#2563eb,#7c3aed)", borderRadius: 6, transition: "width .4s ease" };

const timelineHead = { fontSize: 18, color: "#111827", margin: "0 0 14px" };
const tlRow = { display: "flex", gap: 16, alignItems: "stretch" };
const railCol = { width: 36, position: "relative", display: "flex", justifyContent: "center", flexShrink: 0 };
const railLine = { position: "absolute", top: 28, bottom: -14, left: "50%", transform: "translateX(-50%)", width: 3, borderRadius: 2 };
const node = { position: "relative", zIndex: 1, width: 34, height: 34, borderRadius: "50%", border: "2px solid", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, marginTop: 12, background: "#fff" };
const tlCard = { flex: 1, display: "flex", alignItems: "center", gap: 14, background: "#fff", border: "1px solid #eef2f8", borderRadius: 14, padding: 16, marginBottom: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" };
const tlCardDone = { background: "#f0fdf4", border: "1px solid #bbf7d0" };
const tlCardNext = { border: "2px solid #2563eb", boxShadow: "0 6px 16px rgba(37,99,235,0.12)" };
const iconBox = { width: 46, height: 46, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 };
const nextTag = { background: "#2563eb", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999 };
const catChip = { display: "inline-block", marginTop: 5, padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600 };
const checkBtn = { background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: 8, padding: "9px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" };
const checkedBtn = { background: "#dcfce7", color: "#16a34a", border: "1px solid #bbf7d0", borderRadius: 8, padding: "9px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" };
const celebrate = { marginTop: 18, background: "linear-gradient(135deg,#fffbeb,#fef3c7)", border: "1px solid #fde68a", borderRadius: 14, padding: 18, textAlign: "center", fontWeight: 600, color: "#92400e" };
