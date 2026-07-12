// ============================================================
// Data access layer cho RAISE TICKET — thay localStorage bằng Supabase.
// Toàn bộ hàm nhận/trả về object theo ĐÚNG shape mà RaiseTicket.jsx đang dùng
// (camelCase, staff.id, where/when, date, customPoints) để không phải sửa
// logic calcPoints/dashboard. Việc map sang cột snake_case của DB nằm gọn ở đây.
// ============================================================
import { supabase } from "./supabaseClient.js";

// Fallback dùng trước khi tải xong config từ DB (khớp seed trong migration).
export const DEFAULT_POINTS = {
  raise: { NV: 10, TP: 1, TPCC: 0.5, GD_subordinate: 0.1, GD_self: 20 },
  announce: { GD: 5, TPCC: 1 },
  feedback: { GD: 4, TPCC: 3, TP: 2, NV: 1 },
  useful: { raiser: 100, announcer: 15, responder: 10 },
  timePerPoint: 2,
};

// ---------- Mappers: STAFF ----------
const fromStaffRow = (r) => ({
  id: r.code, name: r.name, level: r.level, bu: r.bu, reportsTo: r.reports_to,
});
const toStaffRow = (s) => ({
  code: s.id, name: s.name, level: s.level, bu: s.bu, reports_to: s.reportsTo || null,
});

// ---------- Mappers: TICKET ----------
// camelCase (frontend) -> cột DB. Dùng cho cả insert (đủ field) và update (một phần).
const TICKET_TO_ROW = {
  code: "code", type: "type", bu: "bu",
  raiserId: "raiser_id", raiserName: "raiser_name", raiserLevel: "raiser_level",
  what: "what", why: "why", where: "where_text", when: "when_text", how: "how", note: "note",
  useful: "useful", customPoints: "custom_points", date: "ticket_date",
};
const toTicketRow = (obj) => {
  const row = {};
  for (const k of Object.keys(obj)) {
    if (k in TICKET_TO_ROW) row[TICKET_TO_ROW[k]] = obj[k];
  }
  return row;
};
const fromTicketRow = (r) => ({
  id: r.id, code: r.code, type: r.type, bu: r.bu,
  raiserId: r.raiser_id, raiserName: r.raiser_name, raiserLevel: r.raiser_level,
  what: r.what, why: r.why, where: r.where_text, when: r.when_text, how: r.how, note: r.note,
  useful: r.useful, customPoints: r.custom_points, date: r.ticket_date,
});

// ---------- READ: tải toàn bộ dữ liệu màn hình ----------
export async function fetchAll() {
  const [staffRes, ticketRes, cfgRes, emailRes] = await Promise.all([
    supabase.from("staff").select("*").order("code"),
    supabase.from("tickets").select("*").order("ticket_date", { ascending: false }),
    supabase.from("point_config").select("config").eq("id", 1).maybeSingle(),
    supabase.from("report_emails").select("email").order("created_at"),
  ]);

  const err = staffRes.error || ticketRes.error || cfgRes.error || emailRes.error;
  if (err) throw err;

  return {
    staff: (staffRes.data ?? []).map(fromStaffRow),
    tickets: (ticketRes.data ?? []).map(fromTicketRow),
    pointConfig: cfgRes.data?.config ?? DEFAULT_POINTS,
    emails: (emailRes.data ?? []).map((e) => e.email),
  };
}

// ---------- TICKETS ----------
export async function insertTicket(ticket) {
  const { data, error } = await supabase
    .from("tickets").insert(toTicketRow(ticket)).select().single();
  if (error) throw error;
  return fromTicketRow(data);
}

export async function patchTicket(id, patch) {
  const { data, error } = await supabase
    .from("tickets").update(toTicketRow(patch)).eq("id", id).select().single();
  if (error) throw error;
  return fromTicketRow(data);
}

export async function removeTicket(id) {
  const { error } = await supabase.from("tickets").delete().eq("id", id);
  if (error) throw error;
}

// ---------- STAFF ----------
export async function insertStaff(staffMember) {
  const { data, error } = await supabase
    .from("staff").insert(toStaffRow(staffMember)).select().single();
  if (error) throw error;
  return fromStaffRow(data);
}

export async function removeStaff(id) {
  const { error } = await supabase.from("staff").delete().eq("code", id);
  if (error) throw error;
}

export async function updateStaffReportsTo(id, reportsTo) {
  const { error } = await supabase
    .from("staff").update({ reports_to: reportsTo || null }).eq("code", id);
  if (error) throw error;
}

// ---------- POINT CONFIG (singleton id = 1) ----------
export async function savePointConfig(config) {
  const { error } = await supabase
    .from("point_config")
    .update({ config, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) throw error;
}

// ---------- REPORT EMAILS (replace-all cho danh sách nhỏ) ----------
export async function saveEmails(emails) {
  const clean = emails.map((e) => e.trim()).filter(Boolean);
  const { error: delErr } = await supabase
    .from("report_emails").delete().not("id", "is", null);
  if (delErr) throw delErr;
  if (clean.length) {
    const { error } = await supabase
      .from("report_emails").insert(clean.map((email) => ({ email })));
    if (error) throw error;
  }
  return clean;
}
