export default function Dashboard() {
    return (
        <div className="page">
            <h1>Dashboard</h1>
            <p>Tổng quan các module trong TRACE OS.</p>

            <div className="grid">
                <div className="card">
                    <h3>Event Trace</h3>
                    <p>0 sự kiện mới</p>
                </div>

                <div className="card">
                    <h3>Raise Ticket</h3>
                    <p>0 ticket đang mở</p>
                </div>

                <div className="card">
                    <h3>Supplier Evaluation</h3>
                    <p>0 nhà cung cấp cần đánh giá</p>
                </div>

                <div className="card">
                    <h3>Training Chatbot</h3>
                    <p>Module đào tạo và hỏi đáp.</p>
                </div>

                <div className="card">
                    <h3>OKR System</h3>
                    <p>Theo dõi mục tiêu và kết quả then chốt.</p>
                </div>

                <div className="card">
                    <h3>Labelling</h3>
                    <p>Kiểm định nhãn sản phẩm.</p>
                </div>
            </div>
        </div>
    );
}