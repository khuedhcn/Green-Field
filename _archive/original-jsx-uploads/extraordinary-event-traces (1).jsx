import { useState, useEffect, useRef } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

/* ══════════════════════════════════════════
   CONSTANTS & HELPERS
   ══════════════════════════════════════════ */
const CATEGORIES = [
  { id: "deviation", label: "Sự sai lệch", color: "#f59e0b", icon: "⚡" },
  { id: "nc", label: "Không phù hợp", color: "#ef4444", icon: "🚫" },
  { id: "oos_oot", label: "Ngoài tiêu chuẩn / Ngoài xu hướng", color: "#8b5cf6", icon: "📊" },
  { id: "complaint", label: "Khiếu nại khách hàng", color: "#ec4899", icon: "📞" },
  { id: "equipment", label: "Sự cố thiết bị / Hệ thống", color: "#6366f1", icon: "🔧" },
  { id: "behavior", label: "Hành vi", color: "#14b8a6", icon: "👤" },
];
const CAT_MAP = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));

/* Robust date+time parser: supports DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, YYYY-MM-DD, and bare YYYY/MM/DD
   Returns a timestamp number for reliable sorting. Invalid dates → Infinity (sort to end). */
const parseDateTime = (dateStr, timeStr) => {
  if (!dateStr) return Infinity;
  const s = dateStr.trim();
  let d = NaN, m = NaN, y = NaN;

  // Try DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmy = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (dmy) { d = parseInt(dmy[1]); m = parseInt(dmy[2]); y = parseInt(dmy[3]); }

  // Try YYYY-MM-DD or YYYY/MM/DD
  if (isNaN(y)) {
    const ymd = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
    if (ymd) { y = parseInt(ymd[1]); m = parseInt(ymd[2]); d = parseInt(ymd[3]); }
  }

  // Fallback: native Date parse
  if (isNaN(y) || isNaN(m) || isNaN(d)) {
    const fallback = new Date(s);
    if (!isNaN(fallback.getTime())) return fallback.getTime();
    return Infinity;
  }

  // Parse time HH:MM or HH:MM:SS
  let hrs = 0, mins = 0;
  if (timeStr) {
    const tm = timeStr.trim().match(/^(\d{1,2})[:\.](\d{2})/);
    if (tm) { hrs = parseInt(tm[1]); mins = parseInt(tm[2]); }
  }

  return new Date(y, m - 1, d, hrs, mins).getTime();
};

/* Extract year from date string for chart grouping */
const extractYear = (dateStr) => {
  if (!dateStr) return "N/A";
  const s = dateStr.trim();
  const dmy = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (dmy) return dmy[3];
  const ymd = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
  if (ymd) return ymd[1];
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.getFullYear().toString();
  return "N/A";
};

const loadPersistent = async (key, fallback) => {
  try { const r = await window.storage.get(key); return r ? JSON.parse(r.value) : fallback; }
  catch { return fallback; }
};
const savePersistent = async (key, val) => {
  try { await window.storage.set(key, JSON.stringify(val)); } catch {}
};

/* Safe AI call — always returns parsed object or null */
const callAI = async (prompt, systemPrompt) => {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: systemPrompt || "Bạn là chuyên gia quản lý chất lượng trong ngành sản xuất thức ăn chăn nuôi tại Việt Nam. LUÔN trả lời hoàn toàn bằng tiếng Việt. LUÔN trả về JSON hợp lệ, KHÔNG bao giờ kèm markdown, backtick hay giải thích thêm. Chỉ trả JSON thuần túy.",
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await res.json();
    const text = (data.content || []).map(i => i.text || "").join("\n").trim();
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("AI Error:", e);
    return null;
  }
};

/* ══════════════════════════════════════════
   ICONS (inline SVG)
   ══════════════════════════════════════════ */
const I = {
  timeline: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18"/><circle cx="7" cy="12" r="2"/><circle cx="17" cy="12" r="2"/></svg>,
  edit: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  archive: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 8v13H3V8M1 3h22v5H1z"/></svg>,
  ai: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.2 4.2l2.8 2.8M17 17l2.8 2.8M1 12h4M19 12h4M4.2 19.8l2.8-2.8M17 7l2.8-2.8"/></svg>,
  check: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>,
  pdf: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>,
  alert: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="17" r="0.5"/></svg>,
  save: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>,
  eye: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  report: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>,
  del: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
};

/* ══════════════════════════════════════════
   SHARED UI COMPONENTS
   ══════════════════════════════════════════ */
const css = {
  input: (extra = {}) => ({
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 8, padding: "9px 13px", color: "#e2e8f0", fontSize: 13,
    fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box", ...extra,
  }),
};

function Btn({ icon, children, onClick, loading, color = "#14b8a6", small, disabled }) {
  return (
    <button onClick={onClick} disabled={loading || disabled} style={{
      display: "inline-flex", alignItems: "center", gap: 7,
      padding: small ? "6px 13px" : "9px 18px",
      background: `${color}15`, border: `1px solid ${color}40`, color,
      borderRadius: 8, cursor: loading || disabled ? "not-allowed" : "pointer",
      fontSize: small ? 11 : 12, fontWeight: 600, fontFamily: "inherit",
      opacity: loading || disabled ? 0.55 : 1, transition: "all 0.2s", whiteSpace: "nowrap",
    }}>
      {loading ? <span className="eet-spin" /> : icon}{children}
    </button>
  );
}

function Section({ title, children, accent }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${accent || "rgba(255,255,255,0.07)"}`, borderRadius: 12, padding: "16px 18px", marginBottom: 16 }}>
      {title && <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>{title}</h3>}
      {children}
    </div>
  );
}

function Field({ label, value, onChange, multi, placeholder, required, error }) {
  const props = { value: value || "", onChange: e => onChange(e.target.value), placeholder, style: { ...css.input({ borderColor: error ? "rgba(239,68,68,0.5)" : undefined }), ...(multi ? { minHeight: 68, resize: "vertical" } : { padding: "8px 13px" }) } };
  return (
    <div>
      <label style={{ fontSize: 11, color: error ? "#fca5a5" : "#64748b", display: "block", marginBottom: 3 }}>
        {label}{required && <span style={{ color: "#ef4444" }}> *</span>}
      </label>
      {multi ? <textarea {...props} /> : <input {...props} />}
    </div>
  );
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div style={{ background: "#0c1322", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 24, maxHeight: "85vh", overflow: "auto", width: wide ? "92%" : 620, maxWidth: wide ? 1000 : 620 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, color: "#e2e8f0" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 22, lineHeight: 1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function AIPanel({ title, icon, color, children, visible }) {
  if (!visible) return null;
  return (
    <div style={{ marginTop: 14, padding: 16, background: `${color}08`, border: `1px solid ${color}30`, borderRadius: 10, animation: "eet-fadeIn 0.3s ease" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>{icon} {title}</div>
      {children}
    </div>
  );
}

function SeverityBadge({ level }) {
  const m = { "Cao": { bg: "#fee2e233", fg: "#fca5a5" }, "Trung bình": { bg: "#fef3c733", fg: "#fcd34d" }, "Thấp": { bg: "#d1fae533", fg: "#6ee7b7" } };
  const s = m[level] || m["Thấp"];
  return <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: s.bg, color: s.fg }}>{level}</span>;
}

function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, padding: "12px 20px", background: "#065f46", border: "1px solid #14b8a6", borderRadius: 10, color: "#d1fae5", fontSize: 13, fontWeight: 600, animation: "eet-fadeIn 0.3s ease", boxShadow: "0 8px 30px rgba(0,0,0,0.4)" }}>
      {msg}
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN APP
   ══════════════════════════════════════════ */
export default function App() {
  const [tab, setTab] = useState(2); // Start on Nhập liệu
  const [confirmedEvents, setConfirmedEvents] = useState([]);
  const [purpose, setPurpose] = useState("");
  const [confirmedPurpose, setConfirmedPurpose] = useState("");
  const [reports, setReports] = useState([]);
  const [fullReport, setFullReport] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      setConfirmedEvents(await loadPersistent("eet-events", []));
      setReports(await loadPersistent("eet-reports", []));
      const p = await loadPersistent("eet-purpose", "");
      setConfirmedPurpose(p);
      setPurpose(p);
      setFullReport(await loadPersistent("eet-fullreport", null));
      setReady(true);
    })();
  }, []);

  useEffect(() => { if (ready) savePersistent("eet-events", confirmedEvents); }, [confirmedEvents, ready]);
  useEffect(() => { if (ready) savePersistent("eet-reports", reports); }, [reports, ready]);
  useEffect(() => { if (ready) savePersistent("eet-purpose", confirmedPurpose); }, [confirmedPurpose, ready]);
  useEffect(() => { if (ready && fullReport) savePersistent("eet-fullreport", fullReport); }, [fullReport, ready]);

  const tabs = [
    { icon: I.timeline, label: "Dòng thời gian" },
    { icon: I.report, label: "Báo cáo chi tiết" },
    { icon: I.edit, label: "Nhập liệu" },
    { icon: I.archive, label: "Lịch sử & Tri thức" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #080d18 0%, #0b1221 40%, #091018 100%)", color: "#c8d6e5", fontFamily: "'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        @keyframes eet-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes eet-fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .eet-spin { display:inline-block; width:14px; height:14px; border:2px solid rgba(255,255,255,0.15); border-top-color:currentColor; border-radius:50%; animation:eet-spin 0.7s linear infinite; }
        textarea:focus,input:focus,select:focus { border-color:rgba(20,184,166,0.5)!important; box-shadow:0 0 0 3px rgba(20,184,166,0.08)!important; }
        select { background:#0c1322; color:#e2e8f0; }
        ::-webkit-scrollbar { width:6px; height:6px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:4px; }
      `}</style>

      {/* HEADER */}
      <div style={{ background: "linear-gradient(90deg, rgba(20,184,166,0.12) 0%, rgba(6,182,212,0.06) 50%, transparent 100%)", borderBottom: "1px solid rgba(20,184,166,0.18)", padding: "14px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 11, background: "linear-gradient(135deg, #14b8a6, #06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 17, color: "#080d18", fontFamily: "'JetBrains Mono'" }}>ET</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: "#f1f5f9", letterSpacing: "-0.01em" }}>Extraordinary Event Traces</h1>
            <p style={{ margin: 0, fontSize: 11, color: "#5eead4", fontFamily: "'JetBrains Mono'", letterSpacing: "0.06em" }}>HỆ THỐNG TRUY VẾT SỰ KIỆN BẤT THƯỜNG</p>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: "flex", gap: 2, padding: "10px 22px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", overflowX: "auto" }}>
        {tabs.map((t, i) => (
          <button key={i} onClick={() => setTab(i)} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", border: "none",
            background: tab === i ? "rgba(20,184,166,0.12)" : "transparent",
            color: tab === i ? "#5eead4" : "#536478",
            borderBottom: tab === i ? "2px solid #14b8a6" : "2px solid transparent",
            cursor: "pointer", fontSize: 12, fontWeight: tab === i ? 600 : 400,
            fontFamily: "inherit", borderRadius: "8px 8px 0 0", transition: "all 0.15s", whiteSpace: "nowrap",
          }}>
            {t.icon}<span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div style={{ padding: "18px 22px", maxWidth: 1200, margin: "0 auto" }}>
        {tab === 0 && <Tab1 events={confirmedEvents} purpose={confirmedPurpose} reports={reports} setReports={setReports} fullReport={fullReport} setFullReport={setFullReport} setTab={setTab} />}
        {tab === 1 && <TabReport events={confirmedEvents} purpose={confirmedPurpose} fullReport={fullReport} setFullReport={setFullReport} reports={reports} setReports={setReports} />}
        {tab === 2 && <Tab2 confirmedEvents={confirmedEvents} setConfirmedEvents={setConfirmedEvents} purpose={purpose} setPurpose={setPurpose} confirmedPurpose={confirmedPurpose} setConfirmedPurpose={setConfirmedPurpose} />}
        {tab === 3 && <Tab3 events={confirmedEvents} reports={reports} />}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   TAB 1: DÒNG THỜI GIAN
   ══════════════════════════════════════════ */
function Tab1({ events, purpose, reports, setReports, fullReport, setFullReport, setTab }) {
  const [aiReport, setAiReport] = useState(null);
  const [aiSeverity, setAiSeverity] = useState(null);
  const [loading, setLoading] = useState({});
  const [toast, setToast] = useState(null);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 3000); };

  const sorted = [...events].sort((a, b) => parseDateTime(a.date, a.time) - parseDateTime(b.date, b.time));
  const abnormals = sorted.filter(e => e.isAbnormal);

  const doReport = async () => {
    if (abnormals.length === 0) return alert("Chưa có sự kiện bất thường nào để phân tích.");
    setLoading(p => ({ ...p, report: true }));
    const info = abnormals.map((e, i) =>
      `Sự kiện ${i + 1}: Ngày ${e.date}, Giờ ${e.time || "không rõ"}, Người: ${e.requester}, Bộ phận: ${e.department}, Vị trí: ${e.position}, Nguồn: ${e.source}, Truy xuất: ${e.traceInfo}, Loại: ${CAT_MAP[e.category]?.label || ""}, Mô tả: ${e.description}, Bổ sung: ${e.abnormalDetail || "không"}, Nhân chứng: ${e.witness || "không"}`
    ).join("\n");
    const result = await callAI(`Phân tích các sự kiện bất thường. Mục đích: "${purpose || "Chưa xác định"}"

${info}

Trả về JSON:
{"batThuong":[{"stt":1,"ten":"tên ngắn tiếng Việt","thoiGian":"khung thời gian","chiTiet":"mô tả 4W1H chi tiết tiếng Việt giúp người đọc hiểu nhanh","mucDo":"Cao hoặc Trung bình hoặc Thấp"}],"ketLuan":"kết luận tổng thể tiếng Việt dựa trên mục đích phân tích"}`);
    setAiReport(result);
    setLoading(p => ({ ...p, report: false }));
  };

  const doSeverity = async () => {
    if (abnormals.length === 0) return alert("Chưa có sự kiện bất thường.");
    setLoading(p => ({ ...p, severity: true }));
    const info = abnormals.map((e, i) => `${i + 1}. ${e.date}: ${e.description} [${CAT_MAP[e.category]?.label || ""}]`).join("\n");
    const result = await callAI(`Đánh giá nghiêm trọng tổng hợp. Mục đích: "${purpose || "Chưa xác định"}"
${info}

Trả về JSON: {"mucDoTongThe":"Nghiêm trọng hoặc Cảnh báo hoặc Theo dõi","diem":số từ 1 đến 10,"lyDo":"giải thích tiếng Việt","khuyenNghi":["khuyến nghị 1 tiếng Việt","khuyến nghị 2","khuyến nghị 3"]}`);
    setAiSeverity(result);
    setLoading(p => ({ ...p, severity: false }));
  };

  const doSave = () => {
    const data = {
      id: Date.now(), date: new Date().toISOString(), purpose,
      events: [...events], sorted: [...sorted], abnormals: [...abnormals],
      aiReport, aiSeverity,
    };
    setFullReport(data);
    setReports(prev => [...prev, data]);
    showToast("✅ Đã lưu báo cáo! Chuyển sang thẻ Báo cáo chi tiết để xem.");
    setTimeout(() => setTab(1), 1200);
  };

  const doPDF = () => {
    const w = window.open("", "_blank");
    const rows = sorted.map((e, i) => `<tr${e.isAbnormal ? ' style="background:#fef2f2"' : ""}>
      <td>${i + 1}</td><td>${e.date}</td><td>${e.requester}</td><td>${e.department}</td><td>${e.position || "—"}</td>
      <td>${CAT_MAP[e.category]?.label || ""}</td>
      <td${e.isAbnormal ? ' style="color:#dc2626;font-weight:700"' : ""}>${e.shortDesc || e.description?.slice(0, 80)}${e.isAbnormal && e.abnormalDetail ? ` — ⚠ ${e.abnormalDetail}` : ""}</td>
      <td>${e.isAbnormal ? "⚠ Có" : "—"}</td></tr>`).join("");
    let aiHTML = "";
    if (aiReport?.batThuong) {
      aiHTML = `<h2 style="color:#14b8a6;margin-top:30px">Phân tích bất thường</h2>` +
        aiReport.batThuong.map(a => `<div style="margin:10px 0;padding:12px;border-left:4px solid #ef4444;background:#fef2f2;border-radius:4px">
          <strong style="color:#dc2626">Bất thường #${a.stt}: ${a.ten}</strong><br/>
          <span style="color:#666;font-size:12px">⏱ ${a.thoiGian}</span>
          <p style="margin:6px 0;line-height:1.6">${a.chiTiet}</p>
          <span style="padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;background:${a.mucDo === "Cao" ? "#fee2e2" : a.mucDo === "Trung bình" ? "#fef3c7" : "#d1fae5"};color:${a.mucDo === "Cao" ? "#dc2626" : a.mucDo === "Trung bình" ? "#d97706" : "#059669"}">${a.mucDo}</span>
        </div>`).join("") +
        (aiReport.ketLuan ? `<div style="margin:16px 0;padding:14px;background:#f0fdfa;border:2px solid #14b8a6;border-radius:8px"><strong>📋 Kết luận:</strong> ${aiReport.ketLuan}</div>` : "");
    }
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Báo cáo Sự kiện Bất thường</title>
      <style>body{font-family:'Segoe UI',sans-serif;padding:30px;color:#1a1a2e;max-width:900px;margin:0 auto}h1{color:#14b8a6;border-bottom:3px solid #14b8a6;padding-bottom:8px;font-size:22px}table{width:100%;border-collapse:collapse;margin:14px 0;font-size:12px}th,td{border:1px solid #e2e8f0;padding:7px 10px;text-align:left}th{background:#f1f5f9;font-weight:600}.info{font-size:13px;color:#555;margin:4px 0}@media print{body{padding:15px}}</style>
    </head><body>
      <h1>📋 Báo cáo Truy vết Sự kiện Bất thường</h1>
      <p class="info"><strong>Mục đích:</strong> ${purpose || "Chưa xác định"}</p>
      <p class="info"><strong>Ngày xuất:</strong> ${new Date().toLocaleString("vi-VN")}</p>
      <p class="info"><strong>Tổng sự kiện:</strong> ${sorted.length} &nbsp;|&nbsp; <strong>Bất thường:</strong> ${abnormals.length}</p>
      <h2 style="color:#14b8a6">Dòng thời gian sự kiện</h2>
      <table><tr><th>STT</th><th>Ngày</th><th>Người báo cáo</th><th>Bộ phận</th><th>Vị trí</th><th>Phân loại</th><th>Mô tả</th><th>Bất thường</th></tr>${rows}</table>
      ${aiHTML}
      <script>setTimeout(()=>window.print(),500)</script></body></html>`);
    w.document.close();
  };

  if (sorted.length === 0) return (
    <div style={{ textAlign: "center", padding: "50px 20px" }}>
      <Toast msg={toast} />
      <div style={{ fontSize: 50, marginBottom: 12, opacity: 0.25 }}>📊</div>
      <p style={{ fontSize: 15, color: "#64748b", margin: "0 0 6px" }}>Chưa có sự kiện nào được xác nhận</p>
      <p style={{ fontSize: 12, color: "#475569" }}>Chuyển sang thẻ <strong style={{ color: "#5eead4" }}>Nhập liệu</strong> để bắt đầu thêm sự kiện.</p>
    </div>
  );

  return (
    <div>
      <Toast msg={toast} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        <Btn icon={I.pdf} onClick={doPDF} color="#06b6d4">Xuất PDF</Btn>
        <Btn icon={I.ai} onClick={doReport} loading={loading.report} color="#14b8a6">Phân tích bất thường</Btn>
        <Btn icon={I.alert} onClick={doSeverity} loading={loading.severity} color="#f59e0b">Đánh giá mức nghiêm trọng</Btn>
        <Btn icon={I.save} onClick={doSave} color="#8b5cf6" disabled={sorted.length === 0}>Lưu báo cáo</Btn>
      </div>

      {purpose && (
        <div style={{ padding: "8px 14px", background: "rgba(20,184,166,0.07)", border: "1px solid rgba(20,184,166,0.18)", borderRadius: 8, marginBottom: 16, fontSize: 12 }}>
          <strong style={{ color: "#5eead4" }}>Mục đích phân tích:</strong> {purpose}
        </div>
      )}

      {/* TIMELINE */}
      <div style={{ overflowX: "auto", paddingBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", minWidth: sorted.length * 215, position: "relative", padding: "20px 10px" }}>
          <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 3, background: "linear-gradient(90deg, #14b8a6, #06b6d4)", borderRadius: 2 }} />
          {sorted.map((evt, i) => (
            <div key={evt.id || i} style={{ flex: "0 0 205px", position: "relative", display: "flex", flexDirection: "column", alignItems: "center", zIndex: 1 }}>
              {/* Phía trên */}
              <div style={{
                width: 185, padding: "9px 11px", marginBottom: 10,
                background: evt.isAbnormal ? "rgba(239,68,68,0.07)" : "rgba(20,184,166,0.05)",
                border: `1px solid ${evt.isAbnormal ? "rgba(239,68,68,0.25)" : "rgba(20,184,166,0.12)"}`,
                borderRadius: 8, fontSize: 11, lineHeight: 1.55,
              }}>
                <div style={{ fontWeight: 700, color: evt.isAbnormal ? "#fca5a5" : "#5eead4", fontSize: 12, marginBottom: 3 }}>{evt.date}{evt.time ? ` • ${evt.time}` : ""}</div>
                <div>👤 {evt.requester}</div>
                <div>🏢 {evt.department}</div>
                <div>📍 {evt.position || "—"}</div>
                <div>🔗 {evt.traceInfo || "—"}</div>
              </div>
              {/* Node */}
              <div style={{
                width: evt.isAbnormal ? 18 : 12, height: evt.isAbnormal ? 18 : 12, borderRadius: "50%",
                background: evt.isAbnormal ? "#ef4444" : "#14b8a6",
                border: `3px solid ${evt.isAbnormal ? "#fca5a5" : "#5eead4"}`,
                boxShadow: evt.isAbnormal ? "0 0 14px rgba(239,68,68,0.45)" : "0 0 8px rgba(20,184,166,0.25)",
              }} />
              {/* Phía dưới */}
              <div style={{
                width: 185, padding: "9px 11px", marginTop: 10,
                background: evt.isAbnormal ? "rgba(239,68,68,0.05)" : "rgba(255,255,255,0.015)",
                border: `1px solid ${evt.isAbnormal ? "rgba(239,68,68,0.18)" : "rgba(255,255,255,0.05)"}`,
                borderRadius: 8, fontSize: 11,
              }}>
                <div style={{ color: evt.isAbnormal ? "#f87171" : "#94a3b8", fontWeight: evt.isAbnormal ? 700 : 400, lineHeight: 1.5 }}>
                  {evt.shortDesc || evt.description?.slice(0, 60)}
                </div>
                {evt.isAbnormal && evt.abnormalDetail && (
                  <div style={{ color: "#ef4444", fontWeight: 700, marginTop: 5, fontSize: 11, borderTop: "1px dashed rgba(239,68,68,0.2)", paddingTop: 5 }}>
                    ⚠ {evt.abnormalDetail}
                  </div>
                )}
                <div style={{ marginTop: 6 }}>
                  <span style={{
                    display: "inline-block", padding: "1px 8px", borderRadius: 10, fontSize: 10, fontWeight: 600,
                    background: (CAT_MAP[evt.category]?.color || "#555") + "20",
                    color: CAT_MAP[evt.category]?.color || "#888",
                  }}>
                    {CAT_MAP[evt.category]?.icon} {CAT_MAP[evt.category]?.label || ""}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Report */}
      <AIPanel title="Báo cáo phân tích bất thường" icon="🔍" color="#5eead4" visible={!!aiReport}>
        {aiReport?.batThuong ? (
          <>
            {aiReport.batThuong.map((a, i) => (
              <div key={i} style={{ padding: 13, marginBottom: 10, background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.18)", borderRadius: 8 }}>
                <div style={{ fontWeight: 700, color: "#fca5a5", fontSize: 13, marginBottom: 5 }}>Bất thường #{a.stt}: {a.ten}</div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>⏱ Thời gian: {a.thoiGian}</div>
                <div style={{ fontSize: 12, color: "#c8d6e5", lineHeight: 1.65 }}>{a.chiTiet}</div>
                <div style={{ marginTop: 8 }}><SeverityBadge level={a.mucDo} /></div>
              </div>
            ))}
            {aiReport.ketLuan && (
              <div style={{ padding: 14, background: "rgba(20,184,166,0.08)", border: "2px solid rgba(20,184,166,0.25)", borderRadius: 8, marginTop: 6 }}>
                <strong style={{ color: "#5eead4" }}>📋 Kết luận tổng thể:</strong>
                <p style={{ margin: "6px 0 0", fontSize: 13, lineHeight: 1.6 }}>{aiReport.ketLuan}</p>
              </div>
            )}
          </>
        ) : (
          <p style={{ fontSize: 12, color: "#fca5a5" }}>⚠ Không thể phân tích lúc này. Vui lòng thử lại sau.</p>
        )}
      </AIPanel>

      {/* AI Severity */}
      <AIPanel title="Đánh giá mức độ nghiêm trọng" icon="⚡" color="#fbbf24" visible={!!aiSeverity}>
        {aiSeverity?.mucDoTongThe ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
              <div style={{
                width: 58, height: 58, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24, fontWeight: 800, fontFamily: "'JetBrains Mono'",
                background: (aiSeverity.diem || 0) >= 7 ? "rgba(239,68,68,0.15)" : (aiSeverity.diem || 0) >= 4 ? "rgba(245,158,11,0.15)" : "rgba(20,184,166,0.15)",
                color: (aiSeverity.diem || 0) >= 7 ? "#fca5a5" : (aiSeverity.diem || 0) >= 4 ? "#fcd34d" : "#5eead4",
                border: `2px solid ${(aiSeverity.diem || 0) >= 7 ? "#ef4444" : (aiSeverity.diem || 0) >= 4 ? "#f59e0b" : "#14b8a6"}`,
              }}>{aiSeverity.diem}</div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "#e2e8f0" }}>{aiSeverity.mucDoTongThe}</div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>Điểm: {aiSeverity.diem}/10</div>
              </div>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.6, margin: "0 0 12px" }}>{aiSeverity.lyDo}</p>
            {aiSeverity.khuyenNghi?.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#fbbf24", marginBottom: 6 }}>📌 Khuyến nghị:</div>
                {aiSeverity.khuyenNghi.map((r, i) => (
                  <div key={i} style={{ fontSize: 12, padding: "7px 11px", background: "rgba(255,255,255,0.025)", borderRadius: 6, marginBottom: 4, borderLeft: "3px solid #f59e0b", lineHeight: 1.5 }}>
                    {i + 1}. {r}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <p style={{ fontSize: 12, color: "#fca5a5" }}>⚠ Không thể đánh giá. Vui lòng thử lại.</p>
        )}
      </AIPanel>
    </div>
  );
}

/* ══════════════════════════════════════════
   TAB 1B: BÁO CÁO CHI TIẾT
   ══════════════════════════════════════════ */
function TabReport({ events, purpose, fullReport, setFullReport, reports, setReports }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 3000); };

  const sorted = [...events].sort((a, b) => parseDateTime(a.date, a.time) - parseDateTime(b.date, b.time));
  const abnormals = sorted.filter(e => e.isAbnormal);

  // Build comprehensive event context for AI
  const buildContext = () => {
    const allEventsInfo = sorted.map((e, i) =>
      `Sự kiện ${i + 1} [${e.isAbnormal ? "BẤT THƯỜNG" : "Bình thường"}]: Ngày ${e.date}, Giờ ${e.time || "không rõ"}, Người gửi/báo cáo (To): ${e.requester}, Bộ phận: ${e.department}, Vị trí: ${e.position || "không rõ"}, Nguồn: ${e.source}, Truy xuất: ${e.traceInfo}, Phân loại: ${CAT_MAP[e.category]?.label || ""}, Mô tả 4W1H: ${e.description}, Nhân chứng: ${e.witness || "không có"}, Bất thường: ${e.abnormalDetail || "không"}`
    ).join("\n\n");
    return allEventsInfo;
  };

  const doGenerateReport = async () => {
    if (abnormals.length === 0) return alert("Chưa có sự kiện bất thường nào để phân tích.");
    setLoading(true);

    const ctx = buildContext();
    const result = await callAI(`Bạn là chuyên gia phân tích sự kiện bất thường trong quản lý chất lượng. Phân tích TOÀN BỘ các sự kiện bên dưới và tạo báo cáo chi tiết.

MỤC ĐÍCH PHÂN TÍCH: "${purpose || "Chưa xác định"}"

TOÀN BỘ SỰ KIỆN:
${ctx}

LƯU Ý QUAN TRỌNG:
- Chỉ phân tích hành vi/thái độ của người được gửi đến trực tiếp (To), KHÔNG phân tích người được CC
- Phân tích mức độ nỗ lực của từng người liên quan trực tiếp
- Xác định rõ hành vi nào phù hợp, hành vi nào chưa phù hợp
- Viết hoàn toàn bằng tiếng Việt, chuyên nghiệp, dễ hiểu

Trả về JSON với cấu trúc sau:
{
  "nhanXetTongThe": {
    "moTa": "Nhận xét tổng thể về sự bất thường - đánh giá bao quát",
    "dongThoiGian": [
      {"thoiGian": "ngày giờ", "moTa": "mô tả sự bất thường xảy ra tại thời điểm này"}
    ]
  },
  "ketLuan": {
    "hanhViThaiDo": [
      {"nguoi": "tên người (To)", "boPhan": "bộ phận", "hanhVi": "mô tả hành vi và thái độ", "danhGia": "Phù hợp hoặc Chưa phù hợp hoặc Cần cải thiện", "chiTiet": "giải thích cụ thể"}
    ],
    "hanhViPhuHop": ["liệt kê hành vi phù hợp"],
    "hanhViChuaPhuHop": ["liệt kê hành vi chưa phù hợp"],
    "mucDoNoLuc": [
      {"nguoi": "tên", "mucDo": "Cao hoặc Trung bình hoặc Thấp", "chiTiet": "mô tả nỗ lực"}
    ],
    "ketLuanTongThe": "kết luận tổng thể về sự bất thường dựa trên mục đích phân tích"
  },
  "hanhDongCaiThien": {
    "hieuSuatXuLy": ["hành động cải thiện hiệu suất 1", "hành động 2"],
    "hanhViThaiDo": ["hành động cải thiện hành vi thái độ 1", "hành động 2"],
    "phuongPhapXuLy": ["phương pháp xử lý sự kiện bất thường 1", "phương pháp 2"],
    "phuongAnTongThe": "phương án tổng thể tối ưu khi xảy ra tình huống tương tự",
    "baiHocKinhNghiem": ["bài học 1", "bài học 2", "bài học 3"]
  }
}`, "Bạn là chuyên gia quản lý chất lượng cấp cao trong ngành sản xuất thức ăn chăn nuôi tại Việt Nam. LUÔN trả lời hoàn toàn bằng tiếng Việt. LUÔN trả về JSON hợp lệ duy nhất, KHÔNG markdown, KHÔNG backtick, KHÔNG giải thích thêm bên ngoài JSON.");

    if (result) {
      setReport(result);
      // Auto-save to fullReport
      const data = {
        ...fullReport,
        id: Date.now(), date: new Date().toISOString(), purpose,
        events: [...events], detailedReport: result,
      };
      setFullReport(data);
      showToast("✅ Đã tạo báo cáo chi tiết thành công!");
    } else {
      alert("Không thể tạo báo cáo. Vui lòng thử lại.");
    }
    setLoading(false);
  };

  const doExportPDF = () => {
    const r = report || fullReport?.detailedReport;
    if (!r) return alert("Chưa có báo cáo để xuất.");
    const w = window.open("", "_blank");

    const hanhViRows = (r.ketLuan?.hanhViThaiDo || []).map(h =>
      `<tr><td>${h.nguoi}</td><td>${h.boPhan || ""}</td><td>${h.hanhVi}</td>
       <td style="color:${h.danhGia === "Phù hợp" ? "#059669" : h.danhGia === "Chưa phù hợp" ? "#dc2626" : "#d97706"};font-weight:700">${h.danhGia}</td>
       <td>${h.chiTiet}</td></tr>`
    ).join("");

    const noLucRows = (r.ketLuan?.mucDoNoLuc || []).map(n =>
      `<tr><td>${n.nguoi}</td>
       <td style="color:${n.mucDo === "Cao" ? "#059669" : n.mucDo === "Thấp" ? "#dc2626" : "#d97706"};font-weight:700">${n.mucDo}</td>
       <td>${n.chiTiet}</td></tr>`
    ).join("");

    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Báo cáo Chi tiết Sự kiện Bất thường</title>
      <style>body{font-family:'Segoe UI',sans-serif;padding:30px;color:#1a1a2e;max-width:950px;margin:0 auto;line-height:1.6}
      h1{color:#14b8a6;border-bottom:3px solid #14b8a6;padding-bottom:8px;font-size:22px}
      h2{color:#0f766e;margin-top:28px;font-size:17px;border-left:4px solid #14b8a6;padding-left:12px}
      h3{color:#334155;font-size:14px;margin-top:16px}
      table{width:100%;border-collapse:collapse;margin:12px 0;font-size:12px}
      th,td{border:1px solid #e2e8f0;padding:8px 10px;text-align:left}
      th{background:#f1f5f9;font-weight:600}
      .box{padding:14px;border-radius:8px;margin:10px 0;font-size:13px}
      .box-teal{background:#f0fdfa;border:2px solid #14b8a6}
      .box-red{background:#fef2f2;border:1px solid #fca5a5}
      .box-green{background:#f0fdf4;border:1px solid #86efac}
      .box-amber{background:#fffbeb;border:1px solid #fcd34d}
      .list{margin:6px 0;padding-left:20px}
      .list li{margin:4px 0;font-size:13px}
      .tag{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;margin:2px}
      .info{font-size:13px;color:#555;margin:4px 0}
      @media print{body{padding:15px}}</style>
    </head><body>
      <h1>📋 Báo cáo Chi tiết Sự kiện Bất thường</h1>
      <p class="info"><strong>Mục đích:</strong> ${purpose || "Chưa xác định"}</p>
      <p class="info"><strong>Ngày xuất:</strong> ${new Date().toLocaleString("vi-VN")}</p>
      <p class="info"><strong>Tổng sự kiện:</strong> ${sorted.length} | <strong>Bất thường:</strong> ${abnormals.length}</p>

      <h2>1. Nhận xét tổng thể về sự bất thường</h2>
      <div class="box box-teal">${r.nhanXetTongThe?.moTa || ""}</div>
      <h3>Diễn biến theo dòng thời gian:</h3>
      ${(r.nhanXetTongThe?.dongThoiGian || []).map(d => `<div style="margin:6px 0;padding:8px 12px;border-left:3px solid #14b8a6;background:#f8fafc;border-radius:4px;font-size:12px"><strong>${d.thoiGian}:</strong> ${d.moTa}</div>`).join("")}

      <h2>2. Kết luận về sự bất thường</h2>
      <h3>2.1 Hành vi và thái độ người liên quan</h3>
      <table><tr><th>Người</th><th>Bộ phận</th><th>Hành vi</th><th>Đánh giá</th><th>Chi tiết</th></tr>${hanhViRows}</table>

      <h3>2.2 Hành vi phù hợp</h3>
      <div class="box box-green"><ul class="list">${(r.ketLuan?.hanhViPhuHop || []).map(h => `<li>✅ ${h}</li>`).join("")}</ul></div>

      <h3>2.3 Hành vi chưa phù hợp</h3>
      <div class="box box-red"><ul class="list">${(r.ketLuan?.hanhViChuaPhuHop || []).map(h => `<li>⚠ ${h}</li>`).join("")}</ul></div>

      <h3>2.4 Mức độ nỗ lực</h3>
      <table><tr><th>Người</th><th>Mức độ</th><th>Chi tiết</th></tr>${noLucRows}</table>

      <h3>2.5 Kết luận tổng thể</h3>
      <div class="box box-teal"><strong>${r.ketLuan?.ketLuanTongThe || ""}</strong></div>

      <h2>3. Các hành động cần cải thiện</h2>
      <h3>3.1 Tăng hiệu suất xử lý</h3>
      <ul class="list">${(r.hanhDongCaiThien?.hieuSuatXuLy || []).map(h => `<li>📌 ${h}</li>`).join("")}</ul>

      <h3>3.2 Hành vi và thái độ</h3>
      <ul class="list">${(r.hanhDongCaiThien?.hanhViThaiDo || []).map(h => `<li>📌 ${h}</li>`).join("")}</ul>

      <h3>3.3 Phương pháp xử lý sự kiện bất thường</h3>
      <ul class="list">${(r.hanhDongCaiThien?.phuongPhapXuLy || []).map(h => `<li>📌 ${h}</li>`).join("")}</ul>

      <h3>3.4 Phương án tổng thể tối ưu</h3>
      <div class="box box-amber">${r.hanhDongCaiThien?.phuongAnTongThe || ""}</div>

      <h3>3.5 Bài học kinh nghiệm</h3>
      <div class="box box-teal"><ul class="list">${(r.hanhDongCaiThien?.baiHocKinhNghiem || []).map((h, i) => `<li><strong>Bài học ${i + 1}:</strong> ${h}</li>`).join("")}</ul></div>

      <script>setTimeout(()=>window.print(),500)</script></body></html>`);
    w.document.close();
  };

  // Use stored report if exists
  const displayReport = report || fullReport?.detailedReport;

  if (events.length === 0) return (
    <div style={{ textAlign: "center", padding: "50px 20px" }}>
      <div style={{ fontSize: 50, marginBottom: 12, opacity: 0.25 }}>📋</div>
      <p style={{ fontSize: 15, color: "#64748b" }}>Chưa có sự kiện nào.</p>
      <p style={{ fontSize: 12, color: "#475569" }}>Thêm sự kiện tại thẻ <strong style={{ color: "#5eead4" }}>Nhập liệu</strong>, sau đó lưu báo cáo tại thẻ <strong style={{ color: "#5eead4" }}>Dòng thời gian</strong>.</p>
    </div>
  );

  return (
    <div>
      <Toast msg={toast} />

      {/* Action buttons */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        <Btn icon={I.ai} onClick={doGenerateReport} loading={loading} color="#14b8a6">Tạo báo cáo chi tiết bằng AI</Btn>
        {displayReport && <Btn icon={I.pdf} onClick={doExportPDF} color="#06b6d4">Xuất PDF báo cáo</Btn>}
      </div>

      {purpose && (
        <div style={{ padding: "8px 14px", background: "rgba(20,184,166,0.07)", border: "1px solid rgba(20,184,166,0.18)", borderRadius: 8, marginBottom: 16, fontSize: 12 }}>
          <strong style={{ color: "#5eead4" }}>Mục đích phân tích:</strong> {purpose}
        </div>
      )}

      {!displayReport && !loading && (
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 40, marginBottom: 10, opacity: 0.3 }}>🔍</div>
          <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 6px" }}>Chưa có báo cáo chi tiết</p>
          <p style={{ fontSize: 12, color: "#475569" }}>Bấm nút <strong style={{ color: "#14b8a6" }}>Tạo báo cáo chi tiết bằng AI</strong> để bắt đầu phân tích toàn diện các sự kiện bất thường.</p>
        </div>
      )}

      {displayReport && (
        <div style={{ animation: "eet-fadeIn 0.4s ease" }}>

          {/* 1. NHẬN XÉT TỔNG THỂ */}
          <Section title="📝 1. Nhận xét tổng thể về sự bất thường" accent="rgba(20,184,166,0.2)">
            <div style={{ fontSize: 13, color: "#e2e8f0", lineHeight: 1.7, padding: "10px 14px", background: "rgba(20,184,166,0.06)", borderRadius: 8, marginBottom: 14 }}>
              {displayReport.nhanXetTongThe?.moTa}
            </div>
            {displayReport.nhanXetTongThe?.dongThoiGian?.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#5eead4", marginBottom: 8 }}>📅 Diễn biến theo dòng thời gian:</div>
                <div style={{ position: "relative", paddingLeft: 20 }}>
                  <div style={{ position: "absolute", left: 6, top: 0, bottom: 0, width: 2, background: "rgba(20,184,166,0.2)" }} />
                  {displayReport.nhanXetTongThe.dongThoiGian.map((d, i) => (
                    <div key={i} style={{ position: "relative", marginBottom: 10, paddingLeft: 16 }}>
                      <div style={{ position: "absolute", left: -17, top: 5, width: 10, height: 10, borderRadius: "50%", background: "#14b8a6", border: "2px solid #5eead4" }} />
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#5eead4", fontFamily: "'JetBrains Mono'" }}>{d.thoiGian}</div>
                      <div style={{ fontSize: 12, color: "#c8d6e5", lineHeight: 1.5, marginTop: 2 }}>{d.moTa}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Section>

          {/* 2. KẾT LUẬN */}
          <Section title="⚖️ 2. Kết luận về sự bất thường" accent="rgba(239,68,68,0.15)">

            {/* 2.1 Hành vi & thái độ */}
            {displayReport.ketLuan?.hanhViThaiDo?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginBottom: 10 }}>👤 Hành vi và thái độ người liên quan (chỉ người được gửi trực tiếp)</div>
                {displayReport.ketLuan.hanhViThaiDo.map((h, i) => (
                  <div key={i} style={{
                    padding: "10px 14px", marginBottom: 8, borderRadius: 8, fontSize: 12,
                    background: h.danhGia === "Phù hợp" ? "rgba(20,184,166,0.05)" : h.danhGia === "Chưa phù hợp" ? "rgba(239,68,68,0.05)" : "rgba(245,158,11,0.05)",
                    border: `1px solid ${h.danhGia === "Phù hợp" ? "rgba(20,184,166,0.18)" : h.danhGia === "Chưa phù hợp" ? "rgba(239,68,68,0.18)" : "rgba(245,158,11,0.18)"}`,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, color: "#e2e8f0" }}>{h.nguoi}</span>
                      {h.boPhan && <span style={{ fontSize: 10, color: "#94a3b8", background: "rgba(255,255,255,0.05)", padding: "1px 8px", borderRadius: 8 }}>{h.boPhan}</span>}
                      <span style={{
                        padding: "2px 10px", borderRadius: 10, fontSize: 10, fontWeight: 700,
                        background: h.danhGia === "Phù hợp" ? "#d1fae533" : h.danhGia === "Chưa phù hợp" ? "#fee2e233" : "#fef3c733",
                        color: h.danhGia === "Phù hợp" ? "#6ee7b7" : h.danhGia === "Chưa phù hợp" ? "#fca5a5" : "#fcd34d",
                      }}>{h.danhGia}</span>
                    </div>
                    <div style={{ color: "#94a3b8", lineHeight: 1.5 }}>{h.hanhVi}</div>
                    <div style={{ color: "#c8d6e5", marginTop: 4, lineHeight: 1.5 }}>{h.chiTiet}</div>
                  </div>
                ))}
              </div>
            )}

            {/* 2.2 & 2.3 Phù hợp / Chưa phù hợp */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div style={{ padding: 12, background: "rgba(20,184,166,0.04)", border: "1px solid rgba(20,184,166,0.15)", borderRadius: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#6ee7b7", marginBottom: 8 }}>✅ Hành vi phù hợp</div>
                {(displayReport.ketLuan?.hanhViPhuHop || []).map((h, i) => (
                  <div key={i} style={{ fontSize: 12, padding: "5px 0", color: "#c8d6e5", borderBottom: "1px solid rgba(255,255,255,0.04)", lineHeight: 1.5 }}>✅ {h}</div>
                ))}
                {(!displayReport.ketLuan?.hanhViPhuHop || displayReport.ketLuan.hanhViPhuHop.length === 0) && <div style={{ fontSize: 11, color: "#64748b" }}>Không có</div>}
              </div>
              <div style={{ padding: 12, background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#fca5a5", marginBottom: 8 }}>⚠ Hành vi chưa phù hợp</div>
                {(displayReport.ketLuan?.hanhViChuaPhuHop || []).map((h, i) => (
                  <div key={i} style={{ fontSize: 12, padding: "5px 0", color: "#c8d6e5", borderBottom: "1px solid rgba(255,255,255,0.04)", lineHeight: 1.5 }}>⚠ {h}</div>
                ))}
                {(!displayReport.ketLuan?.hanhViChuaPhuHop || displayReport.ketLuan.hanhViChuaPhuHop.length === 0) && <div style={{ fontSize: 11, color: "#64748b" }}>Không có</div>}
              </div>
            </div>

            {/* 2.4 Mức độ nỗ lực */}
            {displayReport.ketLuan?.mucDoNoLuc?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 8 }}>💪 Mức độ nỗ lực của người liên quan trực tiếp</div>
                {displayReport.ketLuan.mucDoNoLuc.map((n, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", marginBottom: 4, background: "rgba(255,255,255,0.02)", borderRadius: 6, fontSize: 12 }}>
                    <span style={{ fontWeight: 700, color: "#e2e8f0", minWidth: 100 }}>{n.nguoi}</span>
                    <span style={{
                      padding: "2px 10px", borderRadius: 10, fontSize: 10, fontWeight: 700, minWidth: 70, textAlign: "center",
                      background: n.mucDo === "Cao" ? "#d1fae533" : n.mucDo === "Thấp" ? "#fee2e233" : "#fef3c733",
                      color: n.mucDo === "Cao" ? "#6ee7b7" : n.mucDo === "Thấp" ? "#fca5a5" : "#fcd34d",
                    }}>{n.mucDo}</span>
                    <span style={{ color: "#94a3b8", flex: 1 }}>{n.chiTiet}</span>
                  </div>
                ))}
              </div>
            )}

            {/* 2.5 Kết luận tổng thể */}
            {displayReport.ketLuan?.ketLuanTongThe && (
              <div style={{ padding: 14, background: "rgba(20,184,166,0.08)", border: "2px solid rgba(20,184,166,0.25)", borderRadius: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#5eead4", marginBottom: 6 }}>📋 Kết luận tổng thể</div>
                <div style={{ fontSize: 13, color: "#e2e8f0", lineHeight: 1.7 }}>{displayReport.ketLuan.ketLuanTongThe}</div>
              </div>
            )}
          </Section>

          {/* 3. HÀNH ĐỘNG CẢI THIỆN */}
          <Section title="🚀 3. Các hành động cần cải thiện" accent="rgba(245,158,11,0.15)">

            {/* 3.1 Hiệu suất */}
            <ReportSubSection icon="⚡" title="Tăng hiệu suất xử lý" items={displayReport.hanhDongCaiThien?.hieuSuatXuLy} color="#06b6d4" />

            {/* 3.2 Hành vi */}
            <ReportSubSection icon="👤" title="Hành vi và thái độ đối với sự việc" items={displayReport.hanhDongCaiThien?.hanhViThaiDo} color="#8b5cf6" />

            {/* 3.3 Phương pháp */}
            <ReportSubSection icon="🔧" title="Phương pháp xử lý các sự kiện bất thường" items={displayReport.hanhDongCaiThien?.phuongPhapXuLy} color="#f59e0b" />

            {/* 3.4 Phương án tổng thể */}
            {displayReport.hanhDongCaiThien?.phuongAnTongThe && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#ec4899", marginBottom: 8 }}>🎯 Phương án tổng thể tối ưu khi xảy ra tình huống tương tự</div>
                <div style={{ padding: "12px 14px", background: "rgba(236,72,153,0.05)", border: "1px solid rgba(236,72,153,0.18)", borderRadius: 8, fontSize: 13, color: "#e2e8f0", lineHeight: 1.7 }}>
                  {displayReport.hanhDongCaiThien.phuongAnTongThe}
                </div>
              </div>
            )}

            {/* 3.5 Bài học kinh nghiệm */}
            {displayReport.hanhDongCaiThien?.baiHocKinhNghiem?.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#14b8a6", marginBottom: 8 }}>📚 Bài học kinh nghiệm</div>
                {displayReport.hanhDongCaiThien.baiHocKinhNghiem.map((b, i) => (
                  <div key={i} style={{
                    padding: "10px 14px", marginBottom: 6, borderRadius: 8,
                    background: "rgba(20,184,166,0.04)", border: "1px solid rgba(20,184,166,0.12)",
                    fontSize: 12, color: "#e2e8f0", lineHeight: 1.6,
                    display: "flex", gap: 10, alignItems: "flex-start",
                  }}>
                    <span style={{ fontSize: 18, flexShrink: 0, marginTop: -2 }}>💡</span>
                    <div><strong style={{ color: "#5eead4" }}>Bài học {i + 1}:</strong> {b}</div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}

function ReportSubSection({ icon, title, items, color }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 8 }}>{icon} {title}</div>
      {items.map((item, i) => (
        <div key={i} style={{
          fontSize: 12, padding: "8px 12px", marginBottom: 4,
          background: "rgba(255,255,255,0.02)", borderRadius: 6,
          borderLeft: `3px solid ${color}`, color: "#c8d6e5", lineHeight: 1.5,
        }}>
          {i + 1}. {item}
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════
   TAB 2: NHẬP LIỆU
   ══════════════════════════════════════════ */
function Tab2({ confirmedEvents, setConfirmedEvents, purpose, setPurpose, confirmedPurpose, setConfirmedPurpose }) {
  const empty = { date: "", time: "", requester: "", department: "", position: "", witness: "", traceInfo: "", source: "", description: "", shortDesc: "", isAbnormal: false, abnormalDetail: "", category: "" };
  const [evt, setEvt] = useState({ ...empty });
  const [paste, setPaste] = useState("");
  const [aiPurpose, setAiPurpose] = useState(null);
  const [aiClassify, setAiClassify] = useState(null);
  const [loading, setLoading] = useState({});
  const [warnings, setWarnings] = useState([]);
  const [editIdx, setEditIdx] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 3000); };
  const setL = (k, v) => setLoading(p => ({ ...p, [k]: v }));
  const upd = (k, v) => { setEvt(p => ({ ...p, [k]: v })); setWarnings([]); };

  const validate = () => {
    const w = [];
    if (!evt.date) w.push("Ngày tháng năm");
    if (!evt.requester) w.push("Người cung cấp thông tin");
    if (!evt.department) w.push("Bộ phận");
    if (!evt.description) w.push("Mô tả 4W1H");
    if (!evt.source) w.push("Nguồn thông tin");
    if (!evt.traceInfo) w.push("Thông tin truy xuất");
    if (!evt.category) w.push("Phân loại sự kiện (dùng nút phân loại tự động hoặc chọn thủ công)");
    return w;
  };

  const doCheckPurpose = async () => {
    if (!purpose.trim()) return alert("Hãy nhập mục đích phân tích trước.");
    setL("purpose", true);
    const result = await callAI(`Đánh giá mô tả mục đích phân tích sự kiện bất thường sau có rõ ràng và dễ hiểu không:

"${purpose}"

Trả về JSON: {"roRang":true hoặc false,"nhanXet":"nhận xét bằng tiếng Việt nếu chưa rõ thì giải thích cụ thể tại sao","goiY":"gợi ý sửa đổi cụ thể bằng tiếng Việt nếu cần"}`);
    setAiPurpose(result);
    setL("purpose", false);
  };

  const doExtract = async () => {
    if (!paste.trim()) return alert("Hãy dán thông tin vào khung trước.");
    setL("extract", true);
    const result = await callAI(`Đọc đoạn thông tin sau và trích xuất. Nếu không tìm thấy thì để "".

Trả về JSON:
{"ngay":"DD/MM/YYYY","gio":"HH:MM","nguoiCungCap":"tên","boPhan":"bộ phận","viTri":"vị trí","nhanChung":"nhân chứng","truyXuat":"email hoặc tên cuộc họp","nguon":"email hoặc cuộc họp","moTa":"mô tả What Who When Where How tiếng Việt","tomTat":"tối đa 12 từ tiếng Việt xúc tích nêu bật ý chính"}

Thông tin:
${paste}`);
    if (result) {
      setEvt(p => ({
        ...p,
        date: result.ngay || p.date, time: result.gio || p.time,
        requester: result.nguoiCungCap || p.requester, department: result.boPhan || p.department,
        position: result.viTri || p.position, witness: result.nhanChung || p.witness,
        traceInfo: result.truyXuat || p.traceInfo, source: result.nguon || p.source,
        description: result.moTa || p.description, shortDesc: result.tomTat || p.shortDesc,
      }));
      showToast("✅ Đã trích xuất! Kiểm tra và bổ sung ô còn thiếu.");
    } else {
      alert("Không thể trích xuất. Thử dán nội dung rõ ràng hơn.");
    }
    setL("extract", false);
  };

  const doClassify = async () => {
    if (!evt.description) return alert("Hãy nhập mô tả sự kiện trước.");
    setL("classify", true);
    const result = await callAI(`Phân loại sự kiện vào 1 mã:
deviation = Sự sai lệch, nc = Không phù hợp, oos_oot = Ngoài tiêu chuẩn/xu hướng, complaint = Khiếu nại KH, equipment = Sự cố thiết bị, behavior = Hành vi

Mô tả: ${evt.description}
Bối cảnh: ${evt.requester}, ${evt.department}, ${evt.source}

Trả về JSON: {"maLoai":"mã","tenLoai":"tên tiếng Việt","doTinCay":"Cao hoặc Trung bình hoặc Thấp","giaiThich":"giải thích tiếng Việt","laBatThuong":true hoặc false,"lyDoBatThuong":"lý do tiếng Việt không quá 20 từ"}`);
    if (result) {
      setAiClassify(result);
      setEvt(p => ({
        ...p,
        category: result.maLoai || p.category,
        isAbnormal: result.laBatThuong ?? p.isAbnormal,
        abnormalDetail: result.lyDoBatThuong || p.abnormalDetail,
      }));
      showToast("✅ Đã phân loại! Kiểm tra kết quả bên dưới.");
    } else {
      alert("Không thể phân loại. Vui lòng thử lại.");
    }
    setL("classify", false);
  };

  const doConfirm = () => {
    const w = validate();
    if (w.length > 0) { setWarnings(w); return; }
    setWarnings([]);
    const final = { ...evt, id: editIdx !== null ? confirmedEvents[editIdx].id : Date.now() };
    if (editIdx !== null) {
      const arr = [...confirmedEvents]; arr[editIdx] = final;
      setConfirmedEvents(arr);
      setEditIdx(null);
      showToast("✅ Đã cập nhật sự kiện!");
    } else {
      setConfirmedEvents(prev => [...prev, final]);
      showToast("✅ Đã thêm sự kiện mới!");
    }
    setEvt({ ...empty });
    setAiClassify(null);
    setPaste("");
  };

  return (
    <div>
      <Toast msg={toast} />

      {/* BƯỚC 1 */}
      <Section title="📌 Bước 1: Xác định mục đích phân tích" accent="rgba(20,184,166,0.15)">
        <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 10px", lineHeight: 1.6 }}>
          Mô tả rõ ràng mục đích cần phân tích. <span style={{ color: "#5eead4" }}>Ví dụ:</span> "Phân tích chuỗi sự kiện liên quan đến sai sót chất lượng sản phẩm XYZ trong tháng 3/2026 để xác định nguyên nhân gốc rễ."
        </p>
        <textarea value={purpose} onChange={e => setPurpose(e.target.value)}
          placeholder="Nhập mục đích phân tích sự kiện bất thường tại đây..."
          style={css.input({ minHeight: 55 })} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          <Btn icon={I.ai} onClick={doCheckPurpose} loading={loading.purpose} color="#14b8a6" small>Kiểm tra mô tả</Btn>
          <Btn icon={I.check} onClick={() => { setConfirmedPurpose(purpose); showToast("✅ Đã xác nhận mục đích!"); }} color="#06b6d4" small disabled={!purpose.trim()}>Xác nhận mục đích</Btn>
        </div>

        <AIPanel title="Nhận xét từ AI" icon="💡" color="#5eead4" visible={!!aiPurpose}>
          {aiPurpose?.roRang === true ? (
            <div style={{ fontSize: 13, color: "#6ee7b7", lineHeight: 1.6 }}>✅ Mô tả rõ ràng, dễ hiểu. {aiPurpose.nhanXet}</div>
          ) : aiPurpose ? (
            <>
              <div style={{ fontSize: 13, color: "#fcd34d", lineHeight: 1.6, marginBottom: 10 }}>⚠ {aiPurpose.nhanXet}</div>
              {aiPurpose.goiY && (
                <>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4, fontWeight: 600 }}>Gợi ý sửa đổi (bấm nút bên dưới để áp dụng):</div>
                  <div style={{ padding: "8px 12px", background: "rgba(255,255,255,0.04)", borderRadius: 6, fontSize: 12, color: "#e2e8f0", lineHeight: 1.6, border: "1px solid rgba(245,158,11,0.2)" }}>
                    {aiPurpose.goiY}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <Btn icon={I.check} onClick={() => { setPurpose(aiPurpose.goiY); setAiPurpose(null); showToast("✅ Đã áp dụng gợi ý!"); }} color="#f59e0b" small>Áp dụng gợi ý này</Btn>
                  </div>
                </>
              )}
            </>
          ) : (
            <div style={{ fontSize: 12, color: "#fca5a5" }}>Không thể kiểm tra. Vui lòng thử lại.</div>
          )}
        </AIPanel>

        {confirmedPurpose && (
          <div style={{ marginTop: 10, padding: "7px 12px", background: "rgba(20,184,166,0.08)", borderRadius: 7, fontSize: 12, color: "#5eead4" }}>
            ✅ Đã xác nhận: <span style={{ color: "#e2e8f0" }}>{confirmedPurpose}</span>
          </div>
        )}
      </Section>

      {/* BƯỚC 2 */}
      <Section title="📋 Bước 2: Dán thông tin gốc (không bắt buộc)" accent="rgba(6,182,212,0.12)">
        <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 10px", lineHeight: 1.6 }}>
          Dán nội dung email, biên bản họp, tin nhắn... AI sẽ tự động trích xuất và điền vào form bên dưới. Bạn có thể bỏ qua và nhập tay ở Bước 3.
        </p>
        <textarea value={paste} onChange={e => setPaste(e.target.value)}
          placeholder={"Dán nội dung gốc vào đây...\n\nVí dụ:\nEmail từ anh Minh (QC) ngày 15/03/2026 báo cáo máy trộn #3 dừng hoạt động lúc 14h do lỗi cảm biến nhiệt..."}
          style={css.input({ minHeight: 90 })} />
        <div style={{ marginTop: 8 }}>
          <Btn icon={I.ai} onClick={doExtract} loading={loading.extract} color="#06b6d4" small>Trích xuất thông tin tự động</Btn>
        </div>
      </Section>

      {/* BƯỚC 3 */}
      <Section title={editIdx !== null ? "✏️ Bước 3: Chỉnh sửa sự kiện" : "📝 Bước 3: Nhập / kiểm tra thông tin sự kiện"} accent="rgba(139,92,246,0.12)">
        <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 12px", lineHeight: 1.6 }}>
          Điền đầy đủ các trường có dấu <span style={{ color: "#ef4444" }}>*</span>. Nếu đã trích xuất ở Bước 2, kiểm tra lại và bổ sung thông tin còn thiếu.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Ngày" value={evt.date} onChange={v => upd("date", v)} required placeholder="VD: 15/03/2026" error={warnings.includes("Ngày tháng năm")} />
          <Field label="Giờ" value={evt.time} onChange={v => upd("time", v)} placeholder="VD: 14:30" />
          <Field label="Người cung cấp thông tin" value={evt.requester} onChange={v => upd("requester", v)} required placeholder="VD: Nguyễn Văn A" error={warnings.includes("Người cung cấp thông tin")} />
          <Field label="Bộ phận" value={evt.department} onChange={v => upd("department", v)} required placeholder="VD: QC, Sản xuất, Kho..." error={warnings.includes("Bộ phận")} />
          <Field label="Vị trí / Chức vụ" value={evt.position} onChange={v => upd("position", v)} placeholder="VD: Trưởng ca, QC Supervisor..." />
          <Field label="Nhân chứng (không bắt buộc)" value={evt.witness} onChange={v => upd("witness", v)} placeholder="VD: Trần Thị B" />
          <Field label="Thông tin truy xuất" value={evt.traceInfo} onChange={v => upd("traceInfo", v)} required placeholder='VD: Email "Báo cáo sự cố #3"' error={warnings.includes("Thông tin truy xuất")} />
          <Field label="Nguồn thông tin" value={evt.source} onChange={v => upd("source", v)} required placeholder="VD: Email, Cuộc họp, Báo cáo..." error={warnings.includes("Nguồn thông tin")} />
        </div>
        <div style={{ marginTop: 10 }}>
          <Field label="Mô tả chi tiết theo 4W1H (What - Who - When - Where - How)" value={evt.description} onChange={v => upd("description", v)} multi required
            placeholder={"VD: Ngày 15/03, lúc 14h, máy trộn #3 tại xưởng SX1 dừng đột ngột do lỗi cảm biến nhiệt. Anh Minh (QC) phát hiện khi kiểm tra định kỳ..."}
            error={warnings.includes("Mô tả 4W1H")} />
        </div>
        <div style={{ marginTop: 10 }}>
          <Field label="Tóm tắt ngắn (hiển thị trên dòng thời gian, tối đa 12 từ)" value={evt.shortDesc} onChange={v => upd("shortDesc", v)}
            placeholder="VD: Máy trộn #3 dừng đột ngột do lỗi cảm biến" />
        </div>

        {warnings.length > 0 && (
          <div style={{ marginTop: 10, padding: 11, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#fca5a5", marginBottom: 4 }}>⚠ Vui lòng bổ sung:</div>
            {warnings.map((w, i) => <div key={i} style={{ fontSize: 12, color: "#f87171", padding: "2px 0" }}>• {w}</div>)}
          </div>
        )}

        {/* Phân loại */}
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#a78bfa", marginBottom: 10 }}>🏷 Phân loại sự kiện</div>
          <Btn icon={I.ai} onClick={doClassify} loading={loading.classify} color="#8b5cf6" small>Phân loại tự động bằng AI</Btn>

          <AIPanel title="Kết quả phân loại" icon="🏷" color="#a78bfa" visible={!!aiClassify}>
            {aiClassify ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                  <span style={{
                    padding: "4px 12px", borderRadius: 12, fontWeight: 700, fontSize: 12,
                    background: (CAT_MAP[aiClassify.maLoai]?.color || "#555") + "20",
                    color: CAT_MAP[aiClassify.maLoai]?.color || "#aaa",
                  }}>
                    {CAT_MAP[aiClassify.maLoai]?.icon} {aiClassify.tenLoai || CAT_MAP[aiClassify.maLoai]?.label}
                  </span>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>Độ tin cậy: {aiClassify.doTinCay}</span>
                </div>
                <div style={{ fontSize: 12, color: "#c8d6e5", lineHeight: 1.5 }}>{aiClassify.giaiThich}</div>
                {aiClassify.laBatThuong && (
                  <div style={{ marginTop: 8, fontSize: 12, color: "#fca5a5", fontWeight: 700 }}>⚠ Bất thường: {aiClassify.lyDoBatThuong}</div>
                )}
              </>
            ) : null}
          </AIPanel>

          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 3 }}>
              Chọn / điều chỉnh phân loại <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <select value={evt.category} onChange={e => upd("category", e.target.value)}
              style={{ ...css.input(), padding: "8px 12px", cursor: "pointer" }}>
              <option value="">— Chọn phân loại —</option>
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
            </select>
          </div>

          <Btn icon={I.check} onClick={() => showToast("✅ Đã xác nhận phân loại!")} color="#8b5cf6" small disabled={!evt.category} style={{ marginTop: 8 }}>Xác nhận phân loại</Btn>
        </div>

        {/* Bất thường */}
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <label style={{ fontSize: 13, color: "#e2e8f0", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontWeight: 600 }}>
            <input type="checkbox" checked={evt.isAbnormal} onChange={e => upd("isAbnormal", e.target.checked)} style={{ accentColor: "#ef4444", width: 16, height: 16 }} />
            ⚠ Đánh dấu là sự kiện bất thường
          </label>
          {evt.isAbnormal && (
            <div style={{ marginTop: 8 }}>
              <Field label="Mô tả bất thường (tối đa 20 từ, hiển thị màu đỏ trên dòng thời gian)" value={evt.abnormalDetail} onChange={v => upd("abnormalDetail", v)}
                placeholder="VD: Cảm biến bị vô hiệu hóa bất thường, không theo quy trình" />
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <Btn icon={I.check} onClick={doConfirm} color="#14b8a6">
            {editIdx !== null ? "Cập nhật sự kiện" : "✅ Xác nhận & Thêm sự kiện"}
          </Btn>
          {editIdx !== null && (
            <Btn icon={I.del} onClick={() => { setEditIdx(null); setEvt({ ...empty }); setAiClassify(null); }} color="#64748b">Hủy</Btn>
          )}
        </div>
      </Section>

      {/* Danh sách */}
      {confirmedEvents.length > 0 && (
        <Section title={`✅ Danh sách sự kiện đã xác nhận (${confirmedEvents.length})`}>
          {confirmedEvents.map((e, i) => (
            <div key={e.id} style={{
              padding: "10px 14px", borderRadius: 8, marginBottom: 6, fontSize: 12,
              background: e.isAbnormal ? "rgba(239,68,68,0.05)" : "rgba(255,255,255,0.015)",
              border: `1px solid ${e.isAbnormal ? "rgba(239,68,68,0.18)" : "rgba(255,255,255,0.05)"}`,
              display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, color: e.isAbnormal ? "#fca5a5" : "#5eead4", fontFamily: "'JetBrains Mono'", fontSize: 11 }}>{e.date}</span>
                  <span style={{ color: "#e2e8f0" }}>{e.requester}</span>
                  <span style={{ color: "#64748b" }}>• {e.department}</span>
                  <span style={{ padding: "1px 8px", borderRadius: 10, fontSize: 10, fontWeight: 600, background: (CAT_MAP[e.category]?.color || "#555") + "20", color: CAT_MAP[e.category]?.color }}>
                    {CAT_MAP[e.category]?.icon} {CAT_MAP[e.category]?.label || ""}
                  </span>
                  {e.isAbnormal && <span style={{ color: "#ef4444", fontWeight: 800, fontSize: 10 }}>⚠ BẤT THƯỜNG</span>}
                </div>
                <div style={{ color: "#94a3b8", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.shortDesc || e.description?.slice(0, 90)}</div>
              </div>
              <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                <button onClick={() => { setEvt({ ...e }); setEditIdx(i); setAiClassify(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#94a3b8", cursor: "pointer", padding: "5px 7px", display: "flex" }} title="Chỉnh sửa">{I.edit}</button>
                <button onClick={() => { if (confirm("Bạn có chắc muốn xóa?")) setConfirmedEvents(prev => prev.filter((_, j) => j !== i)); }}
                  style={{ background: "none", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6, color: "#ef4444", cursor: "pointer", padding: "5px 7px", display: "flex" }} title="Xóa">{I.del}</button>
              </div>
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   TAB 3: LỊCH SỬ & TRI THỨC
   ══════════════════════════════════════════ */
function Tab3({ events, reports }) {
  const [viewRpt, setViewRpt] = useState(null);
  const [viewTL, setViewTL] = useState(null);

  const yearCat = {};
  events.forEach(e => {
    const y = extractYear(e.date);
    if (!yearCat[y]) yearCat[y] = {};
    yearCat[y][e.category] = (yearCat[y][e.category] || 0) + 1;
  });
  const barData = Object.entries(yearCat).sort(([a], [b]) => a.localeCompare(b)).map(([year, cats]) => ({ year, ...cats }));

  const catCnt = {};
  events.forEach(e => { catCnt[e.category] = (catCnt[e.category] || 0) + 1; });
  const pieData = Object.entries(catCnt).map(([id, value]) => ({
    name: CAT_MAP[id]?.label || id, value, color: CAT_MAP[id]?.color || "#666",
  }));

  return (
    <div>
      <Section title="📊 Thống kê phân loại sự kiện">
        {events.length === 0 ? (
          <div style={{ textAlign: "center", padding: 25, color: "#64748b", fontSize: 13 }}>Chưa có dữ liệu. Thêm sự kiện tại thẻ Nhập liệu.</div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: "#5eead4", fontWeight: 600, marginBottom: 8 }}>Lũy kế theo năm</div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={barData}>
                    <XAxis dataKey="year" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 11, color: "#e2e8f0" }} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    {CATEGORIES.map(c => <Bar key={c.id} dataKey={c.id} name={c.label} fill={c.color} stackId="a" />)}
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#5eead4", fontWeight: 600, marginBottom: 8 }}>Phân bố tổng thể</div>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={85} dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 10 }}>
                      {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 11, color: "#e2e8f0" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <div style={{ padding: "8px 14px", background: "rgba(20,184,166,0.06)", borderRadius: 8, fontSize: 12 }}>
                <span style={{ color: "#5eead4", fontWeight: 700 }}>{events.length}</span> <span style={{ color: "#94a3b8" }}>tổng sự kiện</span>
              </div>
              <div style={{ padding: "8px 14px", background: "rgba(239,68,68,0.06)", borderRadius: 8, fontSize: 12 }}>
                <span style={{ color: "#fca5a5", fontWeight: 700 }}>{events.filter(e => e.isAbnormal).length}</span> <span style={{ color: "#94a3b8" }}>bất thường</span>
              </div>
              <div style={{ padding: "8px 14px", background: "rgba(139,92,246,0.06)", borderRadius: 8, fontSize: 12 }}>
                <span style={{ color: "#a78bfa", fontWeight: 700 }}>{reports.length}</span> <span style={{ color: "#94a3b8" }}>báo cáo đã lưu</span>
              </div>
            </div>
          </>
        )}
      </Section>

      <Section title="📁 Lịch sử báo cáo đã lưu">
        {reports.length === 0 ? (
          <div style={{ textAlign: "center", padding: 25, color: "#64748b", fontSize: 13 }}>
            Chưa có báo cáo. Tạo tại thẻ Dòng thời gian → Phân tích bất thường → Lưu báo cáo.
          </div>
        ) : (
          reports.map((r, i) => (
            <div key={r.id} style={{
              padding: "12px 16px", borderRadius: 8, marginBottom: 6,
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
              display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap",
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>Báo cáo #{i + 1} — {new Date(r.date).toLocaleString("vi-VN")}</div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Mục đích: {r.purpose || "Không xác định"} | {r.events?.length || 0} sự kiện</div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <Btn icon={I.timeline} onClick={() => setViewTL(r)} color="#06b6d4" small>Dòng thời gian</Btn>
                <Btn icon={I.eye} onClick={() => setViewRpt(r)} color="#14b8a6" small>Xem phân tích</Btn>
              </div>
            </div>
          ))
        )}
      </Section>

      {viewRpt && (
        <Modal title="📋 Chi tiết báo cáo" onClose={() => setViewRpt(null)}>
          <div style={{ fontSize: 12, color: "#5eead4", marginBottom: 14, padding: "6px 10px", background: "rgba(20,184,166,0.06)", borderRadius: 6 }}>
            <strong>Mục đích:</strong> {viewRpt.purpose}
          </div>
          {viewRpt.aiReport?.batThuong?.map((a, i) => (
            <div key={i} style={{ padding: 12, marginBottom: 8, background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 8, fontSize: 12 }}>
              <div style={{ fontWeight: 700, color: "#fca5a5", marginBottom: 4 }}>Bất thường #{a.stt}: {a.ten}</div>
              <div style={{ color: "#94a3b8", fontSize: 11 }}>⏱ {a.thoiGian}</div>
              <div style={{ marginTop: 5, lineHeight: 1.6 }}>{a.chiTiet}</div>
              <div style={{ marginTop: 6 }}><SeverityBadge level={a.mucDo} /></div>
            </div>
          ))}
          {viewRpt.aiReport?.ketLuan && (
            <div style={{ padding: 12, background: "rgba(20,184,166,0.08)", border: "2px solid rgba(20,184,166,0.2)", borderRadius: 8, fontSize: 12, marginTop: 4 }}>
              <strong style={{ color: "#5eead4" }}>Kết luận:</strong> <span style={{ lineHeight: 1.6 }}>{viewRpt.aiReport.ketLuan}</span>
            </div>
          )}
          {viewRpt.aiSeverity?.mucDoTongThe && (
            <div style={{ marginTop: 12, padding: 12, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 8, fontSize: 12 }}>
              <strong style={{ color: "#fbbf24" }}>Mức nghiêm trọng:</strong> {viewRpt.aiSeverity.mucDoTongThe} ({viewRpt.aiSeverity.diem}/10)
              <div style={{ marginTop: 4, color: "#94a3b8" }}>{viewRpt.aiSeverity.lyDo}</div>
            </div>
          )}
        </Modal>
      )}

      {viewTL && (
        <Modal title="📊 Dòng thời gian" onClose={() => setViewTL(null)} wide>
          <div style={{ overflowX: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", minWidth: (viewTL.events?.length || 1) * 200, position: "relative", padding: "20px 8px" }}>
              <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 3, background: "linear-gradient(90deg, #14b8a6, #06b6d4)", borderRadius: 2 }} />
              {(viewTL.events || []).sort((a, b) => parseDateTime(a.date, a.time) - parseDateTime(b.date, b.time)).map((e, i) => (
                <div key={e.id || i} style={{ flex: "0 0 190px", position: "relative", display: "flex", flexDirection: "column", alignItems: "center", zIndex: 1 }}>
                  <div style={{ width: 170, padding: "7px 9px", marginBottom: 8, background: e.isAbnormal ? "rgba(239,68,68,0.07)" : "rgba(20,184,166,0.05)", border: `1px solid ${e.isAbnormal ? "rgba(239,68,68,0.2)" : "rgba(20,184,166,0.1)"}`, borderRadius: 6, fontSize: 10 }}>
                    <div style={{ fontWeight: 700, color: e.isAbnormal ? "#fca5a5" : "#5eead4" }}>{e.date}</div>
                    <div>{e.requester} • {e.department}</div>
                  </div>
                  <div style={{ width: e.isAbnormal ? 14 : 10, height: e.isAbnormal ? 14 : 10, borderRadius: "50%", background: e.isAbnormal ? "#ef4444" : "#14b8a6", border: `2px solid ${e.isAbnormal ? "#fca5a5" : "#5eead4"}`, zIndex: 2 }} />
                  <div style={{ width: 170, padding: "7px 9px", marginTop: 8, fontSize: 10, color: e.isAbnormal ? "#f87171" : "#94a3b8", fontWeight: e.isAbnormal ? 600 : 400, lineHeight: 1.5 }}>
                    {e.shortDesc || e.description?.slice(0, 50)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
