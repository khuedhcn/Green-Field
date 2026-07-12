import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import _ from "lodash";

// ============================================================
// DATA & CONSTANTS
// ============================================================
const BU_LOCATIONS = [
    "GD CL", "LAB HO", "LAB DONAVET", "BU BD", "BU HY", "BU HN",
    "BU VL", "BU LA", "BU DN", "BU CAM", "BU LAO", "BU MYA", "GC", "KHÁC"
];

const TOOLTIP_DEFINITIONS = {
    "Prevention": "Chi phí phòng ngừa: Đào tạo, kiểm tra thiết bị, đánh giá nhà cung cấp",
    "Appraisal": "Chi phí đánh giá: Kiểm tra nguyên liệu, sản phẩm, hiệu chuẩn thiết bị",
    "Internal Failure": "Chi phí lỗi nội bộ: Sản phẩm lỗi, tái chế, thời gian chết",
    "External Failure": "Chi phí lỗi bên ngoài: Khiếu nại khách hàng, thu hồi, bồi thường",
    "Cost Reduction": "Giảm chi phí: Các sáng kiến tiết kiệm và cải tiến quy trình",
    "RFT": "Right First Time - Tỷ lệ đạt yêu cầu ngay lần đầu",
    "CAPA": "Corrective Action & Preventive Action - Hành động khắc phục và phòng ngừa",
    "KR": "Key Result - Kết quả then chốt đo lường tiến độ Objective",
    "OKR": "Objectives & Key Results - Quản trị mục tiêu và kết quả then chốt",
    "BU": "Business Unit - Đơn vị kinh doanh",
    "Roll-up": "Cơ chế tổng hợp dữ liệu từ cấp thấp nhất lên cấp cao nhất"
};

const STATUS_COLORS = {
    "not_started": { bg: "#1a2332", text: "#64748b", label: "Chưa bắt đầu" },
    "in_progress": { bg: "#0c2d4a", text: "#38bdf8", label: "Đang thực hiện" },
    "pending_review": { bg: "#2d1f0e", text: "#f59e0b", label: "Chờ duyệt" },
    "approved": { bg: "#0a2e1a", text: "#22c55e", label: "Đã duyệt" },
    "rejected": { bg: "#2e0a0a", text: "#ef4444", label: "Không đạt" },
};

const generateId = () => Math.random().toString(36).substr(2, 9);

const INITIAL_EMPLOYEES = [
    { id: "EMP001", name: "Nguyễn Văn An", code: "NVA001", tenure: "3 năm", pc: "QA-PC01", salary: 15000000, manager: "Director", bu: "GD CL", role: "admin" },
    { id: "EMP002", name: "Trần Thị Bình", code: "TTB002", tenure: "5 năm", pc: "QA-PC02", salary: 18000000, manager: "Nguyễn Văn An", bu: "LAB HO", role: "manager" },
    { id: "EMP003", name: "Lê Hoàng Cường", code: "LHC003", tenure: "2 năm", pc: "QA-PC03", salary: 12000000, manager: "Trần Thị Bình", bu: "LAB HO", role: "user" },
    { id: "EMP004", name: "Phạm Minh Đức", code: "PMD004", tenure: "4 năm", pc: "QA-PC04", salary: 14000000, manager: "Trần Thị Bình", bu: "BU BD", role: "user" },
    { id: "EMP005", name: "Võ Thị Em", code: "VTE005", tenure: "1 năm", pc: "QA-PC05", salary: 11000000, manager: "Nguyễn Văn An", bu: "BU HY", role: "manager" },
    { id: "EMP006", name: "Hoàng Văn Phúc", code: "HVP006", tenure: "3 năm", pc: "QA-PC06", salary: 13000000, manager: "Võ Thị Em", bu: "BU HY", role: "user" },
    { id: "EMP007", name: "Đặng Thị Giang", code: "DTG007", tenure: "2 năm", pc: "QA-PC07", salary: 12500000, manager: "Võ Thị Em", bu: "BU HN", role: "user" },
    { id: "EMP008", name: "Bùi Quang Hải", code: "BQH008", tenure: "6 năm", pc: "QA-PC08", salary: 20000000, manager: "Nguyễn Văn An", bu: "BU DN", role: "manager" },
    { id: "EMP009", name: "Ngô Thanh Inh", code: "NTI009", tenure: "1.5 năm", pc: "QA-PC09", salary: 11500000, manager: "Bùi Quang Hải", bu: "BU DN", role: "user" },
    { id: "EMP010", name: "Mai Xuân Kim", code: "MXK010", tenure: "4 năm", pc: "QA-PC10", salary: 16000000, manager: "Bùi Quang Hải", bu: "BU VL", role: "user" },
];

const createSampleOKR = () => ({
    id: generateId(),
    objective: "Nâng cao chất lượng sản phẩm & giảm chi phí lỗi Q1/2026",
    objectiveWeight: 100,
    keyResults: [
        {
            id: generateId(), level: 1, title: "Giảm 30% tỷ lệ Internal Failure", weight: 40,
            actions: [
                { id: generateId(), level: "2.1", title: "Đào tạo QC inline cho 100% nhân viên", weight: 50, completion: 80, status: "approved", assignee: "EMP003", deadline: "2026-02-15", completedDate: "2026-02-14" },
                { id: generateId(), level: "2.2", title: "Triển khai SPC cho 5 dây chuyền chính", weight: 50, completion: 40, status: "in_progress", assignee: "EMP004", deadline: "2026-03-30", completedDate: null },
            ],
            subKeyResults: [
                {
                    id: generateId(), level: 2, title: "Giảm 50% lỗi đóng gói", weight: 60,
                    actions: [
                        { id: generateId(), level: "3.1", title: "Lắp đặt vision inspection system", weight: 60, completion: 100, status: "approved", assignee: "EMP006", deadline: "2026-01-31", completedDate: "2026-01-28" },
                        { id: generateId(), level: "3.2", title: "Cập nhật SOP đóng gói theo ISO 22000", weight: 40, completion: 60, status: "pending_review", assignee: "EMP007", deadline: "2026-03-15", completedDate: null },
                    ]
                }
            ]
        },
        {
            id: generateId(), level: 1, title: "Đạt RFT ≥ 95% cho sản phẩm mới", weight: 35,
            actions: [
                { id: generateId(), level: "2.1", title: "Thiết lập quy trình trial run 3 giai đoạn", weight: 60, completion: 70, status: "in_progress", assignee: "EMP009", deadline: "2026-03-01", completedDate: null },
                { id: generateId(), level: "2.2", title: "Xây dựng checklist đánh giá RFT", weight: 40, completion: 100, status: "approved", assignee: "EMP010", deadline: "2026-02-01", completedDate: "2026-01-30" },
            ],
            subKeyResults: []
        },
        {
            id: generateId(), level: 1, title: "Hoàn thành 100% CAPA đúng hạn", weight: 25,
            actions: [
                { id: generateId(), level: "2.1", title: "Số hóa hệ thống CAPA tracking", weight: 50, completion: 55, status: "in_progress", assignee: "EMP003", deadline: "2026-04-01", completedDate: null },
                { id: generateId(), level: "2.2", title: "Training 8D methodology cho team leads", weight: 50, completion: 90, status: "pending_review", assignee: "EMP006", deadline: "2026-02-28", completedDate: null },
            ],
            subKeyResults: [
                {
                    id: generateId(), level: 2, title: "Giảm thời gian đóng CAPA < 15 ngày", weight: 100,
                    actions: [
                        { id: generateId(), level: "3.1", title: "Tự động hóa notification & escalation", weight: 50, completion: 30, status: "in_progress", assignee: "EMP004", deadline: "2026-03-15", completedDate: null },
                        { id: generateId(), level: "3.2", title: "Phân công CAPA owner rõ ràng", weight: 50, completion: 85, status: "pending_review", assignee: "EMP007", deadline: "2026-02-20", completedDate: null },
                    ]
                }
            ]
        },
    ]
});

const WEEKLY_METRICS_TEMPLATE = {
    prevention: 0, appraisal: 0, internalFailure: 0, externalFailure: 0,
    costReduction: 0, complaints: 0, rft: 0, capa: 0, initiatives: "", feedback: ""
};

// ============================================================
// UTILITY COMPONENTS
// ============================================================
const Tooltip = ({ term, children }) => {
    const [show, setShow] = useState(false);
    const def = TOOLTIP_DEFINITIONS[term];
    if (!def) return <span>{children || term}</span>;
    return (
        <span className="tooltip-wrapper" style={{ position: "relative", display: "inline" }}
            onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
            <span style={{ borderBottom: "1px dashed #2dd4bf", cursor: "help" }}>{children || term}</span>
            {show && (
                <span style={{
                    position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)",
                    background: "#1e293b", border: "1px solid #2dd4bf", color: "#e2e8f0",
                    padding: "6px 10px", borderRadius: "6px", fontSize: "11px", whiteSpace: "nowrap",
                    zIndex: 1000, marginBottom: "4px", boxShadow: "0 4px 12px rgba(0,0,0,0.4)"
                }}>{def}</span>
            )}
        </span>
    );
};

const StatusBadge = ({ status }) => {
    const s = STATUS_COLORS[status] || STATUS_COLORS.not_started;
    return (
        <span style={{
            background: s.bg, color: s.text, padding: "2px 10px", borderRadius: "20px",
            fontSize: "11px", fontWeight: 600, border: `1px solid ${s.text}33`
        }}>{s.label}</span>
    );
};

const ProgressBar = ({ value, size = "md", color }) => {
    const h = size === "sm" ? 6 : size === "lg" ? 14 : 8;
    const c = color || (value >= 80 ? "#22c55e" : value >= 50 ? "#f59e0b" : "#ef4444");
    return (
        <div style={{ background: "#0f172a", borderRadius: 20, height: h, width: "100%", overflow: "hidden" }}>
            <div style={{
                width: `${Math.min(100, value)}%`, height: "100%", borderRadius: 20,
                background: `linear-gradient(90deg, ${c}88, ${c})`,
                transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)"
            }} />
        </div>
    );
};

const Modal = ({ open, onClose, title, children, width = 600 }) => {
    if (!open) return null;
    return (
        <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 20
        }} onClick={onClose}>
            <div onClick={e => e.stopPropagation()} style={{
                background: "#0f172a", border: "1px solid #1e3a5f", borderRadius: 12,
                width: "100%", maxWidth: width, maxHeight: "85vh", overflow: "auto",
                boxShadow: "0 25px 50px rgba(0,0,0,0.5)"
            }}>
                <div style={{
                    padding: "16px 20px", borderBottom: "1px solid #1e3a5f",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    position: "sticky", top: 0, background: "#0f172a", zIndex: 1
                }}>
                    <h3 style={{ margin: 0, color: "#2dd4bf", fontSize: 16 }}>{title}</h3>
                    <button onClick={onClose} style={{
                        background: "none", border: "none", color: "#64748b", fontSize: 20, cursor: "pointer"
                    }}>✕</button>
                </div>
                <div style={{ padding: 20 }}>{children}</div>
            </div>
        </div>
    );
};

// ============================================================
// CALCULATION ENGINE
// ============================================================
const calculateActionProgress = (action) => {
    if (action.status === "approved") return action.completion;
    if (action.status === "rejected") return 0;
    return 0; // Only approved counts
};

const calculateKRProgress = (kr) => {
    let directActionsProgress = 0;
    let directActionsWeight = 0;
    kr.actions.forEach(a => {
        directActionsProgress += (a.weight / 100) * calculateActionProgress(a);
        directActionsWeight += a.weight;
    });

    let subKRProgress = 0;
    let subKRWeight = 0;
    (kr.subKeyResults || []).forEach(skr => {
        const skrProg = calculateSubKRProgress(skr);
        subKRProgress += (skr.weight / 100) * skrProg;
        subKRWeight += skr.weight;
    });

    if (subKRWeight > 0 && directActionsWeight > 0) {
        const totalWeight = directActionsWeight + subKRWeight;
        return (directActionsProgress * directActionsWeight + subKRProgress * subKRWeight) / totalWeight * 100;
    }
    if (subKRWeight > 0) return subKRProgress;
    return directActionsProgress * 100 / (directActionsWeight || 1) * (directActionsWeight / 100);
};

const calculateSubKRProgress = (skr) => {
    let total = 0;
    skr.actions.forEach(a => {
        total += (a.weight / 100) * calculateActionProgress(a);
    });
    return total * 100;
};

const calculateObjectiveProgress = (okr) => {
    if (!okr || !okr.keyResults) return 0;
    let total = 0;
    okr.keyResults.forEach(kr => {
        total += (kr.weight / 100) * calculateKRProgress(kr);
    });
    return Math.round(total * 100) / 100;
};

const getAllActions = (okr) => {
    if (!okr) return [];
    const actions = [];
    okr.keyResults.forEach(kr => {
        kr.actions.forEach(a => actions.push({ ...a, krTitle: kr.title }));
        (kr.subKeyResults || []).forEach(skr => {
            skr.actions.forEach(a => actions.push({ ...a, krTitle: `${kr.title} > ${skr.title}` }));
        });
    });
    return actions;
};

// ============================================================
// MAIN APPLICATION
// ============================================================
export default function OKRSystem() {
    const [currentView, setCurrentView] = useState("dashboard");
    const [currentUser, setCurrentUser] = useState(INITIAL_EMPLOYEES[0]);
    const [employees, setEmployees] = useState(INITIAL_EMPLOYEES);
    const [okrData, setOkrData] = useState(createSampleOKR());
    const [weeklyMetrics, setWeeklyMetrics] = useState({});
    const [showEmployeeModal, setShowEmployeeModal] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [aiResult, setAiResult] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");
    const [showRejectModal, setShowRejectModal] = useState(null);
    const [showLogicMap, setShowLogicMap] = useState(false);

    const isAdmin = currentUser.role === "admin";
    const overallProgress = calculateObjectiveProgress(okrData);

    // NAV ITEMS
    const navItems = [
        { key: "dashboard", label: "Dashboard", icon: "◉" },
        { key: "okr_tree", label: "OKR Tree", icon: "⬡" },
        { key: "employees", label: "Nhân sự", icon: "◈" },
        { key: "gantt", label: "Gantt Chart", icon: "▦" },
        { key: "weekly", label: "Chỉ số tuần", icon: "◧" },
        { key: "logic_map", label: "Logic Map", icon: "◇" },
        { key: "ai_tools", label: "AI Tools", icon: "◎" },
    ];

    // ============================================================
    // AI FUNCTIONS (using Anthropic API)
    // ============================================================
    const runAIAnalysis = async (type) => {
        setAiLoading(true);
        setAiResult(null);

        const allActions = getAllActions(okrData);
        const empMap = {};
        employees.forEach(e => { empMap[e.id] = e; });

        const actionSummary = allActions.map(a => {
            const emp = empMap[a.assignee] || {};
            const isLate = a.deadline && !a.completedDate && new Date(a.deadline) < new Date();
            const completedLate = a.completedDate && a.deadline && new Date(a.completedDate) > new Date(a.deadline);
            return `- ${a.title} | Assignee: ${emp.name || "N/A"} (${emp.bu || "N/A"}) | Weight: ${a.weight}% | Completion: ${a.completion}% | Status: ${a.status} | Deadline: ${a.deadline || "N/A"} | ${isLate ? "OVERDUE" : completedLate ? "COMPLETED LATE" : "ON TRACK"}`;
        }).join("\n");

        const buSummary = {};
        employees.filter(e => e.role !== "admin").forEach(emp => {
            if (!buSummary[emp.bu]) buSummary[emp.bu] = { employees: [], totalWeight: 0, totalCompletion: 0 };
            const empActions = allActions.filter(a => a.assignee === emp.id);
            const avgCompletion = empActions.length > 0 ? empActions.reduce((s, a) => s + a.completion, 0) / empActions.length : 0;
            buSummary[emp.bu].employees.push({ name: emp.name, actions: empActions.length, avgCompletion });
        });

        let prompt = "";
        if (type === "detail") {
            prompt = `Bạn là chuyên gia phân tích hiệu suất QA/Operations tại Green Feed Vietnam. 
Phân tích CHI TIẾT dữ liệu OKR sau (KHÔNG bao gồm Director):

OBJECTIVE: ${okrData.objective}
TIẾN ĐỘ TỔNG: ${overallProgress}%

CHI TIẾT ACTIONS:
${actionSummary}

Hãy phân tích:
1. Tỷ lệ hoàn thành đúng hạn vs trễ hạn (số liệu cụ thể)
2. Các action có rủi ro trễ deadline cao
3. Nhân viên có workload bất cân đối
4. Đề xuất cụ thể để cải thiện tiến độ
5. Xếp hạng ưu tiên các action cần tập trung

Trả lời bằng tiếng Việt, chuyên nghiệp, có cấu trúc rõ ràng.`;
        } else {
            const buText = Object.entries(buSummary).map(([bu, data]) =>
                `${bu}: ${data.employees.length} NV | Avg completion: ${(data.employees.reduce((s, e) => s + e.avgCompletion, 0) / data.employees.length).toFixed(1)}%`
            ).join("\n");

            prompt = `Bạn là chuyên gia phân tích hiệu suất cấp cao tại Green Feed Vietnam.
Xuất BÁO CÁO EXECUTIVE về hiệu suất OKR:

OBJECTIVE: ${okrData.objective}
TIẾN ĐỘ TỔNG: ${overallProgress}%

PHÂN TÍCH THEO BU:
${buText}

CHI TIẾT ACTIONS:
${actionSummary}

MANAGERS:
${employees.filter(e => e.role === "manager").map(m => {
                const subordinates = employees.filter(e => e.manager === m.name);
                return `${m.name} (${m.bu}): Quản lý ${subordinates.length} NV`;
            }).join("\n")}

Hãy xuất báo cáo Executive gồm:
1. Tổng quan bức tranh hiệu suất (Executive Summary)
2. Phân tích theo từng BU (mạnh/yếu)
3. Đánh giá từng Trưởng phòng và team
4. Rủi ro chiến lược và đề xuất hành động
5. Dự báo khả năng đạt mục tiêu cuối quý

Trả lời bằng tiếng Việt, phong cách executive report chuyên nghiệp.`;
        }

        try {
            const response = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "claude-sonnet-4-20250514",
                    max_tokens: 1000,
                    messages: [{ role: "user", content: prompt }]
                })
            });
            const data = await response.json();
            const text = data.content?.map(i => i.text || "").join("\n") || "Không thể tạo phân tích.";
            setAiResult({ type, text });
        } catch (err) {
            setAiResult({ type, text: "Lỗi kết nối AI. Vui lòng thử lại." });
        }
        setAiLoading(false);
    };

    const runBalanceAnalysis = async () => {
        setAiLoading(true);
        const allActions = getAllActions(okrData);
        const empMap = {};
        employees.forEach(e => { empMap[e.id] = e; });

        const workloadData = employees.filter(e => e.role !== "admin").map(emp => {
            const empActions = allActions.filter(a => a.assignee === emp.id);
            const totalWeight = empActions.reduce((s, a) => s + a.weight, 0);
            return `${emp.name} (${emp.bu}): ${empActions.length} tasks, tổng weight: ${totalWeight}%`;
        }).join("\n");

        try {
            const response = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "claude-sonnet-4-20250514",
                    max_tokens: 1000,
                    messages: [{ role: "user", content: `Phân tích cân bằng workload giữa nhân viên QA/Operations:\n\n${workloadData}\n\nĐánh giá mức độ công bằng trong phân bổ công việc và đề xuất điều chỉnh cụ thể. Trả lời bằng tiếng Việt.` }]
                })
            });
            const data = await response.json();
            const text = data.content?.map(i => i.text || "").join("\n") || "Không thể phân tích.";
            setAiResult({ type: "balance", text });
        } catch (err) {
            setAiResult({ type: "balance", text: "Lỗi kết nối AI. Vui lòng thử lại." });
        }
        setAiLoading(false);
    };

    // ============================================================
    // ACTION HANDLERS
    // ============================================================
    const handleApprove = (actionId) => {
        const newOkr = JSON.parse(JSON.stringify(okrData));
        newOkr.keyResults.forEach(kr => {
            kr.actions.forEach(a => { if (a.id === actionId) { a.status = "approved"; } });
            (kr.subKeyResults || []).forEach(skr => {
                skr.actions.forEach(a => { if (a.id === actionId) { a.status = "approved"; } });
            });
        });
        setOkrData(newOkr);
    };

    const handleReject = (actionId) => {
        const newOkr = JSON.parse(JSON.stringify(okrData));
        newOkr.keyResults.forEach(kr => {
            kr.actions.forEach(a => { if (a.id === actionId) { a.status = "rejected"; a.rejectionReason = rejectionReason; } });
            (kr.subKeyResults || []).forEach(skr => {
                skr.actions.forEach(a => { if (a.id === actionId) { a.status = "rejected"; a.rejectionReason = rejectionReason; } });
            });
        });
        setOkrData(newOkr);
        setShowRejectModal(null);
        setRejectionReason("");
    };

    const handleMarkComplete = (actionId) => {
        const newOkr = JSON.parse(JSON.stringify(okrData));
        newOkr.keyResults.forEach(kr => {
            kr.actions.forEach(a => { if (a.id === actionId) { a.status = "pending_review"; a.completion = 100; a.completedDate = new Date().toISOString().split("T")[0]; } });
            (kr.subKeyResults || []).forEach(skr => {
                skr.actions.forEach(a => { if (a.id === actionId) { a.status = "pending_review"; a.completion = 100; a.completedDate = new Date().toISOString().split("T")[0]; } });
            });
        });
        setOkrData(newOkr);
    };

    const handleSaveEmployee = (emp) => {
        if (editingEmployee) {
            setEmployees(prev => prev.map(e => e.id === emp.id ? emp : e));
        } else {
            setEmployees(prev => [...prev, { ...emp, id: `EMP${String(prev.length + 1).padStart(3, "0")}` }]);
        }
        setShowEmployeeModal(false);
        setEditingEmployee(null);
    };

    // ============================================================
    // STYLES
    // ============================================================
    const S = {
        app: { minHeight: "100vh", background: "#030712", color: "#e2e8f0", fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 13 },
        header: {
            background: "linear-gradient(135deg, #0a0f1a 0%, #0c1929 50%, #0a1520 100%)",
            borderBottom: "1px solid #1e3a5f", padding: "12px 24px",
            display: "flex", alignItems: "center", justifyContent: "space-between"
        },
        nav: {
            display: "flex", gap: 2, background: "#0a0f1a", borderBottom: "1px solid #1e3a5f",
            padding: "0 16px", overflowX: "auto"
        },
        navBtn: (active) => ({
            padding: "10px 16px", background: active ? "#0c2d4a" : "transparent",
            border: "none", borderBottom: active ? "2px solid #2dd4bf" : "2px solid transparent",
            color: active ? "#2dd4bf" : "#64748b", cursor: "pointer", fontSize: 12,
            fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
            transition: "all 0.2s"
        }),
        card: {
            background: "linear-gradient(145deg, #0f172a 0%, #0c1322 100%)",
            border: "1px solid #1e3a5f", borderRadius: 10, padding: 16, marginBottom: 12
        },
        grid: (cols) => ({ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12 }),
        btn: (variant = "primary") => ({
            padding: "8px 16px", borderRadius: 6, border: "none", cursor: "pointer",
            fontSize: 12, fontFamily: "inherit", fontWeight: 600, transition: "all 0.2s",
            ...(variant === "primary" ? { background: "linear-gradient(135deg, #0d9488, #2dd4bf)", color: "#030712" } :
                variant === "danger" ? { background: "linear-gradient(135deg, #dc2626, #ef4444)", color: "#fff" } :
                    variant === "warning" ? { background: "linear-gradient(135deg, #d97706, #f59e0b)", color: "#030712" } :
                        variant === "ai" ? { background: "linear-gradient(135deg, #7c3aed, #a78bfa)", color: "#fff" } :
                            { background: "#1e293b", color: "#94a3b8", border: "1px solid #334155" })
        }),
        input: {
            background: "#0a0f1a", border: "1px solid #1e3a5f", borderRadius: 6,
            padding: "8px 12px", color: "#e2e8f0", fontSize: 12, fontFamily: "inherit",
            width: "100%", outline: "none", boxSizing: "border-box"
        },
        select: {
            background: "#0a0f1a", border: "1px solid #1e3a5f", borderRadius: 6,
            padding: "8px 12px", color: "#e2e8f0", fontSize: 12, fontFamily: "inherit",
            width: "100%", outline: "none"
        },
        th: { padding: "10px 12px", textAlign: "left", color: "#2dd4bf", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 },
        td: { padding: "10px 12px", borderTop: "1px solid #1e293b", fontSize: 12 },
        sectionTitle: { color: "#2dd4bf", fontSize: 14, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 },
        metricCard: (color) => ({
            ...{ background: "linear-gradient(145deg, #0f172a 0%, #0c1322 100%)", border: "1px solid #1e3a5f", borderRadius: 10, padding: 16 },
            borderLeft: `3px solid ${color}`
        }),
    };

    // ============================================================
    // RENDER: DASHBOARD
    // ============================================================
    const renderDashboard = () => {
        const allActions = getAllActions(okrData);
        const empMap = {};
        employees.forEach(e => { empMap[e.id] = e; });

        const buStats = {};
        BU_LOCATIONS.forEach(bu => {
            const buEmps = employees.filter(e => e.bu === bu && e.role !== "admin");
            if (buEmps.length === 0) return;
            const buActions = allActions.filter(a => buEmps.some(e => e.id === a.assignee));
            const avgCompletion = buActions.length > 0 ? buActions.reduce((s, a) => s + (a.status === "approved" ? a.completion : 0), 0) / buActions.length : 0;
            buStats[bu] = { employees: buEmps.length, actions: buActions.length, progress: Math.round(avgCompletion) };
        });

        const managerStats = employees.filter(e => e.role === "manager").map(m => {
            const subs = employees.filter(e => e.manager === m.name);
            const subActions = allActions.filter(a => subs.some(s => s.id === a.assignee));
            const avgProg = subActions.length > 0 ? subActions.reduce((s, a) => s + (a.status === "approved" ? a.completion : 0), 0) / subActions.length : 0;
            return { ...m, subCount: subs.length, avgProgress: Math.round(avgProg) };
        });

        const pendingActions = allActions.filter(a => a.status === "pending_review");
        const overdueActions = allActions.filter(a => a.deadline && a.status !== "approved" && new Date(a.deadline) < new Date());
        const approvedActions = allActions.filter(a => a.status === "approved");

        return (
            <div style={{ padding: 20 }}>
                {/* Overall Progress */}
                <div style={{ ...S.card, borderLeft: "3px solid #2dd4bf", marginBottom: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <div>
                            <div style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>OBJECTIVE TỔNG</div>
                            <div style={{ color: "#f1f5f9", fontSize: 15, fontWeight: 700, marginTop: 4 }}>{okrData.objective}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                            <div style={{ color: "#2dd4bf", fontSize: 28, fontWeight: 800 }}>{overallProgress}%</div>
                            <div style={{ color: "#64748b", fontSize: 11 }}>Tiến độ tổng</div>
                        </div>
                    </div>
                    <ProgressBar value={overallProgress} size="lg" color="#2dd4bf" />
                </div>

                {/* Summary Cards */}
                <div style={S.grid(4)}>
                    {[
                        { label: "Tổng Actions", value: allActions.length, color: "#38bdf8", icon: "▣" },
                        { label: "Chờ duyệt", value: pendingActions.length, color: "#f59e0b", icon: "◔" },
                        { label: "Đã duyệt", value: approvedActions.length, color: "#22c55e", icon: "◉" },
                        { label: "Quá hạn", value: overdueActions.length, color: "#ef4444", icon: "◈" },
                    ].map((m, i) => (
                        <div key={i} style={S.metricCard(m.color)}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase" }}>{m.label}</span>
                                <span style={{ color: m.color, fontSize: 18 }}>{m.icon}</span>
                            </div>
                            <div style={{ color: m.color, fontSize: 26, fontWeight: 800, marginTop: 4 }}>{m.value}</div>
                        </div>
                    ))}
                </div>

                {/* BU Progress */}
                <div style={{ ...S.card, marginTop: 16 }}>
                    <div style={S.sectionTitle}>
                        <span style={{ color: "#2dd4bf" }}>▦</span> Tiến độ theo <Tooltip term="BU">BU</Tooltip>
                        {isAdmin && (
                            <button style={S.btn("ai")} onClick={runBalanceAnalysis}>
                                ⚖ Balance Analyzer
                            </button>
                        )}
                    </div>
                    <div style={S.grid(3)}>
                        {Object.entries(buStats).map(([bu, data]) => (
                            <div key={bu} style={{
                                background: "#0a0f1a", borderRadius: 8, padding: 12,
                                border: "1px solid #1e293b"
                            }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                                    <span style={{ fontWeight: 700, color: "#e2e8f0" }}>{bu}</span>
                                    <span style={{ color: data.progress >= 60 ? "#22c55e" : data.progress >= 30 ? "#f59e0b" : "#ef4444", fontWeight: 700 }}>
                                        {data.progress}%
                                    </span>
                                </div>
                                <ProgressBar value={data.progress} size="sm" />
                                <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between", color: "#64748b", fontSize: 10 }}>
                                    <span>{data.employees} NV</span>
                                    <span>{data.actions} tasks</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Manager Stats */}
                <div style={{ ...S.card, marginTop: 16 }}>
                    <div style={S.sectionTitle}><span style={{ color: "#f59e0b" }}>◈</span> Trưởng phòng</div>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ background: "#0a0f1a" }}>
                                {["Tên", "BU", "Nhân viên", "Tiến độ TB"].map(h => <th key={h} style={S.th}>{h}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {managerStats.map(m => (
                                <tr key={m.id}>
                                    <td style={S.td}><span style={{ fontWeight: 600 }}>{m.name}</span></td>
                                    <td style={S.td}>{m.bu}</td>
                                    <td style={S.td}>{m.subCount} NV</td>
                                    <td style={S.td}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <div style={{ flex: 1 }}><ProgressBar value={m.avgProgress} size="sm" /></div>
                                            <span style={{ fontWeight: 700, minWidth: 36, textAlign: "right" }}>{m.avgProgress}%</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pending Reviews (Admin only) */}
                {isAdmin && pendingActions.length > 0 && (
                    <div style={{ ...S.card, marginTop: 16, borderLeft: "3px solid #f59e0b" }}>
                        <div style={S.sectionTitle}><span style={{ color: "#f59e0b" }}>◔</span> Chờ Duyệt ({pendingActions.length})</div>
                        {pendingActions.map(action => (
                            <div key={action.id} style={{
                                background: "#0a0f1a", borderRadius: 8, padding: 12, marginBottom: 8,
                                border: "1px solid #1e293b", display: "flex", justifyContent: "space-between", alignItems: "center"
                            }}>
                                <div>
                                    <div style={{ fontWeight: 600, color: "#f1f5f9", marginBottom: 4 }}>{action.title}</div>
                                    <div style={{ color: "#64748b", fontSize: 11 }}>
                                        {empMap[action.assignee]?.name} • {action.krTitle} • {action.completion}%
                                    </div>
                                </div>
                                <div style={{ display: "flex", gap: 6 }}>
                                    <button style={S.btn("primary")} onClick={() => handleApprove(action.id)}>✓ OK</button>
                                    <button style={S.btn("danger")} onClick={() => setShowRejectModal(action.id)}>✗ Không OK</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // ============================================================
    // RENDER: OKR TREE
    // ============================================================
    const renderOKRTree = () => {
        const empMap = {};
        employees.forEach(e => { empMap[e.id] = e; });

        const renderAction = (action, level, krTitle) => {
            const isMyAction = action.assignee === currentUser.id;
            const isOverdue = action.deadline && action.status !== "approved" && new Date(action.deadline) < new Date();

            return (
                <div key={action.id} style={{
                    marginLeft: level * 24, padding: "10px 14px", marginBottom: 6,
                    background: isOverdue ? "#1a0a0a" : "#0a0f1a", borderRadius: 8,
                    border: `1px solid ${isOverdue ? "#7f1d1d" : "#1e293b"}`,
                    transition: "all 0.2s"
                }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                <span style={{
                                    background: "#0c2d4a", color: "#38bdf8", padding: "1px 8px",
                                    borderRadius: 4, fontSize: 10, fontWeight: 700
                                }}>Action {action.level}</span>
                                <span style={{ fontWeight: 600, color: "#f1f5f9", fontSize: 12 }}>{action.title}</span>
                            </div>
                            <div style={{ display: "flex", gap: 12, color: "#64748b", fontSize: 10, marginBottom: 6 }}>
                                <span>👤 {empMap[action.assignee]?.name || "N/A"}</span>
                                <span>⚖ {action.weight}%</span>
                                <span style={{ color: isOverdue ? "#ef4444" : "#64748b" }}>📅 {action.deadline || "—"}</span>
                                {action.completedDate && <span>✓ {action.completedDate}</span>}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ flex: 1, maxWidth: 200 }}><ProgressBar value={action.completion} size="sm" /></div>
                                <span style={{ fontSize: 11, fontWeight: 700 }}>{action.completion}%</span>
                                <StatusBadge status={action.status} />
                            </div>
                            {action.rejectionReason && (
                                <div style={{ marginTop: 4, color: "#ef4444", fontSize: 11, fontStyle: "italic" }}>
                                    ⚠ Lý do từ chối: {action.rejectionReason}
                                </div>
                            )}
                        </div>
                        <div style={{ display: "flex", gap: 4 }}>
                            {isMyAction && action.status === "in_progress" && (
                                <button style={S.btn("warning")} onClick={() => handleMarkComplete(action.id)}>
                                    ✓ Hoàn thành
                                </button>
                            )}
                            {isAdmin && action.status === "pending_review" && (
                                <>
                                    <button style={S.btn("primary")} onClick={() => handleApprove(action.id)}>OK</button>
                                    <button style={S.btn("danger")} onClick={() => setShowRejectModal(action.id)}>✗</button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            );
        };

        return (
            <div style={{ padding: 20 }}>
                {/* Objective */}
                <div style={{ ...S.card, borderLeft: "3px solid #2dd4bf" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{
                            background: "#0d3d56", color: "#2dd4bf", padding: "2px 10px",
                            borderRadius: 4, fontSize: 11, fontWeight: 800
                        }}>O — Cấp 1</span>
                        <span style={{ fontWeight: 700, fontSize: 14, color: "#f1f5f9" }}>
                            <Tooltip term="OKR">{okrData.objective}</Tooltip>
                        </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
                        <div style={{ flex: 1 }}><ProgressBar value={overallProgress} size="lg" color="#2dd4bf" /></div>
                        <span style={{ color: "#2dd4bf", fontWeight: 800, fontSize: 18 }}>{overallProgress}%</span>
                    </div>
                </div>

                {/* Key Results */}
                {okrData.keyResults.map(kr => {
                    const krProgress = calculateKRProgress(kr);
                    return (
                        <div key={kr.id} style={{ marginTop: 12 }}>
                            <div style={{ ...S.card, borderLeft: "3px solid #38bdf8", marginLeft: 20 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                    <span style={{
                                        background: "#0c2d4a", color: "#38bdf8", padding: "2px 10px",
                                        borderRadius: 4, fontSize: 11, fontWeight: 800
                                    }}><Tooltip term="KR">KR</Tooltip> Cấp {kr.level}</span>
                                    <span style={{ fontWeight: 600, color: "#f1f5f9" }}>{kr.title}</span>
                                    <span style={{ color: "#64748b", fontSize: 11 }}>⚖ {kr.weight}%</span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                                    <div style={{ flex: 1, maxWidth: 300 }}><ProgressBar value={krProgress} size="sm" color="#38bdf8" /></div>
                                    <span style={{ fontWeight: 700, color: "#38bdf8" }}>{krProgress.toFixed(1)}%</span>
                                </div>
                            </div>

                            {/* Direct Actions */}
                            <div style={{ marginLeft: 40 }}>
                                {kr.actions.map(a => renderAction(a, 0, kr.title))}
                            </div>

                            {/* Sub Key Results */}
                            {(kr.subKeyResults || []).map(skr => {
                                const skrProgress = calculateSubKRProgress(skr);
                                return (
                                    <div key={skr.id} style={{ marginLeft: 40, marginTop: 8 }}>
                                        <div style={{
                                            ...S.card, borderLeft: "3px solid #a78bfa",
                                            background: "linear-gradient(145deg, #120f24 0%, #0f1024 100%)"
                                        }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <span style={{
                                                    background: "#1e1346", color: "#a78bfa", padding: "2px 10px",
                                                    borderRadius: 4, fontSize: 11, fontWeight: 800
                                                }}>KR Cấp {skr.level}</span>
                                                <span style={{ fontWeight: 600, color: "#f1f5f9" }}>{skr.title}</span>
                                                <span style={{ color: "#64748b", fontSize: 11 }}>⚖ {skr.weight}%</span>
                                            </div>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                                                <div style={{ flex: 1, maxWidth: 200 }}><ProgressBar value={skrProgress} size="sm" color="#a78bfa" /></div>
                                                <span style={{ fontWeight: 700, color: "#a78bfa" }}>{skrProgress.toFixed(1)}%</span>
                                            </div>
                                        </div>
                                        <div style={{ marginLeft: 20 }}>
                                            {skr.actions.map(a => renderAction(a, 0, `${kr.title} > ${skr.title}`))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        );
    };

    // ============================================================
    // RENDER: EMPLOYEES
    // ============================================================
    const EmployeeForm = ({ employee, onSave, onCancel }) => {
        const [form, setForm] = useState(employee || {
            name: "", code: "", tenure: "", pc: "", salary: 0, manager: "", bu: BU_LOCATIONS[0], role: "user"
        });
        return (
            <div>
                <div style={S.grid(2)}>
                    {[
                        { key: "name", label: "Tên nhân viên" },
                        { key: "code", label: "Mã nhân viên" },
                        { key: "tenure", label: "Thời gian làm việc" },
                        { key: "pc", label: "PC" },
                        { key: "salary", label: "Lương", type: "number" },
                        { key: "manager", label: "Trưởng phòng quản lý" },
                    ].map(f => (
                        <div key={f.key} style={{ marginBottom: 12 }}>
                            <label style={{ color: "#94a3b8", fontSize: 11, marginBottom: 4, display: "block" }}>{f.label}</label>
                            <input
                                style={S.input} type={f.type || "text"} value={form[f.key] || ""}
                                onChange={e => setForm({ ...form, [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value })}
                            />
                        </div>
                    ))}
                    <div style={{ marginBottom: 12 }}>
                        <label style={{ color: "#94a3b8", fontSize: 11, marginBottom: 4, display: "block" }}>Vị trí (BU)</label>
                        <select style={S.select} value={form.bu} onChange={e => setForm({ ...form, bu: e.target.value })}>
                            {BU_LOCATIONS.map(bu => <option key={bu} value={bu}>{bu}</option>)}
                        </select>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                        <label style={{ color: "#94a3b8", fontSize: 11, marginBottom: 4, display: "block" }}>Vai trò</label>
                        <select style={S.select} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                            <option value="admin">Admin/Director</option>
                            <option value="manager">Trưởng phòng</option>
                            <option value="user">Nhân viên</option>
                        </select>
                    </div>
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
                    <button style={S.btn("ghost")} onClick={onCancel}>Hủy</button>
                    <button style={S.btn("primary")} onClick={() => onSave(form)}>Lưu</button>
                </div>
            </div>
        );
    };

    const renderEmployees = () => (
        <div style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={S.sectionTitle}><span>◈</span> Quản lý Nhân sự</div>
                {isAdmin && (
                    <button style={S.btn("primary")} onClick={() => { setEditingEmployee(null); setShowEmployeeModal(true); }}>
                        + Thêm nhân viên
                    </button>
                )}
            </div>
            <div style={S.card}>
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
                        <thead>
                            <tr style={{ background: "#0a0f1a" }}>
                                {["Mã NV", "Tên", "BU", "Thời gian", "PC", "Lương", "Quản lý", "Vai trò", ""].map(h =>
                                    <th key={h} style={S.th}>{h}</th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map(emp => (
                                <tr key={emp.id} style={{ background: emp.id === currentUser.id ? "#0c2d4a22" : "transparent" }}>
                                    <td style={S.td}><span style={{ color: "#2dd4bf", fontWeight: 600 }}>{emp.code}</span></td>
                                    <td style={S.td}><span style={{ fontWeight: 600 }}>{emp.name}</span></td>
                                    <td style={S.td}><span style={{
                                        background: "#0c2d4a", color: "#38bdf8", padding: "2px 8px",
                                        borderRadius: 4, fontSize: 10
                                    }}>{emp.bu}</span></td>
                                    <td style={S.td}>{emp.tenure}</td>
                                    <td style={S.td}>{emp.pc}</td>
                                    <td style={S.td}>{(emp.salary || 0).toLocaleString("vi-VN")}đ</td>
                                    <td style={S.td}>{emp.manager}</td>
                                    <td style={S.td}>
                                        <span style={{
                                            background: emp.role === "admin" ? "#2dd4bf22" : emp.role === "manager" ? "#f59e0b22" : "#64748b22",
                                            color: emp.role === "admin" ? "#2dd4bf" : emp.role === "manager" ? "#f59e0b" : "#94a3b8",
                                            padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600
                                        }}>{emp.role === "admin" ? "Director" : emp.role === "manager" ? "Trưởng phòng" : "Nhân viên"}</span>
                                    </td>
                                    <td style={S.td}>
                                        {isAdmin && (
                                            <button style={{ ...S.btn("ghost"), padding: "4px 10px" }}
                                                onClick={() => { setEditingEmployee(emp); setShowEmployeeModal(true); }}>
                                                ✎
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <Modal open={showEmployeeModal} onClose={() => setShowEmployeeModal(false)}
                title={editingEmployee ? "Chỉnh sửa nhân viên" : "Thêm nhân viên mới"}>
                <EmployeeForm employee={editingEmployee} onSave={handleSaveEmployee}
                    onCancel={() => setShowEmployeeModal(false)} />
            </Modal>
        </div>
    );

    // ============================================================
    // RENDER: GANTT CHART
    // ============================================================
    const renderGantt = () => {
        const allActions = getAllActions(okrData);
        const empMap = {};
        employees.forEach(e => { empMap[e.id] = e; });

        const startDate = new Date("2026-01-01");
        const endDate = new Date("2026-06-30");
        const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        const today = new Date();
        const todayOffset = Math.ceil((today - startDate) / (1000 * 60 * 60 * 24));

        const months = [];
        for (let d = new Date(startDate); d <= endDate; d.setMonth(d.getMonth() + 1)) {
            months.push(new Date(d).toLocaleDateString("vi-VN", { month: "short", year: "numeric" }));
        }

        const getBarStyle = (action) => {
            const dl = new Date(action.deadline);
            const barEnd = Math.ceil((dl - startDate) / (1000 * 60 * 60 * 24));
            const barStart = Math.max(0, barEnd - 30); // assume 30-day duration
            const leftPct = (barStart / totalDays) * 100;
            const widthPct = ((barEnd - barStart) / totalDays) * 100;

            let color = "#38bdf8";
            if (action.status === "approved") color = "#22c55e";
            else if (action.status === "rejected") color = "#ef4444";
            else if (action.status === "pending_review") color = "#f59e0b";
            else if (new Date(action.deadline) < today) color = "#ef4444";

            return { left: `${leftPct}%`, width: `${Math.max(2, widthPct)}%`, background: `${color}88`, borderLeft: `2px solid ${color}` };
        };

        return (
            <div style={{ padding: 20 }}>
                <div style={S.sectionTitle}><span>▦</span> Gantt Chart — Timeline</div>
                <div style={{ ...S.card, overflowX: "auto" }}>
                    {/* Header */}
                    <div style={{ display: "flex", borderBottom: "1px solid #1e3a5f", position: "relative" }}>
                        <div style={{ minWidth: 220, padding: "8px 12px", color: "#64748b", fontSize: 11, fontWeight: 600 }}>TASK / ASSIGNEE</div>
                        <div style={{ flex: 1, display: "flex", position: "relative", minWidth: 600 }}>
                            {months.map((m, i) => (
                                <div key={i} style={{
                                    flex: 1, textAlign: "center", padding: "8px 0",
                                    color: "#64748b", fontSize: 10, borderLeft: "1px solid #1e293b"
                                }}>{m}</div>
                            ))}
                            {/* Today line */}
                            <div style={{
                                position: "absolute", left: `${(todayOffset / totalDays) * 100}%`, top: 0, bottom: 0,
                                width: 2, background: "#ef444488", zIndex: 5
                            }}>
                                <span style={{
                                    position: "absolute", top: -2, left: 4, color: "#ef4444",
                                    fontSize: 9, whiteSpace: "nowrap"
                                }}>Hôm nay</span>
                            </div>
                        </div>
                    </div>

                    {/* Rows */}
                    {allActions.map((action, idx) => (
                        <div key={action.id} style={{
                            display: "flex", borderBottom: "1px solid #0f172a",
                            background: idx % 2 === 0 ? "transparent" : "#0a0f1a22"
                        }}>
                            <div style={{ minWidth: 220, padding: "6px 12px" }}>
                                <div style={{ fontSize: 11, fontWeight: 600, color: "#e2e8f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {action.title}
                                </div>
                                <div style={{ fontSize: 10, color: "#64748b" }}>
                                    {empMap[action.assignee]?.name || "—"} • {action.deadline}
                                </div>
                            </div>
                            <div style={{ flex: 1, position: "relative", minWidth: 600, minHeight: 36 }}>
                                <div style={{
                                    position: "absolute", top: 8, height: 20, borderRadius: 3,
                                    ...getBarStyle(action), display: "flex", alignItems: "center",
                                    paddingLeft: 6, fontSize: 9, color: "#fff", fontWeight: 600
                                }}>
                                    {action.completion}%
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // ============================================================
    // RENDER: WEEKLY METRICS
    // ============================================================
    const renderWeeklyMetrics = () => {
        const currentWeek = new Date().toISOString().split("T")[0];
        const [metrics, setMetrics] = useState(weeklyMetrics[currentWeek] || { ...WEEKLY_METRICS_TEMPLATE });

        const saveMetrics = () => {
            setWeeklyMetrics(prev => ({ ...prev, [currentWeek]: metrics }));
        };

        const fields = [
            { key: "prevention", label: "Prevention", type: "number", tooltip: "Prevention" },
            { key: "appraisal", label: "Appraisal", type: "number", tooltip: "Appraisal" },
            { key: "internalFailure", label: "Internal Failure", type: "number", tooltip: "Internal Failure" },
            { key: "externalFailure", label: "External Failure", type: "number", tooltip: "External Failure" },
            { key: "costReduction", label: "Cost Reduction", type: "number", tooltip: "Cost Reduction" },
            { key: "complaints", label: "Khiếu nại (số lượng)", type: "number" },
            { key: "rft", label: "RFT (%)", type: "number", tooltip: "RFT" },
            { key: "capa", label: "CAPA (số open)", type: "number", tooltip: "CAPA" },
        ];

        return (
            <div style={{ padding: 20 }}>
                <div style={S.sectionTitle}><span>◧</span> Nhập chỉ số hàng tuần — {currentWeek}</div>

                <div style={S.card}>
                    <div style={{ color: "#64748b", fontSize: 11, marginBottom: 12 }}>
                        <Tooltip term="Prevention">Tài chính Chất lượng (COQ)</Tooltip> — Đơn vị: VNĐ (nghìn)
                    </div>
                    <div style={S.grid(4)}>
                        {fields.map(f => (
                            <div key={f.key}>
                                <label style={{ color: "#94a3b8", fontSize: 11, marginBottom: 4, display: "block" }}>
                                    {f.tooltip ? <Tooltip term={f.tooltip}>{f.label}</Tooltip> : f.label}
                                </label>
                                <input style={S.input} type="number" value={metrics[f.key]}
                                    onChange={e => setMetrics({ ...metrics, [f.key]: Number(e.target.value) })} />
                            </div>
                        ))}
                    </div>

                    <div style={{ marginTop: 16 }}>
                        <label style={{ color: "#94a3b8", fontSize: 11, marginBottom: 4, display: "block" }}>Sáng kiến & Cải tiến</label>
                        <textarea style={{ ...S.input, minHeight: 60, resize: "vertical" }} value={metrics.initiatives}
                            onChange={e => setMetrics({ ...metrics, initiatives: e.target.value })}
                            placeholder="Mô tả sáng kiến, cải tiến trong tuần..." />
                    </div>

                    <div style={{ marginTop: 12 }}>
                        <label style={{ color: "#94a3b8", fontSize: 11, marginBottom: 4, display: "block" }}>Phản hồi & Ghi chú</label>
                        <textarea style={{ ...S.input, minHeight: 60, resize: "vertical" }} value={metrics.feedback}
                            onChange={e => setMetrics({ ...metrics, feedback: e.target.value })}
                            placeholder="Phản hồi từ khách hàng, nội bộ..." />
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                        <button style={S.btn("primary")} onClick={saveMetrics}>💾 Lưu chỉ số tuần</button>
                    </div>
                </div>

                {/* COQ Summary Card */}
                <div style={{ ...S.card, marginTop: 16 }}>
                    <div style={S.sectionTitle}><span>◉</span> Tóm tắt COQ tuần này</div>
                    <div style={S.grid(4)}>
                        {[
                            { label: "Prevention", value: metrics.prevention, color: "#22c55e" },
                            { label: "Appraisal", value: metrics.appraisal, color: "#38bdf8" },
                            { label: "Internal Fail", value: metrics.internalFailure, color: "#f59e0b" },
                            { label: "External Fail", value: metrics.externalFailure, color: "#ef4444" },
                        ].map((m, i) => (
                            <div key={i} style={S.metricCard(m.color)}>
                                <div style={{ color: "#64748b", fontSize: 10, textTransform: "uppercase" }}>{m.label}</div>
                                <div style={{ color: m.color, fontSize: 22, fontWeight: 800, marginTop: 4 }}>
                                    {(m.value || 0).toLocaleString("vi-VN")}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    // ============================================================
    // RENDER: LOGIC MAP (Roll-up Explanation)
    // ============================================================
    const renderLogicMap = () => (
        <div style={{ padding: 20 }}>
            <div style={S.sectionTitle}><span>◇</span> Logic Map — Cơ chế <Tooltip term="Roll-up">Roll-up</Tooltip> tính toán</div>

            <div style={S.card}>
                <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 12, marginBottom: 20 }}>
                    Sơ đồ minh họa cách dữ liệu được tổng hợp từ Action thấp nhất lên Objective
                </div>

                {/* Visual Flow */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    {/* Objective */}
                    <div style={{
                        background: "linear-gradient(135deg, #0d3d56, #134e6f)", border: "2px solid #2dd4bf",
                        borderRadius: 12, padding: "14px 32px", color: "#2dd4bf", fontWeight: 800, fontSize: 14
                    }}>
                        Cấp 1: OBJECTIVE — {overallProgress}%
                    </div>
                    <div style={{ color: "#2dd4bf", fontSize: 20 }}>▼</div>
                    <div style={{
                        background: "#0a1520", border: "1px dashed #2dd4bf55", borderRadius: 8,
                        padding: "8px 16px", color: "#94a3b8", fontSize: 11, textAlign: "center"
                    }}>
                        Progress = Σ (Weight_KR × Progress_KR)
                    </div>
                    <div style={{ color: "#38bdf8", fontSize: 20 }}>▼</div>

                    {/* KR Level */}
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
                        {okrData.keyResults.map(kr => (
                            <div key={kr.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                                <div style={{
                                    background: "linear-gradient(135deg, #0c2d4a, #1e3a5f)", border: "2px solid #38bdf8",
                                    borderRadius: 10, padding: "10px 20px", color: "#38bdf8", fontWeight: 700, fontSize: 12,
                                    maxWidth: 200, textAlign: "center"
                                }}>
                                    KR Cấp 1 — {kr.weight}%
                                    <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>{kr.title.substring(0, 30)}...</div>
                                </div>
                                <div style={{ color: "#a78bfa", fontSize: 16 }}>▼</div>

                                {/* Actions */}
                                <div style={{ display: "flex", gap: 8 }}>
                                    {kr.actions.map((a, i) => (
                                        <div key={a.id} style={{
                                            background: "#0a0f1a", border: "1px solid #334155", borderRadius: 6,
                                            padding: "6px 10px", fontSize: 10, textAlign: "center", minWidth: 80
                                        }}>
                                            <div style={{ color: "#f59e0b", fontWeight: 700 }}>Action {a.level}</div>
                                            <div style={{ color: "#94a3b8" }}>W: {a.weight}%</div>
                                            <div style={{ color: a.status === "approved" ? "#22c55e" : "#64748b" }}>{a.completion}%</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Sub KRs */}
                                {(kr.subKeyResults || []).map(skr => (
                                    <div key={skr.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, marginTop: 4 }}>
                                        <div style={{ color: "#a78bfa33", fontSize: 12 }}>▼</div>
                                        <div style={{
                                            background: "#120f24", border: "1px solid #a78bfa55", borderRadius: 8,
                                            padding: "8px 14px", color: "#a78bfa", fontWeight: 600, fontSize: 11
                                        }}>
                                            KR Cấp 2 — W: {skr.weight}%
                                        </div>
                                        <div style={{ display: "flex", gap: 6 }}>
                                            {skr.actions.map(a => (
                                                <div key={a.id} style={{
                                                    background: "#0a0f1a", border: "1px solid #1e293b", borderRadius: 6,
                                                    padding: "5px 8px", fontSize: 9, textAlign: "center"
                                                }}>
                                                    <div style={{ color: "#c084fc", fontWeight: 700 }}>Action {a.level}</div>
                                                    <div style={{ color: "#94a3b8" }}>W: {a.weight}%</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Formula Explanation */}
                <div style={{
                    marginTop: 24, background: "#0a0f1a", borderRadius: 8, padding: 16,
                    border: "1px solid #1e293b"
                }}>
                    <div style={{ color: "#2dd4bf", fontWeight: 700, fontSize: 13, marginBottom: 10 }}>
                        📐 Công thức tính toán Roll-up
                    </div>
                    <div style={{ color: "#e2e8f0", fontSize: 12, lineHeight: 2 }}>
                        <div><span style={{ color: "#f59e0b" }}>① Action Progress</span> = Completion % (chỉ tính khi status = "Đã duyệt")</div>
                        <div><span style={{ color: "#a78bfa" }}>② Sub-KR Progress</span> = Σ (Action_Weight × Action_Progress) cho các Action thuộc Sub-KR</div>
                        <div><span style={{ color: "#38bdf8" }}>③ KR Progress</span> = Σ (Direct_Actions + Sub-KRs) × Weight tương ứng</div>
                        <div><span style={{ color: "#2dd4bf" }}>④ Objective Progress</span> = Σ (KR_Weight × KR_Progress) cho tất cả KR Cấp 1</div>
                    </div>
                    <div style={{
                        marginTop: 12, padding: "8px 12px", background: "#0d3d5622",
                        border: "1px solid #2dd4bf33", borderRadius: 6, color: "#2dd4bf",
                        fontFamily: "monospace", fontSize: 12
                    }}>
                        Progress(O) = Σᵢ [ Wᵢ × ( Σⱼ Wⱼ × Completionⱼ + Σₖ Wₖ × Progress(Sub-KRₖ) ) ]
                    </div>

                    {/* Live calculation */}
                    <div style={{ marginTop: 16, color: "#94a3b8", fontSize: 11 }}>
                        <div style={{ fontWeight: 700, color: "#f1f5f9", marginBottom: 6 }}>🔢 Tính toán thực tế hiện tại:</div>
                        {okrData.keyResults.map(kr => {
                            const krProg = calculateKRProgress(kr);
                            return (
                                <div key={kr.id} style={{ marginBottom: 4 }}>
                                    KR "{kr.title.substring(0, 40)}..." (W={kr.weight}%) → Progress = <span style={{ color: "#38bdf8" }}>{krProg.toFixed(2)}%</span> → Đóng góp = <span style={{ color: "#2dd4bf" }}>{(kr.weight / 100 * krProg).toFixed(2)}%</span>
                                </div>
                            );
                        })}
                        <div style={{ marginTop: 8, fontWeight: 700, color: "#2dd4bf", fontSize: 13 }}>
                            ▶ OBJECTIVE PROGRESS = {overallProgress}%
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // ============================================================
    // RENDER: AI TOOLS
    // ============================================================
    const renderAITools = () => (
        <div style={{ padding: 20 }}>
            <div style={S.sectionTitle}><span>◎</span> AI Analysis Tools</div>

            <div style={S.grid(2)}>
                <div style={{ ...S.card, borderLeft: "3px solid #a78bfa" }}>
                    <div style={{ color: "#a78bfa", fontWeight: 700, fontSize: 14, marginBottom: 6 }}>🔬 AI Detail Analysis</div>
                    <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 12, lineHeight: 1.6 }}>
                        Phân tích chi tiết % hoàn thành đúng hạn vs trễ hạn cho từng nhân viên và action.
                        Không bao gồm dữ liệu Director.
                    </div>
                    <button style={S.btn("ai")} onClick={() => runAIAnalysis("detail")} disabled={aiLoading}>
                        {aiLoading ? "⏳ Đang phân tích..." : "🔬 Phân tích Chi tiết"}
                    </button>
                </div>

                <div style={{ ...S.card, borderLeft: "3px solid #f59e0b" }}>
                    <div style={{ color: "#f59e0b", fontWeight: 700, fontSize: 14, marginBottom: 6 }}>📊 AI Executive Report</div>
                    <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 12, lineHeight: 1.6 }}>
                        Xuất báo cáo tổng thể executive-level: bức tranh hiệu suất theo BU và Trưởng phòng.
                    </div>
                    <button style={{ ...S.btn("warning") }} onClick={() => runAIAnalysis("executive")} disabled={aiLoading}>
                        {aiLoading ? "⏳ Đang tạo báo cáo..." : "📊 Executive Report"}
                    </button>
                </div>
            </div>

            {isAdmin && (
                <div style={{ ...S.card, marginTop: 12, borderLeft: "3px solid #22c55e" }}>
                    <div style={{ color: "#22c55e", fontWeight: 700, fontSize: 14, marginBottom: 6 }}>⚖ Balance Analyzer</div>
                    <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 12, lineHeight: 1.6 }}>
                        AI phân tích cân bằng khối lượng công việc và trọng số giữa các nhân viên.
                        Đề xuất điều chỉnh để phân bổ công bằng hơn.
                    </div>
                    <button style={{ ...S.btn("primary") }} onClick={runBalanceAnalysis} disabled={aiLoading}>
                        {aiLoading ? "⏳ Đang phân tích..." : "⚖ Phân tích Cân bằng"}
                    </button>
                </div>
            )}

            {/* AI Result */}
            {aiResult && (
                <div style={{ ...S.card, marginTop: 16, borderLeft: `3px solid ${aiResult.type === "detail" ? "#a78bfa" : aiResult.type === "balance" ? "#22c55e" : "#f59e0b"}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 14 }}>
                            {aiResult.type === "detail" ? "🔬 Kết quả Phân tích Chi tiết" : aiResult.type === "balance" ? "⚖ Kết quả Phân tích Cân bằng" : "📊 Báo cáo Executive"}
                        </div>
                        <button style={S.btn("ghost")} onClick={() => setAiResult(null)}>✕ Đóng</button>
                    </div>
                    <div style={{
                        background: "#0a0f1a", borderRadius: 8, padding: 16,
                        color: "#e2e8f0", fontSize: 12, lineHeight: 1.8,
                        whiteSpace: "pre-wrap", maxHeight: 500, overflowY: "auto"
                    }}>
                        {aiResult.text}
                    </div>
                </div>
            )}
        </div>
    );

    // ============================================================
    // MAIN RENDER
    // ============================================================
    return (
        <div style={S.app}>
            {/* Header */}
            <div style={S.header}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                        background: "linear-gradient(135deg, #0d9488, #2dd4bf)", color: "#030712", fontWeight: 900, fontSize: 16
                    }}>Q</div>
                    <div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: "#f1f5f9", letterSpacing: -0.5 }}>
                            OKR Performance System
                        </div>
                        <div style={{ fontSize: 10, color: "#2dd4bf", letterSpacing: 2, textTransform: "uppercase" }}>
                            Green Feed Vietnam — QA / Operations
                        </div>
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {/* User Switcher */}
                    <select style={{ ...S.select, width: "auto", minWidth: 180 }}
                        value={currentUser.id}
                        onChange={e => setCurrentUser(employees.find(emp => emp.id === e.target.value) || employees[0])}>
                        {employees.map(emp => (
                            <option key={emp.id} value={emp.id}>
                                {emp.role === "admin" ? "👑" : emp.role === "manager" ? "⬡" : "◦"} {emp.name} ({emp.bu})
                            </option>
                        ))}
                    </select>
                    <div style={{
                        background: isAdmin ? "#0d3d56" : "#1e293b", border: `1px solid ${isAdmin ? "#2dd4bf" : "#334155"}`,
                        borderRadius: 6, padding: "4px 12px", color: isAdmin ? "#2dd4bf" : "#94a3b8",
                        fontSize: 10, fontWeight: 700
                    }}>
                        {isAdmin ? "ADMIN" : currentUser.role === "manager" ? "MANAGER" : "USER"}
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div style={S.nav}>
                {navItems.map(item => (
                    <button key={item.key} style={S.navBtn(currentView === item.key)}
                        onClick={() => setCurrentView(item.key)}>
                        <span>{item.icon}</span> {item.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div style={{ maxWidth: 1400, margin: "0 auto" }}>
                {currentView === "dashboard" && renderDashboard()}
                {currentView === "okr_tree" && renderOKRTree()}
                {currentView === "employees" && renderEmployees()}
                {currentView === "gantt" && renderGantt()}
                {currentView === "weekly" && renderWeeklyMetrics()}
                {currentView === "logic_map" && renderLogicMap()}
                {currentView === "ai_tools" && renderAITools()}
            </div>

            {/* Rejection Modal */}
            <Modal open={!!showRejectModal} onClose={() => setShowRejectModal(null)} title="Từ chối — Nhập lý do" width={450}>
                <textarea style={{ ...S.input, minHeight: 80, resize: "vertical" }} value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    placeholder="Nhập lý do từ chối để gửi về nhân viên..." />
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
                    <button style={S.btn("ghost")} onClick={() => setShowRejectModal(null)}>Hủy</button>
                    <button style={S.btn("danger")} onClick={() => handleReject(showRejectModal)} disabled={!rejectionReason.trim()}>
                        Từ chối & Gửi lý do
                    </button>
                </div>
            </Modal>

            {/* AI Loading Overlay */}
            {aiLoading && (
                <div style={{
                    position: "fixed", bottom: 20, right: 20, background: "#1e293b",
                    border: "1px solid #a78bfa", borderRadius: 10, padding: "12px 20px",
                    display: "flex", alignItems: "center", gap: 10, zIndex: 9998,
                    boxShadow: "0 10px 40px rgba(0,0,0,0.5)"
                }}>
                    <div style={{
                        width: 20, height: 20, border: "2px solid #a78bfa33", borderTop: "2px solid #a78bfa",
                        borderRadius: "50%", animation: "spin 1s linear infinite"
                    }} />
                    <span style={{ color: "#a78bfa", fontSize: 12, fontWeight: 600 }}>AI đang phân tích...</span>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            )}
        </div>
    );
}
