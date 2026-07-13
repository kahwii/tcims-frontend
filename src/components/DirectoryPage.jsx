import { useState, useEffect, useCallback } from "react";
import { apiList, apiCreate, apiUpdate, apiRemove } from "../api/api";
import { toast } from "../utils/toast";
import Icon from "./Icon";

/**
 * Reusable directory page (table with CRUD + search + export) — DB-backed.
 * Used by Restaurants, Hotels, and Tourism Businesses.
 *
 * Props:
 *  - title, subtitle, icon, breadcrumb (string)
 *  - table (DB table name, e.g. "restaurants")
 *  - categoryColumn (DB column the "category" maps to, e.g. "cuisine" or "type")
 *  - categoryLabel (e.g. "Cuisine", "Type")
 *  - categoryOptions (string[])
 *  - addLabel (e.g. "+ Add Restaurant")
 *  - exportName (csv filename without extension)
 */
export default function DirectoryPage({
  title, subtitle, icon = "", breadcrumb = "Tourism",
  table, categoryColumn = "category",
  categoryLabel = "Category", categoryOptions = [],
  addLabel = "+ Add New", exportName = "directory"
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const emptyForm = { name: "", category: categoryOptions[0] || "", address: "", status: "Active" };
  const [form, setForm] = useState(emptyForm);

  // map a DB row -> UI row (category comes from categoryColumn)
  const toUi = useCallback((r) => ({
    id: r.id,
    name: r.name ?? "",
    category: r[categoryColumn] ?? "",
    address: r.address ?? "",
    status: r.status ?? "Active",
  }), [categoryColumn]);

  // map a UI form -> DB payload (category goes back to categoryColumn)
  const toPayload = (f) => ({
    name: f.name,
    [categoryColumn]: f.category,
    address: f.address,
    status: f.status,
  });

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const data = await apiList(table);
      setRows((Array.isArray(data) ? data : []).map(toUi));
    } catch (e) {
      setErr(e.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [table, toUi]);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter(r =>
    [r.name, r.category, r.address].join(" ").toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setEditingId(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (r) => {
    setEditingId(r.id);
    setForm({ name: r.name, category: r.category, address: r.address, status: r.status });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error("Please enter a name."); return; }
    setSaving(true);
    try {
      if (editingId) {
        await apiUpdate(table, editingId, toPayload(form));
      } else {
        await apiCreate(table, toPayload(form));
      }
      setModalOpen(false);
      await load();
    } catch (e) {
      toast.error(e.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this entry?")) return;
    try {
      await apiRemove(table, id);
      await load();
    } catch (e) {
      toast.error(e.message || "Failed to delete.");
    }
  };

  const exportCSV = () => {
    const header = `Name,${categoryLabel},Address,Status\n`;
    const body = rows.map(r => `"${r.name}","${r.category}","${r.address}","${r.status}"`).join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${exportName}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div style={breadcrumbStyle}>
        <span></span><span style={{ opacity: 0.5 }}>›</span>
        <span>{breadcrumb}</span><span style={{ opacity: 0.5 }}>›</span>
        <span style={{ fontWeight: 600, color: "#374151" }}>{title}</span>
      </div>

      <div style={headerRow}>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          <div style={headerIcon}>{icon ? <Icon name={icon} size={26} /> : null}</div>
          <div>
            <h1 style={pageTitle}>{title}</h1>
            <p style={pageSub}>{subtitle}</p>
          </div>
        </div>
        <button style={addBtn} onClick={openAdd}>{addLabel}</button>
      </div>

      <div style={card}>
        <div style={cardToolbar}>
          <div style={searchBox}>
            <span style={{ opacity: 0.5 }}></span>
            <input style={searchInput} placeholder={`Search ${title.toLowerCase()}...`} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button style={exportBtn} onClick={exportCSV}>Export</button>
        </div>

        {loading ? (
          <div style={stateBox}>Loading {title.toLowerCase()}…</div>
        ) : err ? (
          <div style={{ ...stateBox, color: "#dc2626" }}>
             {err}
            <div><button style={retryBtn} onClick={load}>Retry</button></div>
          </div>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>NAME</th>
                <th style={thStyle}>{categoryLabel.toUpperCase()}</th>
                <th style={thStyle}>ADDRESS</th>
                <th style={{ ...thStyle, textAlign: "center" }}>STATUS</th>
                <th style={{ ...thStyle, textAlign: "center" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td style={{ ...tdStyle, fontWeight: 600, color: "#111827" }}>{r.name}</td>
                  <td style={tdStyle}>{r.category}</td>
                  <td style={tdStyle}>{r.address}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    <span style={r.status === "Active" ? badgeActive : badgeInactive}>{r.status}</span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    <button style={editBtn} title="Edit" onClick={() => openEdit(r)}>Edit</button>
                    <button style={delBtn} title="Delete" onClick={() => remove(r.id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td style={{ ...tdStyle, textAlign: "center", color: "#9ca3af" }} colSpan={5}>No entries found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <div style={overlay} onClick={() => setModalOpen(false)}>
          <div style={modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: "0 0 18px", fontSize: 20, color: "#111827" }}>
              {editingId ? `Edit ${title}` : `Add ${title}`}
            </h2>

            <label style={fieldLabel}>Name</label>
            <input style={fieldInput} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />

            <label style={fieldLabel}>{categoryLabel}</label>
            {categoryOptions.length ? (
              <select style={fieldInput} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            ) : (
              <input style={fieldInput} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            )}

            <label style={fieldLabel}>Address</label>
            <input style={fieldInput} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />

            <label style={fieldLabel}>Status</label>
            <select style={fieldInput} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
              <button style={cancelBtn} onClick={() => setModalOpen(false)} disabled={saving}>Cancel</button>
              <button style={saveBtn} onClick={save} disabled={saving}>
                {saving ? "Saving…" : editingId ? "Save Changes" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ================= STYLES ================= */
const breadcrumbStyle = { display: "flex", alignItems: "center", gap: "8px", color: "#6b7280", fontSize: "14px", marginBottom: "16px" };
const headerRow = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: "12px" };
const headerIcon = { width: "52px", height: "52px", borderRadius: "12px", background: "#2563eb", color: "#fff", fontSize: "24px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
const pageTitle = { margin: 0, fontSize: "26px", color: "#111827" };
const pageSub = { margin: "4px 0 0", color: "#6b7280", fontSize: "15px" };
const addBtn = { background: "#2563eb", color: "#fff", border: "none", borderRadius: "10px", padding: "12px 20px", fontSize: "15px", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" };

const card = { background: "#fff", padding: "20px", borderRadius: "16px", border: "1px solid #eef2f8", boxShadow: "0 4px 12px rgba(0,0,0,0.04)" };
const cardToolbar = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", gap: "16px" };
const searchBox = { flex: 1, maxWidth: 420, display: "flex", alignItems: "center", gap: "8px", background: "#f8fafc", border: "1px solid #e6ecf5", borderRadius: "10px", padding: "10px 14px" };
const searchInput = { border: "none", outline: "none", background: "transparent", width: "100%", fontSize: "14px", color: "#374151" };
const exportBtn = { background: "#f1f5f9", border: "1px solid #e6ecf5", borderRadius: "10px", padding: "10px 16px", fontSize: "14px", cursor: "pointer", color: "#374151" };

const stateBox = { padding: "40px", textAlign: "center", color: "#6b7280", fontSize: "15px" };
const retryBtn = { marginTop: 12, background: "#2563eb", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 18px", cursor: "pointer", fontSize: "14px" };

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
