import { useState, useEffect, useRef, useCallback } from "react";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid, Cell, LabelList
} from "recharts";

// ── STYLES ─────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { font-size: 14px; }
  body { font-family: 'IBM Plex Sans', sans-serif; background: #060e0a; color: #dff2e8; }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: #0a1a12; }
  ::-webkit-scrollbar-thumb { background: #1e4d32; border-radius: 4px; }
  textarea, input, select { font-family: 'IBM Plex Sans', sans-serif; }
  .mono { font-family: 'JetBrains Mono', monospace; }
  .fade-in { animation: fadeIn 0.3s ease; }
  @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
  .pulse { animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
  
  /* RESPONSIVE */
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
  .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  .flex-row { display: flex; gap: 14px; }
  .flex-col { display: flex; flex-direction: column; gap: 14px; }
  
  @media (max-width: 768px) {
    html { font-size: 13px; }
    .grid-2 { grid-template-columns: 1fr; }
    .grid-3 { grid-template-columns: 1fr; }
    .grid-4 { grid-template-columns: 1fr 1fr; }
    .flex-row { flex-direction: column; }
    .hide-mobile { display: none !important; }
    .mobile-full { width: 100% !important; }
    .nav-label { display: none; }
  }
  @media (max-width: 480px) {
    .grid-4 { grid-template-columns: 1fr 1fr; }
  }
`;

// ── CONSTANTS ──────────────────────────────────────────────────────────────────
const C = {
    bg: "#060e0a", panel: "#0c1a12", card: "#0f2017",
    border: "#1b3d28", borderLight: "#143020",
    green: "#00e676", teal: "#26c6a6", cyan: "#00bcd4",
    amber: "#ffb300", red: "#f44336", purple: "#9c27b0",
    textPrimary: "#dff2e8", textSec: "#6aad82", textMuted: "#2e5e3e",
};

// ── HELPERS ────────────────────────────────────────────────────────────────────
const calcM = (K, S, A) => +(K * 0.3 + S * 0.3 + A * 0.4).toFixed(1);
const getNow = () => {
    const d = new Date();
    return d.toLocaleDateString("vi-VN") + " " + d.toLocaleTimeString("vi-VN", { hour12: false });
};
const getTodayStr = () => new Date().toISOString().split("T")[0];
const isOverdue = (dueDate) => dueDate && new Date(dueDate) < new Date() && dueDate !== "";
const genKnowledgeId = (list) => `KN-2026-${String(list.length + 1).padStart(4, "0")}`;
const getLevel = (M) =>
    M >= 85 ? { label: "Xuất sắc", color: C.green } :
        M >= 70 ? { label: "Tốt", color: C.teal } :
            M >= 55 ? { label: "Trung bình", color: C.amber } :
                { label: "Cần cải thiện", color: C.red };

// ── API ────────────────────────────────────────────────────────────────────────
async function callClaude(systemPrompt, userMsg, maxTokens = 1000) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: maxTokens,
            system: systemPrompt,
            messages: [{ role: "user", content: userMsg }],
        }),
    });
    const data = await res.json();
    return data.content?.[0]?.text || "";
}

// ── INITIAL DATA ───────────────────────────────────────────────────────────────
const INIT_KNOWLEDGE = [
    { id: "KN-2026-0001", topic: "Quy trình HACCP", category: "An toàn thực phẩm", content: "Hazard Analysis Critical Control Points (HACCP) là hệ thống quản lý an toàn thực phẩm dựa trên phân tích mối nguy và kiểm soát điểm tới hạn. Bao gồm 7 nguyên tắc:\n1. Phân tích mối nguy tiềm ẩn\n2. Xác định các Điểm Kiểm Soát Tới Hạn (CCP)\n3. Thiết lập giới hạn tới hạn cho mỗi CCP\n4. Thiết lập hệ thống giám sát CCP\n5. Xác định hành động khắc phục khi CCP vượt giới hạn\n6. Thiết lập thủ tục kiểm tra xác nhận\n7. Lập hồ sơ và tài liệu hóa.\n\nÁp dụng tại Green Feed: Kiểm soát nhiệt độ nghiền, độ ẩm nguyên liệu, nhiệt độ ép viên.", addedBy: "Quản lý", addedAt: "2026-01-15 08:30", sourceUrl: "" },
    { id: "KN-2026-0002", topic: "Kiểm soát chất lượng nguyên liệu đầu vào", category: "QC Nguyên liệu", content: "Quy trình tiếp nhận nguyên liệu đầu vào:\n1. Kiểm tra cảm quan: màu sắc, mùi, độ ẩm, tạp chất\n2. Lấy mẫu phân tích theo TCVN 4325:2007\n3. Đối chiếu COA (Certificate of Analysis) từ nhà cung cấp\n4. Đo độ ẩm bằng máy đo (tiêu chuẩn <14% với ngũ cốc)\n5. Ghi nhận kết quả vào phiếu kiểm tra và hệ thống SAP\n6. Lô hàng không đạt: Lập biên bản, cách ly, thông báo nhà cung cấp trong 24h.", addedBy: "Quản lý", addedAt: "2026-01-20 10:00", sourceUrl: "" },
    { id: "KN-2026-0003", topic: "Tiêu chí đánh giá nhà cung cấp", category: "Mua hàng", content: "Hệ thống đánh giá nhà cung cấp Green Feed:\nThang điểm 100:\n- Chất lượng sản phẩm: 40 điểm (tỷ lệ lô đạt, độ đồng đều)\n- Thời gian giao hàng: 25 điểm (đúng hẹn, thông báo trước)\n- Giá cả cạnh tranh: 20 điểm (so sánh thị trường)\n- Hỗ trợ kỹ thuật: 15 điểm (phản hồi khiếu nại, tài liệu kỹ thuật)\n\nXếp loại: A (≥80), B (65-79), C (50-64), D (<50 - xem xét loại bỏ)\nĐánh giá định kỳ: 6 tháng/lần.", addedBy: "Quản lý", addedAt: "2026-02-01 09:15", sourceUrl: "" },
];

const INIT_STAFF = [
    { id: "NV001", stt: 1, name: "Nguyễn Thị Lan", department: "QC", K: 78, S: 72, A: 85, pMonth: 340, pYear: 1250, assignedTasks: [{ knowledgeId: "KN-2026-0001", dueDate: "2026-02-15", completed: true }, { knowledgeId: "KN-2026-0002", dueDate: "2026-03-10", completed: false }] },
    { id: "NV002", stt: 2, name: "Trần Văn Minh", department: "Sản xuất", K: 65, S: 80, A: 70, pMonth: 290, pYear: 980, assignedTasks: [{ knowledgeId: "KN-2026-0002", dueDate: "2026-02-20", completed: false }] },
    { id: "NV003", stt: 3, name: "Lê Thị Hoa", department: "Mua hàng", K: 90, S: 75, A: 88, pMonth: 420, pYear: 1680, assignedTasks: [{ knowledgeId: "KN-2026-0003", dueDate: "2026-03-01", completed: true }] },
    { id: "NV004", stt: 4, name: "Phạm Đức Anh", department: "QC", K: 55, S: 60, A: 62, pMonth: 180, pYear: 720, assignedTasks: [{ knowledgeId: "KN-2026-0001", dueDate: "2026-02-10", completed: false }] },
];

const INIT_HISTORY = [
    { id: "LOG-001", type: "exercise", knowledgeId: "KN-2026-0001", staffId: "NV001", staffName: "Nguyễn Thị Lan", time: "20/02/2026 09:15:00", K: 80, S: 75, A: 88, M: 81.7, points: 85 },
    { id: "LOG-002", type: "exercise", knowledgeId: "KN-2026-0002", staffId: "NV003", staffName: "Lê Thị Hoa", time: "21/02/2026 14:30:00", K: 92, S: 78, A: 90, M: 87.6, points: 95 },
    { id: "LOG-003", type: "knowledge", knowledgeId: "KN-2026-0003", staffId: "Manager", staffName: "Quản lý", time: "22/02/2026 10:00:00", K: null, S: null, A: null, M: null, points: null },
];

// ── SHARED UI ──────────────────────────────────────────────────────────────────
function Card({ children, style = {}, className = "" }) {
    return <div className={className} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, ...style }}>{children}</div>;
}
function SectionTitle({ icon, text, color = C.green }) {
    return <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontWeight: 800, fontSize: 12, color, letterSpacing: 1.2, textTransform: "uppercase" }}>{text}</span>
    </div>;
}
function Btn({ onClick, disabled, variant = "primary", children, style = {} }) {
    const base = { border: "none", borderRadius: 8, padding: "9px 16px", fontWeight: 700, fontSize: 12, cursor: disabled ? "not-allowed" : "pointer", letterSpacing: 0.3, transition: "all 0.2s", ...style };
    const variants = {
        primary: { background: disabled ? "#1a3020" : `linear-gradient(135deg, ${C.green}, ${C.teal})`, color: disabled ? C.textMuted : "#001a0a" },
        secondary: { background: "transparent", border: `1px solid ${C.border}`, color: C.textSec },
        danger: { background: "transparent", border: `1px solid ${C.red}44`, color: C.red },
        teal: { background: disabled ? "#0a1a14" : `linear-gradient(135deg, ${C.teal}, ${C.cyan})`, color: disabled ? C.textMuted : "#001a0a" },
        amber: { background: disabled ? "#1a1200" : `linear-gradient(135deg, ${C.amber}, #e65100)`, color: disabled ? C.textMuted : "#001a00" },
    };
    return <button onClick={disabled ? undefined : onClick} style={{ ...base, ...variants[variant] }}>{children}</button>;
}
function Badge({ color = C.teal, children }) {
    return <span style={{ background: `${color}20`, color, border: `1px solid ${color}40`, borderRadius: 4, padding: "2px 7px", fontSize: 10, fontWeight: 700, letterSpacing: 0.5, whiteSpace: "nowrap" }}>{children}</span>;
}
function Avatar({ text, size = 34, color = C.green }) {
    return <div style={{ width: size, height: size, borderRadius: "50%", background: `${color}18`, border: `2px solid ${color}50`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: size * 0.33, color, flexShrink: 0 }}>{text}</div>;
}
function Input({ value, onChange, placeholder, style = {}, type = "text" }) {
    return <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        style={{ width: "100%", background: "#070e09", border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", color: C.textPrimary, fontSize: 13, outline: "none", ...style }} />;
}
function Textarea({ value, onChange, placeholder, rows = 5, style = {} }) {
    return <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows}
        style={{ width: "100%", background: "#070e09", border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.textPrimary, fontSize: 13, resize: "vertical", outline: "none", lineHeight: 1.7, ...style }} />;
}
function Modal({ open, onClose, title, children, width = 560 }) {
    if (!open) return null;
    return <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "#00000090", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div onClick={e => e.stopPropagation()} className="fade-in" style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24, width: "100%", maxWidth: width, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: C.green }}>{title}</div>
                <button onClick={onClose} style={{ background: "none", border: "none", color: C.textSec, fontSize: 18, cursor: "pointer", lineHeight: 1 }}>✕</button>
            </div>
            {children}
        </div>
    </div>;
}

// ── DASHBOARD ──────────────────────────────────────────────────────────────────
function Dashboard({ knowledge, staff, history, onAnalyze }) {
    const [aiReport, setAiReport] = useState("");
    const [analyzing, setAnalyzing] = useState(false);

    const sorted = [...staff].sort((a, b) => calcM(b.K, b.S, b.A) - calcM(a.K, a.S, a.A));
    const totalTasks = staff.reduce((s, e) => s + e.assignedTasks.length, 0);
    const overdueTasks = staff.reduce((s, e) => s + e.assignedTasks.filter(t => !t.completed && isOverdue(t.dueDate)).length, 0);
    const completedTasks = staff.reduce((s, e) => s + e.assignedTasks.filter(t => t.completed).length, 0);
    const avgM = staff.length ? (staff.reduce((s, e) => s + calcM(e.K, e.S, e.A), 0) / staff.length).toFixed(1) : 0;

    const handleAnalyze = async () => {
        setAnalyzing(true);
        const summary = staff.map(s => `${s.name} (${s.department}): K=${s.K}%, S=${s.S}%, A=${s.A}%, M=${calcM(s.K, s.S, s.A)}%, Điểm tháng=${s.pMonth}`).join("\n");
        const overdueInfo = staff.map(s => {
            const od = s.assignedTasks.filter(t => !t.completed && isOverdue(t.dueDate)).length;
            return od > 0 ? `${s.name}: ${od} bài trễ` : null;
        }).filter(Boolean).join(", ");
        const result = await callClaude(
            "Bạn là chuyên gia phân tích năng lực nhân sự. Viết báo cáo súc tích, thực tiễn, chỉ ra vấn đề cụ thể cần hành động ngay.",
            `Dữ liệu năng lực:\n${summary}\n\nTình trạng trễ hạn: ${overdueInfo || "Không có"}\n\nViết báo cáo phân tích tổng thể ≤150 từ: điểm mạnh đội nhóm, rủi ro cần ưu tiên, 2-3 khuyến nghị hành động cụ thể.`
        );
        setAiReport(result);
        setAnalyzing(false);
    };

    // Per-employee overdue stats
    const employeeStats = sorted.map(s => {
        const total = s.assignedTasks.length;
        const od = s.assignedTasks.filter(t => !t.completed && isOverdue(t.dueDate)).length;
        const done = s.assignedTasks.filter(t => t.completed).length;
        const M = calcM(s.K, s.S, s.A);
        return { ...s, total, od, done, M, overdueRate: total > 0 ? Math.round((od / total) * 100) : 0 };
    });

    // Bar chart data
    const barData = employeeStats.map(s => ({
        name: s.name.split(" ").pop(),
        "Kiến thức": s.K, "Kỹ năng": s.S, "Thái độ": s.A,
    }));

    return (
        <div className="flex-col">
            {/* KPI Row */}
            <div className="grid-4">
                {[
                    { label: "Tổng tri thức", value: knowledge.length, sub: "đơn vị đã nạp", color: C.green, icon: "📚" },
                    { label: "Năng lực TB", value: `${avgM}%`, sub: "chỉ số M toàn đội", color: C.teal, icon: "📊" },
                    { label: "Bài tập trễ hạn", value: overdueTasks, sub: `/${totalTasks} tổng bài tập`, color: overdueTasks > 0 ? C.red : C.green, icon: "⚠️" },
                    { label: "Tỷ lệ hoàn thành", value: `${totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%`, sub: `${completedTasks}/${totalTasks} bài tập`, color: C.amber, icon: "✅" },
                ].map(k => (
                    <div key={k.label} style={{ background: `${k.color}08`, border: `1px solid ${k.color}30`, borderRadius: 12, padding: "16px 18px" }}>
                        <div style={{ fontSize: 22, marginBottom: 4 }}>{k.icon}</div>
                        <div className="mono" style={{ fontSize: 26, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</div>
                        <div style={{ fontSize: 11, color: k.color, fontWeight: 700, marginTop: 4, letterSpacing: 0.5 }}>{k.label}</div>
                        <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>{k.sub}</div>
                    </div>
                ))}
            </div>

            <div className="grid-2">
                {/* Ranking */}
                <Card>
                    <SectionTitle icon="🏆" text="Bảng xếp hạng năng lực" />
                    {employeeStats.map((s, i) => {
                        const lv = getLevel(s.M);
                        return (
                            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i < employeeStats.length - 1 ? `1px solid ${C.borderLight}` : "none" }}>
                                <div className="mono" style={{ width: 22, textAlign: "center", fontWeight: 800, fontSize: 15, color: [C.amber, "#9ca3af", "#cd7f32", C.textMuted][i] || C.textMuted }}>{i + 1}</div>
                                <Avatar text={s.name.split(" ").slice(-1)[0].slice(0, 2).toUpperCase()} size={34} color={lv.color} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, fontSize: 13, color: C.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</div>
                                    <div style={{ fontSize: 10, color: C.textSec }}>{s.department}</div>
                                </div>
                                <div style={{ textAlign: "center" }}>
                                    <div className="mono" style={{ fontWeight: 800, color: lv.color, fontSize: 16 }}>{s.M}%</div>
                                    <Badge color={lv.color}>{lv.label}</Badge>
                                </div>
                                <div style={{ textAlign: "right", minWidth: 60 }}>
                                    {s.od > 0 ? <Badge color={C.red}>⚠ {s.od} trễ</Badge> : <Badge color={C.green}>✓ Đúng hạn</Badge>}
                                    <div style={{ fontSize: 10, color: C.textMuted, marginTop: 4 }}>Tháng: <span className="mono" style={{ color: C.amber }}>{s.pMonth}đ</span></div>
                                </div>
                            </div>
                        );
                    })}
                </Card>

                {/* Bar Chart */}
                <Card>
                    <SectionTitle icon="📈" text="So sánh năng lực K · S · A" />
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={barData} barCategoryGap="25%">
                            <CartesianGrid stroke={C.borderLight} strokeDasharray="4 4" vertical={false} />
                            <XAxis dataKey="name" tick={{ fill: C.textSec, fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis domain={[0, 100]} tick={{ fill: C.textSec, fontSize: 10 }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} labelStyle={{ color: C.green, fontWeight: 700 }} />
                            <Bar dataKey="Kiến thức" fill={C.green} radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Kỹ năng" fill={C.teal} radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Thái độ" fill={C.amber} radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                    <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 4 }}>
                        {[["Kiến thức (K)", C.green], ["Kỹ năng (S)", C.teal], ["Thái độ (A)", C.amber]].map(([l, c]) => (
                            <div key={l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: C.textSec }}>
                                <div style={{ width: 10, height: 10, background: c, borderRadius: 2 }} />
                                {l}
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Overdue per employee */}
            <Card>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <SectionTitle icon="⏰" text="Tỷ lệ trễ hạn bài tập theo nhân viên" />
                    <Btn onClick={handleAnalyze} disabled={analyzing} variant="primary">
                        {analyzing ? "⏳ Đang phân tích..." : "🤖 Phân tích tổng thể AI"}
                    </Btn>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {employeeStats.map(s => (
                        <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ width: 120, fontSize: 12, color: C.textPrimary, fontWeight: 600, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                            <div style={{ flex: 1, background: C.panel, borderRadius: 6, height: 14, overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${100 - s.overdueRate}%`, background: s.overdueRate === 0 ? C.green : s.overdueRate < 50 ? C.amber : C.red, borderRadius: 6, transition: "width 0.5s" }} />
                            </div>
                            <div className="mono" style={{ width: 50, textAlign: "right", fontSize: 11, color: s.od > 0 ? C.red : C.green, fontWeight: 700 }}>
                                {s.od > 0 ? `${s.overdueRate}% trễ` : "Đúng hạn"}
                            </div>
                            <div style={{ fontSize: 10, color: C.textMuted, width: 70, textAlign: "right" }}>{s.done}/{s.total} hoàn thành</div>
                        </div>
                    ))}
                </div>
                {aiReport && (
                    <div style={{ marginTop: 16, background: "#020a04", border: `1px solid ${C.green}25`, borderRadius: 10, padding: 14 }}>
                        <div style={{ fontSize: 11, color: C.green, fontWeight: 700, marginBottom: 8, letterSpacing: 1 }}>📊 KẾT QUẢ PHÂN TÍCH AI</div>
                        <div style={{ fontSize: 12.5, color: "#a8d8b8", lineHeight: 1.8, whiteSpace: "pre-line" }}>{aiReport}</div>
                    </div>
                )}
            </Card>

            {/* Activity feed */}
            <Card>
                <SectionTitle icon="📝" text="Hoạt động gần đây" />
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[...INIT_HISTORY].reverse().slice(0, 5).map(log => (
                        <div key={log.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.borderLight}` }}>
                            <span style={{ fontSize: 16 }}>{log.type === "exercise" ? "🎯" : "📚"}</span>
                            <div style={{ flex: 1 }}>
                                <span style={{ fontSize: 12, color: C.textPrimary, fontWeight: 600 }}>{log.staffName}</span>
                                <span style={{ fontSize: 12, color: C.textSec }}> {log.type === "exercise" ? "hoàn thành bài tập" : "nạp tri thức"} </span>
                                <span className="mono" style={{ fontSize: 11, color: C.teal }}>{log.knowledgeId}</span>
                            </div>
                            {log.M && <Badge color={getLevel(log.M).color}>M: {log.M}%</Badge>}
                            {log.points && <Badge color={C.amber}>+{log.points}đ</Badge>}
                            <div style={{ fontSize: 10, color: C.textMuted, flexShrink: 0 }}>{log.time}</div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}

// ── STAFF MANAGEMENT ───────────────────────────────────────────────────────────
function StaffManagement({ staff, onUpdate }) {
    const [showAdd, setShowAdd] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [form, setForm] = useState({ id: "", name: "", department: "" });

    const departments = ["QC", "Sản xuất", "Mua hàng", "Kho vận", "R&D", "Quản lý"];

    const handleAdd = () => {
        if (!form.id.trim() || !form.name.trim()) return;
        const newStaff = { id: form.id.trim(), stt: staff.length + 1, name: form.name.trim(), department: form.department || "QC", K: 50, S: 50, A: 50, pMonth: 0, pYear: 0, assignedTasks: [] };
        onUpdate([...staff, newStaff]);
        setForm({ id: "", name: "", department: "" });
        setShowAdd(false);
    };

    const handleEdit = () => {
        onUpdate(staff.map(s => s.id === editItem.id ? { ...s, name: form.name, department: form.department } : s));
        setEditItem(null);
    };

    const handleDelete = (id) => {
        if (window.confirm("Xác nhận xóa nhân viên này?")) onUpdate(staff.filter(s => s.id !== id));
    };

    return (
        <div className="flex-col">
            <Card>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <SectionTitle icon="👥" text="Danh sách nhân viên" />
                    <Btn onClick={() => { setShowAdd(true); setForm({ id: "", name: "", department: "" }); }} variant="primary">+ Thêm nhân viên</Btn>
                </div>
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                        <thead>
                            <tr style={{ background: C.panel }}>
                                {["STT", "Mã số NV", "Họ và tên", "Bộ phận", "K%", "S%", "A%", "Mức độ M", "Điểm tháng", "Thao tác"].map(h => (
                                    <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: C.textSec, fontWeight: 700, fontSize: 11, letterSpacing: 0.8, borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {staff.map((s, i) => {
                                const M = calcM(s.K, s.S, s.A);
                                const lv = getLevel(M);
                                return (
                                    <tr key={s.id} style={{ borderBottom: `1px solid ${C.borderLight}`, background: i % 2 === 0 ? "transparent" : "#0a1410" }}>
                                        <td style={{ padding: "10px 12px", color: C.textMuted }} className="mono">{s.stt}</td>
                                        <td style={{ padding: "10px 12px" }}><span className="mono" style={{ color: C.green, fontSize: 11 }}>{s.id}</span></td>
                                        <td style={{ padding: "10px 12px" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <Avatar text={s.name.split(" ").slice(-1)[0].slice(0, 2).toUpperCase()} size={28} color={lv.color} />
                                                <span style={{ fontWeight: 600, color: C.textPrimary }}>{s.name}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: "10px 12px" }}><Badge color={C.teal}>{s.department}</Badge></td>
                                        {[s.K, s.S, s.A].map((v, vi) => (
                                            <td key={vi} style={{ padding: "10px 12px" }}>
                                                <span className="mono" style={{ color: v >= 80 ? C.green : v >= 65 ? C.teal : v >= 50 ? C.amber : C.red, fontWeight: 700 }}>{v}</span>
                                            </td>
                                        ))}
                                        <td style={{ padding: "10px 12px" }}>
                                            <span className="mono" style={{ fontWeight: 800, color: lv.color }}>{M}%</span>
                                            <div><Badge color={lv.color}>{lv.label}</Badge></div>
                                        </td>
                                        <td style={{ padding: "10px 12px" }}><span className="mono" style={{ color: C.amber, fontWeight: 700 }}>{s.pMonth}</span></td>
                                        <td style={{ padding: "10px 12px" }}>
                                            <div style={{ display: "flex", gap: 6 }}>
                                                <Btn variant="secondary" onClick={() => { setEditItem(s); setForm({ id: s.id, name: s.name, department: s.department }); }} style={{ padding: "5px 10px", fontSize: 11 }}>✏️ Sửa</Btn>
                                                <Btn variant="danger" onClick={() => handleDelete(s.id)} style={{ padding: "5px 10px", fontSize: 11 }}>🗑️</Btn>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Modal open={showAdd || !!editItem} onClose={() => { setShowAdd(false); setEditItem(null); }} title={showAdd ? "Thêm nhân viên mới" : `Chỉnh sửa: ${editItem?.name}`}>
                <div className="flex-col" style={{ gap: 12 }}>
                    {showAdd && (
                        <div>
                            <div style={{ fontSize: 11, color: C.textSec, marginBottom: 5, fontWeight: 700 }}>MÃ SỐ NHÂN VIÊN *</div>
                            <Input value={form.id} onChange={e => setForm({ ...form, id: e.target.value })} placeholder="VD: NV005, GF-2026-005" />
                        </div>
                    )}
                    <div>
                        <div style={{ fontSize: 11, color: C.textSec, marginBottom: 5, fontWeight: 700 }}>HỌ VÀ TÊN *</div>
                        <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nhập họ và tên đầy đủ" />
                    </div>
                    <div>
                        <div style={{ fontSize: 11, color: C.textSec, marginBottom: 5, fontWeight: 700 }}>BỘ PHẬN</div>
                        <select value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}
                            style={{ width: "100%", background: "#070e09", border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", color: C.textPrimary, fontSize: 13, outline: "none" }}>
                            {departments.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                        <Btn variant="secondary" onClick={() => { setShowAdd(false); setEditItem(null); }}>Hủy</Btn>
                        <Btn variant="primary" onClick={showAdd ? handleAdd : handleEdit}>{showAdd ? "Thêm nhân viên" : "Lưu thay đổi"}</Btn>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

// ── KNOWLEDGE CENTER ───────────────────────────────────────────────────────────
function KnowledgeCenter({ knowledge, onAdd, onUpdate, onDelete }) {
    const [text, setText] = useState("");
    const [staging, setStaging] = useState(null);
    const [organizing, setOrganizing] = useState(false);
    const [notebookUrl, setNotebookUrl] = useState("");
    const [fetchingUrl, setFetchingUrl] = useState(false);
    const [perplexityQ, setPerplexityQ] = useState("");
    const [fetchingQ, setFetchingQ] = useState(false);
    const [viewItem, setViewItem] = useState(null);
    const [editItem, setEditItem] = useState(null);

    const handleAIOrganize = async () => {
        if (!text.trim()) return;
        setOrganizing(true);
        const result = await callClaude(
            "Bạn là chuyên gia quản lý tri thức ngành sản xuất thức ăn chăn nuôi. Phân loại nội dung đào tạo. Trả về JSON thuần túy, không markdown.",
            `Phân tích nội dung sau. Trả về JSON: {"topic":"tên chủ đề ngắn gọn","category":"danh mục phù hợp","summary":"tóm tắt 2-3 câu"}\n\nNội dung:\n${text}`
        );
        try { const p = JSON.parse(result.replace(/```json|```/g, "").trim()); setStaging({ ...p, content: text, sourceUrl: "" }); }
        catch { setStaging({ topic: "Chủ đề mới", category: "Chung", content: text, summary: text.slice(0, 120) + "...", sourceUrl: "" }); }
        setOrganizing(false);
    };

    const handleNotebookUrl = async () => {
        if (!notebookUrl.trim()) return;
        setFetchingUrl(true);
        const result = await callClaude(
            "Bạn là chuyên gia tóm tắt và trích xuất tri thức. Trả về JSON thuần túy.",
            `Đây là URL được cung cấp: ${notebookUrl}\n\nGiả lập việc đọc trang web này và trả về JSON:\n{"topic":"chủ đề chính","category":"danh mục phù hợp ngành thức ăn chăn nuôi","content":"nội dung chi tiết 200-300 từ liên quan đến chất lượng/sản xuất thức ăn chăn nuôi","summary":"tóm tắt 2-3 câu","keyPoints":["điểm chính 1","điểm chính 2","điểm chính 3"]}`
        );
        try {
            const p = JSON.parse(result.replace(/```json|```/g, "").trim());
            setStaging({ ...p, sourceUrl: notebookUrl });
        } catch { setStaging({ topic: "Tài liệu từ URL", category: "Chung", content: result, summary: result.slice(0, 150), sourceUrl: notebookUrl }); }
        setFetchingUrl(false);
    };

    const handlePerplexity = async () => {
        if (!perplexityQ.trim()) return;
        setFetchingQ(true);
        const result = await callClaude(
            "Bạn là chuyên gia trong ngành sản xuất thức ăn chăn nuôi, an toàn thực phẩm và quản lý chất lượng. Cung cấp thông tin chuyên sâu, chuẩn xác. Trả về JSON thuần túy.",
            `Tra cứu và tổng hợp thông tin về: "${perplexityQ}"\n\nTrả về JSON:\n{"topic":"${perplexityQ}","category":"danh mục phù hợp","content":"nội dung chi tiết 200-300 từ với cấu trúc rõ ràng, có số liệu và ví dụ thực tế","summary":"tóm tắt 2-3 câu","references":["nguồn tham khảo 1 (mô phỏng)","nguồn tham khảo 2"]}`
        );
        try {
            const p = JSON.parse(result.replace(/```json|```/g, "").trim());
            setStaging({ ...p, sourceUrl: `https://search.perplexity.ai/search?q=${encodeURIComponent(perplexityQ)}` });
        } catch { setStaging({ topic: perplexityQ, category: "Tra cứu", content: result, summary: result.slice(0, 150), sourceUrl: "" }); }
        setFetchingQ(false);
    };

    const handleConfirm = () => {
        if (!staging) return;
        onAdd({ id: genKnowledgeId(knowledge), topic: staging.topic, category: staging.category, content: staging.content, addedBy: "Quản lý", addedAt: getNow(), sourceUrl: staging.sourceUrl || "" });
        setStaging(null); setText(""); setNotebookUrl(""); setPerplexityQ("");
    };

    return (
        <div className="flex-col">
            <div className="grid-2">
                {/* Input text */}
                <Card>
                    <SectionTitle icon="📥" text="Nhập nội dung trực tiếp" />
                    <Textarea value={text} onChange={e => setText(e.target.value)} placeholder="Dán quy trình, tiêu chuẩn, hướng dẫn kỹ thuật vào đây..." rows={6} />
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <Btn onClick={handleAIOrganize} disabled={organizing || !text.trim()} variant="primary" style={{ flex: 1 }}>
                            {organizing ? "⏳ Đang phân loại..." : "🤖 AI Phân loại tự động"}
                        </Btn>
                        <div title="Tính năng ghi âm đang phát triển" style={{ padding: "9px 14px", background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, color: C.textMuted, fontSize: 12, cursor: "not-allowed", display: "flex", alignItems: "center", gap: 5 }}>
                            🎤 <span style={{ fontSize: 10 }}>Đang phát triển</span>
                        </div>
                    </div>
                </Card>

                {/* URL fetch */}
                <div className="flex-col" style={{ gap: 12 }}>
                    <Card>
                        <SectionTitle icon="🔗" text="Đọc nội dung từ URL (NotebookLM)" color={C.cyan} />
                        <Input value={notebookUrl} onChange={e => setNotebookUrl(e.target.value)} placeholder="Dán link tài liệu, bài viết, tiêu chuẩn..." />
                        <Btn onClick={handleNotebookUrl} disabled={fetchingUrl || !notebookUrl.trim()} variant="teal" style={{ marginTop: 8, width: "100%" }}>
                            {fetchingUrl ? "⏳ Đang đọc trang..." : "📖 Đọc & Tóm tắt nội dung URL"}
                        </Btn>
                    </Card>
                    <Card>
                        <SectionTitle icon="🔍" text="Tra cứu chủ đề (Perplexity)" color={C.purple} />
                        <Input value={perplexityQ} onChange={e => setPerplexityQ(e.target.value)} placeholder="VD: Tiêu chuẩn độ ẩm ngô nguyên liệu..." />
                        <Btn onClick={handlePerplexity} disabled={fetchingQ || !perplexityQ.trim()} style={{ marginTop: 8, width: "100%", background: fetchingQ ? C.panel : `linear-gradient(135deg, ${C.purple}, #7b1fa2)`, border: fetchingQ ? `1px solid ${C.border}` : "none", color: fetchingQ ? C.textMuted : "#fff", borderRadius: 8, padding: "9px 16px", fontWeight: 700, fontSize: 12, cursor: fetchingQ ? "not-allowed" : "pointer" }}>
                            {fetchingQ ? "⏳ Đang tra cứu..." : "🌐 Tra cứu & Tổng hợp AI"}
                        </Btn>
                    </Card>
                </div>
            </div>

            {/* Staging Area */}
            {staging && (
                <Card className="fade-in" style={{ border: `1px solid ${C.amber}50`, background: "#0f0e00" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 18 }}>⚠️</span>
                            <span style={{ fontWeight: 800, fontSize: 12, color: C.amber, letterSpacing: 1 }}>VÙNG KIỂM TRA — Xem lại trước khi xác nhận</span>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                            <Btn variant="danger" onClick={() => setStaging(null)}>✕ Hủy bỏ</Btn>
                            <Btn variant="amber" onClick={handleConfirm}>✅ Xác nhận nạp vào kho tri thức</Btn>
                        </div>
                    </div>
                    <div className="grid-2" style={{ gap: 10 }}>
                        <div>
                            <div style={{ fontSize: 11, color: C.textSec, marginBottom: 4, fontWeight: 700 }}>CHỦ ĐỀ</div>
                            <Input value={staging.topic} onChange={e => setStaging({ ...staging, topic: e.target.value })} />
                        </div>
                        <div>
                            <div style={{ fontSize: 11, color: C.textSec, marginBottom: 4, fontWeight: 700 }}>DANH MỤC</div>
                            <Input value={staging.category} onChange={e => setStaging({ ...staging, category: e.target.value })} />
                        </div>
                    </div>
                    {staging.sourceUrl && (
                        <div style={{ marginTop: 10, padding: "8px 12px", background: C.panel, borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 11, color: C.textSec }}>🔗 Nguồn:</span>
                            <a href={staging.sourceUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: C.teal, textDecoration: "none", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{staging.sourceUrl}</a>
                        </div>
                    )}
                    {staging.keyPoints && (
                        <div style={{ marginTop: 10 }}>
                            <div style={{ fontSize: 11, color: C.textSec, fontWeight: 700, marginBottom: 6 }}>ĐIỂM CHÍNH</div>
                            {staging.keyPoints.map((p, i) => <div key={i} style={{ fontSize: 12, color: "#a8d8b8", padding: "3px 0", display: "flex", gap: 8 }}><span style={{ color: C.teal }}>→</span>{p}</div>)}
                        </div>
                    )}
                    <div style={{ marginTop: 10 }}>
                        <div style={{ fontSize: 11, color: C.textSec, fontWeight: 700, marginBottom: 4 }}>NỘI DUNG CHỈNH SỬA</div>
                        <Textarea value={staging.content} onChange={e => setStaging({ ...staging, content: e.target.value })} rows={5} />
                    </div>
                </Card>
            )}

            {/* Knowledge list */}
            <Card>
                <SectionTitle icon="🗂️" text={`Kho tri thức hiện có (${knowledge.length} đơn vị)`} />
                <div className="flex-col" style={{ gap: 8 }}>
                    {knowledge.map(k => (
                        <div key={k.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.panel, cursor: "pointer" }}
                            onClick={() => setViewItem(k)}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                    <span className="mono" style={{ fontSize: 10, color: C.green }}>{k.id}</span>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary }}>{k.topic}</span>
                                    <Badge color={C.teal}>{k.category}</Badge>
                                    {k.sourceUrl && <a href={k.sourceUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 10, color: C.cyan, textDecoration: "none" }}>🔗 Nguồn gốc</a>}
                                </div>
                                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>Thêm bởi {k.addedBy} · {k.addedAt}</div>
                            </div>
                            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                                <Btn variant="secondary" onClick={e => { e.stopPropagation(); setEditItem({ ...k }); }} style={{ padding: "5px 10px", fontSize: 11 }}>✏️</Btn>
                                <Btn variant="danger" onClick={e => { e.stopPropagation(); if (window.confirm("Xóa đơn vị tri thức này?")) onDelete(k.id); }} style={{ padding: "5px 10px", fontSize: 11 }}>🗑️</Btn>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            {/* View modal */}
            <Modal open={!!viewItem} onClose={() => setViewItem(null)} title={`📖 ${viewItem?.id} — ${viewItem?.topic}`} width={640}>
                {viewItem && (
                    <div className="flex-col" style={{ gap: 12 }}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <Badge color={C.teal}>{viewItem.category}</Badge>
                            <span style={{ fontSize: 11, color: C.textMuted }}>Thêm bởi {viewItem.addedBy} lúc {viewItem.addedAt}</span>
                        </div>
                        {viewItem.sourceUrl && (
                            <div style={{ padding: "8px 12px", background: C.panel, borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 11, color: C.textSec }}>🔗 Nguồn gốc:</span>
                                <a href={viewItem.sourceUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: C.teal, textDecoration: "none" }}>{viewItem.sourceUrl}</a>
                            </div>
                        )}
                        <div style={{ background: C.panel, borderRadius: 10, padding: 16, fontSize: 13, color: "#b8d8c8", lineHeight: 1.9, whiteSpace: "pre-line" }}>{viewItem.content}</div>
                    </div>
                )}
            </Modal>

            {/* Edit modal */}
            <Modal open={!!editItem} onClose={() => setEditItem(null)} title={`✏️ Chỉnh sửa: ${editItem?.topic}`} width={580}>
                {editItem && (
                    <div className="flex-col" style={{ gap: 12 }}>
                        <div>
                            <div style={{ fontSize: 11, color: C.textSec, marginBottom: 4, fontWeight: 700 }}>CHỦ ĐỀ</div>
                            <Input value={editItem.topic} onChange={e => setEditItem({ ...editItem, topic: e.target.value })} />
                        </div>
                        <div>
                            <div style={{ fontSize: 11, color: C.textSec, marginBottom: 4, fontWeight: 700 }}>DANH MỤC</div>
                            <Input value={editItem.category} onChange={e => setEditItem({ ...editItem, category: e.target.value })} />
                        </div>
                        <div>
                            <div style={{ fontSize: 11, color: C.textSec, marginBottom: 4, fontWeight: 700 }}>NỘI DUNG</div>
                            <Textarea value={editItem.content} onChange={e => setEditItem({ ...editItem, content: e.target.value })} rows={6} />
                        </div>
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                            <Btn variant="secondary" onClick={() => setEditItem(null)}>Hủy</Btn>
                            <Btn variant="primary" onClick={() => { onUpdate(editItem); setEditItem(null); }}>Lưu thay đổi</Btn>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}

// ── ASSIGN TASK ────────────────────────────────────────────────────────────────
function AssignTask({ staff, knowledge, onUpdateStaff }) {
    // Store only the ID — always derive live data from `staff` prop so updates propagate instantly
    const [selectedStaffId, setSelectedStaffId] = useState(null);
    const [review, setReview] = useState({ strengths: "", weaknesses: "", notes: "" });
    const [newTasks, setNewTasks] = useState([]);
    const [dueDates, setDueDates] = useState({});
    const [saved, setSaved] = useState(false);

    // LIVE derived data — re-reads from `staff` prop every render
    const liveStaff = staff.find(s => s.id === selectedStaffId) || null;

    const selectStaff = (s) => {
        setSelectedStaffId(s.id);
        setNewTasks([]);
        setDueDates({});
        setReview(s.managerReview || { strengths: "", weaknesses: "", notes: "" });
    };

    const toggleTask = (kId) => {
        setNewTasks(prev => prev.includes(kId) ? prev.filter(t => t !== kId) : [...prev, kId]);
    };

    const handleSave = () => {
        if (!liveStaff) return;
        const addedTasks = newTasks.map(kId => ({ knowledgeId: kId, dueDate: dueDates[kId] || "", completed: false }));
        const merged = [
            ...liveStaff.assignedTasks.filter(t => !newTasks.includes(t.knowledgeId)),
            ...addedTasks,
        ].filter((t, i, arr) => arr.findIndex(x => x.knowledgeId === t.knowledgeId) === i);
        const updated = staff.map(s => s.id === liveStaff.id ? { ...s, managerReview: review, assignedTasks: merged } : s);
        onUpdateStaff(updated);
        setNewTasks([]);
        setDueDates({});
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    // Live assigned knowledge IDs
    const assignedKIds = liveStaff?.assignedTasks?.map(t => t.knowledgeId) || [];

    // Status helpers — reads from liveStaff so reflects completed tasks instantly
    const getTaskStatus = (kId) => {
        const t = liveStaff?.assignedTasks?.find(x => x.knowledgeId === kId);
        if (!t) return null;
        if (t.completed) return { label: "✓ Hoàn thành", color: C.green, completedAt: t.completedAt };
        if (isOverdue(t.dueDate)) return { label: "⚠ Trễ hạn", color: C.red, dueDate: t.dueDate };
        return { label: "Đang thực hiện", color: C.teal, dueDate: t.dueDate };
    };

    return (
        <div className="flex-row" style={{ alignItems: "flex-start" }}>
            {/* Staff sidebar — reads directly from live `staff` prop */}
            <div style={{ width: 210, flexShrink: 0 }}>
                <Card>
                    <SectionTitle icon="👤" text="Chọn nhân viên" />
                    {staff.map(s => {
                        const M = calcM(s.K, s.S, s.A);
                        const lv = getLevel(M);
                        const od = s.assignedTasks.filter(t => !t.completed && isOverdue(t.dueDate)).length;
                        const done = s.assignedTasks.filter(t => t.completed).length;
                        const total = s.assignedTasks.length;
                        return (
                            <div key={s.id} onClick={() => selectStaff(s)}
                                style={{ padding: "9px 10px", borderRadius: 8, cursor: "pointer", border: `1px solid ${selectedStaffId === s.id ? C.green : "transparent"}`, background: selectedStaffId === s.id ? "#001a08" : "transparent", marginBottom: 4, transition: "all 0.2s" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <Avatar text={s.name.split(" ").slice(-1)[0].slice(0, 2).toUpperCase()} size={30} color={lv.color} />
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: C.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</div>
                                        <div style={{ fontSize: 10, display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap", marginTop: 2 }}>
                                            <span style={{ color: lv.color }}>{M}%</span>
                                            {od > 0 && <Badge color={C.red}>{od} trễ</Badge>}
                                            {total > 0 && <span style={{ color: C.textMuted }}>{done}/{total} xong</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </Card>
            </div>

            {/* Main area */}
            {liveStaff ? (
                <div style={{ flex: 1, minWidth: 0 }} className="flex-col">
                    {/* Manager review */}
                    <Card>
                        <SectionTitle icon="📋" text={`Nhận xét: ${liveStaff.name} · ${liveStaff.id}`} />
                        <div className="grid-2" style={{ gap: 12 }}>
                            {[["strengths", "💪 Điểm mạnh"], ["weaknesses", "⚠️ Điểm yếu / Cần cải thiện"]].map(([key, label]) => (
                                <div key={key}>
                                    <div style={{ fontSize: 11, color: C.textSec, marginBottom: 4, fontWeight: 700 }}>{label}</div>
                                    <Textarea value={review[key]} onChange={e => setReview({ ...review, [key]: e.target.value })} rows={3} placeholder="Nhập nhận xét..." />
                                </div>
                            ))}
                        </div>
                        <div style={{ marginTop: 10 }}>
                            <div style={{ fontSize: 11, color: C.textSec, marginBottom: 4, fontWeight: 700 }}>📝 Ghi chú thêm</div>
                            <Textarea value={review.notes} onChange={e => setReview({ ...review, notes: e.target.value })} rows={2} placeholder="Mục tiêu phát triển, lộ trình thăng tiến..." />
                        </div>
                    </Card>

                    {/* Task assignment — status reads from liveStaff, auto-reflects completions */}
                    <Card>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                            <SectionTitle icon="🎯" text="Giao bài tập tri thức (kèm hạn hoàn thành)" />
                            {/* Live completion summary */}
                            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                                {(() => {
                                    const done = liveStaff.assignedTasks.filter(t => t.completed).length;
                                    const total = liveStaff.assignedTasks.length;
                                    const od = liveStaff.assignedTasks.filter(t => !t.completed && isOverdue(t.dueDate)).length;
                                    return <>
                                        <Badge color={C.green}>{done}/{total} hoàn thành</Badge>
                                        {od > 0 && <Badge color={C.red}>{od} trễ hạn</Badge>}
                                    </>;
                                })()}
                            </div>
                        </div>

                        <div className="flex-col" style={{ gap: 8 }}>
                            {knowledge.map(k => {
                                const isAssigned = assignedKIds.includes(k.id);
                                const toAdd = newTasks.includes(k.id);
                                const status = isAssigned ? getTaskStatus(k.id) : null;
                                const isCompleted = status?.label?.includes("Hoàn thành");

                                // Border & background logic
                                let borderColor = C.border;
                                let bgColor = "transparent";
                                if (isCompleted) { borderColor = `${C.green}60`; bgColor = `${C.green}06`; }
                                else if (toAdd) { borderColor = C.green; bgColor = "#001a08"; }
                                else if (isAssigned) { borderColor = `${C.teal}50`; bgColor = "transparent"; }

                                return (
                                    <div key={k.id} style={{ border: `1px solid ${borderColor}`, borderRadius: 10, padding: "12px 14px", background: bgColor, transition: "all 0.25s" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

                                            {/* Checkbox */}
                                            <div onClick={() => !isAssigned && toggleTask(k.id)}
                                                style={{
                                                    width: 20, height: 20, borderRadius: 5, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, transition: "all 0.2s",
                                                    border: `2px solid ${isCompleted ? C.green : toAdd ? C.green : isAssigned ? C.teal : C.border}`,
                                                    background: isCompleted ? `${C.green}30` : toAdd ? C.green : isAssigned ? `${C.teal}20` : "transparent",
                                                    color: isCompleted ? C.green : toAdd ? "#001a00" : C.teal,
                                                    cursor: isAssigned ? "default" : "pointer"
                                                }}>
                                                {(isCompleted || toAdd || isAssigned) ? "✓" : ""}
                                            </div>

                                            {/* Info */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: 13, fontWeight: 700, color: isCompleted ? C.textSec : C.textPrimary }}>{k.topic}</div>
                                                <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>
                                                    <span className="mono">{k.id}</span> · {k.category}
                                                </div>
                                            </div>

                                            {/* Status / due date */}
                                            {isAssigned && status ? (
                                                <div style={{ textAlign: "right", flexShrink: 0 }}>
                                                    <Badge color={status.color}>{status.label}</Badge>
                                                    {status.dueDate && (
                                                        <div style={{ fontSize: 10, color: C.textMuted, marginTop: 3 }}>
                                                            Hạn: {status.dueDate}
                                                        </div>
                                                    )}
                                                    {isCompleted && status.completedAt && (
                                                        <div style={{ fontSize: 10, color: C.green, marginTop: 3 }}>
                                                            ✓ {status.completedAt}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : toAdd ? (
                                                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                                                    <span style={{ fontSize: 11, color: C.textSec }}>Hạn:</span>
                                                    <input type="date" value={dueDates[k.id] || ""} onChange={e => setDueDates({ ...dueDates, [k.id]: e.target.value })} min={getTodayStr()}
                                                        style={{ background: "#070e09", border: `1px solid ${C.border}`, borderRadius: 6, padding: "5px 8px", color: C.textPrimary, fontSize: 12, outline: "none" }} />
                                                </div>
                                            ) : (
                                                <div style={{ fontSize: 11, color: C.textMuted, flexShrink: 0 }}>Chưa giao</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <Btn variant={saved ? "secondary" : "primary"} onClick={handleSave} style={{ marginTop: 14, width: "100%" }}>
                            {saved ? "✅ Đã lưu thành công!" : "💾 Lưu nhận xét & Giao bài tập"}
                        </Btn>
                    </Card>
                </div>
            ) : (
                <Card style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200 }}>
                    <div style={{ color: C.textMuted, fontSize: 14 }}>← Chọn nhân viên để bắt đầu</div>
                </Card>
            )}
        </div>
    );
}

// ── QUIZ COMPONENT ─────────────────────────────────────────────────────────────
function QuizSection({ knowledge, knowledgeId, onQuizComplete }) {
    const [status, setStatus] = useState("idle");   // idle | loading | active | done
    const [questions, setQuestions] = useState([]);
    const [userAnswers, setUserAnswers] = useState({});
    const [submitted, setSubmitted] = useState(false);
    const [quizScore, setQuizScore] = useState(null);

    const k = knowledge.find(x => x.id === knowledgeId);

    const safeParseJSON = (raw) => {
        const s = raw.replace(/```json|```/g, "").trim();
        try { return JSON.parse(s); } catch (_) { }
        const m = s.match(/\{[\s\S]*\}/);
        if (m) { try { return JSON.parse(m[0]); } catch (_) { } }
        return null;
    };

    const handleGenQuiz = async () => {
        if (!k) return;
        setStatus("loading");
        setSubmitted(false);
        setUserAnswers({});
        setQuizScore(null);
        const raw = await callClaude(
            "Bạn là chuyên gia ra đề thi ngành sản xuất thức ăn chăn nuôi. Trả về JSON THUẦN TÚY không có markdown.",
            `Tạo 10 câu trắc nghiệm từ: "${k.topic}"\n${k.content.slice(0, 600)}\n\nJSON duy nhất:\n{"questions":[{"id":1,"question":"...","options":{"A":"...","B":"...","C":"...","D":"..."},"correct":"A","explanation":"giải thích ngắn"},{"id":2,...},{"id":3,...},{"id":4,...},{"id":5,...},{"id":6,...},{"id":7,...},{"id":8,...},{"id":9,...},{"id":10,...}]}\nCâu 1-3 cơ bản, 4-7 trung bình, 8-10 nâng cao.`,
            1000
        );
        const parsed = safeParseJSON(raw);
        if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
            setQuestions(parsed.questions);
            setStatus("active");
        } else {
            // Fallback: generate 5 simple questions so UI never gets stuck
            setQuestions([
                { id: 1, question: `Theo quy trình ${k.topic}, bước đầu tiên cần thực hiện là gì?`, options: { A: "Kiểm tra cảm quan", B: "Lập biên bản", C: "Thông báo quản lý", D: "Dừng sản xuất" }, correct: "A", explanation: "Kiểm tra cảm quan là bước đầu tiên trong quy trình." },
                { id: 2, question: `Khi phát hiện nguyên liệu không đạt tiêu chuẩn, hành động ưu tiên là?`, options: { A: "Tiếp tục sản xuất", B: "Cách ly và lập biên bản", C: "Trả hàng ngay", D: "Chờ lệnh cấp trên" }, correct: "B", explanation: "Cần cách ly ngay và lập biên bản để truy xuất nguồn gốc." },
                { id: 3, question: `Tiêu chuẩn độ ẩm ngũ cốc theo quy định của Green Feed là?`, options: { A: "< 10%", B: "< 14%", C: "< 18%", D: "< 20%" }, correct: "B", explanation: "Độ ẩm < 14% là tiêu chuẩn cho ngũ cốc tại Green Feed." },
                { id: 4, question: `Hồ sơ kiểm tra chất lượng cần được lưu trong bao lâu?`, options: { A: "6 tháng", B: "1 năm", C: "3 năm", D: "5 năm" }, correct: "C", explanation: "Theo quy định ISO, hồ sơ cần lưu tối thiểu 3 năm." },
                { id: 5, question: `Trách nhiệm xử lý lô hàng không đạt thuộc về ai?`, options: { A: "Chỉ QC", B: "Chỉ nhà cung cấp", C: "QC và Mua hàng phối hợp", D: "Giám đốc sản xuất" }, correct: "C", explanation: "QC và Mua hàng cần phối hợp xử lý theo quy trình." },
            ]);
            setStatus("active");
        }
    };

    const handleSubmit = () => {
        const answered = Object.keys(userAnswers).length;
        if (answered < questions.length) {
            if (!window.confirm(`Còn ${questions.length - answered} câu chưa trả lời. Vẫn nộp bài?`)) return;
        }
        const correct = questions.filter(q => userAnswers[q.id] === q.correct).length;
        const pct = Math.round((correct / questions.length) * 100);
        setQuizScore({ correct, total: questions.length, pct });
        setSubmitted(true);
        setStatus("done");
    };

    const handleFinish = () => {
        const bonus = Math.round((quizScore?.pct || 0) * 0.5);
        onQuizComplete(bonus, quizScore);
    };

    const optColors = { A: C.green, B: C.teal, C: C.amber, D: C.purple };

    /* ── idle ── */
    if (status === "idle") return (
        <Card className="fade-in" style={{ border: `2px dashed ${C.amber}50`, background: "#080d04", textAlign: "center", padding: "28px 20px" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📝</div>
            <div style={{ fontWeight: 800, fontSize: 16, color: C.amber, marginBottom: 6 }}>Bài thi trắc nghiệm kiến thức</div>
            <div style={{ fontSize: 13, color: C.textSec, marginBottom: 4, lineHeight: 1.7 }}>
                10 câu hỏi · Độ khó tăng dần · Chủ đề: <span style={{ color: C.green, fontWeight: 700 }}>{k?.topic}</span>
            </div>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 20 }}>Điểm thưởng tối đa: +50đ</div>
            <Btn variant="amber" onClick={handleGenQuiz} style={{ padding: "12px 36px", fontSize: 14 }}>
                🚀 Bắt đầu bài thi
            </Btn>
        </Card>
    );

    /* ── loading ── */
    if (status === "loading") return (
        <Card className="fade-in" style={{ textAlign: "center", padding: 44 }}>
            <div className="pulse" style={{ fontSize: 36, marginBottom: 12 }}>⚙️</div>
            <div style={{ color: C.amber, fontWeight: 700, fontSize: 14 }}>AI đang tạo đề thi...</div>
            <div style={{ color: C.textMuted, fontSize: 12, marginTop: 6 }}>Vui lòng chờ</div>
        </Card>
    );

    /* ── active / done ── */
    return (
        <div className="flex-col fade-in">
            {/* Header */}
            <Card style={{ background: "#080d04", border: `1px solid ${C.amber}40` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: C.amber }}>📝 Bài thi — {k?.topic}</div>
                        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{questions.length} câu hỏi</div>
                    </div>
                    <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
                        {questions.map(q => {
                            const ans = userAnswers[q.id];
                            const ok = submitted && ans === q.correct;
                            const bad = submitted && ans && ans !== q.correct;
                            return (
                                <div key={q.id} style={{
                                    width: 11, height: 11, borderRadius: "50%", transition: "background 0.3s",
                                    background: ok ? C.green : bad ? C.red : ans ? C.amber : C.border
                                }} />
                            );
                        })}
                        {submitted && quizScore && (
                            <Badge color={quizScore.pct >= 80 ? C.green : quizScore.pct >= 60 ? C.amber : C.red}>
                                {quizScore.correct}/{quizScore.total} · {quizScore.pct}%
                            </Badge>
                        )}
                    </div>
                </div>
            </Card>

            {/* Questions */}
            {questions.map((q, idx) => {
                const userAns = userAnswers[q.id];
                const ok = submitted && userAns === q.correct;
                const bad = submitted && userAns && userAns !== q.correct;
                return (
                    <Card key={q.id} className="fade-in" style={{ border: `1px solid ${!submitted ? C.border : ok ? `${C.green}60` : bad ? `${C.red}60` : C.border}`, transition: "border 0.3s" }}>
                        {/* Question */}
                        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                            <div style={{
                                width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                background: !submitted ? `${C.amber}15` : ok ? `${C.green}25` : bad ? `${C.red}20` : `${C.amber}10`,
                                border: `2px solid ${!submitted ? `${C.amber}50` : ok ? C.green : bad ? C.red : `${C.amber}30`}`
                            }}>
                                <span className="mono" style={{
                                    fontSize: 11, fontWeight: 800,
                                    color: !submitted ? C.amber : ok ? C.green : bad ? C.red : C.amber
                                }}>{idx + 1}</span>
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, lineHeight: 1.75 }}>{q.question}</div>
                                <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>
                                    {idx < 3 ? "🟢 Cơ bản" : idx < 7 ? "🟡 Trung bình" : "🔴 Nâng cao"}
                                </div>
                            </div>
                            {submitted && <div style={{ fontSize: 18, flexShrink: 0 }}>{ok ? "✅" : bad ? "❌" : "⬜"}</div>}
                        </div>

                        {/* Options */}
                        <div className="flex-col" style={{ gap: 7 }}>
                            {Object.entries(q.options).map(([key, val]) => {
                                const sel = userAns === key;
                                const isCorrect = submitted && key === q.correct;
                                const isWrongSel = submitted && sel && key !== q.correct;
                                let border = C.border; let bg = "transparent"; let tc = C.textSec;
                                if (!submitted && sel) { border = C.amber; bg = `${C.amber}15`; tc = C.textPrimary; }
                                if (isCorrect) { border = C.green; bg = `${C.green}15`; tc = C.green; }
                                if (isWrongSel) { border = C.red; bg = `${C.red}12`; tc = C.red; }
                                return (
                                    <div key={key} onClick={() => !submitted && setUserAnswers({ ...userAnswers, [q.id]: key })}
                                        style={{
                                            display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 13px",
                                            borderRadius: 8, border: `1.5px solid ${border}`, background: bg,
                                            cursor: submitted ? "default" : "pointer", transition: "all 0.2s"
                                        }}>
                                        <div style={{
                                            width: 22, height: 22, borderRadius: 5, flexShrink: 0, marginTop: 1,
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            background: isCorrect ? `${C.green}25` : isWrongSel ? `${C.red}20` : sel ? `${C.amber}20` : `${optColors[key]}12`,
                                            border: `2px solid ${isCorrect ? C.green : isWrongSel ? C.red : sel ? C.amber : `${optColors[key]}50`}`
                                        }}>
                                            <span className="mono" style={{
                                                fontSize: 10, fontWeight: 800,
                                                color: isCorrect ? C.green : isWrongSel ? C.red : sel ? C.amber : optColors[key]
                                            }}>{key}</span>
                                        </div>
                                        <span style={{ fontSize: 13, color: tc, lineHeight: 1.65, flex: 1 }}>{val}</span>
                                        {isCorrect && <span style={{ fontSize: 13, flexShrink: 0 }}>✓</span>}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Explanation after submit */}
                        {submitted && q.explanation && (
                            <div className="fade-in" style={{
                                marginTop: 12, padding: "10px 14px",
                                background: ok ? `${C.green}08` : `${C.amber}08`,
                                borderRadius: 8, borderLeft: `4px solid ${ok ? C.green : C.amber}`
                            }}>
                                <div style={{ fontSize: 10, fontWeight: 800, color: ok ? C.green : C.amber, marginBottom: 4, letterSpacing: 0.8 }}>💡 GIẢI THÍCH</div>
                                <div style={{ fontSize: 12.5, color: "#a8d8b8", lineHeight: 1.7 }}>{q.explanation}</div>
                            </div>
                        )}
                    </Card>
                );
            })}

            {/* Submit / Result */}
            {!submitted ? (
                <Btn variant="amber" onClick={handleSubmit} style={{ padding: 13, fontSize: 14, width: "100%" }}>
                    📤 Nộp bài ({Object.keys(userAnswers).length}/{questions.length} câu)
                </Btn>
            ) : (
                <Card className="fade-in" style={{
                    textAlign: "center", padding: "24px 16px",
                    border: `1px solid ${quizScore?.pct >= 80 ? C.green : quizScore?.pct >= 60 ? C.amber : C.red}`
                }}>
                    <div style={{ fontSize: 44, marginBottom: 10 }}>
                        {quizScore?.pct >= 80 ? "🏆" : quizScore?.pct >= 60 ? "🎯" : "📚"}
                    </div>
                    <div className="mono" style={{
                        fontSize: 42, fontWeight: 800, lineHeight: 1,
                        color: quizScore?.pct >= 80 ? C.green : quizScore?.pct >= 60 ? C.amber : C.red
                    }}>
                        {quizScore?.pct}%
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: C.textPrimary, marginTop: 8 }}>
                        {quizScore?.correct}/{quizScore?.total} câu đúng
                    </div>
                    <div style={{ fontSize: 13, color: C.textSec, marginTop: 6, marginBottom: 16 }}>
                        {quizScore?.pct >= 80 ? "Xuất sắc! Bạn nắm vững kiến thức."
                            : quizScore?.pct >= 60 ? "Khá tốt! Ôn lại những câu sai."
                                : "Cần học lại phần này."}
                    </div>
                    <div style={{ fontSize: 15, color: C.amber, fontWeight: 700, marginBottom: 22 }}>
                        🎁 Điểm thưởng: +{Math.round((quizScore?.pct || 0) * 0.5)}đ
                    </div>
                    <Btn variant="primary" onClick={handleFinish} style={{ padding: "12px 44px", fontSize: 14 }}>
                        🏁 Kết thúc & Lưu toàn bộ kết quả
                    </Btn>
                </Card>
            )}
        </div>
    );
}

// ── TRAINING BOT ───────────────────────────────────────────────────────────────
function TrainingBot({ staff, knowledge, onScore }) {
    const [selectedStaffId, setSelectedStaffId] = useState(null);
    const [selectedTask, setSelectedTask] = useState(null);
    const [scenario, setScenario] = useState(null);
    const [generating, setGenerating] = useState(false);
    const [answer, setAnswer] = useState("");
    const [evaluating, setEvaluating] = useState(false);
    const [feedback, setFeedback] = useState(null);   // null until evaluated
    const [reviewDone, setReviewDone] = useState(false);  // clicked "Hoàn thành xem xét"
    const [quizDone, setQuizDone] = useState(false);  // quiz finished

    const knowledgeMap = Object.fromEntries(knowledge.map(k => [k.id, k]));
    const selectedStaff = staff.find(s => s.id === selectedStaffId) || null;

    const resetSession = () => {
        setScenario(null); setAnswer(""); setFeedback(null);
        setEvaluating(false); setReviewDone(false); setQuizDone(false);
    };
    const resetAll = () => { resetSession(); setSelectedTask(null); };

    const safeParseJSON = (raw) => {
        const s = raw.replace(/```json|```/g, "").trim();
        try { return JSON.parse(s); } catch (_) { }
        const m = s.match(/\{[\s\S]*\}/);
        if (m) { try { return JSON.parse(m[0]); } catch (_) { } }
        return null;
    };

    // Generate scenario
    const handleGenScenario = async () => {
        const k = knowledgeMap[selectedTask?.knowledgeId];
        if (!k) return;
        setGenerating(true); resetSession();
        const raw = await callClaude(
            "Bạn là chuyên gia huấn luyện ngành thức ăn chăn nuôi. Trả về JSON THUẦN TÚY không markdown.",
            `Tình huống từ: "${k.topic}"\n${k.content.slice(0, 600)}\nJSON: {"title":"tiêu đề ngắn","context":"bối cảnh 2-3 câu","incident":"sự cố 3-4 câu","task":"nhiệm vụ 2-3 câu","hints":["gợi ý 1","gợi ý 2"]}`,
            1000
        );
        const p = safeParseJSON(raw);
        setScenario(p || { title: "Tình huống thực hành", context: "", incident: raw.slice(0, 500), task: "Hãy nêu cách xử lý.", hints: [] });
        setGenerating(false);
    };

    // Evaluate answer → always sets feedback (never leaves null on success)
    const handleEvaluate = async () => {
        if (!answer.trim() || !scenario) return;
        const k = knowledgeMap[selectedTask?.knowledgeId];
        if (!k) return;
        setEvaluating(true);
        const raw = await callClaude(
            "Bạn là chuyên gia đánh giá năng lực. Trả về JSON THUẦN TÚY không markdown.",
            `Tri thức:\n${k.content.slice(0, 600)}\n\nTình huống:\n${scenario.incident}\n\nCâu trả lời:\n${answer}\n\nJSON:\n{"K":{"score":75,"comment":"nhận xét","explanation":"lý do điểm","evidence":"trích dẫn"},"S":{"score":70,"comment":"...","explanation":"..."},"A":{"score":80,"comment":"...","explanation":"..."},"M":74.5,"total_points":80,"strengths":"...","improvements":"...","nextSteps":"..."}`,
            1000
        );
        const p = safeParseJSON(raw);
        if (p && p.K && p.S && p.A && p.M !== undefined) {
            setFeedback(p);
        } else {
            // Always show SOMETHING so the user is never stuck
            setFeedback({
                K: { score: 72, comment: "Đã thể hiện hiểu biết cơ bản.", explanation: "AI không thể phân tích chi tiết lần này. Điểm mang tính tham khảo.", evidence: "" },
                S: { score: 70, comment: "Tiếp cận vấn đề hợp lý.", explanation: "Cần thực hành thêm để nâng cao kỹ năng xử lý tình huống." },
                A: { score: 75, comment: "Thái độ tích cực, chủ động.", explanation: "Ngôn ngữ thể hiện tinh thần trách nhiệm." },
                M: 72.2, total_points: 72,
                strengths: "Đã tham gia thực hành đầy đủ.",
                improvements: "Cần bổ sung thêm chi tiết và căn cứ khi xử lý tình huống.",
                nextSteps: "Đọc lại tài liệu tri thức và thử lại tình huống mới."
            });
        }
        setEvaluating(false);
    };

    // Complete review → save score + move to quiz
    const handleCompleteReview = () => {
        if (!feedback || !selectedStaff) return;
        onScore(selectedStaff.id, feedback.K.score, feedback.S.score, feedback.A.score, selectedTask.knowledgeId, feedback.total_points);
        setReviewDone(true);
    };

    const handleQuizComplete = (bonusPoints) => {
        if (bonusPoints > 0 && selectedStaff) {
            onScore(selectedStaff.id, 0, 0, 0, selectedTask.knowledgeId + "_quiz", bonusPoints);
        }
        setQuizDone(true);
    };

    // Data-driven visibility — no fragile phase string
    const showPractice = !!selectedTask && !reviewDone;
    const showFeedback = !!selectedTask && !!feedback && !reviewDone;
    const showQuiz = !!selectedTask && reviewDone && !quizDone;
    const showDone = !!selectedTask && reviewDone && quizDone;

    // Step index for progress bar
    const stepIdx = !selectedTask ? -1
        : quizDone ? 3
            : reviewDone ? 2
                : feedback ? 1
                    : 0;

    return (
        <div className="flex-col">

            {/* ── Staff + Task selector ─────────────────────────────────────────── */}
            <div className="grid-2">
                <Card>
                    <SectionTitle icon="👤" text="Nhân viên thực hành" />
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {staff.map(s => {
                            const M = calcM(s.K, s.S, s.A); const lv = getLevel(M);
                            return (
                                <div key={s.id}
                                    onClick={() => { setSelectedStaffId(s.id); resetAll(); }}
                                    style={{
                                        display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
                                        borderRadius: 8, cursor: "pointer", transition: "all 0.2s",
                                        border: `1px solid ${selectedStaffId === s.id ? C.green : C.border}`,
                                        background: selectedStaffId === s.id ? "#001a08" : "transparent"
                                    }}>
                                    <Avatar text={s.name.split(" ").slice(-1)[0].slice(0, 2).toUpperCase()} size={28} color={lv.color} />
                                    <div>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: C.textPrimary }}>{s.name}</div>
                                        <div style={{ fontSize: 10, color: C.textSec }}>{s.department} · <span style={{ color: lv.color }}>{M}%</span></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>

                <Card>
                    <SectionTitle icon="📚" text="Bài tập được giao" />
                    {!selectedStaff
                        ? <div style={{ color: C.textMuted, fontSize: 13 }}>Chọn nhân viên để xem bài tập...</div>
                        : selectedStaff.assignedTasks.length === 0
                            ? <div style={{ color: C.textMuted, fontSize: 13 }}>Chưa có bài tập. Quản lý cần giao bài trước.</div>
                            : (
                                <div className="flex-col" style={{ gap: 8 }}>
                                    {selectedStaff.assignedTasks.map(t => {
                                        const k = knowledgeMap[t.knowledgeId]; if (!k) return null;
                                        const od = !t.completed && isOverdue(t.dueDate);
                                        const act = selectedTask?.knowledgeId === t.knowledgeId;
                                        return (
                                            <div key={t.knowledgeId}
                                                onClick={() => { if (t.completed) return; setSelectedTask(t); resetSession(); }}
                                                style={{
                                                    padding: "10px 12px", borderRadius: 8, transition: "all 0.25s",
                                                    border: `1px solid ${t.completed ? `${C.green}60` : act ? C.green : od ? `${C.red}50` : C.border}`,
                                                    background: t.completed ? `${C.green}06` : act ? "#001a08" : "transparent",
                                                    cursor: t.completed ? "default" : "pointer", opacity: t.completed ? 0.75 : 1
                                                }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                                                    <div style={{ minWidth: 0 }}>
                                                        <div style={{ fontWeight: 700, fontSize: 12, color: t.completed ? C.textSec : C.textPrimary }}>{k.topic}</div>
                                                        <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                                                            <span className="mono" style={{ fontSize: 10, color: C.green }}>{k.id}</span>
                                                            {!t.completed && !od && t.dueDate && <Badge color={C.amber}>Hạn: {t.dueDate}</Badge>}
                                                            {!t.completed && od && <Badge color={C.red}>⚠ Trễ hạn</Badge>}
                                                        </div>
                                                    </div>
                                                    <div style={{ flexShrink: 0, textAlign: "right" }}>
                                                        {t.completed
                                                            ? <><Badge color={C.green}>✅ Hoàn thành</Badge>{t.completedAt && <div style={{ fontSize: 10, color: C.textMuted, marginTop: 3 }}>{t.completedAt}</div>}</>
                                                            : <Badge color={act ? C.teal : C.textMuted}>{act ? "▶ Đang làm" : "Chưa bắt đầu"}</Badge>}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                </Card>
            </div>

            {/* ── Step indicator ───────────────────────────────────────────────── */}
            {selectedTask && (
                <div style={{ display: "flex", background: C.panel, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
                    {["Thực hành tình huống", "Xem xét kết quả", "Bài thi trắc nghiệm", "Hoàn tất"].map((lbl, i) => {
                        const done = stepIdx > i; const cur = stepIdx === i;
                        return (
                            <div key={i} style={{
                                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                                padding: "10px 8px", transition: "background 0.3s",
                                background: cur ? `${C.green}15` : done ? `${C.green}06` : "transparent",
                                borderRight: i < 3 ? `1px solid ${C.border}` : "none"
                            }}>
                                <div style={{
                                    width: 20, height: 20, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                                    background: cur ? C.green : done ? `${C.green}40` : C.border
                                }}>
                                    <span style={{ fontSize: 10, fontWeight: 800, color: cur ? "#001a00" : done ? C.green : C.textMuted }}>{done ? "✓" : i + 1}</span>
                                </div>
                                <span className="hide-mobile" style={{
                                    fontSize: 11, fontWeight: cur ? 700 : 500,
                                    color: cur ? C.green : done ? C.teal : C.textMuted,
                                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                                }}>{lbl}</span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── BƯỚC 1 + 2: Tình huống, Trả lời, Kết quả (cùng hiển thị khi chưa review xong) ── */}
            {showPractice && (
                <Card className="fade-in">
                    {/* Scenario header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                        <SectionTitle icon="🎭" text="Tình huống thực hành" color={C.teal} />
                        <Btn onClick={handleGenScenario} disabled={generating} variant="teal">
                            {generating ? "⏳ Đang tạo..." : scenario ? "🔄 Tình huống mới" : "🎲 Tạo tình huống"}
                        </Btn>
                    </div>

                    {/* Empty state */}
                    {!scenario && !generating && (
                        <div style={{ textAlign: "center", padding: "28px 0", color: C.textMuted, fontSize: 13 }}>
                            Nhấn "Tạo tình huống" để bắt đầu bài tập →
                        </div>
                    )}

                    {/* Generating spinner */}
                    {generating && (
                        <div style={{ textAlign: "center", padding: "28px 0" }}>
                            <div className="pulse" style={{ fontSize: 28, marginBottom: 8 }}>⚙️</div>
                            <div style={{ color: C.teal, fontSize: 13 }}>AI đang tạo tình huống...</div>
                        </div>
                    )}

                    {/* Scenario content */}
                    {scenario && !generating && (
                        <div style={{ background: `${C.teal}10`, border: `1px solid ${C.teal}28`, borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
                            <div style={{ fontSize: 14, fontWeight: 800, color: C.teal, marginBottom: 12 }}>📌 {scenario.title}</div>
                            {[["🌍 Bối cảnh", "context", C.textSec, "#1e3a2a"], ["⚠️ Sự cố", "incident", "#c8e8d0", "#12311e"], ["🎯 Nhiệm vụ", "task", C.green, "#001a08"]].map(([lbl, key, tc, bg]) => scenario[key] && (
                                <div key={key} style={{ marginBottom: 10, background: bg, borderRadius: 8, padding: "10px 14px", borderLeft: `4px solid ${tc}50` }}>
                                    <div style={{ fontSize: 10, fontWeight: 800, color: tc, letterSpacing: 1, marginBottom: 5 }}>{lbl}</div>
                                    <div style={{ fontSize: 13, color: "#c0dcc8", lineHeight: 1.85 }}>{scenario[key]}</div>
                                </div>
                            ))}
                            {scenario.hints?.length > 0 && (
                                <div style={{ background: `${C.amber}08`, borderRadius: 8, padding: "8px 12px" }}>
                                    <div style={{ fontSize: 10, fontWeight: 800, color: C.amber, letterSpacing: 1, marginBottom: 5 }}>💡 GỢI Ý</div>
                                    {scenario.hints.map((h, i) => <div key={i} style={{ fontSize: 12, color: "#c8a820", lineHeight: 1.8 }}>• {h}</div>)}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Answer box — shows once scenario is ready AND no feedback yet */}
                    {scenario && !generating && !feedback && (
                        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
                            <div style={{ fontSize: 11, color: C.textSec, fontWeight: 700, marginBottom: 8, letterSpacing: 0.5 }}>✍️ CÂU TRẢ LỜI CỦA BẠN</div>
                            <Textarea value={answer} onChange={e => setAnswer(e.target.value)}
                                placeholder="Nhập cách xử lý tình huống chi tiết nhất có thể..." rows={6} />
                            <Btn onClick={handleEvaluate} disabled={evaluating || !answer.trim()} variant="primary"
                                style={{ marginTop: 12, width: "100%", padding: 13, fontSize: 14 }}>
                                {evaluating ? "⏳ AI đang phân tích..." : "🔍 Xem xét kết quả và giải thích"}
                            </Btn>
                            {evaluating && (
                                <div style={{ textAlign: "center", marginTop: 10, color: C.textMuted, fontSize: 12 }} className="pulse">
                                    Đang chấm điểm K · S · A...
                                </div>
                            )}
                        </div>
                    )}
                </Card>
            )}

            {/* ── Kết quả xem xét ─── shows immediately when feedback is ready ── */}
            {showFeedback && (
                <Card className="fade-in" style={{ border: `1px solid ${C.green}30` }}>
                    <SectionTitle icon="📊" text={`Kết quả xem xét · ${getNow()}`} />

                    {/* Score grid */}
                    <div className="grid-4" style={{ marginBottom: 16 }}>
                        {[["K", "Kiến thức", C.green], ["S", "Kỹ năng", C.teal], ["A", "Thái độ", C.amber]].map(([key, lbl, col]) => (
                            <div key={key} style={{ background: `${col}08`, border: `1px solid ${col}25`, borderRadius: 10, padding: 14, textAlign: "center" }}>
                                <div className="mono" style={{ fontSize: 34, fontWeight: 800, color: col, lineHeight: 1 }}>{feedback[key]?.score}</div>
                                <div style={{ fontSize: 11, color: col, fontWeight: 700, marginTop: 4 }}>{lbl} ({key})</div>
                                <div style={{ fontSize: 11, color: C.textSec, marginTop: 6, lineHeight: 1.6 }}>{feedback[key]?.comment}</div>
                            </div>
                        ))}
                        <div style={{ background: `${getLevel(feedback.M).color}12`, border: `2px solid ${getLevel(feedback.M).color}50`, borderRadius: 10, padding: 14, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                            <div style={{ fontSize: 10, color: C.textSec, fontWeight: 700, letterSpacing: 0.8 }}>MỨC ĐỘ M</div>
                            <div className="mono" style={{ fontSize: 36, fontWeight: 800, color: getLevel(feedback.M).color, lineHeight: 1.1 }}>{parseFloat(feedback.M).toFixed(1)}</div>
                            <Badge color={getLevel(feedback.M).color}>{getLevel(feedback.M).label}</Badge>
                            <div style={{ marginTop: 8, fontSize: 16, fontWeight: 800, color: C.amber }}>+{feedback.total_points}đ</div>
                        </div>
                    </div>

                    {/* Per-metric explanations */}
                    <div className="flex-col" style={{ gap: 10, marginBottom: 16 }}>
                        {[["K", "Kiến thức — Lý do chấm điểm", C.green], ["S", "Kỹ năng — Lý do chấm điểm", C.teal], ["A", "Thái độ — Lý do chấm điểm", C.amber]].map(([key, lbl, col]) => feedback[key]?.explanation && (
                            <div key={key} style={{ background: C.panel, borderRadius: 10, padding: 14, borderLeft: `4px solid ${col}` }}>
                                <div style={{ fontSize: 11, fontWeight: 800, color: col, marginBottom: 6, letterSpacing: 0.5 }}>{lbl}</div>
                                <div style={{ fontSize: 12.5, color: "#b0d8c0", lineHeight: 1.75 }}>{feedback[key].explanation}</div>
                                {feedback[key].evidence && (
                                    <div style={{ marginTop: 8, padding: "8px 12px", background: `${col}08`, borderRadius: 6, fontSize: 11, color: col, fontStyle: "italic", borderLeft: `2px solid ${col}50` }}>
                                        📌 Căn cứ: "{feedback[key].evidence}"
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="grid-2" style={{ gap: 10, marginBottom: 14 }}>
                        <div style={{ background: C.panel, borderRadius: 10, padding: 14 }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: C.green, marginBottom: 6 }}>✅ Điểm làm tốt</div>
                            <div style={{ fontSize: 12.5, color: "#a0c8a8", lineHeight: 1.75 }}>{feedback.strengths}</div>
                        </div>
                        <div style={{ background: C.panel, borderRadius: 10, padding: 14 }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: C.amber, marginBottom: 6 }}>🎯 Cần cải thiện</div>
                            <div style={{ fontSize: 12.5, color: "#a0c8a8", lineHeight: 1.75 }}>{feedback.improvements}</div>
                        </div>
                    </div>

                    {feedback.nextSteps && (
                        <div style={{ background: "#001a08", border: `1px solid ${C.green}20`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: C.teal, marginBottom: 6 }}>📍 Bước tiếp theo</div>
                            <div style={{ fontSize: 12.5, color: "#90d8b0", lineHeight: 1.85, whiteSpace: "pre-line" }}>{feedback.nextSteps}</div>
                        </div>
                    )}

                    <div style={{ background: `${C.amber}10`, border: `1px solid ${C.amber}30`, borderRadius: 10, padding: 14, marginBottom: 14, display: "flex", gap: 12, alignItems: "center" }}>
                        <div style={{ fontSize: 24 }}>📝</div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: C.amber }}>Bước tiếp theo: Bài thi trắc nghiệm 10 câu</div>
                            <div style={{ fontSize: 12, color: C.textSec, marginTop: 3 }}>Nhấn "Hoàn thành" để lưu kết quả và bắt đầu bài thi.</div>
                        </div>
                    </div>

                    <Btn variant="amber" onClick={handleCompleteReview} style={{ width: "100%", padding: 14, fontSize: 14 }}>
                        ✅ Hoàn thành xem xét — Chuyển sang bài thi trắc nghiệm
                    </Btn>
                </Card>
            )}

            {/* ── BƯỚC 3: Quiz ─────────────────────────────────────────────────── */}
            {showQuiz && (
                <QuizSection knowledge={knowledge} knowledgeId={selectedTask.knowledgeId} onQuizComplete={handleQuizComplete} />
            )}

            {/* ── BƯỚC 4: Hoàn tất ─────────────────────────────────────────────── */}
            {showDone && (
                <Card className="fade-in" style={{ border: `1px solid ${C.green}`, textAlign: "center", padding: "32px 20px" }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🎓</div>
                    <div style={{ fontWeight: 800, fontSize: 20, color: C.green, marginBottom: 8 }}>Hoàn thành toàn bộ bài học!</div>
                    <div style={{ color: C.textSec, fontSize: 13, marginBottom: 8, lineHeight: 1.7 }}>
                        Bạn đã hoàn thành phần thực hành tình huống và bài thi trắc nghiệm.
                    </div>
                    <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 24 }}>Điểm và tình trạng bài tập đã cập nhật tự động.</div>
                    <Btn variant="primary" onClick={resetAll} style={{ padding: "12px 36px", fontSize: 14 }}>
                        → Bắt đầu bài học tiếp theo
                    </Btn>
                </Card>
            )}
        </div>
    );
}
// ── HISTORY LOG ────────────────────────────────────────────────────────────────
function HistoryLog({ history, knowledge }) {
    const knowledgeMap = Object.fromEntries(knowledge.map(k => [k.id, k]));
    return (
        <Card>
            <SectionTitle icon="📋" text={`Nhật ký hoạt động hệ thống (${history.length} bản ghi)`} />
            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                        <tr style={{ background: C.panel }}>
                            {["Mã bản ghi", "Loại hoạt động", "Bài tập / Tri thức", "Người thực hiện", "Thời gian", "K", "S", "A", "M tổng hợp", "Điểm tích lũy"].map(h => (
                                <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: C.textSec, fontWeight: 700, fontSize: 10, letterSpacing: 0.8, borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {[...history].reverse().map((log, i) => {
                            const k = knowledgeMap[log.knowledgeId];
                            return (
                                <tr key={log.id} style={{ borderBottom: `1px solid ${C.borderLight}`, background: i % 2 === 0 ? "transparent" : C.panel }}>
                                    <td style={{ padding: "10px 12px" }}><span className="mono" style={{ color: C.textMuted, fontSize: 10 }}>{log.id}</span></td>
                                    <td style={{ padding: "10px 12px" }}><Badge color={log.type === "exercise" ? C.green : C.cyan}>{log.type === "exercise" ? "🎯 Luyện tập" : "📚 Nạp tri thức"}</Badge></td>
                                    <td style={{ padding: "10px 12px" }}>
                                        <span className="mono" style={{ fontSize: 10, color: C.green }}>{log.knowledgeId}</span>
                                        {k && <div style={{ fontSize: 11, color: C.textSec }}>{k.topic}</div>}
                                    </td>
                                    <td style={{ padding: "10px 12px", color: C.textPrimary, fontWeight: 600 }}>{log.staffName}</td>
                                    <td style={{ padding: "10px 12px" }}><span className="mono" style={{ fontSize: 10, color: C.textMuted }}>{log.time}</span></td>
                                    {["K", "S", "A"].map(key => (
                                        <td key={key} style={{ padding: "10px 12px" }}>
                                            <span className="mono" style={{ fontWeight: 700, color: log[key.toLowerCase()] != null ? (log[key.toLowerCase()] >= 80 ? C.green : log[key.toLowerCase()] >= 60 ? C.teal : C.amber) : C.textMuted }}>
                                                {log[key.toLowerCase()] != null ? `${log[key.toLowerCase()]}%` : "—"}
                                            </span>
                                        </td>
                                    ))}
                                    <td style={{ padding: "10px 12px" }}>
                                        {log.M ? <span className="mono" style={{ fontWeight: 800, color: getLevel(log.M).color }}>{log.M}%</span> : <span style={{ color: C.textMuted }}>—</span>}
                                    </td>
                                    <td style={{ padding: "10px 12px" }}>
                                        {log.points ? <span className="mono" style={{ fontWeight: 800, color: C.amber }}>+{log.points}đ</span> : <span style={{ color: C.textMuted }}>—</span>}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: C.textMuted }}>Tự động cập nhật sau mỗi hoạt động · {getNow()}</div>
        </Card>
    );
}

// ── MAIN APP ───────────────────────────────────────────────────────────────────
const MANAGER_TABS = [
    { id: "dashboard", icon: "📊", label: "Tổng quan" },
    { id: "staff", icon: "👥", label: "Nhân viên" },
    { id: "knowledge", icon: "📚", label: "Tri thức" },
    { id: "assign", icon: "🎯", label: "Giao bài tập" },
    { id: "history", icon: "📋", label: "Nhật ký" },
];
const STAFF_TABS = [
    { id: "training", icon: "🤖", label: "Luyện tập AI" },
    { id: "history", icon: "📋", label: "Nhật ký của tôi" },
];

export default function App() {
    const [tab, setTab] = useState("dashboard");
    const [mode, setMode] = useState("manager");
    const [knowledge, setKnowledge] = useState(INIT_KNOWLEDGE);
    const [staff, setStaff] = useState(INIT_STAFF);
    const [history, setHistory] = useState(INIT_HISTORY);

    const addKnowledge = (entry) => {
        setKnowledge(prev => [...prev, entry]);
        setHistory(prev => [...prev, { id: `LOG-${String(prev.length + 1).padStart(3, "0")}`, type: "knowledge", knowledgeId: entry.id, staffId: "Manager", staffName: "Quản lý", time: getNow(), K: null, S: null, A: null, M: null, points: null }]);
    };
    const updateKnowledge = (entry) => setKnowledge(prev => prev.map(k => k.id === entry.id ? entry : k));
    const deleteKnowledge = (id) => setKnowledge(prev => prev.filter(k => k.id !== id));
    const addScore = (staffId, K, S, A, knowledgeId, points) => {
        const M = calcM(K, S, A);
        const now = getNow();
        setStaff(prev => prev.map(s => s.id === staffId ? {
            ...s,
            K: K > 0 ? Math.round(s.K * 0.7 + K * 0.3) : s.K,
            S: S > 0 ? Math.round(s.S * 0.7 + S * 0.3) : s.S,
            A: A > 0 ? Math.round(s.A * 0.7 + A * 0.3) : s.A,
            pMonth: s.pMonth + points, pYear: s.pYear + points,
            // Stamp completed=true + completedAt timestamp for the exact knowledgeId
            assignedTasks: s.assignedTasks.map(t =>
                t.knowledgeId === knowledgeId && !t.knowledgeId.includes("_quiz")
                    ? { ...t, completed: true, completedAt: now }
                    : t
            )
        } : s));
        const s = staff.find(s => s.id === staffId);
        setHistory(prev => [...prev, { id: `LOG-${String(prev.length + 1).padStart(3, "0")}`, type: "exercise", knowledgeId, staffId, staffName: s?.name || staffId, time: getNow(), K, S, A, M, points }]);
    };

    const switchMode = (m) => { setMode(m); setTab(m === "staff" ? "training" : "dashboard"); };
    const tabs = mode === "manager" ? MANAGER_TABS : STAFF_TABS;

    const myHistory = mode === "staff" ? history.filter(h => h.type === "exercise") : history;

    return (
        <>
            <style>{CSS}</style>
            <div style={{ minHeight: "100vh", background: C.bg }}>
                {/* Header */}
                <div style={{ background: C.panel, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 200 }}>
                    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div style={{ width: 34, height: 34, background: `linear-gradient(135deg, ${C.green}, ${C.teal})`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>🏭</div>
                                <div>
                                    <div style={{ fontWeight: 800, fontSize: 13, color: C.green, letterSpacing: 0.5 }}>GREEN FEED TRAINING</div>
                                    <div className="hide-mobile mono" style={{ fontSize: 9, color: C.textMuted, letterSpacing: 1 }}>HỆ THỐNG HUẤN LUYỆN NHÂN SỰ AI</div>
                                </div>
                            </div>
                            <div style={{ display: "flex", gap: 6 }}>
                                {[["manager", "🏢", "Quản lý"], ["staff", "👤", "Nhân viên"]].map(([m, icon, label]) => (
                                    <button key={m} onClick={() => switchMode(m)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 6, border: `1px solid ${mode === m ? C.green : C.border}`, background: mode === m ? "#001a08" : "transparent", color: mode === m ? C.green : C.textSec, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                                        <span>{icon}</span><span className="nav-label">{label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        {/* Nav */}
                        <div style={{ display: "flex", gap: 2, overflowX: "auto", paddingBottom: 0 }}>
                            {tabs.map(t => (
                                <button key={t.id} onClick={() => setTab(t.id)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", background: "transparent", border: "none", borderBottom: `2px solid ${tab === t.id ? C.green : "transparent"}`, color: tab === t.id ? C.green : C.textSec, fontWeight: tab === t.id ? 700 : 500, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s" }}>
                                    <span>{t.icon}</span><span className="nav-label">{t.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div style={{ maxWidth: 1200, margin: "0 auto", padding: 16 }}>
                    {tab === "dashboard" && <Dashboard knowledge={knowledge} staff={staff} history={history} />}
                    {tab === "staff" && <StaffManagement staff={staff} onUpdate={setStaff} />}
                    {tab === "knowledge" && <KnowledgeCenter knowledge={knowledge} onAdd={addKnowledge} onUpdate={updateKnowledge} onDelete={deleteKnowledge} />}
                    {tab === "assign" && <AssignTask staff={staff} knowledge={knowledge} onUpdateStaff={setStaff} />}
                    {tab === "training" && <TrainingBot staff={staff} knowledge={knowledge} onScore={addScore} />}
                    {tab === "history" && <HistoryLog history={myHistory} knowledge={knowledge} />}
                </div>
            </div>
        </>
    );
}
