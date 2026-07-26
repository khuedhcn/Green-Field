// ============================================================
// Hook gom toàn bộ state + thao tác dữ liệu cho Raise Ticket.
// Thay cho 4 cặp useState/useEffect + localStorage trước đây.
// State cục bộ được cập nhật lạc quan (optimistic) sau khi ghi DB thành công,
// nên UI vẫn mượt và các component con gần như không phải đổi cách render.
//
// Chọn backend qua biến môi trường VITE_RAISE_TICKET_BACKEND:
//   "flask"    -> backend Flask + SQLite tự viết trong /API (mặc định)
//   "supabase" -> Supabase (bảng tickets/staff/point_config...)
// Cả 2 module export cùng bộ hàm (fetchAll/insertTicket/...) nên hook và
// RaiseTicket.jsx không cần biết đang dùng backend nào.
// ============================================================
import { useState, useEffect, useCallback } from "react";
import * as supabaseApi from "../lib/raiseTicketApi.js";
import * as flaskApi from "../lib/flaskRaiseTicketApi.js";

const BACKEND = (import.meta.env.VITE_RAISE_TICKET_BACKEND || "flask").toLowerCase();
const api = BACKEND === "supabase" ? supabaseApi : flaskApi;
const DEFAULT_POINTS = api.DEFAULT_POINTS;
// Flask không có khái niệm "thiếu env" như Supabase — server không chạy sẽ
// tự lộ ra qua lỗi fetch (error state), không cần cờ configured riêng.
const isBackendConfigured = BACKEND === "supabase" ? supabaseApi.isSupabaseConfigured : true;

export function useRaiseTicketData() {
  const [loading, setLoading] = useState(isBackendConfigured);
  const [error, setError] = useState(null);
  const [staff, setStaff] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [pointConfig, setPointConfig] = useState(DEFAULT_POINTS);
  const [emails, setEmails] = useState([""]);
  const [refreshTick, setRefreshTick] = useState(0);

  const refresh = useCallback(() => setRefreshTick((n) => n + 1), []);

  useEffect(() => {
    if (!isBackendConfigured) return;
    let alive = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const d = await api.fetchAll();
        if (!alive) return;
        setStaff(d.staff);
        setTickets(d.tickets);
        setPointConfig(d.pointConfig);
        setEmails(d.emails.length ? d.emails : [""]);
      } catch (e) {
        if (alive) setError(e.message || String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [refreshTick]);

  // ---- Tickets ----
  const addTicket = useCallback(async (ticket) => {
    const saved = await api.insertTicket(ticket);
    setTickets((prev) => [saved, ...prev]);
    return saved;
  }, []);

  const updateTicket = useCallback(async (id, patch) => {
    const saved = await api.patchTicket(id, patch);
    setTickets((prev) => prev.map((t) => (t.id === id ? saved : t)));
  }, []);

  const deleteTicket = useCallback(async (id) => {
    await api.removeTicket(id);
    setTickets((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ---- Staff ----
  const addStaff = useCallback(async (member) => {
    const saved = await api.insertStaff(member);
    setStaff((prev) => [...prev, saved]);
  }, []);

  const removeStaff = useCallback(async (id) => {
    await api.removeStaff(id);
    setStaff((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const updateReportsTo = useCallback(async (id, reportsTo) => {
    await api.updateStaffReportsTo(id, reportsTo);
    setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, reportsTo } : s)));
  }, []);

  // ---- Point config ----
  const savePointConfig = useCallback(async (config) => {
    await api.savePointConfig(config);
    setPointConfig(config);
  }, []);

  // ---- Emails ----
  const saveEmails = useCallback(async (list) => {
    const clean = await api.saveEmails(list);
    setEmails(clean.length ? clean : [""]);
  }, []);

  return {
    loading, error, refresh,
    configured: isBackendConfigured,
    backend: BACKEND,
    staff, tickets, pointConfig, emails,
    addTicket, updateTicket, deleteTicket,
    addStaff, removeStaff, updateReportsTo,
    savePointConfig, saveEmails,
  };
}
