import { useState, useEffect, useMemo, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";

const BU_LIST = ["BU1", "BU2", "BU3", "BU4", "LAB HO", "LAB-DONAVET", "GC", "KHÁC"];
const LEVELS = ["NV", "TP", "TPCC", "GD"];
const TICKET_TYPES = ["Raise ticket", "Thông báo", "Phản hồi ticket"];
const MONTHS = ["T1","T2","T3","T4","T5","T6","T7","T8","T9","T10","T11","T12"];

const DEFAULT_POINTS = {
  raise: { NV: 10, TP: 1, TPCC: 0.5, GD_subordinate: 0.1, GD_self: 20 },
  announce: { GD: 5, TPCC: 1 },
  feedback: { GD: 4, TPCC: 3, TP: 2, NV: 1 },
  useful: { raiser: 100, announcer: 15, responder: 10 },
  timePerPoint: 2
};

const DEFAULT_STAFF = [
  { id: "GD01", name: "Nguyễn Văn A", level: "GD", bu: "BU1", reportsTo: null },
  { id: "TPCC01", name: "Trần Thị B", level: "TPCC", bu: "BU1", reportsTo: "GD01" },
  { id: "TPCC02", name: "Lê Văn C", level: "TPCC", bu: "BU2", reportsTo: "GD01" },
  { id: "TP01", name: "Phạm Thị D", level: "TP", bu: "BU1", reportsTo: "TPCC01" },
  { id: "TP02", name: "Hoàng Văn E", level: "TP", bu: "BU2", reportsTo: "TPCC02" },
  { id: "NV01", name: "Ngô Thị F", level: "NV", bu: "BU1", reportsTo: "TP01" },
  { id: "NV02", name: "Đỗ Văn G", level: "NV", bu: "BU1", reportsTo: "TP01" },
  { id: "NV03", name: "Vũ Thị H", level: "NV", bu: "BU2", reportsTo: "TP02" },
];

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

function genTicketCode(type, bu, date) {
  const prefix = type === "Raise ticket" ? "RT" : type === "Thông báo" ? "TB" : "PH";
  const buCode = bu.replace(/\s+/g, "").replace(/-/g, "");
  const d = new Date(date);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear());
  return `${prefix}-${buCode}-${dd}${mm}${yy}`;
}

function calcPoints(ticket, staff, pointConfig) {
  const pts = [];
  const raiser = staff.find(s => s.id === ticket.raiserId);
  if (!raiser) return pts;

  if (ticket.type === "Raise ticket") {
    if (raiser.level === "GD") {
      pts.push({ staffId: raiser.id, points: ticket.customPoints ?? pointConfig.raise.GD_self, type: "raise" });
    } else {
      pts.push({ staffId: raiser.id, points: ticket.customPoints ?? pointConfig.raise[raiser.level], type: "raise" });
      const tp = raiser.level === "NV" ? staff.find(s => s.id === raiser.reportsTo) : null;
      const tpcc = tp ? staff.find(s => s.id === tp.reportsTo) : raiser.level === "TP" ? staff.find(s => s.id === raiser.reportsTo) : null;
      if (tp && tp.level === "TP") pts.push({ staffId: tp.id, points: pointConfig.raise.TP, type: "raise_mgr" });
      if (tpcc && tpcc.level === "TPCC") pts.push({ staffId: tpcc.id, points: pointConfig.raise.TPCC, type: "raise_mgr" });
      if (raiser.level === "TP") {
        const tpccDirect = staff.find(s => s.id === raiser.reportsTo);
        if (tpccDirect && tpccDirect.level === "TPCC") pts.push({ staffId: tpccDirect.id, points: pointConfig.raise.TPCC, type: "raise_mgr" });
      }
      const gd = staff.find(s => s.level === "GD");
      if (gd) pts.push({ staffId: gd.id, points: pointConfig.raise.GD_subordinate, type: "raise_mgr" });
    }
  } else if (ticket.type === "Thông báo") {
    if (raiser.level === "GD") pts.push({ staffId: raiser.id, points: pointConfig.announce.GD, type: "announce" });
    else if (raiser.level === "TPCC") pts.push({ staffId: raiser.id, points: pointConfig.announce.TPCC, type: "announce" });
  } else if (ticket.type === "Phản hồi ticket") {
    pts.push({ staffId: raiser.id, points: pointConfig.feedback[raiser.level] ?? 1, type: "feedback" });
  }
  return pts;
}

// ==================== MAIN APP ====================
export default function RaiseTicketApp() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [staff, setStaff] = useState(() => {
    try { const s = localStorage.getItem("rt_staff"); return s ? JSON.parse(s) : DEFAULT_STAFF; } catch { return DEFAULT_STAFF; }
  });
  const [tickets, setTickets] = useState(() => {
    try { const t = localStorage.getItem("rt_tickets"); return t ? JSON.parse(t) : []; } catch { return []; }
  });
  const [pointConfig, setPointConfig] = useState(() => {
    try { const p = localStorage.getItem("rt_points"); return p ? JSON.parse(p) : DEFAULT_POINTS; } catch { return DEFAULT_POINTS; }
  });
  const [emails, setEmails] = useState(() => {
    try { const e = localStorage.getItem("rt_emails"); return e ? JSON.parse(e) : [""]; } catch { return [""]; }
  });

  useEffect(() => { try { localStorage.setItem("rt_staff", JSON.stringify(staff)); } catch {} }, [staff]);
  useEffect(() => { try { localStorage.setItem("rt_tickets", JSON.stringify(tickets)); } catch {} }, [tickets]);
  useEffect(() => { try { localStorage.setItem("rt_points", JSON.stringify(pointConfig)); } catch {} }, [pointConfig]);
  useEffect(() => { try { localStorage.setItem("rt_emails", JSON.stringify(emails)); } catch {} }, [emails]);

  const allPoints = useMemo(() => {
    const map = {};
    staff.forEach(s => { map[s.id] = { total: 0, useful: 0, ticketCount: 0 }; });
    tickets.forEach(t => {
      const pts = calcPoints(t, staff, pointConfig);
      pts.forEach(p => {
        if (!map[p.staffId]) map[p.staffId] = { total: 0, useful: 0, ticketCount: 0 };
        map[p.staffId].total += p.points;
      });
      if (map[t.raiserId]) map[t.raiserId].ticketCount += 1;
      if (t.useful) {
        if (map[t.raiserId]) {
          const raiser = staff.find(s => s.id === t.raiserId);
          if (t.type === "Raise ticket") map[t.raiserId].useful += pointConfig.useful.raiser;
          else if (t.type === "Thông báo") map[t.raiserId].useful += pointConfig.useful.announcer;
          else map[t.raiserId].useful += pointConfig.useful.responder;
        }
      }
    });
    return map;
  }, [tickets, staff, pointConfig]);

  const tabs = [
    { key: "dashboard", label: "📊 Dashboard", icon: "📊" },
    { key: "input", label: "📝 Nhập Ticket", icon: "📝" },
    { key: "tickets", label: "🎫 DS Ticket", icon: "🎫" },
    { key: "admin", label: "⚙️ Quản lý GĐ", icon: "⚙️" },
    { key: "guide_input", label: "📖 HD Nhập liệu", icon: "📖" },
    { key: "guide_formula", label: "📐 Công thức", icon: "📐" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(145deg, #0a0f1a 0%, #0d1b2a 40%, #1a1a2e 100%)", color: "#e0e6ed", fontFamily: "'Segoe UI', 'Noto Sans', sans-serif" }}>
      <header style={{ background: "linear-gradient(90deg, #0d2137 0%, #143d5e 50%, #0d2137 100%)", borderBottom: "2px solid #00d4aa", padding: "16px 24px", display: "flex", alignItems: "center", gap: 16, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #00d4aa, #00a8cc)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "#0a0f1a" }}>RT</div>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#00d4aa", letterSpacing: 1 }}>RAISE TICKET</h1>
          <p style={{ margin: 0, fontSize: 11, color: "#7a8a9e", letterSpacing: 2, textTransform: "uppercase" }}>Green Feed Vietnam — QA Innovation Tracker</p>
        </div>
      </header>

      <nav style={{ display: "flex", gap: 4, padding: "12px 24px", background: "rgba(13,33,55,0.6)", borderBottom: "1px solid rgba(0,212,170,0.15)", overflowX: "auto" }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            padding: "10px 18px", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
            background: activeTab === t.key ? "linear-gradient(135deg, #00d4aa, #00a8cc)" : "rgba(255,255,255,0.04)",
            color: activeTab === t.key ? "#0a0f1a" : "#7a8a9e",
            transition: "all 0.2s"
          }}>{t.label}</button>
        ))}
      </nav>

      <main style={{ padding: "20px 24px", maxWidth: 1400, margin: "0 auto" }}>
        {activeTab === "input" && <TicketInputCard staff={staff} tickets={tickets} setTickets={setTickets} pointConfig={pointConfig} />}
        {activeTab === "admin" && <AdminCard staff={staff} setStaff={setStaff} pointConfig={pointConfig} setPointConfig={setPointConfig} emails={emails} setEmails={setEmails} tickets={tickets} setTickets={setTickets} />}
        {activeTab === "guide_input" && <GuideInputCard />}
        {activeTab === "guide_formula" && <GuideFormulaCard pointConfig={pointConfig} />}
        {activeTab === "dashboard" && <DashboardCard tickets={tickets} staff={staff} pointConfig={pointConfig} allPoints={allPoints} />}
        {activeTab === "tickets" && <TicketListCard tickets={tickets} staff={staff} setTickets={setTickets} pointConfig={pointConfig} />}
      </main>
    </div>
  );
}

// ==================== CARD WRAPPER ====================
function Card({ title, subtitle, children, accent = "#00d4aa" }) {
  return (
    <div style={{ background: "linear-gradient(145deg, rgba(20,40,65,0.8), rgba(15,25,45,0.9))", border: `1px solid ${accent}33`, borderRadius: 16, padding: 24, marginBottom: 20, backdropFilter: "blur(10px)" }}>
      {title && <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: accent }}>{title}</h2>}
      {subtitle && <p style={{ margin: "0 0 16px", fontSize: 12, color: "#7a8a9e" }}>{subtitle}</p>}
      {children}
    </div>
  );
}

function Field({ label, children, w = "100%" }) {
  return (
    <div style={{ width: w, minWidth: 0 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#7a8a9e", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = { width: "100%", padding: "10px 12px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(0,212,170,0.2)", borderRadius: 8, color: "#e0e6ed", fontSize: 13, outline: "none", boxSizing: "border-box" };
const selectStyle = { ...inputStyle, cursor: "pointer" };
const btnPrimary = { padding: "10px 24px", background: "linear-gradient(135deg, #00d4aa, #00a8cc)", color: "#0a0f1a", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" };
const btnSecondary = { padding: "8px 16px", background: "rgba(0,212,170,0.1)", color: "#00d4aa", border: "1px solid rgba(0,212,170,0.3)", borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: "pointer" };

// ==================== TICKET INPUT ====================
function TicketInputCard({ staff, tickets, setTickets, pointConfig }) {
  const [form, setForm] = useState({ type: "Raise ticket", bu: "BU1", raiserId: "", what: "", why: "", where: "", when: "", how: "", note: "" });
  const [msg, setMsg] = useState("");

  const filteredStaff = useMemo(() => {
    let list = staff.filter(s => s.bu === form.bu || s.level === "GD");
    if (form.type === "Thông báo") list = list.filter(s => s.level === "GD" || s.level === "TPCC");
    return list;
  }, [staff, form.bu, form.type]);

  const handleSubmit = () => {
    if (!form.raiserId) { setMsg("⚠️ Vui lòng chọn người thực hiện"); return; }
    if (!form.what.trim()) { setMsg("⚠️ Vui lòng nhập nội dung WHAT"); return; }
    const raiser = staff.find(s => s.id === form.raiserId);
    const code = genTicketCode(form.type, form.bu, new Date().toISOString());
    const ticket = {
      id: genId(), code: code + "-" + (tickets.length + 1).toString().padStart(3, "0"),
      type: form.type, bu: form.bu, raiserId: form.raiserId,
      raiserName: raiser?.name || "", raiserLevel: raiser?.level || "",
      what: form.what, why: form.why, where: form.where, when: form.when, how: form.how, note: form.note,
      date: new Date().toISOString(), useful: false, customPoints: null
    };
    setTickets(prev => [ticket, ...prev]);
    setForm({ type: "Raise ticket", bu: form.bu, raiserId: "", what: "", why: "", where: "", when: "", how: "", note: "" });
    setMsg(`✅ Đã tạo ticket ${ticket.code} thành công!`);
    setTimeout(() => setMsg(""), 3000);
  };

  return (
    <Card title="📝 Nhập Ticket Mới" subtitle="Tạo Raise ticket, Thông báo hoặc Phản hồi ticket">
      {msg && <div style={{ padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13, background: msg.startsWith("✅") ? "rgba(0,212,170,0.15)" : "rgba(255,170,0,0.15)", color: msg.startsWith("✅") ? "#00d4aa" : "#ffaa00" }}>{msg}</div>}
      
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
        <Field label="Loại Ticket">
          <select style={selectStyle} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value, raiserId: "" }))}>
            {TICKET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="BU / Đơn vị">
          <select style={selectStyle} value={form.bu} onChange={e => setForm(f => ({ ...f, bu: e.target.value, raiserId: "" }))}>
            {BU_LIST.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </Field>
        <Field label="Người thực hiện">
          <select style={selectStyle} value={form.raiserId} onChange={e => setForm(f => ({ ...f, raiserId: e.target.value }))}>
            <option value="">-- Chọn --</option>
            {filteredStaff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.level})</option>)}
          </select>
        </Field>
      </div>

      <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 600, color: "#00d4aa" }}>📋 Mô tả sáng kiến (4W1H)</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
          <Field label="WHAT – Nội dung sáng kiến *">
            <textarea style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} value={form.what} onChange={e => setForm(f => ({ ...f, what: e.target.value }))} placeholder="Mô tả chi tiết sáng kiến..." />
          </Field>
          <Field label="WHY – Lý do / Mục đích">
            <textarea style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} value={form.why} onChange={e => setForm(f => ({ ...f, why: e.target.value }))} placeholder="Tại sao cần thực hiện..." />
          </Field>
          <Field label="WHERE – Áp dụng ở đâu">
            <input style={inputStyle} value={form.where} onChange={e => setForm(f => ({ ...f, where: e.target.value }))} placeholder="Vị trí / Khu vực áp dụng" />
          </Field>
          <Field label="WHEN – Thời gian">
            <input style={inputStyle} value={form.when} onChange={e => setForm(f => ({ ...f, when: e.target.value }))} placeholder="Thời gian thực hiện" />
          </Field>
          <Field label="HOW – Cách thực hiện">
            <textarea style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} value={form.how} onChange={e => setForm(f => ({ ...f, how: e.target.value }))} placeholder="Phương pháp thực hiện..." />
          </Field>
          <Field label="Ghi chú thêm">
            <textarea style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Thông tin bổ sung..." />
          </Field>
        </div>
      </div>

      <button style={btnPrimary} onClick={handleSubmit}>🚀 Tạo Ticket</button>
    </Card>
  );
}

// ==================== ADMIN CARD ====================
function AdminCard({ staff, setStaff, pointConfig, setPointConfig, emails, setEmails, tickets, setTickets }) {
  const [showPoints, setShowPoints] = useState(false);
  const [showStaff, setShowStaff] = useState(false);
  const [showEmails, setShowEmails] = useState(false);
  const [newStaff, setNewStaff] = useState({ id: "", name: "", level: "NV", bu: "BU1", reportsTo: "" });
  const [editLine, setEditLine] = useState(null);
  const [localPts, setLocalPts] = useState(pointConfig);

  const savePoints = () => { setPointConfig(localPts); };

  const addStaffMember = () => {
    if (!newStaff.id || !newStaff.name) return;
    if (staff.find(s => s.id === newStaff.id)) return;
    setStaff(prev => [...prev, { ...newStaff }]);
    setNewStaff({ id: "", name: "", level: "NV", bu: "BU1", reportsTo: "" });
  };

  const removeStaff = (id) => { setStaff(prev => prev.filter(s => s.id !== id)); };

  const updateReportsTo = (id, newReportsTo) => {
    setStaff(prev => prev.map(s => s.id === id ? { ...s, reportsTo: newReportsTo } : s));
  };

  return (
    <>
      {/* Reporting Line */}
      <Card title="🔗 Line Báo Cáo" subtitle="Cập nhật quan hệ báo cáo trực tiếp (NV → TP → TPCC → GĐ)">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid rgba(0,212,170,0.3)" }}>
                {["Mã NV", "Tên", "Cấp", "BU", "Báo cáo cho"].map(h => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "#00d4aa", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staff.map(s => (
                <tr key={s.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={{ padding: "8px 12px", fontFamily: "monospace", color: "#00d4aa" }}>{s.id}</td>
                  <td style={{ padding: "8px 12px" }}>{s.name}</td>
                  <td style={{ padding: "8px 12px" }}><span style={{ background: s.level === "GD" ? "#ff6b6b33" : s.level === "TPCC" ? "#ffa50033" : s.level === "TP" ? "#00d4aa33" : "#4dabf733", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>{s.level}</span></td>
                  <td style={{ padding: "8px 12px" }}>{s.bu}</td>
                  <td style={{ padding: "8px 12px" }}>
                    <select style={{ ...selectStyle, padding: "6px 8px" }} value={s.reportsTo || ""} onChange={e => updateReportsTo(s.id, e.target.value)}>
                      <option value="">-- Không --</option>
                      {staff.filter(x => x.id !== s.id).map(x => <option key={x.id} value={x.id}>{x.name} ({x.level})</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Point Adjustment */}
      <Card title="📊 Điều Chỉnh Điểm" subtitle="GĐ điều chỉnh cấu hình điểm cho từng loại ticket">
        <button style={btnSecondary} onClick={() => setShowPoints(!showPoints)}>{showPoints ? "▲ Thu gọn" : "▼ Xem & Chỉnh sửa điểm"}</button>
        {showPoints && (
          <div style={{ marginTop: 16 }}>
            <h4 style={{ color: "#00d4aa", fontSize: 13, marginBottom: 8 }}>Raise Ticket</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginBottom: 16 }}>
              {[["NV", "raise", "NV"], ["TP (quản lý)", "raise", "TP"], ["TPCC (quản lý)", "raise", "TPCC"], ["GĐ (cấp dưới raise)", "raise", "GD_subordinate"], ["GĐ (tự raise)", "raise", "GD_self"]].map(([label, cat, key]) => (
                <Field key={key} label={label}>
                  <input type="number" step="0.1" style={inputStyle} value={localPts[cat][key]} onChange={e => setLocalPts(p => ({ ...p, [cat]: { ...p[cat], [key]: parseFloat(e.target.value) || 0 } }))} />
                </Field>
              ))}
            </div>
            <h4 style={{ color: "#00d4aa", fontSize: 13, marginBottom: 8 }}>Thông báo</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginBottom: 16 }}>
              {[["GĐ", "announce", "GD"], ["TPCC", "announce", "TPCC"]].map(([label, cat, key]) => (
                <Field key={key} label={label}>
                  <input type="number" step="0.1" style={inputStyle} value={localPts[cat][key]} onChange={e => setLocalPts(p => ({ ...p, [cat]: { ...p[cat], [key]: parseFloat(e.target.value) || 0 } }))} />
                </Field>
              ))}
            </div>
            <h4 style={{ color: "#00d4aa", fontSize: 13, marginBottom: 8 }}>Phản hồi Ticket</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginBottom: 16 }}>
              {LEVELS.map(l => (
                <Field key={l} label={l}>
                  <input type="number" step="0.1" style={inputStyle} value={localPts.feedback[l]} onChange={e => setLocalPts(p => ({ ...p, feedback: { ...p.feedback, [l]: parseFloat(e.target.value) || 0 } }))} />
                </Field>
              ))}
            </div>
            <h4 style={{ color: "#00d4aa", fontSize: 13, marginBottom: 8 }}>Sáng kiến hữu ích</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginBottom: 16 }}>
              {[["Người raise", "useful", "raiser"], ["Người thông báo", "useful", "announcer"], ["Người phản hồi", "useful", "responder"]].map(([label, cat, key]) => (
                <Field key={key} label={label}>
                  <input type="number" step="1" style={inputStyle} value={localPts[cat][key]} onChange={e => setLocalPts(p => ({ ...p, [cat]: { ...p[cat], [key]: parseFloat(e.target.value) || 0 } }))} />
                </Field>
              ))}
            </div>
            <h4 style={{ color: "#00d4aa", fontSize: 13, marginBottom: 8 }}>Quy đổi thời gian</h4>
            <Field label="Phút / Điểm">
              <input type="number" step="0.5" style={{ ...inputStyle, maxWidth: 200 }} value={localPts.timePerPoint} onChange={e => setLocalPts(p => ({ ...p, timePerPoint: parseFloat(e.target.value) || 1 }))} />
            </Field>
            <button style={{ ...btnPrimary, marginTop: 12 }} onClick={savePoints}>💾 Lưu cấu hình điểm</button>
          </div>
        )}
      </Card>

      {/* Staff Management */}
      <Card title="👥 Quản Lý Nhân Sự" subtitle="Thêm, xóa nhân sự">
        <button style={btnSecondary} onClick={() => setShowStaff(!showStaff)}>{showStaff ? "▲ Thu gọn" : "▼ Quản lý nhân sự"}</button>
        {showStaff && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginBottom: 12 }}>
              <Field label="Mã NV"><input style={inputStyle} value={newStaff.id} onChange={e => setNewStaff(s => ({ ...s, id: e.target.value }))} placeholder="VD: NV04" /></Field>
              <Field label="Tên"><input style={inputStyle} value={newStaff.name} onChange={e => setNewStaff(s => ({ ...s, name: e.target.value }))} /></Field>
              <Field label="Cấp">
                <select style={selectStyle} value={newStaff.level} onChange={e => setNewStaff(s => ({ ...s, level: e.target.value }))}>
                  {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </Field>
              <Field label="BU">
                <select style={selectStyle} value={newStaff.bu} onChange={e => setNewStaff(s => ({ ...s, bu: e.target.value }))}>
                  {BU_LIST.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </Field>
              <Field label="Báo cáo cho">
                <select style={selectStyle} value={newStaff.reportsTo} onChange={e => setNewStaff(s => ({ ...s, reportsTo: e.target.value }))}>
                  <option value="">-- Không --</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.level})</option>)}
                </select>
              </Field>
            </div>
            <button style={btnPrimary} onClick={addStaffMember}>➕ Thêm nhân sự</button>
            <div style={{ marginTop: 16 }}>
              {staff.map(s => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 13 }}>
                  <span><strong style={{ color: "#00d4aa" }}>{s.id}</strong> — {s.name} ({s.level}, {s.bu})</span>
                  <button onClick={() => removeStaff(s.id)} style={{ background: "rgba(255,80,80,0.2)", color: "#ff5050", border: "none", borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontSize: 11 }}>Xóa</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Email Config */}
      <Card title="📧 Email Báo Cáo" subtitle="Danh sách email nhận báo cáo">
        <button style={btnSecondary} onClick={() => setShowEmails(!showEmails)}>{showEmails ? "▲ Thu gọn" : "▼ Cập nhật email"}</button>
        {showEmails && (
          <div style={{ marginTop: 16 }}>
            {emails.map((em, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input style={{ ...inputStyle, flex: 1 }} value={em} onChange={e => { const copy = [...emails]; copy[i] = e.target.value; setEmails(copy); }} placeholder="email@greenfeed.com" />
                <button onClick={() => setEmails(emails.filter((_, j) => j !== i))} style={{ background: "rgba(255,80,80,0.15)", color: "#ff5050", border: "none", borderRadius: 8, padding: "0 12px", cursor: "pointer" }}>✕</button>
              </div>
            ))}
            <button style={btnSecondary} onClick={() => setEmails([...emails, ""])}>➕ Thêm email</button>
          </div>
        )}
      </Card>
    </>
  );
}

// ==================== TICKET LIST ====================
function TicketListCard({ tickets, staff, setTickets, pointConfig }) {
  const [filter, setFilter] = useState({ type: "", bu: "" });
  const filtered = tickets.filter(t => (!filter.type || t.type === filter.type) && (!filter.bu || t.bu === filter.bu));

  const toggleUseful = (id) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, useful: !t.useful } : t));
  };

  const updateCustomPoints = (id, val) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, customPoints: val === "" ? null : parseFloat(val) } : t));
  };

  const deleteTicket = (id) => { setTickets(prev => prev.filter(t => t.id !== id)); };

  return (
    <Card title="🎫 Danh Sách Ticket" subtitle={`Tổng: ${tickets.length} ticket`}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <select style={{ ...selectStyle, width: "auto" }} value={filter.type} onChange={e => setFilter(f => ({ ...f, type: e.target.value }))}>
          <option value="">Tất cả loại</option>
          {TICKET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select style={{ ...selectStyle, width: "auto" }} value={filter.bu} onChange={e => setFilter(f => ({ ...f, bu: e.target.value }))}>
          <option value="">Tất cả BU</option>
          {BU_LIST.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>
      <div style={{ overflowX: "auto" }}>
        {filtered.length === 0 ? <p style={{ color: "#7a8a9e", textAlign: "center", padding: 20 }}>Chưa có ticket nào</p> : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid rgba(0,212,170,0.3)" }}>
                {["Mã Ticket", "Loại", "BU", "Người tạo", "Ngày", "WHAT", "Hữu ích", "Điểm tùy chỉnh", ""].map(h => (
                  <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: "#00d4aa", fontWeight: 600, fontSize: 10, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ padding: "8px 10px", fontFamily: "monospace", color: "#00d4aa", fontSize: 11 }}>{t.code}</td>
                  <td style={{ padding: "8px 10px" }}><span style={{ background: t.type === "Raise ticket" ? "#00d4aa22" : t.type === "Thông báo" ? "#ffa50022" : "#4dabf722", padding: "2px 6px", borderRadius: 4, fontSize: 11 }}>{t.type}</span></td>
                  <td style={{ padding: "8px 10px" }}>{t.bu}</td>
                  <td style={{ padding: "8px 10px" }}>{t.raiserName} <span style={{ color: "#7a8a9e" }}>({t.raiserLevel})</span></td>
                  <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{new Date(t.date).toLocaleDateString("vi-VN")}</td>
                  <td style={{ padding: "8px 10px", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.what}</td>
                  <td style={{ padding: "8px 10px", textAlign: "center" }}>
                    <button onClick={() => toggleUseful(t.id)} style={{ background: t.useful ? "#00d4aa" : "rgba(255,255,255,0.08)", border: "none", borderRadius: 4, padding: "4px 10px", cursor: "pointer", color: t.useful ? "#0a0f1a" : "#7a8a9e", fontWeight: 700, fontSize: 11 }}>
                      {t.useful ? "✅ Có" : "—"}
                    </button>
                  </td>
                  <td style={{ padding: "8px 10px" }}>
                    <input type="number" step="1" style={{ ...inputStyle, width: 70, padding: "4px 6px", textAlign: "center" }} value={t.customPoints ?? ""} onChange={e => updateCustomPoints(t.id, e.target.value)} placeholder="—" />
                  </td>
                  <td style={{ padding: "8px 10px" }}>
                    <button onClick={() => deleteTicket(t.id)} style={{ background: "rgba(255,80,80,0.15)", color: "#ff5050", border: "none", borderRadius: 4, padding: "4px 8px", cursor: "pointer", fontSize: 10 }}>🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}

// ==================== GUIDE INPUT ====================
function GuideInputCard() {
  const steps = [
    { level: "NV", color: "#4dabf7", desc: "Nhân viên nhập Raise ticket hoặc Phản hồi ticket", detail: "Chọn BU → Chọn tên NV → Chọn loại ticket → Điền 4W1H → Tạo ticket. NV được 10đ/raise, 1đ/phản hồi." },
    { level: "TP", color: "#00d4aa", desc: "Trưởng phòng nhập Raise ticket hoặc Phản hồi ticket", detail: "Chọn BU → Chọn tên TP → Nhập ticket. TP được 10đ/raise, 2đ/phản hồi. TP quản lý NV raise được +1đ." },
    { level: "TPCC", color: "#ffa500", desc: "TP Chất Chế nhập Raise ticket, Thông báo hoặc Phản hồi", detail: "TPCC được 10đ/raise, 1đ/thông báo, 3đ/phản hồi. TPCC quản lý TP của NV raise được +0.5đ." },
    { level: "GĐ", color: "#ff6b6b", desc: "Giám đốc nhập tất cả loại ticket + quản lý hệ thống", detail: "GĐ raise được 20đ, thông báo 5đ, phản hồi 4đ. GĐ cũng +0.1đ khi cấp dưới raise. GĐ xác nhận sáng kiến hữu ích." },
  ];

  return (
    <Card title="📖 Hướng Dẫn Nhập Liệu" subtitle="Quy trình nhập ticket cho từng cấp">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {steps.map((s, i) => (
          <div key={s.level} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            <div style={{ minWidth: 56, textAlign: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: `${s.color}22`, border: `2px solid ${s.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: s.color, margin: "0 auto" }}>{s.level}</div>
              {i < steps.length - 1 && <div style={{ width: 2, height: 40, background: `${s.color}44`, margin: "4px auto" }} />}
            </div>
            <div style={{ flex: 1, background: "rgba(0,0,0,0.2)", borderRadius: 10, padding: 14, borderLeft: `3px solid ${s.color}` }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: s.color }}>{s.desc}</p>
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "#a0aec0", lineHeight: 1.6 }}>{s.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24, background: "rgba(0,212,170,0.08)", borderRadius: 10, padding: 16, border: "1px solid rgba(0,212,170,0.2)" }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#00d4aa", marginBottom: 8 }}>📌 Quy tắc mã ticket</p>
        <div style={{ fontSize: 12, color: "#a0aec0", lineHeight: 1.8 }}>
          <div><strong style={{ color: "#e0e6ed" }}>Raise ticket:</strong> RT-[Mã BU]-[DDMMYYYY]-[STT]</div>
          <div><strong style={{ color: "#e0e6ed" }}>Thông báo:</strong> TB-[Mã BU]-[DDMMYYYY]-[STT]</div>
          <div><strong style={{ color: "#e0e6ed" }}>Phản hồi:</strong> PH-[Mã BU]-[DDMMYYYY]-[STT]</div>
        </div>
      </div>
    </Card>
  );
}

// ==================== GUIDE FORMULA ====================
function GuideFormulaCard({ pointConfig }) {
  return (
    <Card title="📐 Công Thức Tính Toán & Hợp Nhất" subtitle="Chi tiết cách tính điểm và quy đổi thời gian">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        {/* Raise Ticket */}
        <div style={{ background: "rgba(0,212,170,0.06)", borderRadius: 10, padding: 16, border: "1px solid rgba(0,212,170,0.15)" }}>
          <h4 style={{ margin: "0 0 10px", color: "#00d4aa", fontSize: 14 }}>🎫 Raise Ticket</h4>
          <div style={{ fontSize: 12, color: "#a0aec0", lineHeight: 2 }}>
            <div>NV raise → NV: <strong style={{ color: "#e0e6ed" }}>+{pointConfig.raise.NV}đ</strong></div>
            <div>TP quản lý → TP: <strong style={{ color: "#e0e6ed" }}>+{pointConfig.raise.TP}đ</strong></div>
            <div>TPCC quản lý → TPCC: <strong style={{ color: "#e0e6ed" }}>+{pointConfig.raise.TPCC}đ</strong></div>
            <div>GĐ (cấp dưới raise) → GĐ: <strong style={{ color: "#e0e6ed" }}>+{pointConfig.raise.GD_subordinate}đ</strong></div>
            <div>GĐ tự raise → GĐ: <strong style={{ color: "#e0e6ed" }}>+{pointConfig.raise.GD_self}đ</strong></div>
          </div>
        </div>

        {/* Thông báo */}
        <div style={{ background: "rgba(255,165,0,0.06)", borderRadius: 10, padding: 16, border: "1px solid rgba(255,165,0,0.15)" }}>
          <h4 style={{ margin: "0 0 10px", color: "#ffa500", fontSize: 14 }}>📢 Thông Báo</h4>
          <div style={{ fontSize: 12, color: "#a0aec0", lineHeight: 2 }}>
            <div>GĐ thông báo: <strong style={{ color: "#e0e6ed" }}>+{pointConfig.announce.GD}đ</strong></div>
            <div>TPCC thông báo: <strong style={{ color: "#e0e6ed" }}>+{pointConfig.announce.TPCC}đ</strong></div>
          </div>
        </div>

        {/* Phản hồi */}
        <div style={{ background: "rgba(77,171,247,0.06)", borderRadius: 10, padding: 16, border: "1px solid rgba(77,171,247,0.15)" }}>
          <h4 style={{ margin: "0 0 10px", color: "#4dabf7", fontSize: 14 }}>💬 Phản Hồi Ticket</h4>
          <div style={{ fontSize: 12, color: "#a0aec0", lineHeight: 2 }}>
            {LEVELS.map(l => <div key={l}>{l}: <strong style={{ color: "#e0e6ed" }}>+{pointConfig.feedback[l]}đ</strong></div>)}
          </div>
        </div>

        {/* Sáng kiến hữu ích */}
        <div style={{ background: "rgba(255,107,107,0.06)", borderRadius: 10, padding: 16, border: "1px solid rgba(255,107,107,0.15)" }}>
          <h4 style={{ margin: "0 0 10px", color: "#ff6b6b", fontSize: 14 }}>⭐ Sáng Kiến Hữu Ích (GĐ xác nhận)</h4>
          <div style={{ fontSize: 12, color: "#a0aec0", lineHeight: 2 }}>
            <div>Người raise: <strong style={{ color: "#e0e6ed" }}>+{pointConfig.useful.raiser}đ</strong></div>
            <div>Người thông báo: <strong style={{ color: "#e0e6ed" }}>+{pointConfig.useful.announcer}đ</strong></div>
            <div>Người phản hồi: <strong style={{ color: "#e0e6ed" }}>+{pointConfig.useful.responder}đ</strong></div>
          </div>
        </div>

        {/* Time conversion */}
        <div style={{ background: "rgba(200,200,255,0.06)", borderRadius: 10, padding: 16, border: "1px solid rgba(200,200,255,0.15)" }}>
          <h4 style={{ margin: "0 0 10px", color: "#c8c8ff", fontSize: 14 }}>⏱ Quy Đổi Thời Gian</h4>
          <div style={{ fontSize: 12, color: "#a0aec0", lineHeight: 2 }}>
            <div>1 điểm = <strong style={{ color: "#e0e6ed" }}>{pointConfig.timePerPoint} phút</strong></div>
            <div>Tổng thời gian = Tổng điểm × {pointConfig.timePerPoint} phút</div>
          </div>
        </div>

        {/* Hợp nhất */}
        <div style={{ background: "rgba(0,200,150,0.06)", borderRadius: 10, padding: 16, border: "1px solid rgba(0,200,150,0.15)" }}>
          <h4 style={{ margin: "0 0 10px", color: "#00c896", fontSize: 14 }}>🔄 Hợp Nhất Số Liệu</h4>
          <div style={{ fontSize: 12, color: "#a0aec0", lineHeight: 2 }}>
            <div>Điểm cá nhân = Σ(điểm ticket) + Σ(điểm hữu ích)</div>
            <div>Điểm BU = Σ(điểm tất cả NV trong BU)</div>
            <div>Điểm tổng = Σ(điểm tất cả BU)</div>
            <div style={{ marginTop: 8, color: "#ffa500", fontSize: 11 }}>⚠ Khi GĐ thay đổi cấu hình → Điểm được tính lại từ thời điểm thay đổi. Số liệu trước đó giữ nguyên.</div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ==================== DASHBOARD ====================
function DashboardCard({ tickets, staff, pointConfig, allPoints }) {
  const [subView, setSubView] = useState("gd");
  const [showAI, setShowAI] = useState(false);
  const [aiReport, setAiReport] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());

  const yearTickets = tickets.filter(t => new Date(t.date).getFullYear() === year);
  const totalTickets = yearTickets.length;
  const usefulTickets = yearTickets.filter(t => t.useful).length;

  const totalPoints = useMemo(() => {
    let sum = 0;
    Object.values(allPoints).forEach(v => { sum += v.total + v.useful; });
    return sum;
  }, [allPoints]);

  const totalTime = totalPoints * pointConfig.timePerPoint;
  const usefulRate = totalTickets > 0 ? ((usefulTickets / totalTickets) * 100).toFixed(1) : 0;

  // Monthly data
  const monthlyData = useMemo(() => {
    return MONTHS.map((m, i) => {
      const mTickets = yearTickets.filter(t => new Date(t.date).getMonth() === i);
      let mPts = 0;
      mTickets.forEach(t => {
        const pts = calcPoints(t, staff, pointConfig);
        pts.forEach(p => mPts += p.points);
        if (t.useful) {
          if (t.type === "Raise ticket") mPts += pointConfig.useful.raiser;
          else if (t.type === "Thông báo") mPts += pointConfig.useful.announcer;
          else mPts += pointConfig.useful.responder;
        }
      });
      return { name: m, tickets: mTickets.length, points: Math.round(mPts * 10) / 10, time: Math.round(mPts * pointConfig.timePerPoint * 10) / 10, useful: mTickets.filter(t => t.useful).length };
    });
  }, [yearTickets, staff, pointConfig]);

  // BU data
  const buData = useMemo(() => {
    return BU_LIST.map(bu => {
      const buTickets = yearTickets.filter(t => t.bu === bu);
      let pts = 0;
      buTickets.forEach(t => {
        calcPoints(t, staff, pointConfig).forEach(p => pts += p.points);
        if (t.useful) {
          if (t.type === "Raise ticket") pts += pointConfig.useful.raiser;
          else if (t.type === "Thông báo") pts += pointConfig.useful.announcer;
          else pts += pointConfig.useful.responder;
        }
      });
      return { name: bu, tickets: buTickets.length, points: Math.round(pts * 10) / 10, time: Math.round(pts * pointConfig.timePerPoint * 10) / 10, useful: buTickets.filter(t => t.useful).length };
    }).filter(d => d.tickets > 0 || d.points > 0);
  }, [yearTickets, staff, pointConfig]);

  // Staff by level
  const staffByLevel = (level) => {
    return staff.filter(s => s.level === level).map(s => {
      const p = allPoints[s.id] || { total: 0, useful: 0, ticketCount: 0 };
      return { name: s.name, id: s.id, bu: s.bu, points: Math.round((p.total + p.useful) * 10) / 10, time: Math.round((p.total + p.useful) * pointConfig.timePerPoint * 10) / 10, tickets: p.ticketCount };
    });
  };

  const COLORS = ["#00d4aa", "#4dabf7", "#ffa500", "#ff6b6b", "#c084fc", "#f472b6", "#34d399", "#fbbf24"];

  const handleAI = async () => {
    setAiLoading(true);
    setShowAI(true);
    try {
      const summary = {
        totalTickets, totalPoints: Math.round(totalPoints * 10) / 10, totalTime: Math.round(totalTime), usefulRate,
        buBreakdown: buData.map(b => `${b.name}: ${b.tickets} tickets, ${b.points}đ`).join("; "),
        staffCount: staff.length,
        byLevel: LEVELS.map(l => `${l}: ${staff.filter(s => s.level === l).length} người`).join(", ")
      };
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1000,
          messages: [{ role: "user", content: `Bạn là chuyên gia phân tích QA cho Green Feed Vietnam. Dựa trên dữ liệu sau, hãy phân tích bằng tiếng Việt:\n\nDữ liệu năm ${year}:\n- Tổng ticket: ${summary.totalTickets}\n- Tổng điểm: ${summary.totalPoints}\n- Tổng thời gian: ${summary.totalTime} phút\n- Tỷ lệ hữu ích: ${summary.usefulRate}%\n- BU: ${summary.buBreakdown}\n- Nhân sự: ${summary.staffCount} (${summary.byLevel})\n\nHãy phân tích:\n1. Tổng quan điểm mạnh/yếu\n2. Phân tích từng BU\n3. Các hành động tiếp theo\n4. Gợi ý 3 phương án tăng cường chỉ số\n\nTrả lời ngắn gọn, trực tiếp.` }]
        })
      });
      const data = await resp.json();
      setAiReport(data.content?.[0]?.text || "Không thể tạo báo cáo.");
    } catch (e) {
      setAiReport("⚠️ Không thể kết nối AI. Báo cáo tổng quan:\n\n" +
        `📊 Năm ${year}: ${totalTickets} ticket, ${Math.round(totalPoints)}đ, ${Math.round(totalTime)} phút\n` +
        `✅ Tỷ lệ hữu ích: ${usefulRate}%\n\n` +
        buData.map(b => `• ${b.name}: ${b.tickets} ticket, ${b.points}đ`).join("\n") +
        `\n\n💡 Gợi ý: Tăng tần suất raise ticket, khuyến khích phản hồi giữa các cấp, tổ chức workshop chia sẻ sáng kiến hữu ích.`
      );
    }
    setAiLoading(false);
  };

  const StatBox = ({ label, value, unit, color = "#00d4aa" }) => (
    <div style={{ background: "rgba(0,0,0,0.25)", borderRadius: 12, padding: 16, textAlign: "center", border: `1px solid ${color}22` }}>
      <p style={{ margin: 0, fontSize: 11, color: "#7a8a9e", textTransform: "uppercase", letterSpacing: 1 }}>{label}</p>
      <p style={{ margin: "6px 0 2px", fontSize: 28, fontWeight: 800, color }}>{value}</p>
      {unit && <p style={{ margin: 0, fontSize: 11, color: "#7a8a9e" }}>{unit}</p>}
    </div>
  );

  return (
    <>
      {/* Year selector */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 20, color: "#00d4aa" }}>📊 Dashboard</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ fontSize: 12, color: "#7a8a9e" }}>Năm:</label>
          <select style={{ ...selectStyle, width: "auto" }} value={year} onChange={e => setYear(parseInt(e.target.value))}>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Main KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
        <StatBox label="Tổng Ticket" value={totalTickets} unit={`năm ${year}`} />
        <StatBox label="Tổng Điểm" value={Math.round(totalPoints * 10) / 10} unit="điểm tích lũy" color="#4dabf7" />
        <StatBox label="Tổng Thời Gian" value={Math.round(totalTime)} unit="phút" color="#ffa500" />
        <StatBox label="Tỷ Lệ Hữu Ích" value={`${usefulRate}%`} unit={`${usefulTickets}/${totalTickets}`} color="#ff6b6b" />
        <StatBox label="Tỷ Lệ Chuyển Hóa" value={`${totalTickets > 0 ? ((usefulTickets / totalTickets) * 100).toFixed(1) : 0}%`} unit={`${usefulTickets}/${totalTickets} ticket → hữu ích`} color="#c084fc" />
      </div>

      {/* Monthly trend chart */}
      <Card title="📈 Xu Hướng Theo Tháng" subtitle={`Năm ${year}`}>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="name" stroke="#7a8a9e" fontSize={11} />
            <YAxis stroke="#7a8a9e" fontSize={11} />
            <Tooltip contentStyle={{ background: "#0d1b2a", border: "1px solid #00d4aa44", borderRadius: 8, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="tickets" stroke="#00d4aa" strokeWidth={2} name="Tickets" dot={{ r: 3 }} />
            <Line type="monotone" dataKey="points" stroke="#4dabf7" strokeWidth={2} name="Điểm" dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* BU Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>
        <Card title="📊 Thời Gian Tích Lũy / BU" subtitle="Phút / năm">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={buData.length > 0 ? buData : [{ name: "N/A", time: 1 }]} dataKey="time" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} labelLine={true} fontSize={11}>
                {(buData.length > 0 ? buData : [{}]).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#0d1b2a", border: "1px solid #00d4aa44", borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
        <Card title="🎫 Ticket / BU" subtitle="Số lượng / năm">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={buData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="name" stroke="#7a8a9e" fontSize={11} />
              <YAxis stroke="#7a8a9e" fontSize={11} />
              <Tooltip contentStyle={{ background: "#0d1b2a", border: "1px solid #00d4aa44", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="tickets" fill="#00d4aa" radius={[4, 4, 0, 0]} name="Tickets" />
              <Bar dataKey="useful" fill="#ff6b6b" radius={[4, 4, 0, 0]} name="Hữu ích" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Sub-metrics */}
      <Card title="🔍 Số Liệu Chi Tiết" subtitle="Chọn cấp để xem">
        <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
          {[{ k: "gd", l: "GĐ" }, { k: "bu", l: "BU" }, { k: "tpcc", l: "TPCC" }, { k: "tp", l: "TP" }, { k: "nv", l: "NV" }].map(v => (
            <button key={v.k} onClick={() => setSubView(v.k)} style={{
              padding: "8px 16px", borderRadius: 6, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 12,
              background: subView === v.k ? "linear-gradient(135deg, #00d4aa, #00a8cc)" : "rgba(255,255,255,0.06)",
              color: subView === v.k ? "#0a0f1a" : "#7a8a9e"
            }}>{v.l}</button>
          ))}
        </div>

        {subView === "bu" && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead><tr style={{ borderBottom: "2px solid rgba(0,212,170,0.3)" }}>
                {["BU", "Tickets", "Điểm", "Thời gian (phút)", "Hữu ích"].map(h => <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: "#00d4aa", fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>{h}</th>)}
              </tr></thead>
              <tbody>{buData.map(b => (
                <tr key={b.name} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ padding: "8px 10px", fontWeight: 600 }}>{b.name}</td>
                  <td style={{ padding: "8px 10px" }}>{b.tickets}</td>
                  <td style={{ padding: "8px 10px", color: "#4dabf7" }}>{b.points}</td>
                  <td style={{ padding: "8px 10px", color: "#ffa500" }}>{b.time}</td>
                  <td style={{ padding: "8px 10px", color: "#ff6b6b" }}>{b.useful}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}

        {["gd", "tpcc", "tp", "nv"].includes(subView) && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead><tr style={{ borderBottom: "2px solid rgba(0,212,170,0.3)" }}>
                {["Mã NV", "Tên", "BU", "Tickets", "Điểm", "Thời gian (phút)"].map(h => <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: "#00d4aa", fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>{h}</th>)}
              </tr></thead>
              <tbody>{staffByLevel(subView.toUpperCase()).map(s => (
                <tr key={s.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ padding: "8px 10px", fontFamily: "monospace", color: "#00d4aa" }}>{s.id}</td>
                  <td style={{ padding: "8px 10px" }}>{s.name}</td>
                  <td style={{ padding: "8px 10px" }}>{s.bu}</td>
                  <td style={{ padding: "8px 10px" }}>{s.tickets}</td>
                  <td style={{ padding: "8px 10px", color: "#4dabf7" }}>{s.points}</td>
                  <td style={{ padding: "8px 10px", color: "#ffa500" }}>{s.time}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Card>

      {/* AI Analysis */}
      <Card title="🤖 Phân Tích AI" subtitle="Phân tích thông minh và gợi ý hành động">
        <button style={btnPrimary} onClick={handleAI} disabled={aiLoading}>
          {aiLoading ? "⏳ Đang phân tích..." : "🧠 Phân tích & Tạo báo cáo"}
        </button>
        {showAI && aiReport && (
          <div style={{ marginTop: 16, background: "rgba(0,0,0,0.3)", borderRadius: 10, padding: 16, whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.7, color: "#c8d6e5" }}>
            {aiReport}
          </div>
        )}
      </Card>

      {/* Send Report */}
      <Card title="📧 Gửi Báo Cáo" subtitle="Gửi báo cáo qua email">
        <button style={btnPrimary} onClick={() => {
          const subject = encodeURIComponent(`Báo cáo Raise Ticket - Năm ${year}`);
          const body = encodeURIComponent(
            `BÁO CÁO RAISE TICKET - NĂM ${year}\n\n` +
            `Tổng ticket: ${totalTickets}\nTổng điểm: ${Math.round(totalPoints * 10) / 10}\nTổng thời gian: ${Math.round(totalTime)} phút\nTỷ lệ hữu ích: ${usefulRate}%\n\n` +
            buData.map(b => `${b.name}: ${b.tickets} ticket, ${b.points}đ, ${b.time} phút`).join("\n") +
            (aiReport ? `\n\n--- PHÂN TÍCH AI ---\n${aiReport}` : "")
          );
          window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
        }}>
          📤 Mở email để gửi báo cáo
        </button>
      </Card>
    </>
  );
}
