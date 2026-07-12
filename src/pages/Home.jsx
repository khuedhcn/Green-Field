import { Link } from "react-router-dom";

export default function Home() {
  return (
    <main className="page hero-page">
      <p className="eyebrow">GreenField Quality Workspace</p>
      <h1>Hệ thống quản lý chất lượng GreenField</h1>
      <p className="lead">Tập trung các công cụ quản lý ticket, đánh giá nhà cung cấp và truy vết sự kiện bất thường.</p>
      <div className="app-grid">
        <Link className="app-card" to="/raise-ticket"><strong>Raise Ticket</strong><span>Quản lý ticket và điểm đóng góp.</span></Link>
        <Link className="app-card" to="/supplier-eval"><strong>Supplier Evaluation</strong><span>Đánh giá nhà cung cấp và tri thức nguyên liệu.</span></Link>
        <Link className="app-card" to="/extraordinary-event-traces"><strong>Event Traces</strong><span>Truy vết sự kiện bất thường và báo cáo.</span></Link>
        <Link className="app-card" to="/dashboard"><strong>Dashboard</strong><span>Tổng quan các module trong hệ thống.</span></Link>
        <Link className="app-card" to="/okr-system"><strong>OKR System</strong><span>Theo dõi mục tiêu và kết quả then chốt.</span></Link>
        <Link className="app-card" to="/training-chatbot"><strong>Training Chatbot</strong><span>Module đào tạo và hỏi đáp nội bộ.</span></Link>
        <Link className="app-card" to="/labelling"><strong>Labelling</strong><span>Quản lý và kiểm định nhãn sản phẩm.</span></Link>
      </div>
    </main>
  );
}
