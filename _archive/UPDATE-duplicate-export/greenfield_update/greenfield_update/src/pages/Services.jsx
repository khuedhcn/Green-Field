import { Link } from "react-router-dom";

export default function Services() {
  return (
    <main className="page">
      <p className="eyebrow">Services</p>
      <h1>Các module chính</h1>
      <div className="app-grid">
        <Link className="app-card" to="/raise-ticket"><strong>Raise Ticket</strong><span>Nhập ticket, quản lý danh sách, dashboard và công thức điểm.</span></Link>
        <Link className="app-card" to="/supplier-eval"><strong>Supplier Evaluation</strong><span>Quản lý tri thức, checklist và lịch sử đánh giá nhà cung cấp.</span></Link>
        <Link className="app-card" to="/extraordinary-event-traces"><strong>Extraordinary Event Traces</strong><span>Truy vết dòng thời gian, báo cáo chi tiết và lịch sử sự kiện.</span></Link>
      </div>
    </main>
  );
}
