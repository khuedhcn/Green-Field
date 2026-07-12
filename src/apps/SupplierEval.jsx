import { useState, useEffect, useRef, useCallback } from "react";

const INGREDIENTS = [
  "Bắp hạt","Bắp ép đùn","Bột Gluten bắp","DDGS từ bắp","Lúa mì hạt","Cám lúa mì",
  "Bột mì","Bột Gluten mì","DDGS từ lúa mì","Bã bia","Lúa hạt","Tấm gạo",
  "Cám gạo sấy","Cám gạo tươi","Cám trích ly xơ cao","Cám trích ly xơ thấp",
  "Dầu cám gạo","Khoai mì không vỏ","Khoai mì nguyên vỏ","Bã khoai mì sấy",
  "Khô dầu đậu nành","Khô dầu đậu nành lên men","Vỏ đậu nành","Đậu nành ép đùn",
  "Dầu đậu nành","Soya Lecithin","Khô dầu hạt cải đắng","Khô dầu hạt cải ngọt",
  "Khô dầu mè","Khô dầu cọ","Khô dầu dừa","Mật rỉ đường","Vedafeed dạng lỏng",
  "Vedafeed viên","Bột cá","Bột cá Tra/Basa","Bột mực","Bột gan mực","Dầu gan mực",
  "Bột đầu tôm","Dịch tôm thủy phân","Bột xương thịt","Bột phụ phẩm gia cầm",
  "Bột lông vũ thủy phân","Bột xương","Bột huyết","Bột hồng cầu sấy phun",
  "Bột huyết tương","Bột trứng kháng thể","Bột váng sữa","Lactose Crude","Muối",
  "Dicalcium Phosphate","Mono-Dicalcium Phosphate","Monocalcium Phosphate","Bột đá vôi",
  "Sodium bicarbonate","Methionine","L-Lysine Monohydrochloride","Threonine",
  "Tryptophan","Choline Chloride","Premix vitamin","Premix khoáng","Premix vitamin và khoáng",
  "Dầu cọ","Bao bì","Bột bánh biscuits","Đại mạch (Barley)","Khô dầu đậu nành lên men Xsoy",
  "L-Lysine Sulphate","Khô dầu nhân đậu phộng","Khô dầu hướng dương","Gạo lức",
  "Dầu cọ thô","Lupin","Đường mía","Sweet Whey","Dầu cá biển","Trấu nhiên liệu","Khác"
];

const now = () => new Date().toLocaleString("vi-VN");
const nowISO = () => new Date().toISOString();

// ─── Storage helpers ──────────────────────────────────────────────────────────
async function load(key) {
  try {
    const r = await window.storage.get(key);
    return r ? JSON.parse(r.value) : null;
  } catch { return null; }
}
async function save(key, val) {
  try { await window.storage.set(key, JSON.stringify(val)); } catch {}
}

// ─── Tiny components ──────────────────────────────────────────────────────────
const Btn = ({ children, onClick, variant = "primary", size = "sm", disabled, className = "" }) => {
  const v = {
    primary: "bg-emerald-700 hover:bg-emerald-600 text-white",
    secondary: "bg-slate-700 hover:bg-slate-600 text-white",
    danger: "bg-red-700 hover:bg-red-600 text-white",
    ghost: "bg-transparent border border-slate-600 hover:bg-slate-800 text-slate-300",
    success: "bg-teal-700 hover:bg-teal-600 text-white",
    warning: "bg-amber-700 hover:bg-amber-600 text-white",
  }[variant];
  const s = size === "xs" ? "px-2 py-1 text-xs" : size === "lg" ? "px-5 py-2.5 text-base" : "px-3 py-1.5 text-sm";
  return (
    <button onClick={onClick} disabled={disabled}
      className={`${v} ${s} rounded font-medium transition-all duration-150 disabled:opacity-40 ${className}`}>
      {children}
    </button>
  );
};

const Input = ({ label, value, onChange, placeholder, type = "text", className = "" }) => (
  <div className={className}>
    {label && <label className="block text-xs text-slate-400 mb-1">{label}</label>}
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-600 placeholder-slate-600" />
  </div>
);

const Textarea = ({ label, value, onChange, placeholder, rows = 3, className = "" }) => (
  <div className={className}>
    {label && <label className="block text-xs text-slate-400 mb-1">{label}</label>}
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-600 placeholder-slate-600 resize-none" />
  </div>
);

const Select = ({ label, value, onChange, options, placeholder, className = "" }) => (
  <div className={className}>
    {label && <label className="block text-xs text-slate-400 mb-1">{label}</label>}
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-600">
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

const Badge = ({ children, color = "emerald" }) => {
  const colors = {
    emerald: "bg-emerald-900 text-emerald-300 border-emerald-700",
    red: "bg-red-900 text-red-300 border-red-700",
    amber: "bg-amber-900 text-amber-300 border-amber-700",
    blue: "bg-blue-900 text-blue-300 border-blue-700",
    slate: "bg-slate-700 text-slate-300 border-slate-600",
  };
  return <span className={`inline-block px-2 py-0.5 rounded text-xs border ${colors[color]}`}>{children}</span>;
};

const StatCard = ({ label, value, sub }) => (
  <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
    <div className="text-2xl font-bold text-emerald-400">{value}</div>
    <div className="text-xs text-slate-400 mt-1">{label}</div>
    {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
  </div>
);

// ─── Section 1: Knowledge Base ────────────────────────────────────────────────
function KnowledgeSection({ knowledge, setKnowledge, checkpoints, setCheckpoints, evaluations }) {
  const [tab, setTab] = useState("knowledge");
  const tabs = [
    { id: "knowledge", label: "1.2 Bộ tri thức" },
    { id: "checklist", label: "1.3 Biên tập Checklist" },
    { id: "history", label: "1.4 Lịch sử đánh giá" },
  ];
  return (
    <div>
      <div className="flex gap-2 mb-4 border-b border-slate-700 pb-2">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm rounded-t font-medium transition-colors ${tab === t.id ? "bg-emerald-700 text-white" : "text-slate-400 hover:text-white"}`}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "knowledge" && <KnowledgeInput knowledge={knowledge} setKnowledge={setKnowledge} />}
      {tab === "checklist" && <ChecklistEditor checkpoints={checkpoints} setCheckpoints={setCheckpoints} />}
      {tab === "history" && <EvaluationHistory evaluations={evaluations} />}
    </div>
  );
}

function KnowledgeInput({ knowledge, setKnowledge }) {
  const [ingredient, setIngredient] = useState("");
  const [sourceType, setSourceType] = useState("internal");
  const [author, setAuthor] = useState("");
  // Law fields
  const [lawCode, setLawCode] = useState(""); const [lawDate, setLawDate] = useState("");
  const [lawEffective, setLawEffective] = useState(""); const [lawName, setLawName] = useState("");
  const [lawContent, setLawContent] = useState("");
  // Internal
  const [internalContent, setInternalContent] = useState("");
  // External
  const [extLink, setExtLink] = useState(""); const [extTitle, setExtTitle] = useState("");
  const [extContent, setExtContent] = useState("");
  // Edit
  const [editId, setEditId] = useState(null);

  const filteredKnowledge = knowledge.filter(k => !ingredient || k.ingredient === ingredient);

  const reset = () => {
    setLawCode(""); setLawDate(""); setLawEffective(""); setLawName(""); setLawContent("");
    setInternalContent(""); setExtLink(""); setExtTitle(""); setExtContent("");
    setEditId(null);
  };

  const handleConfirm = async () => {
    if (!ingredient || !author) return alert("Vui lòng chọn nguyên liệu và nhập tên người nhập!");
    const entry = {
      id: editId || Date.now(),
      ingredient, sourceType, author,
      timestamp: now(),
      ...(sourceType === "law" && { lawCode, lawDate, lawEffective, lawName, lawContent }),
      ...(sourceType === "internal" && { content: internalContent }),
      ...(sourceType === "external" && { link: extLink, title: extTitle, content: extContent }),
    };
    let updated;
    if (editId) {
      updated = knowledge.map(k => k.id === editId ? entry : k);
    } else {
      updated = [...knowledge, entry];
    }
    setKnowledge(updated);
    await save("knowledge", updated);
    reset();
    alert("Đã lưu tri thức thành công!");
  };

  const handleEdit = (k) => {
    setIngredient(k.ingredient); setSourceType(k.sourceType); setAuthor(k.author); setEditId(k.id);
    if (k.sourceType === "law") { setLawCode(k.lawCode||""); setLawDate(k.lawDate||""); setLawEffective(k.lawEffective||""); setLawName(k.lawName||""); setLawContent(k.lawContent||""); }
    if (k.sourceType === "internal") { setInternalContent(k.content||""); }
    if (k.sourceType === "external") { setExtLink(k.link||""); setExtTitle(k.title||""); setExtContent(k.content||""); }
  };

  // Stats by person/month
  const stats = {};
  knowledge.forEach(k => {
    const m = k.timestamp ? k.timestamp.split(",")[0].split("/").slice(1).join("/") : "?";
    const key = `${k.author}|||${m}`;
    stats[key] = (stats[key] || 0) + 1;
  });
  const statRows = Object.entries(stats).map(([key, count]) => { const [a, m] = key.split("|||"); return { author: a, month: m, count }; });

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-4">
        <h3 className="text-emerald-400 font-semibold text-sm uppercase tracking-wide">Nhập tri thức mới {editId && <Badge color="amber">Đang chỉnh sửa</Badge>}</h3>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Chọn nhóm nguyên liệu *" value={ingredient} onChange={setIngredient} options={INGREDIENTS} placeholder="-- Chọn nguyên liệu --" />
          <Input label="Người nhập *" value={author} onChange={setAuthor} placeholder="Họ tên người nhập" />
        </div>
        <div className="flex gap-2">
          {[["law","Luật/Quy định"],["internal","Nội bộ"],["external","Bên ngoài"]].map(([v,l]) => (
            <button key={v} onClick={() => setSourceType(v)}
              className={`px-4 py-2 text-sm rounded font-medium border transition-colors ${sourceType===v?"bg-emerald-700 border-emerald-600 text-white":"border-slate-600 text-slate-400 hover:border-emerald-700"}`}>
              {l}
            </button>
          ))}
        </div>
        {sourceType === "law" && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <Input label="Mã số" value={lawCode} onChange={setLawCode} placeholder="VD: 123/2023/TT-BNNPTNT" />
              <Input label="Ngày ban hành" value={lawDate} onChange={setLawDate} type="date" />
              <Input label="Ngày có hiệu lực" value={lawEffective} onChange={setLawEffective} type="date" />
            </div>
            <Input label="Tên luật/quy định" value={lawName} onChange={setLawName} placeholder="Tên đầy đủ của luật/quy định" />
            <Textarea label="Nội dung chi tiết (Điều/Khoản)" value={lawContent} onChange={setLawContent} rows={4} placeholder="Nhập nội dung điều/khoản liên quan..." />
          </div>
        )}
        {sourceType === "internal" && (
          <Textarea label="Nội dung tri thức nội bộ" value={internalContent} onChange={setInternalContent} rows={5} placeholder="Nhập nội dung tri thức nội bộ..." />
        )}
        {sourceType === "external" && (
          <div className="space-y-3">
            <Input label="Link nguồn" value={extLink} onChange={setExtLink} placeholder="https://..." />
            <Input label="Tiêu đề" value={extTitle} onChange={setExtTitle} placeholder="Tiêu đề bài viết/tài liệu" />
            <Textarea label="Nội dung" value={extContent} onChange={setExtContent} rows={4} placeholder="Tóm tắt nội dung..." />
          </div>
        )}
        <div className="flex gap-2 pt-2">
          <Btn onClick={handleConfirm} variant="success" size="sm">✓ Xác nhận đã nhập xong</Btn>
          {editId && <Btn onClick={reset} variant="ghost" size="sm">Hủy chỉnh sửa</Btn>}
        </div>
      </div>

      {/* History */}
      {filteredKnowledge.length > 0 && (
        <div>
          <h3 className="text-slate-300 font-semibold text-sm mb-2">Lịch sử nhập tri thức {ingredient && `— ${ingredient}`}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-700 text-slate-300">
                  {["STT","Ngày/Giờ","Người nhập","Nguồn","Nội dung",""].map(h => (
                    <th key={h} className="px-3 py-2 text-left border border-slate-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredKnowledge.map((k, i) => (
                  <tr key={k.id} className="border-b border-slate-700 hover:bg-slate-800">
                    <td className="px-3 py-2 border border-slate-700">{i+1}</td>
                    <td className="px-3 py-2 border border-slate-700 whitespace-nowrap">{k.timestamp}</td>
                    <td className="px-3 py-2 border border-slate-700">{k.author}</td>
                    <td className="px-3 py-2 border border-slate-700">
                      <Badge color={k.sourceType==="law"?"red":k.sourceType==="internal"?"blue":"amber"}>
                        {k.sourceType==="law"?"Luật":k.sourceType==="internal"?"Nội bộ":"Bên ngoài"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 border border-slate-700 max-w-xs truncate">
                      {k.lawName || k.title || (k.content||"").slice(0,60)+"..."}
                    </td>
                    <td className="px-3 py-2 border border-slate-700">
                      <Btn onClick={() => handleEdit(k)} variant="ghost" size="xs">✏️ Sửa</Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stats */}
      {statRows.length > 0 && (
        <div>
          <h3 className="text-slate-300 font-semibold text-sm mb-2">Bảng thống kê tổng</h3>
          <table className="w-full text-xs border-collapse">
            <thead><tr className="bg-slate-700 text-slate-300">
              {["Người nhập","Tháng","Số lần nhập"].map(h => <th key={h} className="px-3 py-2 text-left border border-slate-600">{h}</th>)}
            </tr></thead>
            <tbody>{statRows.map((r,i) => (
              <tr key={i} className="border-b border-slate-700">
                <td className="px-3 py-2 border border-slate-700">{r.author}</td>
                <td className="px-3 py-2 border border-slate-700">{r.month}</td>
                <td className="px-3 py-2 border border-slate-700 font-bold text-emerald-400">{r.count}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ChecklistEditor({ checkpoints, setCheckpoints }) {
  const [ingredient, setIngredient] = useState("");
  const [cpType, setCpType] = useState("common");
  const [items, setItems] = useState([{ content: "" }]);
  const [author, setAuthor] = useState("");
  const [editId, setEditId] = useState(null);

  const addItem = () => setItems([...items, { content: "" }]);
  const removeItem = (i) => setItems(items.filter((_,idx) => idx !== i));
  const updateItem = (i, val) => setItems(items.map((it,idx) => idx===i ? {...it, content: val} : it));

  const handleConfirm = async () => {
    if (!ingredient || !author) return alert("Vui lòng chọn nguyên liệu và nhập tên!");
    const validItems = items.filter(it => it.content.trim());
    if (!validItems.length) return alert("Vui lòng nhập ít nhất 1 nội dung đánh giá!");
    const entry = { id: editId || Date.now(), ingredient, cpType, author, timestamp: now(), items: validItems };
    let updated;
    if (editId) { updated = checkpoints.map(c => c.id === editId ? entry : c); }
    else { updated = [...checkpoints, entry]; }
    setCheckpoints(updated);
    await save("checkpoints", updated);
    setItems([{ content: "" }]); setEditId(null);
    alert("Đã lưu checklist thành công!");
  };

  const handleEdit = (cp) => {
    setIngredient(cp.ingredient); setCpType(cp.cpType); setAuthor(cp.author);
    setItems(cp.items); setEditId(cp.id);
  };

  const filtered = checkpoints.filter(c => !ingredient || c.ingredient === ingredient);

  // Stats
  const stats = {};
  checkpoints.forEach(c => {
    const m = c.timestamp ? c.timestamp.split(",")[0].split("/").slice(1).join("/") : "?";
    const y = c.timestamp ? c.timestamp.split(",")[0].split("/")[2] : "?";
    const km = `${c.author}|||${m}`; const ky = `${c.author}|||${y}`;
    stats[km] = (stats[km]||0)+1; stats[ky+"_y"] = (stats[ky+"_y"]||0)+1;
  });

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-4">
        <h3 className="text-emerald-400 font-semibold text-sm uppercase tracking-wide">
          Nhập Checkpoint {editId && <Badge color="amber">Đang chỉnh sửa</Badge>}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Nguyên liệu *" value={ingredient} onChange={setIngredient} options={INGREDIENTS} placeholder="-- Chọn nguyên liệu --" />
          <Input label="Người nhập *" value={author} onChange={setAuthor} placeholder="Họ tên" />
        </div>
        <div className="flex gap-2">
          {[["common","Checkpoint chung"],["specific","Checkpoint đặc trưng ngành"]].map(([v,l]) => (
            <button key={v} onClick={() => setCpType(v)}
              className={`px-4 py-2 text-sm rounded font-medium border transition-colors ${cpType===v?"bg-emerald-700 border-emerald-600 text-white":"border-slate-600 text-slate-400 hover:border-emerald-700"}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          <label className="text-xs text-slate-400">Nội dung đánh giá</label>
          {items.map((it, i) => (
            <div key={i} className="flex gap-2 items-start">
              <span className="text-slate-500 text-xs mt-2 w-6">{i+1}.</span>
              <textarea value={it.content} onChange={e => updateItem(i, e.target.value)} rows={2}
                placeholder="Nhập nội dung checkpoint..."
                className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-600 resize-none" />
              {items.length > 1 && <Btn onClick={() => removeItem(i)} variant="danger" size="xs">✕</Btn>}
            </div>
          ))}
          <Btn onClick={addItem} variant="ghost" size="xs">+ Thêm checkpoint</Btn>
        </div>
        <div className="flex gap-2 pt-2">
          <Btn onClick={handleConfirm} variant="success">✓ Xác nhận</Btn>
          {editId && <Btn onClick={() => { setEditId(null); setItems([{content:""}]); }} variant="ghost">Hủy</Btn>}
        </div>
      </div>

      {filtered.length > 0 && (
        <div>
          <h3 className="text-slate-300 font-semibold text-sm mb-2">Lịch sử checklist</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead><tr className="bg-slate-700 text-slate-300">
                {["STT","Ngày/Giờ","Người nhập","Loại","Số CP",""].map(h => <th key={h} className="px-3 py-2 text-left border border-slate-600">{h}</th>)}
              </tr></thead>
              <tbody>{filtered.map((c,i) => (
                <tr key={c.id} className="border-b border-slate-700 hover:bg-slate-800">
                  <td className="px-3 py-2 border border-slate-700">{i+1}</td>
                  <td className="px-3 py-2 border border-slate-700">{c.timestamp}</td>
                  <td className="px-3 py-2 border border-slate-700">{c.author}</td>
                  <td className="px-3 py-2 border border-slate-700"><Badge color={c.cpType==="common"?"blue":"emerald"}>{c.cpType==="common"?"Chung":"Đặc trưng"}</Badge></td>
                  <td className="px-3 py-2 border border-slate-700 text-emerald-400 font-bold">{c.items.length}</td>
                  <td className="px-3 py-2 border border-slate-700"><Btn onClick={() => handleEdit(c)} variant="ghost" size="xs">✏️ Sửa</Btn></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function EvaluationHistory({ evaluations }) {
  if (!evaluations.length) return (
    <div className="text-center py-12 text-slate-500">
      <div className="text-4xl mb-3">📋</div>
      <p>Chưa có lịch sử đánh giá. Các đánh giá hoàn thành sẽ xuất hiện ở đây.</p>
    </div>
  );
  const stats = {};
  evaluations.forEach(e => {
    const m = e.timestamp ? e.timestamp.split(",")[0].split("/").slice(1).join("/") : "?";
    const y = e.timestamp ? e.timestamp.split(",")[0].split("/")[2] : "?";
    const km = `${e.evaluatorName}|||${m}`; const ky = `${e.evaluatorName}|||${y}`;
    stats[km] = (stats[km]||0)+1; stats[ky+"_y"] = (stats[ky+"_y"]||0)+1;
  });
  return (
    <div className="space-y-6">
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead><tr className="bg-slate-700 text-slate-300">
            {["STT","Ngày/Giờ","Đánh giá viên","Nhà CC","Major","Minor","OFI","Mô tả"].map(h => <th key={h} className="px-3 py-2 text-left border border-slate-600">{h}</th>)}
          </tr></thead>
          <tbody>{evaluations.map((e,i) => (
            <tr key={e.id} className="border-b border-slate-700 hover:bg-slate-800">
              <td className="px-3 py-2 border border-slate-700">{i+1}</td>
              <td className="px-3 py-2 border border-slate-700 whitespace-nowrap">{e.timestamp}</td>
              <td className="px-3 py-2 border border-slate-700">{e.evaluatorName}</td>
              <td className="px-3 py-2 border border-slate-700">{e.supplierName}</td>
              <td className="px-3 py-2 border border-slate-700 text-red-400 font-bold">{e.majorCount}</td>
              <td className="px-3 py-2 border border-slate-700 text-amber-400 font-bold">{e.minorCount}</td>
              <td className="px-3 py-2 border border-slate-700 text-blue-400 font-bold">{e.ofiCount}</td>
              <td className="px-3 py-2 border border-slate-700 max-w-xs truncate">{e.summary}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div>
        <h3 className="text-slate-300 font-semibold text-sm mb-2">Thống kê theo người đánh giá</h3>
        <table className="w-full text-xs border-collapse">
          <thead><tr className="bg-slate-700 text-slate-300">
            {["Đánh giá viên","Tháng","Số lần (tháng)"].map(h => <th key={h} className="px-3 py-2 text-left border border-slate-600">{h}</th>)}
          </tr></thead>
          <tbody>{Object.entries(stats).filter(([k]) => !k.endsWith("_y")).map(([key,count],i) => {
            const [a,m] = key.split("|||");
            return <tr key={i} className="border-b border-slate-700">
              <td className="px-3 py-2 border border-slate-700">{a}</td>
              <td className="px-3 py-2 border border-slate-700">{m}</td>
              <td className="px-3 py-2 border border-slate-700 font-bold text-emerald-400">{count}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Section 2: Evaluator Interface ──────────────────────────────────────────
function EvaluatorSection({ checkpoints, knowledge, evaluations, setEvaluations }) {
  const [ingredient, setIngredient] = useState("");
  const [evalData, setEvalData] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [evaluatorName, setEvaluatorName] = useState("");
  const [evaluatorCode, setEvaluatorCode] = useState("");
  const [evaluatorLevel, setEvaluatorLevel] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierAddress, setSupplierAddress] = useState("");
  const [supplierMaterial, setSupplierMaterial] = useState("");
  const [evalCount, setEvalCount] = useState("");
  const [certifications, setCertifications] = useState("");
  const [conclusion, setConclusion] = useState("");
  const [majorIssues, setMajorIssues] = useState("");
  const [newMaterials, setNewMaterials] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (startTime && !endTime) {
      timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startTime)/1000)), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [startTime, endTime]);

  const buildChecklist = () => {
    const common = checkpoints.filter(c => c.ingredient === ingredient && c.cpType === "common");
    const specific = checkpoints.filter(c => c.ingredient === ingredient && c.cpType === "specific");
    const relKnowledge = knowledge.filter(k => k.ingredient === ingredient);
    const prevEvals = evaluations.filter(e => e.ingredient === ingredient);

    const buildRows = (cpList) => cpList.flatMap((cp, ci) =>
      cp.items.map((it, ii) => ({
        id: `${cp.id}_${ii}`, cpIdx: ci+1, content: it.content,
        nonConformity: "", result: null, score: null, classification: null, images: [],
        completed: false,
        hints: buildHints(it.content, relKnowledge, prevEvals),
      }))
    );
    return { common: buildRows(common), specific: buildRows(specific) };
  };

  const buildHints = (content, kn, prevEvals) => {
    const hints = [];
    if (kn.length > 0) hints.push(`📚 ${(kn[0].content||kn[0].lawContent||kn[0].extContent||"").slice(0,80)}...`);
    if (prevEvals.length > 0 && prevEvals[0].majorIssues) hints.push(`⚠️ Lần trước: ${prevEvals[0].majorIssues.slice(0,80)}`);
    if (!hints.length) hints.push("💡 Kiểm tra tài liệu, giấy tờ liên quan và quan sát thực tế.");
    return hints.slice(0,3);
  };

  const handleStartEval = () => {
    if (!ingredient) return alert("Vui lòng chọn nguyên liệu!");
    const cl = buildChecklist();
    setEvalData(cl); setStartTime(Date.now()); setCompleted(false);
  };

  const handleEnd = () => {
    clearInterval(timerRef.current);
    setEndTime(Date.now());
    setElapsed(Math.floor((Date.now() - startTime)/1000));
  };

  const updateRow = (type, id, field, value) => {
    setEvalData(prev => ({
      ...prev,
      [type]: prev[type].map(r => r.id === id ? {...r, [field]: value} : r)
    }));
  };

  const handleComplete = async () => {
    if (!evaluatorName) return alert("Nhập tên đánh giá viên!");
    const allRows = [...(evalData?.common||[]), ...(evalData?.specific||[])];
    const major = allRows.filter(r => r.classification === "Major").length;
    const minor = allRows.filter(r => r.classification === "Minor").length;
    const ofi = allRows.filter(r => r.classification === "OFI").length;
    const entry = {
      id: Date.now(), ingredient, evaluatorName, evaluatorCode, evaluatorLevel,
      supplierName, supplierAddress, supplierMaterial, evalCount, certifications,
      conclusion, majorIssues, newMaterials, summary: conclusion.slice(0,100),
      majorCount: major, minorCount: minor, ofiCount: ofi,
      timestamp: now(), startTime, endTime: endTime||Date.now(),
      evalData, elapsed,
    };
    const updated = [...evaluations, entry];
    setEvaluations(updated);
    await save("evaluations", updated);
    setCompleted(true);
    alert("✅ Đánh giá đã được lưu thành công!");
  };

  const fmtTime = (s) => `${Math.floor(s/3600).toString().padStart(2,"0")}:${Math.floor((s%3600)/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`;
  const allRows = [...(evalData?.common||[]), ...(evalData?.specific||[])];
  const completedRows = allRows.filter(r => r.completed).length;
  const totalRows = allRows.length;
  const majorCount = allRows.filter(r => r.classification==="Major").length;
  const minorCount = allRows.filter(r => r.classification==="Minor").length;
  const ofiCount = allRows.filter(r => r.classification==="OFI").length;
  const total = majorCount+minorCount+ofiCount;
  const pct = totalRows ? Math.round(completedRows/totalRows*100) : 0;

  return (
    <div className="space-y-4">
      {/* Setup */}
      {!evalData && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-4">
          <h3 className="text-emerald-400 font-semibold text-sm uppercase tracking-wide">Khởi động đánh giá</h3>
          <Select label="Chọn nhóm nguyên liệu *" value={ingredient} onChange={setIngredient} options={INGREDIENTS} placeholder="-- Chọn nguyên liệu --" />
          <Btn onClick={handleStartEval} variant="success" size="lg">▶ Bắt đầu đánh giá</Btn>
        </div>
      )}

      {evalData && (
        <div className="grid grid-cols-3 gap-4">
          {/* Left: Stats Panel */}
          <div className="col-span-1 space-y-3">
            {/* Timer */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-center">
              <div className="text-3xl font-mono text-emerald-400">{fmtTime(elapsed)}</div>
              <div className="text-xs text-slate-500 mt-1">Thời lượng đánh giá</div>
              <div className="flex gap-2 mt-2 justify-center">
                {!endTime ? (
                  <Btn onClick={handleEnd} variant="danger" size="xs">■ Kết thúc</Btn>
                ) : (
                  <Badge color="emerald">Đã kết thúc</Badge>
                )}
              </div>
            </div>

            {/* Checkpoint stats */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 space-y-2">
              <h4 className="text-xs font-semibold text-slate-400 uppercase">Checkpoint</h4>
              <div className="grid grid-cols-2 gap-2">
                <StatCard label="Tổng" value={totalRows} />
                <StatCard label="Chung" value={evalData.common.length} />
                <StatCard label="Đặc trưng" value={evalData.specific.length} />
                <StatCard label="Còn lại" value={totalRows-completedRows} />
              </div>
              <div className="mt-2">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Hoàn thành</span><span className="text-emerald-400">{pct}%</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-600 transition-all" style={{width:`${pct}%`}} />
                </div>
              </div>
            </div>

            {/* NC Analysis */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 space-y-2">
              <h4 className="text-xs font-semibold text-slate-400 uppercase">Phân tích không phù hợp</h4>
              <div className="space-y-1.5">
                {[["Major","red",majorCount],["Minor","amber",minorCount],["OFI","blue",ofiCount]].map(([l,c,n]) => (
                  <div key={l} className="flex items-center justify-between">
                    <Badge color={c}>{l}</Badge>
                    <span className="text-sm font-bold text-slate-200">{n}</span>
                    <span className="text-xs text-slate-500">{total?Math.round(n/total*100):0}%</span>
                  </div>
                ))}
              </div>
              {totalRows && <div className="text-xs text-slate-500 mt-1">
                Hiệu suất: {elapsed && totalRows ? (elapsed/60/totalRows).toFixed(1) : "—"} phút/câu
              </div>}
            </div>

            {/* Evaluator info */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 space-y-2">
              <h4 className="text-xs font-semibold text-slate-400 uppercase">Đánh giá viên</h4>
              <Input placeholder="Họ tên *" value={evaluatorName} onChange={setEvaluatorName} />
              <Input placeholder="Mã số nhân viên" value={evaluatorCode} onChange={setEvaluatorCode} />
              <Select value={evaluatorLevel} onChange={setEvaluatorLevel} options={["1","2","3","4","5"]} placeholder="Level (1-5)" />
            </div>

            {/* Supplier info */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 space-y-2">
              <h4 className="text-xs font-semibold text-slate-400 uppercase">Thông tin nhà cung cấp</h4>
              <Input placeholder="Tên nhà cung cấp" value={supplierName} onChange={setSupplierName} />
              <Input placeholder="Địa chỉ" value={supplierAddress} onChange={setSupplierAddress} />
              <Input placeholder="Loại nguyên liệu cung cấp" value={supplierMaterial} onChange={setSupplierMaterial} />
              <Input placeholder="Lần đánh giá thứ" value={evalCount} onChange={setEvalCount} />
              <Input placeholder="Chứng chỉ/chứng nhận" value={certifications} onChange={setCertifications} />
            </div>
          </div>

          {/* Right: Checklist */}
          <div className="col-span-2 space-y-4">
            <ChecklistTable title="🔷 CHECKPOINT CHUNG" rows={evalData.common} type="common"
              onUpdate={updateRow} totalScore={evalData.common.reduce((s,r) => s+(r.score||0),0)} />
            <ChecklistTable title="🔶 CHECKPOINT ĐẶC TRƯNG NGÀNH" rows={evalData.specific} type="specific"
              onUpdate={updateRow} totalScore={evalData.specific.reduce((s,r) => s+(r.score||0),0)} />

            {/* Completion */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-3">
              <h3 className="text-emerald-400 font-semibold text-sm uppercase">2.5 Hoàn tất đánh giá</h3>
              <Textarea label="Kết luận tổng thể (Điểm mạnh/Yếu)" value={conclusion} onChange={setConclusion} rows={3} placeholder="Nhập kết luận tổng thể..." />
              <Textarea label="Các điểm không phù hợp nghiêm trọng" value={majorIssues} onChange={setMajorIssues} rows={2} placeholder="Mô tả các vấn đề nghiêm trọng..." />
              <Textarea label="Lưu ý nguyên liệu mới/tiềm năng" value={newMaterials} onChange={setNewMaterials} rows={2} placeholder="Các nguyên liệu mới cần quan tâm..." />
              <Btn onClick={handleComplete} variant="success" size="lg" disabled={completed}>
                {completed ? "✅ Đã hoàn thành" : "✓ Xác nhận hoàn thành đánh giá"}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ChecklistTable({ title, rows, type, onUpdate, totalScore }) {
  if (!rows.length) return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
      <h3 className="text-slate-400 text-sm font-semibold">{title}</h3>
      <p className="text-slate-500 text-xs mt-2">Chưa có checkpoint. Vui lòng nhập ở Bộ tri thức.</p>
    </div>
  );
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-slate-700 flex justify-between items-center">
        <h3 className="text-slate-200 font-semibold text-sm">{title}</h3>
        <Badge color="emerald">{rows.length} checkpoint</Badge>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="bg-slate-700/50 text-slate-400">
            <th className="px-2 py-2 text-left w-8">STT</th>
            <th className="px-2 py-2 text-left">Nội dung đánh giá & Gợi ý</th>
            <th className="px-2 py-2 text-left w-40">Sự không phù hợp</th>
            <th className="px-2 py-2 text-center w-20">Kết luận</th>
            <th className="px-2 py-2 text-center w-20">Điểm</th>
            <th className="px-2 py-2 text-center w-24">Phân loại</th>
            <th className="px-2 py-2 text-center w-20">Hình ảnh</th>
            <th className="px-2 py-2 text-center w-16">Xong</th>
          </tr></thead>
          <tbody>
            {rows.map((r,i) => (
              <tr key={r.id} className={`border-t border-slate-700 ${r.completed?"bg-emerald-950/30":""}`}>
                <td className="px-2 py-2 text-slate-400">{i+1}</td>
                <td className="px-2 py-2">
                  <div className="text-slate-200 text-xs mb-1">{r.content}</div>
                  <div className="space-y-0.5">
                    {r.hints.map((h,hi) => (
                      <div key={hi} className="text-slate-500 text-xs italic">{h}</div>
                    ))}
                  </div>
                </td>
                <td className="px-2 py-2">
                  <textarea value={r.nonConformity} onChange={e => onUpdate(type, r.id, "nonConformity", e.target.value)}
                    rows={2} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 resize-none focus:outline-none focus:border-emerald-600" />
                </td>
                <td className="px-2 py-2 text-center">
                  <div className="flex flex-col gap-1 items-center">
                    {[["pass","✓ Đạt","emerald"],["fail","✗ Không","red"]].map(([v,l,c]) => (
                      <button key={v} onClick={() => onUpdate(type, r.id, "result", v)}
                        className={`px-2 py-0.5 rounded text-xs font-medium border transition-colors w-full
                          ${r.result===v?(c==="emerald"?"bg-emerald-700 border-emerald-600 text-white":"bg-red-700 border-red-600 text-white"):"border-slate-600 text-slate-400 hover:bg-slate-700"}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </td>
                <td className="px-2 py-2 text-center">
                  <div className="flex flex-col gap-1 items-center">
                    {[1,3,5].map(s => (
                      <button key={s} onClick={() => onUpdate(type, r.id, "score", s)}
                        className={`w-8 h-6 rounded text-xs font-bold transition-colors ${r.score===s?"bg-emerald-700 text-white":"bg-slate-700 text-slate-400 hover:bg-slate-600"}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </td>
                <td className="px-2 py-2 text-center">
                  <div className="flex flex-col gap-1 items-center">
                    {[["Major","red"],["Minor","amber"],["OFI","blue"]].map(([v,c]) => (
                      <button key={v} onClick={() => onUpdate(type, r.id, "classification", v)}
                        className={`px-1.5 py-0.5 rounded text-xs font-medium border transition-colors w-full
                          ${r.classification===v?`${c==="red"?"bg-red-700 border-red-600":c==="amber"?"bg-amber-700 border-amber-600":"bg-blue-700 border-blue-600"} text-white`:"border-slate-600 text-slate-400 hover:bg-slate-700"}`}>
                        {v}
                      </button>
                    ))}
                  </div>
                </td>
                <td className="px-2 py-2 text-center">
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" multiple className="hidden"
                      onChange={e => {
                        const files = Array.from(e.target.files).map(f => URL.createObjectURL(f));
                        onUpdate(type, r.id, "images", [...r.images, ...files]);
                      }} />
                    <div className="text-lg">📷</div>
                    {r.images.length > 0 && <div className="text-emerald-400 text-xs">{r.images.length}</div>}
                  </label>
                </td>
                <td className="px-2 py-2 text-center">
                  <input type="checkbox" checked={r.completed} onChange={e => onUpdate(type, r.id, "completed", e.target.checked)}
                    className="w-4 h-4 accent-emerald-600" />
                </td>
              </tr>
            ))}
            <tr className="bg-slate-700/50 border-t-2 border-emerald-700">
              <td colSpan={4} className="px-3 py-2 text-right text-sm font-semibold text-slate-300">Tổng điểm:</td>
              <td className="px-2 py-2 text-center text-emerald-400 font-bold text-base">{totalScore}</td>
              <td colSpan={3}></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Section 3: Report ────────────────────────────────────────────────────────
function ReportSection({ evaluations }) {
  const [selectedId, setSelectedId] = useState("");
  const evalOptions = evaluations.map(e => `${e.supplierName || "Không tên"} — ${e.timestamp} (${e.ingredient})`);
  const selected = evaluations[evaluations.findIndex((e,i) => `${e.supplierName || "Không tên"} — ${e.timestamp} (${e.ingredient})` === selectedId)];

  const fmtDuration = (s) => {
    if (!s) return "—";
    return `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m ${s%60}s`;
  };

  if (!evaluations.length) return (
    <div className="text-center py-12 text-slate-500">
      <div className="text-4xl mb-3">📄</div>
      <p>Chưa có đánh giá hoàn thành. Hãy thực hiện đánh giá trước.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <Select label="Chọn đánh giá để xem báo cáo" value={selectedId} onChange={setSelectedId}
          options={evalOptions} placeholder="-- Chọn đánh giá --" />
      </div>

      {selected && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-6">
          {/* Header */}
          <div className="text-center border-b border-slate-600 pb-4">
            <div className="text-2xl font-bold text-emerald-400">BÁO CÁO ĐÁNH GIÁ NHÀ CUNG CẤP</div>
            <div className="text-slate-400 text-sm mt-1">Green Feed Vietnam — Ngành Thức ăn Chăn nuôi</div>
          </div>

          {/* Intro */}
          <div className="bg-emerald-900/30 border border-emerald-800 rounded-lg p-4 text-sm text-slate-300 leading-relaxed">
            Cảm ơn nhà cung cấp đã hợp tác cùng <strong className="text-emerald-400">Green Feed</strong> cho hoạt động đánh giá này. Báo cáo này là cơ hội cho việc cải tiến các hoạt động của quý nhà cung cấp. Việc cải thiện nên tập trung vào những điểm không phù hợp <strong className="text-red-400">Major</strong> và sau đó là các <strong className="text-amber-400">Minor</strong> hoặc <strong className="text-blue-400">OFI</strong>. Sau đây là báo cáo chi tiết.
          </div>

          {/* General Info */}
          <div>
            <h3 className="text-emerald-400 font-semibold text-sm uppercase tracking-wide mb-3">3.2 Thông tin chung về nhà cung cấp</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ["Tên nhà cung cấp", selected.supplierName],
                ["Địa chỉ", selected.supplierAddress],
                ["Loại nguyên liệu", selected.supplierMaterial || selected.ingredient],
                ["Lần đánh giá", selected.evalCount],
                ["Chứng chỉ/Chứng nhận", selected.certifications],
              ].map(([l,v]) => (
                <div key={l} className="bg-slate-700 rounded p-3">
                  <div className="text-xs text-slate-500">{l}</div>
                  <div className="text-slate-200 mt-0.5">{v||"—"}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Eval Info */}
          <div>
            <h3 className="text-emerald-400 font-semibold text-sm uppercase tracking-wide mb-3">3.3 Thông tin đánh giá</h3>
            <div className="grid grid-cols-3 gap-3 text-sm">
              {[
                ["Đánh giá viên", selected.evaluatorName],
                ["Ngày đánh giá", selected.timestamp],
                ["Thời lượng", fmtDuration(selected.elapsed)],
              ].map(([l,v]) => (
                <div key={l} className="bg-slate-700 rounded p-3">
                  <div className="text-xs text-slate-500">{l}</div>
                  <div className="text-slate-200 mt-0.5">{v||"—"}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div>
            <h3 className="text-emerald-400 font-semibold text-sm uppercase tracking-wide mb-3">3.4 Tổng quan kết quả</h3>
            {/* NC overview */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[["Major","red",selected.majorCount],["Minor","amber",selected.minorCount],["OFI","blue",selected.ofiCount]].map(([l,c,n]) => {
                const total = selected.majorCount+selected.minorCount+selected.ofiCount;
                return (
                  <div key={l} className={`bg-slate-700 rounded-lg p-4 border-l-4 ${c==="red"?"border-red-600":c==="amber"?"border-amber-600":"border-blue-600"}`}>
                    <div className={`text-2xl font-bold ${c==="red"?"text-red-400":c==="amber"?"text-amber-400":"text-blue-400"}`}>{n}</div>
                    <div className="text-sm text-slate-400">{l}</div>
                    <div className="text-xs text-slate-500">{total?Math.round(n/total*100):0}% tổng NC</div>
                  </div>
                );
              })}
            </div>
            <div className="space-y-3">
              {selected.conclusion && (
                <div className="bg-slate-700 rounded p-3">
                  <div className="text-xs text-slate-400 mb-1">Kết luận tổng thể</div>
                  <div className="text-sm text-slate-200">{selected.conclusion}</div>
                </div>
              )}
              {selected.majorIssues && (
                <div className="bg-red-950/40 border border-red-800 rounded p-3">
                  <div className="text-xs text-red-400 mb-1">Điểm không phù hợp nghiêm trọng</div>
                  <div className="text-sm text-slate-200">{selected.majorIssues}</div>
                </div>
              )}
              {selected.newMaterials && (
                <div className="bg-blue-950/40 border border-blue-800 rounded p-3">
                  <div className="text-xs text-blue-400 mb-1">Nguyên liệu mới/tiềm năng</div>
                  <div className="text-sm text-slate-200">{selected.newMaterials}</div>
                </div>
              )}
            </div>
          </div>

          {/* NC Details */}
          {selected.evalData && (
            <div>
              <h3 className="text-emerald-400 font-semibold text-sm uppercase tracking-wide mb-3">Danh sách điểm không phù hợp chi tiết</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead><tr className="bg-slate-700 text-slate-300">
                    {["STT","Nội dung","Sự không phù hợp","Kết luận","Điểm","Phân loại"].map(h => (
                      <th key={h} className="px-3 py-2 text-left border border-slate-600">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {[...(selected.evalData.common||[]),...(selected.evalData.specific||[])]
                      .filter(r => r.classification || r.result === "fail")
                      .map((r,i) => (
                        <tr key={r.id} className="border-b border-slate-700 hover:bg-slate-750">
                          <td className="px-3 py-2 border border-slate-700">{i+1}</td>
                          <td className="px-3 py-2 border border-slate-700 max-w-xs">{r.content}</td>
                          <td className="px-3 py-2 border border-slate-700">{r.nonConformity||"—"}</td>
                          <td className="px-3 py-2 border border-slate-700">
                            <Badge color={r.result==="pass"?"emerald":"red"}>{r.result==="pass"?"Đạt":"Không đạt"}</Badge>
                          </td>
                          <td className="px-3 py-2 border border-slate-700 text-emerald-400 font-bold">{r.score||"—"}</td>
                          <td className="px-3 py-2 border border-slate-700">
                            {r.classification && <Badge color={r.classification==="Major"?"red":r.classification==="Minor"?"amber":"blue"}>{r.classification}</Badge>}
                          </td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
              <div className="mt-4 text-center text-slate-400 text-sm italic">
                Chân thành cảm ơn quý nhà cung cấp! 🌱
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [section, setSection] = useState("knowledge");
  const [knowledge, setKnowledge] = useState([]);
  const [checkpoints, setCheckpoints] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const k = await load("knowledge"); if (k) setKnowledge(k);
      const c = await load("checkpoints"); if (c) setCheckpoints(c);
      const e = await load("evaluations"); if (e) setEvaluations(e);
      setLoaded(true);
    })();
  }, []);

  const nav = [
    { id: "knowledge", icon: "📚", label: "Bộ tri thức", sub: "Quản lý nguồn tri thức & checklist" },
    { id: "evaluator", icon: "✅", label: "Đánh giá viên", sub: "Thực hiện đánh giá nhà cung cấp" },
    { id: "report", icon: "📊", label: "Báo cáo", sub: "Xem & xuất báo cáo" },
  ];

  if (!loaded) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-emerald-400 text-lg">Đang tải dữ liệu...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200" style={{fontFamily:"'DM Mono', 'Fira Code', monospace, sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap'); * { font-family: 'Plus Jakarta Sans', sans-serif; } code, .mono { font-family: 'DM Mono', monospace; }`}</style>

      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-700 rounded-lg flex items-center justify-center text-white font-bold text-sm">GF</div>
          <div>
            <div className="font-bold text-slate-100 text-sm">GreenFeed Supplier Audit</div>
            <div className="text-xs text-slate-500">Hệ thống đánh giá nhà cung cấp nguyên liệu</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block"></span>
          {knowledge.length} tri thức • {checkpoints.length} checklist • {evaluations.length} đánh giá
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav className="w-56 bg-slate-900 border-r border-slate-800 min-h-screen p-3 pt-4 sticky top-14 self-start">
          <div className="space-y-1">
            {nav.map(n => (
              <button key={n.id} onClick={() => setSection(n.id)}
                className={`w-full text-left px-3 py-3 rounded-lg transition-all ${section===n.id?"bg-emerald-800 border border-emerald-700":"hover:bg-slate-800 border border-transparent"}`}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{n.icon}</span>
                  <div>
                    <div className={`text-sm font-medium ${section===n.id?"text-white":"text-slate-300"}`}>{n.label}</div>
                    <div className="text-xs text-slate-500 mt-0.5 leading-tight">{n.sub}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="mt-6 p-3 bg-slate-800 rounded-lg">
            <div className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-2">Tổng quan</div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs"><span className="text-slate-400">Tri thức</span><span className="text-emerald-400 font-bold">{knowledge.length}</span></div>
              <div className="flex justify-between text-xs"><span className="text-slate-400">Checklist</span><span className="text-emerald-400 font-bold">{checkpoints.length}</span></div>
              <div className="flex justify-between text-xs"><span className="text-slate-400">Đánh giá</span><span className="text-emerald-400 font-bold">{evaluations.length}</span></div>
            </div>
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 p-6">
          <div className="max-w-6xl">
            {section === "knowledge" && (
              <>
                <div className="mb-4">
                  <h1 className="text-xl font-bold text-slate-100">Bộ tri thức & Biên tập Checklist</h1>
                  <p className="text-slate-500 text-sm mt-1">Quản lý tri thức và checklist đánh giá cho từng nhóm nguyên liệu</p>
                </div>
                <KnowledgeSection knowledge={knowledge} setKnowledge={setKnowledge}
                  checkpoints={checkpoints} setCheckpoints={setCheckpoints} evaluations={evaluations} />
              </>
            )}
            {section === "evaluator" && (
              <>
                <div className="mb-4">
                  <h1 className="text-xl font-bold text-slate-100">Giao diện Đánh giá viên</h1>
                  <p className="text-slate-500 text-sm mt-1">Thực hiện đánh giá nhà cung cấp theo checklist đã thiết lập</p>
                </div>
                <EvaluatorSection checkpoints={checkpoints} knowledge={knowledge}
                  evaluations={evaluations} setEvaluations={setEvaluations} />
              </>
            )}
            {section === "report" && (
              <>
                <div className="mb-4">
                  <h1 className="text-xl font-bold text-slate-100">Báo cáo cho nhà cung cấp</h1>
                  <p className="text-slate-500 text-sm mt-1">Xem báo cáo đánh giá chi tiết dành cho nhà cung cấp</p>
                </div>
                <ReportSection evaluations={evaluations} />
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
