import { useState, useEffect, useCallback } from "react";
import jsPDF from "jspdf";
import { apiList, apiUpdate, apiCertDocs, fileUrl } from "../api/api";
import { toast } from "../utils/toast";
import Icon from "./Icon";

/* ---- Official CCAT signatories (edit here if they change) ---- */
const CCAT_HEAD = { name: "NOLAN V. ANGELES", title: "Head, City Cultural Affairs & Tourism Development Department" };
const CITY_MAYOR = { name: "BENJAMIN S. ABALOS", title: "Mayor, Mandaluyong City" };
const TOURISM_CODE = "City Ordinance No. 877, S-2022";

// DB row (snake_case) -> UI record (camelCase)
const toUi = (r) => ({
  id: r.id,
  establishment: r.establishment ?? "",
  type: r.type ?? "",
  applicant: r.applicant ?? "",
  contact: r.contact ?? "",
  address: r.address ?? "",
  submitted: r.submitted_date ?? "",
  status: r.status ?? "Under Review",
  controlNo: r.control_no || "—",
  businessAccountNo: r.business_account_no || "—",
  orNo: r.or_no || "—",
  issued: r.issued || "—",
  expiry: r.expiry || "—",
  remarks: r.remarks ?? "",
  documents: (() => { try { return r.documents ? JSON.parse(r.documents) : []; } catch { return []; } })(),
});

export default function Certificates() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [reviewing, setReviewing] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [reviewDocs, setReviewDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const data = await apiList("certificates");
      setApps((Array.isArray(data) ? data : []).map(toUi));
    } catch (e) {
      setErr(e.message || "Failed to load applications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = apps.filter(a =>
    [a.establishment, a.type, a.applicant, a.status].join(" ").toLowerCase().includes(search.toLowerCase())
  );

  const openReview = async (a) => {
    setReviewing(a); setRemarks(a.remarks || "");
    setReviewDocs([]); setDocsLoading(true);
    try {
      const docs = await apiCertDocs(a.id);
      setReviewDocs(Array.isArray(docs) ? docs : []);
    } catch { setReviewDocs([]); }
    finally { setDocsLoading(false); }
  };
  const closeReview = () => { setReviewing(null); setReviewDocs([]); };

  const pad = (n, len) => String(n).padStart(len, "0");
  const genNumbers = () => {
    const year = new Date().getFullYear();
    const seq = apps.filter(a => a.controlNo && a.controlNo !== "—").length + 1;
    return {
      controlNo: `${year}-${pad(seq, 5)}`,
      businessAccountNo: `MC${year}${pad(seq, 5)}`,
      orNo: String(5480000 + Math.floor(Math.random() * 9999)),
      issued: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
      expiry: (() => { const d = new Date(); d.setFullYear(d.getFullYear() + 1); return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }); })()
    };
  };

  const approve = async () => {
    const nums = reviewing.controlNo !== "—"
      ? { controlNo: reviewing.controlNo, businessAccountNo: reviewing.businessAccountNo, orNo: reviewing.orNo, issued: reviewing.issued, expiry: reviewing.expiry }
      : genNumbers();
    const payload = {
      status: "Approved",
      control_no: nums.controlNo,
      business_account_no: nums.businessAccountNo,
      or_no: nums.orNo,
      issued: nums.issued,
      expiry: nums.expiry,
      remarks,
    };
    setBusy(true);
    try {
      await apiUpdate("certificates", reviewing.id, payload);
      await load();
      toast.success(`Approved! Notification sent to ${reviewing.establishment}.`);
      closeReview();
    } catch (e) {
      toast.error(e.message || "Failed to approve.");
    } finally {
      setBusy(false);
    }
  };
  const reject = async () => {
    setBusy(true);
    try {
      await apiUpdate("certificates", reviewing.id, { status: "Rejected", remarks });
      await load();
      toast.info(`Notification sent to ${reviewing.establishment}: application rejected.`);
      closeReview();
    } catch (e) {
      toast.error(e.message || "Failed to reject.");
    } finally {
      setBusy(false);
    }
  };

  /* ---- Official Certificate of Registration (Tourism Oriented & Related Enterprises) ---- */
  const generateCertificate = (a) => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();   // 297
    const H = doc.internal.pageSize.getHeight();  // 210
    const year = (a.issued && a.issued !== "—") ? a.issued.split(",").pop().trim() : new Date().getFullYear();
    const blue = [13, 71, 161];

    // outer border
    doc.setDrawColor(...blue); doc.setLineWidth(0.6); doc.rect(8, 8, W - 16, H - 16);

    // header band
    doc.setFillColor(...blue); doc.rect(8, 8, W - 16, 26, "F");
    doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(20);
    doc.text("CERTIFICATE OF REGISTRATION " + year, W / 2 + 14, 19, { align: "center" });
    doc.setFontSize(12);
    doc.text("TOURISM ORIENTED AND RELATED ENTERPRISES", W / 2 + 14, 28, { align: "center" });
    // (logos area placeholder — left side of band)
    doc.setFontSize(7); doc.text("CITY OF MANDALUYONG  •  CCAT", 14, 22);

    // reference numbers (right)
    doc.setTextColor(17, 24, 39); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
    let ry = 44;
    const field = (label, val) => {
      doc.setFont("helvetica", "bold"); doc.text(label, W - 95, ry);
      doc.setFont("helvetica", "normal"); doc.text(String(val), W - 50, ry);
      ry += 6;
    };
    field("CONTROL NO.", a.controlNo);
    field("BUSINESS ACCOUNT NO.", a.businessAccountNo);
    field("OR NO.", a.orNo);

    // business name
    doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.setTextColor(17, 24, 39);
    doc.text(a.establishment.toUpperCase(), W / 2, 70, { align: "center" });
    doc.setDrawColor(120); doc.setLineWidth(0.3); doc.line(40, 74, W - 40, 74);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(90);
    doc.text("BUSINESS NAME", W / 2, 80, { align: "center" });

    // business address
    doc.setFont("helvetica", "normal"); doc.setFontSize(12); doc.setTextColor(17, 24, 39);
    doc.text(a.address.toUpperCase(), W / 2, 92, { align: "center" });
    doc.line(40, 96, W - 40, 96);
    doc.setFontSize(9); doc.setTextColor(90);
    doc.text("BUSINESS ADDRESS", W / 2, 102, { align: "center" });

    // body text
    doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(40);
    const body = `This is to certify that the above mentioned business/enterprise has complied with all the requirements for Tourism Oriented/Related enterprises. This Certificate shall be displayed in a conspicuous area in the place of business, pursuant to the provisions of ${TOURISM_CODE}, otherwise known as the Tourism Code of the City of Mandaluyong.`;
    doc.text(doc.splitTextToSize(body, W - 60), 30, 116);

    // issued line
    const issued = a.issued && a.issued !== "—" ? a.issued : new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    doc.setFontSize(11); doc.setTextColor(17, 24, 39);
    doc.text(`Issued this ${issued} in the City of Mandaluyong.`, 30, 140);

    // signatories
    doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    doc.text(CCAT_HEAD.name, 70, 168, { align: "center" });
    doc.text(CITY_MAYOR.name, W - 70, 168, { align: "center" });
    doc.setDrawColor(120); doc.line(35, 166, 105, 166); doc.line(W - 105, 166, W - 35, 166);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(90);
    doc.text(doc.splitTextToSize(CCAT_HEAD.title, 75), 70, 173, { align: "center" });
    doc.text(CITY_MAYOR.title, W - 70, 173, { align: "center" });

    // bottom banner
    doc.setFillColor(...blue); doc.rect(8, H - 22, W - 16, 14, "F");
    doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    doc.text("MANDALEÑO DISIPLINADO  •  GAWA HINDI SALITA", W / 2, H - 13, { align: "center" });

    doc.save(`Certificate_${a.controlNo}_${a.establishment.replace(/\s+/g, "_")}.pdf`);
  };

  const statusStyle = (s) => s === "Approved" ? badgeGreen : s === "Rejected" ? badgeRed : badgeBlue;

  return (
    <>
      <div style={breadcrumb}>
        <span></span><span style={{ opacity: 0.5 }}>›</span>
        <span style={{ fontWeight: 600, color: "#374151" }}>Certificates</span>
      </div>

      <div style={pageHeader}>
        <div style={headerIcon}><Icon name="file" size={26} /></div>
        <div>
          <h1 style={pageTitle}>Tourism Certificates</h1>
          <p style={pageSub}>Review and manage establishment accreditations.</p>
        </div>
      </div>

      <div style={card}>
        <div style={searchBox}>
          <span style={{ opacity: 0.5 }}></span>
          <input style={searchInput} placeholder="Search applications..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>Loading applications…</div>
        ) : err ? (
          <div style={{ padding: 40, textAlign: "center", color: "#dc2626" }}>
             {err}
            <div><button style={eyeBtn} onClick={load}>Retry</button></div>
          </div>
        ) : (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>ESTABLISHMENT</th>
              <th style={thStyle}>TYPE</th>
              <th style={thStyle}>APPLICANT</th>
              <th style={{ ...thStyle, textAlign: "center" }}>STATUS</th>
              <th style={thStyle}>SUBMITTED DATE</th>
              <th style={{ ...thStyle, textAlign: "center" }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id}>
                <td style={{ ...tdStyle, fontWeight: 600, color: "#111827" }}>{a.establishment}</td>
                <td style={tdStyle}>{a.type}</td>
                <td style={tdStyle}>{a.applicant}</td>
                <td style={{ ...tdStyle, textAlign: "center" }}><span style={statusStyle(a.status)}>{a.status}</span></td>
                <td style={tdStyle}>{a.submitted}</td>
                <td style={{ ...tdStyle, textAlign: "center" }}>
                  <button style={eyeBtn} title="Review Application" onClick={() => openReview(a)}>Review</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td style={{ ...tdStyle, textAlign: "center", color: "#9ca3af" }} colSpan={6}>No applications found.</td></tr>
            )}
          </tbody>
        </table>
        )}
      </div>

      {reviewing && (
        <div style={overlay} onClick={closeReview}>
          <div style={modal} onClick={(e) => e.stopPropagation()}>
            <div style={modalTop}>
              <span style={{ fontWeight: 700, fontSize: 20 }}>Review Application</span>
              <button style={closeBtn} onClick={closeReview}>✕</button>
            </div>

            <div style={{ padding: "22px" }}>
              <div style={{ fontWeight: 700, fontSize: 18, color: "#111827" }}>{reviewing.establishment}</div>
              <div style={{ color: "#6b7280", marginBottom: 16 }}>{reviewing.type}</div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 14 }}>
                <div><div style={infoLabel}>Applicant</div><div style={infoValue}>{reviewing.applicant}</div></div>
                <div><div style={infoLabel}>Contact</div><div style={infoValue}>{reviewing.contact}</div></div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={infoLabel}>Business Address</div>
                <div style={infoValue}>{reviewing.address}</div>
              </div>

              <div style={infoLabel}>Uploaded Documents</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6, marginBottom: 18 }}>
                {docsLoading ? (
                  <span style={{ fontSize: 13, color: "#9ca3af" }}>Loading documents…</span>
                ) : reviewDocs.length === 0 ? (
                  <span style={{ fontSize: 13, color: "#9ca3af" }}>No documents uploaded.</span>
                ) : (
                  reviewDocs.map((d) => (
                    <a
                      key={d.id}
                      style={docChip}
                      href={fileUrl(d.stored_path)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={d.original_name}
                    > {d.doc_type || d.original_name}</a>
                  ))
                )}
              </div>

              {reviewing.status === "Approved" ? (
                <div style={approvedBox}>
                  <div style={{ fontWeight: 600, color: "#16a34a", marginBottom: 6 }}>Approved</div>
                  <div style={infoSm}>Control No.: <b>{reviewing.controlNo}</b></div>
                  <div style={infoSm}>Business Account No.: <b>{reviewing.businessAccountNo}</b></div>
                  <div style={infoSm}>OR No.: <b>{reviewing.orNo}</b></div>
                  <div style={infoSm}>Issued: <b>{reviewing.issued}</b> · Valid Until: <b>{reviewing.expiry}</b></div>
                  {reviewing.remarks && <div style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>Remarks: {reviewing.remarks}</div>}
                </div>
              ) : reviewing.status === "Rejected" ? (
                <div style={{ ...approvedBox, background: "#fef2f2", border: "1px solid #fecaca" }}>
                  <div style={{ fontWeight: 600, color: "#dc2626" }}>✕ Rejected</div>
                  {reviewing.remarks && <div style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>Remarks: {reviewing.remarks}</div>}
                </div>
              ) : (
                <>
                  <div style={infoLabel}>Review Remarks (Optional)</div>
                  <textarea style={textarea} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                </>
              )}
            </div>

            <div style={modalFooter}>
              {reviewing.status === "Under Review" ? (
                <>
                  <button style={rejectBtn} onClick={reject} disabled={busy}>⊘ Reject</button>
                  <button style={approveBtn} onClick={approve} disabled={busy}>{busy ? "Saving…" : "✓ Approve"}</button>
                </>
              ) : reviewing.status === "Approved" ? (
                <button style={approveBtn} onClick={() => generateCertificate(reviewing)}>Download Certificate</button>
              ) : (
                <button style={cancelBtn} onClick={closeReview}>Close</button>
              )}
            </div>
          </div>
        </div>
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

const card = { background: "#fff", padding: "20px", borderRadius: "16px", border: "1px solid #eef2f8", boxShadow: "0 4px 12px rgba(0,0,0,0.04)", overflowX: "auto" };
const searchBox = { display: "flex", alignItems: "center", gap: "8px", background: "#f8fafc", border: "1px solid #e6ecf5", borderRadius: "10px", padding: "10px 14px", marginBottom: "16px" };
const searchInput = { border: "none", outline: "none", background: "transparent", width: "100%", fontSize: "14px", color: "#374151" };

const tableStyle = { width: "100%", borderCollapse: "collapse" };
const thStyle = { padding: "12px 14px", textAlign: "left", fontSize: "12px", letterSpacing: "0.5px", color: "#9ca3af", borderBottom: "1px solid #eef2f8", whiteSpace: "nowrap" };
const tdStyle = { padding: "16px 14px", borderBottom: "1px solid #f1f5f9", fontSize: "14px", color: "#374151" };

const badgeBase = { padding: "4px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: 600, display: "inline-block" };
const badgeBlue = { ...badgeBase, background: "#dbeafe", color: "#2563eb" };
const badgeGreen = { ...badgeBase, background: "#dcfce7", color: "#16a34a" };
const badgeRed = { ...badgeBase, background: "#fee2e2", color: "#dc2626" };
const eyeBtn = { background: "none", border: "none", cursor: "pointer", fontSize: "16px", color: "#2563eb" };

const overlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 };
const modal = { background: "#fff", borderRadius: "16px", width: "640px", maxWidth: "100%", maxHeight: "92vh", overflowY: "auto", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" };
const modalTop = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderBottom: "1px solid #eef2f8" };
const closeBtn = { background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#6b7280" };
const infoLabel = { fontSize: "13px", color: "#6b7280", marginBottom: 4 };
const infoValue = { fontSize: "15px", fontWeight: 600, color: "#111827" };
const infoSm = { fontSize: "14px", color: "#374151", padding: "1px 0" };
const docChip = { background: "#f8fafc", border: "1px solid #e6ecf5", borderRadius: "8px", padding: "8px 12px", fontSize: "13px", color: "#2563eb", cursor: "pointer", textDecoration: "none", display: "inline-block" };
const textarea = { width: "100%", minHeight: 110, padding: "10px 12px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "14px", boxSizing: "border-box", marginTop: 6, resize: "vertical", fontFamily: "inherit" };
const approvedBox = { background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "14px" };
const modalFooter = { display: "flex", justifyContent: "flex-end", gap: 10, padding: "16px 22px", borderTop: "1px solid #eef2f8" };
const rejectBtn = { background: "#fff", color: "#dc2626", border: "1px solid #fecaca", borderRadius: "10px", padding: "10px 20px", fontSize: "14px", fontWeight: 600, cursor: "pointer" };
const approveBtn = { background: "#16a34a", color: "#fff", border: "none", borderRadius: "10px", padding: "10px 20px", fontSize: "14px", fontWeight: 600, cursor: "pointer" };
const cancelBtn = { background: "#f1f5f9", color: "#374151", border: "none", borderRadius: "10px", padding: "10px 20px", fontSize: "14px", cursor: "pointer" };
