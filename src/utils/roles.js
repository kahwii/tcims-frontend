// Roles that belong to the admin panel (TIMS/CHIMS management).
export const ADMIN_ROLES = ["admin", "Super Admin", "CCAT Admin", "CCAT Staff"];

export const isAdmin = (role) => ADMIN_ROLES.includes(role);

// Establishment accounts (businesses applying for accreditation).
export const isEstablishment = (role) => role === "Establishment";
