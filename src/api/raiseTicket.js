// API client for the Raise Ticket module. Talks to the Flask backend via the
// Vite dev proxy (/api -> http://localhost:5000).

const BASE = "/api";

async function req(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.json()).error || "";
    } catch {
      /* ignore non-JSON error bodies */
    }
    throw new Error(detail || `Request failed (${res.status})`);
  }
  return res.status === 204 ? null : res.json();
}

export const RaiseTicketAPI = {
  // Staff
  listStaff: () => req("/staff"),
  addStaff: (staff) => req("/staff", { method: "POST", body: JSON.stringify(staff) }),
  updateStaff: (id, patch) =>
    req(`/staff/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(patch) }),
  deleteStaff: (id) => req(`/staff/${encodeURIComponent(id)}`, { method: "DELETE" }),

  // Tickets
  listTickets: () => req("/tickets"),
  createTicket: (ticket) => req("/tickets", { method: "POST", body: JSON.stringify(ticket) }),
  patchTicket: (id, patch) =>
    req(`/tickets/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteTicket: (id) => req(`/tickets/${encodeURIComponent(id)}`, { method: "DELETE" }),

  // Config
  getConfig: () => req("/config"),
  savePoints: (points) => req("/config/points", { method: "PUT", body: JSON.stringify(points) }),
  saveEmails: (emails) => req("/config/emails", { method: "PUT", body: JSON.stringify(emails) }),

  // AI proxy
  analyze: (prompt, maxTokens = 1000) =>
    req("/ai/analyze", { method: "POST", body: JSON.stringify({ prompt, maxTokens }) }),
};
