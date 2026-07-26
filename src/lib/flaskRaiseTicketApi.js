// ============================================================
// Data access layer cho RAISE TICKET — dùng backend Flask tự viết (/API).
// Cùng "hình dạng" hàm với raiseTicketApi.js (bản Supabase) để
// useRaiseTicketData.js dùng được cả 2 mà không cần sửa logic UI.
// ============================================================
import { RaiseTicketAPI } from "../api/raiseTicket.js";

export const DEFAULT_POINTS = {
  raise: { NV: 10, TP: 1, TPCC: 0.5, GD_subordinate: 0.1, GD_self: 20 },
  announce: { GD: 5, TPCC: 1 },
  feedback: { GD: 4, TPCC: 3, TP: 2, NV: 1 },
  useful: { raiser: 100, announcer: 15, responder: 10 },
  timePerPoint: 2,
};

export async function fetchAll() {
  const [staff, tickets, config] = await Promise.all([
    RaiseTicketAPI.listStaff(),
    RaiseTicketAPI.listTickets(),
    RaiseTicketAPI.getConfig(),
  ]);
  return {
    staff,
    tickets,
    pointConfig: config?.points ?? DEFAULT_POINTS,
    emails: config?.emails?.length ? config.emails : [""],
  };
}

export async function insertTicket(ticket) {
  return RaiseTicketAPI.createTicket(ticket);
}

export async function patchTicket(id, patch) {
  return RaiseTicketAPI.patchTicket(id, patch);
}

export async function removeTicket(id) {
  await RaiseTicketAPI.deleteTicket(id);
}

export async function insertStaff(staffMember) {
  return RaiseTicketAPI.addStaff(staffMember);
}

export async function removeStaff(id) {
  await RaiseTicketAPI.deleteStaff(id);
}

export async function updateStaffReportsTo(id, reportsTo) {
  await RaiseTicketAPI.updateStaff(id, { reportsTo: reportsTo || null });
}

export async function savePointConfig(config) {
  await RaiseTicketAPI.savePoints(config);
}

export async function saveEmails(emails) {
  const clean = emails.map((e) => e.trim()).filter(Boolean);
  await RaiseTicketAPI.saveEmails(clean);
  return clean;
}
