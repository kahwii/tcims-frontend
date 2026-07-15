// Central API helper for the TCIMS backend (raw PHP @ XAMPP).
// Configurable via .env (VITE_API_HOST); falls back to local XAMPP.
const HOST = import.meta.env.VITE_API_HOST || "http://localhost/my-app-backend";
const BASE = `${HOST}/api`;

// Read the logged-in user's API token from localStorage.
function authHeaders() {
  try {
    const u = JSON.parse(localStorage.getItem("user"));
    return u && u.api_token ? { Authorization: `Bearer ${u.api_token}` } : {};
  } catch {
    return {};
  }
}

async function handle(res) {
  // session expired / invalid token -> force re-login
  if (res.status === 401) {
    localStorage.removeItem("user");
    if (!location.pathname.startsWith("/login")) location.href = "/login";
    throw new Error("Session expired. Please log in again.");
  }
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok) {
    throw new Error((data && (data.error || data.message)) || `Request failed (${res.status})`);
  }
  return data;
}

const jsonHeaders = () => ({ "Content-Type": "application/json", ...authHeaders() });

// ---- Generic CRUD (crud.php) ----
export async function apiList(table) {
  return handle(await fetch(`${BASE}/crud.php?table=${table}`, { headers: authHeaders() }));
}
export async function apiGet(table, id) {
  return handle(await fetch(`${BASE}/crud.php?table=${table}&id=${id}`, { headers: authHeaders() }));
}
export async function apiCreate(table, data) {
  return handle(await fetch(`${BASE}/crud.php?table=${table}`, {
    method: "POST", headers: jsonHeaders(), body: JSON.stringify(data)
  }));
}
export async function apiUpdate(table, id, data) {
  return handle(await fetch(`${BASE}/crud.php?table=${table}&id=${id}`, {
    method: "PUT", headers: jsonHeaders(), body: JSON.stringify(data)
  }));
}
export async function apiRemove(table, id) {
  return handle(await fetch(`${BASE}/crud.php?table=${table}&id=${id}`, {
    method: "DELETE", headers: authHeaders()
  }));
}

// ---- Certificate documents (file upload) ----
// Upload one file (multipart). Do NOT set Content-Type; the browser adds the boundary.
export async function apiUploadDoc(certificateId, docType, file) {
  const fd = new FormData();
  fd.append("certificate_id", certificateId);
  fd.append("doc_type", docType);
  fd.append("file", file);
  return handle(await fetch(`${BASE}/upload_doc.php`, {
    method: "POST", headers: authHeaders(), body: fd
  }));
}
export async function apiCertDocs(certificateId) {
  return handle(await fetch(`${BASE}/cert_docs.php?certificate_id=${certificateId}`, { headers: authHeaders() }));
}
// Build a full URL to an uploaded file from its stored_path.
export const fileUrl = (storedPath) => `${HOST}/${storedPath}`;

// ---- Tourist feedback (sentiment computed server-side) ----
export async function apiFeedbackCreate({ place, rating, comment }) {
  return handle(await fetch(`${BASE}/feedback.php`, {
    method: "POST", headers: jsonHeaders(), body: JSON.stringify({ place, rating, comment })
  }));
}
export async function apiFeedbackMine() {
  return handle(await fetch(`${BASE}/feedback.php`, { headers: authHeaders() }));
}

// ---- Tourist check-ins (visits) ----
export async function apiVisitsMine() {
  return handle(await fetch(`${BASE}/visits.php`, { headers: authHeaders() }));
}
export async function apiVisitToggle(place) {
  return handle(await fetch(`${BASE}/visits.php`, {
    method: "POST", headers: jsonHeaders(), body: JSON.stringify({ place })
  }));
}
// Heritage Trail check-in with 2 photo proofs (selfie + on-site).
export async function apiCheckinWithPhotos(place, selfieFile, siteFile) {
  const fd = new FormData();
  fd.append("place", place);
  fd.append("selfie", selfieFile);
  fd.append("site", siteFile);
  return handle(await fetch(`${BASE}/checkin.php`, {
    method: "POST", headers: authHeaders(), body: fd
  }));
}

// ---- Trail completion reward (Heritage Mug) ----
export async function apiRewardMine() {
  return handle(await fetch(`${BASE}/claim_reward.php`, { headers: authHeaders() }));
}
export async function apiRewardClaim() {
  return handle(await fetch(`${BASE}/claim_reward.php`, { method: "POST", headers: jsonHeaders() }));
}

// ---- Admin: create a staff/admin account (with password) ----
export async function apiAdminCreateUser(data) {
  return handle(await fetch(`${BASE}/admin_create_user.php`, {
    method: "POST", headers: jsonHeaders(), body: JSON.stringify(data)
  }));
}

// ---- Google OAuth sign-in ----
export async function apiGoogleLogin(credential) {
  return handle(await fetch(`${BASE}/google_login.php`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential })
  }));
}
// ---- Firebase sign-in (verifies the Firebase ID token server-side) ----
export async function apiFirebaseLogin(idToken, role = "Tourist") {
  return handle(await fetch(`${BASE}/firebase_login.php`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken, role })
  }));
}

export { BASE, HOST };
