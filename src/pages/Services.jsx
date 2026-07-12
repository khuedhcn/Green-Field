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
        <Link className="app-card" to="/dashboard"><strong>Dashboard</strong><span>Tổng quan số liệu của tất cả module.</span></Link>
        <Link className="app-card" to="/okr-system"><strong>OKR System</strong><span>Quản trị mục tiêu, kết quả then chốt theo BU.</span></Link>
        <Link className="app-card" to="/training-chatbot"><strong>Training Chatbot</strong><span>Đào tạo, hỏi đáp và tra cứu quy trình nội bộ.</span></Link>
        <Link className="app-card" to="/labelling"><strong>Labelling</strong><span>Kiểm định và quản lý nhãn sản phẩm.</span></Link>
      </div>
    </main>
  );
}
