import { useState, useEffect } from "react";
import { apiList, apiCreate, apiUpdate, apiRemove } from "../api/api";
import { toast } from "../utils/toast";
import Icon from "./Icon";

const TABLE = "tourist_spots";

const CATEGORY_OPTIONS = [
  "Historical/Cultural", "Church", "Park", "Mall", "Sports & Recreation", "Museum", "Special Events", "Others"
];

const EMPTY_FORM = { name: "", category: CATEGORY_OPTIONS[0], address: "", status: "Active" };

export default function TouristSpots() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = async () => {
    setLoading(true); setErr("");
    try {
      const data = await apiList(TABLE);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr("Failed to load from server. Make sure XAMPP (Apache + MySQL) is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = rows.filter(s =>
    [s.name, s.category, s.address].join(" ").toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setEditingId(null); setForm(EMPTY_FORM); setModalOpen(true); };
  const openEdit = (s) => {
    setEditingId(s.id);
    setForm({ name: s.name, category: s.category || "", address: s.address || "", status: s.status || "Active" });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error("Please enter a name."); return; }
    setSaving(true);
    try {
      if (editingId) await apiUpdate(TABLE, editingId, form);
      else await apiCreate(TABLE, form);
      setModalOpen(false);
      await load();
    } catch (e) {
      toast.error("Save failed: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this tourist spot?")) return;
    try { await apiRemove(TABLE, id); await load(); }
    catch (e) { toast.error("Delete failed: " + e.message); }
  };

  return (
    <>
      <div style={breadcrumb}>
        <span></span><span style={{ opacity: 0.5 }}>›</span>
        <span>Tourism</span><span style={{ opacity: 0.5 }}>›</span>
        <span style={{ fontWeight: 600, color: "#374151" }}>Spots</span>
      </div>

      <div style={headerRow}>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          <div style={headerIcon}><Icon name="pin" size={26} /></div>
          <div>
            <h1 style={pageTitle}>Tourist Spots</h1>
            <p style={pageSub}>Manage tourist destinations, parks, and landmarks.</p>
          </div>
        </div>
        <button style={addBtn} onClick={openAdd}>+ Add New</button>
      </div>

      <div style={card}>
        <div style={cardToolbar}>
          <div style={searchBox}>
            <span style={{ opacity: 0.5 }}></span>
            <input style={searchInput} placeholder="Search tourist spots..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button style={exportBtn} onClick={() => exportCSV(rows)}>Export</button>
        </div>

        {err && <div style={errBox}>{err} <button style={retryBtn} onClick={load}>Retry</button></div>}

        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>NAME</th>
              <th style={thStyle}>CATEGORY</th>
              <th style={thStyle}>ADDRESS</th>
              <th style={{ ...thStyle, textAlign: "center" }}>STATUS</th>
              <th style={{ ...thStyle, textAlign: "center" }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td style={{ ...tdStyle, textAlign: "center", color: "#9ca3af" }} colSpan={5}>Loading…</td></tr>
            ) : filtered.map((s) => (
              <tr key={s.id}>
                <td style={{ ...tdStyle, fontWeight: 600, color: "#111827" }}>{s.name}</td>
                <td style={tdStyle}>{s.category}</td>
                <td style={tdStyle}>{s.address}</td>
                <td style={{ ...tdStyle, textAlign: "center" }}>
                  <span style={s.status === "Active" ? badgeActive : badgeInactive}>{s.status}</span>
                </td>
                <td style={{ ...tdStyle, textAlign: "center" }}>
                  <button style={editBtn} title="Edit" onClick={() => openEdit(s)}>Edit</button>
                  <button style={delBtn} title="Delete" onClick={() => remove(s.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr><td style={{ ...tdStyle, textAlign: "center", color: "#9ca3af" }} colSpan={5}>No tourist spots found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div style={overlay} onClick={() => setModalOpen(false)}>
          <div style={modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: "0 0 18px", fontSize: 20, color: "#111827" }}>
              {editingId ? "Edit Tourist Spot" : "Add Tourist Spot"}
            </h2>

            <label style={fieldLabel}>Name</label>
            <input style={fieldInput} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />

            <label style={fieldLabel}>Category</label>
            <select style={fieldInput} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <label style={fieldLabel}>Address</label>
            <input style={fieldInput} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />

            <label style={fieldLabel}>Status</label>
            <select style={fieldInput} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
              <button style={cancelBtn} onClick={() => setModalOpen(false)}>Cancel</button>
              <button style={saveBtn} onClick={save} disabled={saving}>
                {saving ? "Saving…" : (editingId ? "Save Changes" : "Add Spot")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function exportCSV(rows) {
  const header = "Name,Category,Address,Status\n";
  const body = rows.map(r => `"${r.name}","${r.category || ""}","${r.address || ""}","${r.status || ""}"`).join("\n");
  const blob = new Blob([header + body], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "tourist_spots.csv"; a.click();
  URL.revokeObjectURL(url);
}

/* ================= STYLES ================= */
const breadcrumb = { display: "flex", alignItems: "center", gap: "8px", color: "#6b7280", fontSize: "14px", marginBottom: "16px" };
const headerRow = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" };
const headerIcon = { width: "52px", height: "52px", borderRadius: "12px", background: "#2563eb", color: "#fff", fontSize: "24px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
const pageTitle = { margin: 0, fontSize: "26px", color: "#111827" };
const pageSub = { margin: "4px 0 0", color: "#6b7280", fontSize: "15px" };
const addBtn = { background: "#2563eb", color: "#fff", border: "none", borderRadius: "10px", padding: "12px 20px", fontSize: "15px", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" };

const card = { background: "#fff", padding: "20px", borderRadius: "16px", border: "1px solid #eef2f8", boxShadow: "0 4px 12px rgba(0,0,0,0.04)" };
const cardToolbar = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", gap: "16px" };
const searchBox = { flex: 1, maxWidth: 420, display: "flex", alignItems: "center", gap: "8px", background: "#f8fafc", border: "1px solid #e6ecf5", borderRadius: "10px", padding: "10px 14px" };
const searchInput = { border: "none", outline: "none", background: "transparent", width: "100%", fontSize: "14px", color: "#374151" };
const exportBtn = { background: "#f1f5f9", border: "1px solid #e6ecf5", borderRadius: "10px", padding: "10px 16px", fontSize: "14px", cursor: "pointer", color: "#374151" };
const errBox = { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", fontSize: 14, marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" };
const retryBtn = { background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13 };

const tableStyle = { width: "100%", borderCollapse: "collapse" };
const thStyle = { padding: "12px 14px", textAlign: "left", fontSize: "12px", letterSpacing: "0.5px", color: "#9ca3af", borderBottom: "1px solid #eef2f8" };
const tdStyle = { padding: "16px 14px", borderBottom: "1px solid #f1f5f9", fontSize: "14px", color: "#374151" };
const badgeActive = { background: "#dcfce7", color: "#16a34a", padding: "4px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: 600 };
const badgeInactive = { background: "#fee2e2", color: "#dc2626", padding: "4px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: 600 };
const iconAction = { background: "none", border: "none", cursor: "pointer", fontSize: "16px", margin: "0 4px" };
const editBtn = { background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: 6, padding: "5px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer", margin: "0 3px" };
const delBtn = { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 6, padding: "5px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer", margin: "0 3px" };

const overlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 };
const modal = { background: "#fff", borderRadius: "16px", padding: "26px", width: "440px", maxWidth: "90%", boxShadow: "0 20px 50px rgba(0,0,0,0.25)" };
const fieldLabel = { display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", margin: "12px 0 6px" };
const fieldInput = { width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "14px", boxSizing: "border-box" };
const cancelBtn = { background: "#f1f5f9", border: "none", borderRadius: "8px", padding: "10px 18px", cursor: "pointer", fontSize: "14px", color: "#374151" };
const saveBtn = { background: "#2563eb", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 18px", cursor: "pointer", fontSize: "14px", fontWeight: 600 };
