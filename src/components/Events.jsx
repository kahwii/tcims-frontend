import { useState, useEffect, useCallback } from "react";
import { EVENTS_2026 } from "../data/tcimsData";
import { apiList, apiCreate, apiUpdate, apiRemove } from "../api/api";
import { toast } from "../utils/toast";
import Icon from "./Icon";

const STATUS_OPTIONS = ["Upcoming", "Ongoing", "Completed", "Cancelled"];

const CATEGORY_OPTIONS = [...new Set(EVENTS_2026.map(e => e.category))];
const MONTH_ORDER = ["January","February","March/April","May","June","July","August","September","October","November","December"];

const EMPTY_FORM = {
  name: "", event_date: "", start_time: "", end_time: "", venue: "Mandaluyong City",
  description: "", category: CATEGORY_OPTIONS[0], status: "Upcoming"
};

// format "YYYY-MM-DD" -> "Mon D, YYYY"
const fmtDate = (d) => {
  if (!d) return "";
  const dt = new Date(String(d) + "T00:00:00");
  return isNaN(dt) ? d : dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};
// "13:30" or "13:30:00" -> "1:30 PM"
const fmtTime = (t) => {
  if (!t) return "";
  const [h, m] = String(t).split(":");
  const hh = parseInt(h, 10);
  if (isNaN(hh)) return "";
  const ap = hh >= 12 ? "PM" : "AM";
  const h12 = ((hh + 11) % 12) + 1;
  return `${h12}:${m ?? "00"} ${ap}`;
};
// "9:00 AM – 12:00 PM" / "9:00 AM" / ""
const timeRange = (e) => {
  const s = fmtTime(e.start_time), en = fmtTime(e.end_time);
  if (s && en) return `${s} – ${en}`;
  if (s) return `${s} onwards`;
  return en || "";
};
// month name from a date (for calendar grouping); auto-saved to the `month` column
const monthName = (d) => {
  if (!d) return "";
  const dt = new Date(String(d) + "T00:00:00");
  return isNaN(dt) ? "" : dt.toLocaleDateString("en-US", { month: "long" });
};

// DB row -> UI row
const toUi = (r) => ({
  id: r.id,
  name: r.name ?? "",
  event_date: r.event_date || "",
  start_time: r.start_time ? String(r.start_time).slice(0, 5) : "",
  end_time: r.end_time ? String(r.end_time).slice(0, 5) : "",
  month: r.month ?? "",
  venue: r.venue ?? "",
  description: r.description ?? "",
  category: r.category ?? "",
  status: r.status ?? "Upcoming",
});

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [view, setView] = useState("list"); // "list" | "calendar"
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const data = await apiList("events");
      setEvents((Array.isArray(data) ? data : []).map(toUi));
    } catch (e) {
      setErr(e.message || "Failed to load events.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const dispDate = (e) => (e.event_date ? fmtDate(e.event_date) : (e.month || "—"));

  const filtered = events.filter(e =>
    [e.name, e.venue, e.category, e.month, fmtDate(e.event_date)].join(" ").toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setEditingId(null); setForm(EMPTY_FORM); setModalOpen(true); };
  const openEdit = (ev) => {
    setEditingId(ev.id);
    setForm({ name: ev.name, event_date: ev.event_date, start_time: ev.start_time, end_time: ev.end_time, venue: ev.venue, description: ev.description, category: ev.category, status: ev.status });
    setModalOpen(true);
  };

  const saveEvent = async () => {
    if (!form.name.trim()) { toast.error("Please enter an event name."); return; }
    if (!form.event_date) { toast.error("Please pick an event date."); return; }
    if (form.start_time && form.end_time && form.end_time <= form.start_time) {
      toast.error("End time must be after the start time."); return;
    }
    const payload = {
      name: form.name,
      event_date: form.event_date,
      start_time: form.start_time,
      end_time: form.end_time,
      month: monthName(form.event_date),
      venue: form.venue,
      description: form.description,
      status: form.status,
    };
    setSaving(true);
    try {
      if (editingId) await apiUpdate("events", editingId, payload);
      else await apiCreate("events", payload);
      setModalOpen(false);
      await load();
    } catch (e) {
      toast.error(e.message || "Failed to save event.");
    } finally {
      setSaving(false);
    }
  };

  const deleteEvent = async (id) => {
    if (!window.confirm("Delete this event?")) return;
    try {
      await apiRemove("events", id);
      await load();
    } catch (e) {
      toast.error(e.message || "Failed to delete event.");
    }
  };

  const exportCSV = () => {
    const header = "Event Name,Date,Time,Venue,Category,Status\n";
    const rows = events.map(e => `"${e.name}","${dispDate(e)}","${timeRange(e)}","${e.venue}","${e.category}","${e.status}"`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "events_2026.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const statusStyle = (s) => {
    if (s === "Ongoing") return badgeGreen;
    if (s === "Completed") return badgeGray;
    if (s === "Cancelled") return badgeRed;
    return badgeBlue; // Upcoming
  };

  // group for calendar view (by the event's month/year, from the real date)
  const grouped = (() => {
    const map = {};
    filtered.forEach(e => {
      const dt = e.event_date ? new Date(e.event_date + "T00:00:00") : null;
      const valid = dt && !isNaN(dt);
      const key = valid ? dt.toLocaleDateString("en-US", { month: "long", year: "numeric" }) : (e.month || "Unscheduled");
      const ts = valid ? new Date(dt.getFullYear(), dt.getMonth(), 1).getTime() : Number.MAX_SAFE_INTEGER;
      if (!map[key]) map[key] = { month: key, ts, items: [] };
      map[key].items.push(e);
    });
    return Object.values(map).sort((a, b) => a.ts - b.ts);
  })();

  return (
    <>
      {/* BREADCRUMB */}
      <div style={breadcrumb}>
        <span></span><span style={{ opacity: 0.5 }}>›</span>
        <span style={{ fontWeight: 600, color: "#374151" }}>Events</span>
      </div>

      {/* HEADER */}
      <div style={headerRow}>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          <div style={headerIcon}><Icon name="calendar" size={26} /></div>
          <div>
            <h1 style={pageTitle}>Events &amp; Visitor Services</h1>
            <p style={pageSub}>Manage city events, festivals, and cultural activities.</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={secondaryBtn} onClick={() => toast.info("Visitor Inquiry — coming soon")}>Visitor Inquiry</button>
          <button style={addBtn} onClick={openAdd}>+ Add Event</button>
        </div>
      </div>

      {/* VIEW TOGGLE */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <div style={toggleWrap}>
          <button
            style={{ ...toggleItem, ...(view === "list" ? toggleActive : {}) }}
            onClick={() => setView("list")}
          >☰ List</button>
          <button
            style={{ ...toggleItem, ...(view === "calendar" ? toggleActive : {}) }}
            onClick={() => setView("calendar")}
          >Calendar</button>
        </div>
      </div>

      {/* CARD */}
      <div style={card}>
        <div style={cardToolbar}>
          <div style={searchBox}>
            <span style={{ opacity: 0.5 }}></span>
            <input style={searchInput} placeholder="Search events..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button style={exportBtn} onClick={exportCSV}>Export</button>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>Loading events…</div>
        ) : err ? (
          <div style={{ padding: 40, textAlign: "center", color: "#dc2626" }}>
             {err}
            <div><button style={{ ...addBtn, marginTop: 12 }} onClick={load}>Retry</button></div>
          </div>
        ) : view === "list" ? (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>EVENT NAME</th>
                <th style={thStyle}>DATE</th>
                <th style={thStyle}>VENUE</th>
                <th style={{ ...thStyle, textAlign: "center" }}>STATUS</th>
                <th style={{ ...thStyle, textAlign: "center" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ev) => (
                <tr key={ev.id}>
                  <td style={{ ...tdStyle, fontWeight: 600, color: "#111827" }}>{ev.name}</td>
                  <td style={tdStyle}>
                    {dispDate(ev)}
                    {timeRange(ev) && <div style={{ fontSize: 12, color: "#6b7280" }}>{timeRange(ev)}</div>}
                  </td>
                  <td style={tdStyle}>{ev.venue}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    <span style={statusStyle(ev.status)}>{ev.status}</span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    <button style={editBtn} title="Edit" onClick={() => openEdit(ev)}>Edit</button>
                    <button style={delBtn} title="Delete" onClick={() => deleteEvent(ev.id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td style={{ ...tdStyle, textAlign: "center", color: "#9ca3af" }} colSpan={5}>No events found.</td></tr>
              )}
            </tbody>
          </table>
        ) : (
          /* CALENDAR (grouped by month) */
          <div>
            {grouped.map((g) => (
              <div key={g.month} style={{ marginBottom: 22 }}>
                <h3 style={{ margin: "0 0 12px", fontSize: 16, color: "#2563eb" }}> {g.month}</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
                  {g.items.map((ev) => (
                    <div key={ev.id} style={calCard}>
                      <div style={{ fontWeight: 600, color: "#111827", marginBottom: 6 }}>{ev.name}</div>
                      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 2 }}>{dispDate(ev)}{timeRange(ev) ? ` · ${timeRange(ev)}` : ""}</div>
                      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>{ev.venue}</div>
                      <span style={statusStyle(ev.status)}>{ev.status}</span>
                      <span style={{ ...badgeGray, marginLeft: 6 }}>{ev.category}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {grouped.length === 0 && <div style={{ textAlign: "center", color: "#9ca3af", padding: 20 }}>No events found.</div>}
          </div>
        )}
      </div>

      {/* MODAL */}
      {modalOpen && (
        <div style={overlay} onClick={() => setModalOpen(false)}>
          <div style={modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: "0 0 18px", fontSize: 20, color: "#111827" }}>
              {editingId ? "Edit Event" : "Add Event"}
            </h2>

            <label style={fieldLabel}>Event Name</label>
            <input style={fieldInput} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />

            <label style={fieldLabel}>Event Date</label>
            <input type="date" style={fieldInput} value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />

            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={fieldLabel}>Start Time</label>
                <input type="time" style={fieldInput} value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={fieldLabel}>End Time (optional)</label>
                <input type="time" style={fieldInput} value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
              </div>
            </div>

            <label style={fieldLabel}>Venue</label>
            <input style={fieldInput} value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />

            <label style={fieldLabel}>Description (optional)</label>
            <textarea style={{ ...fieldInput, minHeight: 70, resize: "vertical" }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short details about the event…" />

            <label style={fieldLabel}>Status</label>
            <select style={fieldInput} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
              <button style={cancelBtn} onClick={() => setModalOpen(false)} disabled={saving}>Cancel</button>
              <button style={saveBtn} onClick={saveEvent} disabled={saving}>{saving ? "Saving…" : editingId ? "Save Changes" : "Add Event"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ================= STYLES ================= */
const breadcrumb = { display: "flex", alignItems: "center", gap: "8px", color: "#6b7280", fontSize: "14px", marginBottom: "16px" };
const headerRow = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "12px" };
const headerIcon = { width: "52px", height: "52px", borderRadius: "12px", background: "#2563eb", color: "#fff", fontSize: "24px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
const pageTitle = { margin: 0, fontSize: "26px", color: "#111827" };
const pageSub = { margin: "4px 0 0", color: "#6b7280", fontSize: "15px" };
const addBtn = { background: "#2563eb", color: "#fff", border: "none", borderRadius: "10px", padding: "12px 20px", fontSize: "15px", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" };
const secondaryBtn = { background: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: "10px", padding: "12px 18px", fontSize: "15px", cursor: "pointer", whiteSpace: "nowrap" };

const toggleWrap = { display: "inline-flex", background: "#fff", border: "1px solid #e6ecf5", borderRadius: "10px", padding: "4px", gap: "4px" };
const toggleItem = { border: "none", background: "transparent", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "14px", color: "#374151" };
const toggleActive = { background: "#eff6ff", color: "#2563eb", fontWeight: 600 };

const card = { background: "#fff", padding: "20px", borderRadius: "16px", border: "1px solid #eef2f8", boxShadow: "0 4px 12px rgba(0,0,0,0.04)" };
const cardToolbar = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", gap: "16px" };
const searchBox = { flex: 1, maxWidth: 420, display: "flex", alignItems: "center", gap: "8px", background: "#f8fafc", border: "1px solid #e6ecf5", borderRadius: "10px", padding: "10px 14px" };
const searchInput = { border: "none", outline: "none", background: "transparent", width: "100%", fontSize: "14px", color: "#374151" };
const exportBtn = { background: "#f1f5f9", border: "1px solid #e6ecf5", borderRadius: "10px", padding: "10px 16px", fontSize: "14px", cursor: "pointer", color: "#374151" };

const tableStyle = { width: "100%", borderCollapse: "collapse" };
const thStyle = { padding: "12px 14px", textAlign: "left", fontSize: "12px", letterSpacing: "0.5px", color: "#9ca3af", borderBottom: "1px solid #eef2f8" };
const tdStyle = { padding: "16px 14px", borderBottom: "1px solid #f1f5f9", fontSize: "14px", color: "#374151" };

const badgeBase = { padding: "4px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: 600, display: "inline-block" };
const badgeBlue = { ...badgeBase, background: "#dbeafe", color: "#2563eb" };
const badgeGreen = { ...badgeBase, background: "#dcfce7", color: "#16a34a" };
const badgeGray = { ...badgeBase, background: "#f1f5f9", color: "#6b7280" };
const badgeRed = { ...badgeBase, background: "#fee2e2", color: "#dc2626" };
const iconAction = { background: "none", border: "none", cursor: "pointer", fontSize: "16px", margin: "0 4px" };
const editBtn = { background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: 6, padding: "5px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer", margin: "0 3px" };
const delBtn = { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 6, padding: "5px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer", margin: "0 3px" };

const calCard = { border: "1px solid #eef2f8", borderRadius: "12px", padding: "16px", background: "#fafbff" };

const overlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 };
const modal = { background: "#fff", borderRadius: "16px", padding: "26px", width: "460px", maxWidth: "90%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 50px rgba(0,0,0,0.25)" };
const fieldLabel = { display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", margin: "12px 0 6px" };
const fieldInput = { width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "14px", boxSizing: "border-box" };
const cancelBtn = { background: "#f1f5f9", border: "none", borderRadius: "8px", padding: "10px 18px", cursor: "pointer", fontSize: "14px", color: "#374151" };
const saveBtn = { background: "#2563eb", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 18px", cursor: "pointer", fontSize: "14px", fontWeight: 600 };
