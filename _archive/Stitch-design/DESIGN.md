---
name: TRACE OS Prototype
product: TRACE OS Prototype
source_context:
  - extraordinary-event-traces (1).jsx
  - raise-ticket (1).jsx
  - supplier-eval.jsx
  - greenfield.zip / Label Management System build
primary_style: dark operational dashboard
accent_color: teal
fonts:
  primary: Outfit
  monospace: Fira Code
---

# DESIGN.md — TRACE OS Prototype

## 1. Mục tiêu sản phẩm

TRACE OS Prototype là một web app nội bộ dùng để gom nhiều module nghiệp vụ rời rạc vào một giao diện thống nhất. Các module hiện có gồm Event Trace, Raise Ticket, Supplier Evaluation và Labelling / Label Management System. Các module khác như Training Chatbot, OKR System, Home, Dashboard, Login và Contact có thể được thiết kế như page khung để hoàn thiện prototype tổng thể.

Mục tiêu giai đoạn này là tạo giao diện prototype có thể bấm chuyển page, trình bày nội dung rõ ràng, thống nhất về màu sắc, layout, card, form, bảng dữ liệu và sidebar. Chưa cần backend thật, database thật hoặc đăng nhập thật.

## 2. Nội dung thật đã có trong source

### Event Trace

Module Event Trace quản lý và phân tích sự kiện bất thường. Nội dung thật trong source gồm các nhóm sự kiện:

- Sự sai lệch
- Không phù hợp
- Ngoài tiêu chuẩn / Ngoài xu hướng
- Khiếu nại khách hàng
- Sự cố thiết bị / Hệ thống
- Hành vi

Module có các phần như phân tích bất thường, báo cáo truy vết sự kiện bất thường, dòng thời gian sự kiện, báo cáo chi tiết sự kiện, nhận xét tổng thể, kết luận, hành vi người liên quan và hành động cải thiện.

### Raise Ticket

Module Raise Ticket dùng để tạo ticket, thông báo, phản hồi ticket và tính điểm/hiệu suất theo cấp nhân sự. Nội dung thật trong source gồm:

- BU1, BU2, BU3, BU4, LAB HO, LAB-DONAVET, GC, KHÁC
- Cấp nhân sự: NV, TP, TPCC, GD
- Loại ticket: Raise ticket, Thông báo, Phản hồi ticket
- Dashboard thống kê ticket
- Điểm theo vai trò và thời gian xử lý

### Supplier Evaluation

Module Supplier Evaluation dùng để quản lý tri thức, checklist và đánh giá nhà cung cấp nguyên liệu. Nội dung thật trong source có nhiều nhóm nguyên liệu như:

- Bắp hạt, bột mì, cám gạo, dầu cám gạo
- Khô dầu đậu nành, đậu nành ép đùn, Soya Lecithin
- Bột cá, bột mực, bột đầu tôm, dịch tôm thủy phân
- Muối, Dicalcium Phosphate, Sodium bicarbonate
- Methionine, Lysine, Threonine, Tryptophan
- Premix vitamin, premix khoáng, bao bì, dầu cọ và các nguyên liệu khác

Các phần thật trong module gồm:

- Bộ tri thức & Biên tập Checklist
- Giao diện Đánh giá viên
- Báo cáo cho nhà cung cấp
- Lịch sử nhập tri thức
- Bảng thống kê tổng
- Lịch sử checklist
- Thống kê theo người đánh giá
- Khởi động đánh giá
- Hoàn tất đánh giá
- Thông tin chung về nhà cung cấp
- Thông tin đánh giá
- Tổng quan kết quả
- Danh sách điểm không phù hợp chi tiết

### Labelling / Label Management System

Module Labelling hiện là bản build HTML/JS/CSS riêng trong `greenfield.zip`. File HTML có title thật:

Green Feed QA · Label Management System

Phong cách thật của module này là dark mode, nền gần đen, card tối, màu nhấn teal, chữ sáng, font Outfit và code font Fira Code. Module có các tab/màn hình đã thấy trong giao diện:

- Tri Thức R&D
- Nhãn Việt
- Nhãn Nước Ngoài
- Noodle Cake
- Seasoning
- Cấu hình API
- Mô phỏng demo

Labelling nên được tích hợp như một prototype độc lập, mở qua đường dẫn `/labelling/index.html`.

## 3. Information Architecture

Ứng dụng cần có cấu trúc điều hướng rõ ràng, dùng Sidebar bên trái để gom toàn bộ module.

Các page chính:

1. Login
2. Home
3. Dashboard
4. Event Trace
5. Raise Ticket
6. Supplier Evaluation
7. Training Chatbot
8. OKR System
9. Labelling
10. Contact

Luồng sử dụng cơ bản:

Login → Dashboard → chọn module từ Sidebar → thao tác trong từng module → quay lại Dashboard hoặc chuyển module khác.

Labelling là module đặc biệt: app chính chỉ cần có page giới thiệu ngắn và nút mở `/labelling/index.html`, vì Labelling hiện đang là bản build riêng.

## 4. Visual Identity

Phong cách giao diện nên kế thừa từ module Labelling và các module React hiện có.

### Không khí giao diện

- Dark operational dashboard
- Chuyên nghiệp, nội bộ doanh nghiệp, thiên về QA/R&D/operations
- Gọn, rõ, nhiều card và bảng dữ liệu
- Cảm giác công cụ làm việc thực tế, không phải landing page marketing
- Ưu tiên khả năng đọc dữ liệu, lọc dữ liệu, nhập form và xem trạng thái

### Màu sắc chính

Dùng bảng màu kế thừa từ Labelling build:

- Background chính: `#07090c`
- Surface: `#0d1318`
- Card: `#111c24bf`
- Border: `#1a2d3a`
- Border light: `#243848`
- Teal chính: `#00c9a7`
- Teal dim: `#00896f`
- Text chính: `#d4e4f0`
- Text phụ/muted: `#6b8296`
- Warning: `#f59e0b`
- Error: `#ef4444`
- Success: `#22c55e`
- Blue: `#3b82f6`
- Purple: `#a78bfa`

Màu phụ từ các module khác có thể dùng cho trạng thái:

- Amber / warning: `#f59e0b`, `#fbbf24`
- Red / error: `#ef4444`, `#ff5050`, `#ff6b6b`
- Emerald / success: `#34d399`, `#00d4aa`
- Blue / info: `#4dabf7`, `#3b82f6`
- Purple / analysis: `#8b5cf6`, `#a78bfa`

### Typography

Font chính lấy từ Labelling:

- Primary: Outfit
- Fallback: system fonts, Segoe UI, Roboto, sans-serif
- Monospace: Fira Code, Courier New, monospace

Gợi ý hierarchy:

- Page title: 28–36px, weight 700–800
- Section title: 18–22px, weight 700
- Card title: 16–18px, weight 600–700
- Body: 14–16px, weight 400–500
- Label/form helper: 12–14px, muted color

## 5. Layout System

### App shell

Giao diện chính cần có:

- Sidebar bên trái
- Header trên cùng
- Main content area
- Page container có padding rộng
- Card/grid layout cho nội dung

### Sidebar

Sidebar là mục lục chính của app. Sidebar cần có:

- Tên hệ thống: TRACE OS Prototype
- Menu: Home, Dashboard, Event Trace, Raise Ticket, Supplier Evaluation, Training Chatbot, OKR System, Labelling, Contact
- Active state bằng màu teal
- Icon nếu có thể
- Hover state nhẹ
- Không quá rộng; ưu tiên dễ đọc

### Header

Header nên có:

- Tên page hiện tại
- Badge trạng thái Prototype hoặc Demo
- Nút Logout nếu đã login
- Có thể có nút mở Labelling hoặc Cấu hình nếu cần

### Main content

Main content nên dùng:

- Max width rộng, phù hợp dashboard
- Card bo góc
- Grid responsive
- Khoảng cách đều giữa các section
- Page title rõ ràng ở đầu mỗi page

## 6. Component Patterns

### Card

Card là thành phần chính. Card nên có:

- Nền `#111c24bf` hoặc `#0d1318`
- Border `#1a2d3a`
- Border radius 14–18px
- Padding 20–28px
- Tiêu đề rõ
- Có thể có badge trạng thái

### Button

Button chính:

- Nền teal `#00c9a7`
- Text tối hoặc trắng tùy tương phản
- Border radius 10–12px
- Hover sáng hơn hoặc thêm shadow nhẹ

Button phụ:

- Nền trong suốt hoặc surface tối
- Border teal hoặc border muted
- Text teal hoặc text chính

Button nguy hiểm:

- Red accent `#ef4444`

### Form

Input, textarea, select:

- Nền tối
- Border `#1a2d3a` hoặc `#243848`
- Text `#d4e4f0`
- Placeholder `#6b8296`
- Focus border teal
- Label rõ, có helper text nếu cần

### Table

Table nên dùng cho Event Trace, Supplier Evaluation và ticket list:

- Header nền tối hơn
- Row border mỏng
- Hover row nhẹ
- Badge trạng thái
- Có filter/search nếu phù hợp

### Badge

Badge dùng cho trạng thái:

- Success: green
- Warning: amber
- Error: red
- Info: blue
- Analysis/AI: purple

## 7. Page Requirements

### Login

Trang Login là màn hình prototype. Có:

- Tên TRACE OS Prototype
- Mô tả ngắn: Unified internal operations prototype
- Form email/password giả lập
- Nút Login
- Ghi chú: Prototype mode, no real backend yet

### Home

Trang Home giới thiệu ngắn:

- TRACE OS Prototype gom nhiều module nghiệp vụ vào một giao diện thống nhất
- Các module chính: Event Trace, Raise Ticket, Supplier Evaluation, Labelling
- CTA đi đến Dashboard

### Dashboard

Dashboard là trang tổng quan. Cần có card cho:

- Event Trace — theo dõi sự kiện bất thường
- Raise Ticket — tạo ticket/thông báo/phản hồi
- Supplier Evaluation — đánh giá nhà cung cấp
- Training Chatbot — chatbot đào tạo/hỏi đáp
- OKR System — theo dõi mục tiêu và kết quả then chốt
- Labelling — mở Label Management System

Dashboard nên có phần hoạt động gần đây và trạng thái prototype.

### Event Trace

Thiết kế theo hướng timeline/reporting. Cần thể hiện:

- Nhóm sự kiện: Sự sai lệch, Không phù hợp, Ngoài tiêu chuẩn/Ngoài xu hướng, Khiếu nại khách hàng, Sự cố thiết bị/Hệ thống, Hành vi
- Bộ lọc theo loại sự kiện
- Timeline sự kiện
- Card phân tích bất thường
- Khu vực báo cáo chi tiết

### Raise Ticket

Thiết kế theo hướng ticket workflow. Cần thể hiện:

- Form tạo ticket
- Loại ticket: Raise ticket, Thông báo, Phản hồi ticket
- Bộ phận/BU
- Cấp nhân sự: NV, TP, TPCC, GD
- Dashboard thống kê ticket
- Danh sách ticket

### Supplier Evaluation

Thiết kế theo hướng evaluation workflow. Cần thể hiện:

- Bộ tri thức & Biên tập Checklist
- Giao diện Đánh giá viên
- Báo cáo cho nhà cung cấp
- Danh sách nguyên liệu
- Checklist đánh giá
- Điểm không phù hợp
- Thống kê theo người đánh giá

### Training Chatbot

Nếu chưa có source thật, tạo page prototype. Cần có:

- Chat panel
- Ô nhập câu hỏi
- Danh sách chủ đề đào tạo gợi ý
- Card câu trả lời mẫu
- Ghi chú: module placeholder/prototype

### OKR System

Nếu chưa có source thật, tạo page prototype. Cần có:

- Danh sách Objective
- Key Results
- % tiến độ
- Trạng thái On track / At risk / Behind
- Card tổng quan tiến độ

### Labelling

Labelling là module riêng. Page trong app chính cần:

- Mô tả: Green Feed QA · Label Management System
- Giải thích: module kiểm tra nhãn, tri thức R&D, nhãn Việt, nhãn nước ngoài, Noodle Cake, Seasoning
- Nút mở `/labelling/index.html`
- Ghi chú rằng module này đang được tích hợp như prototype độc lập trong thư mục public/labelling

### Contact

Trang Contact cần đơn giản:

- Thông tin hỗ trợ prototype
- Form liên hệ: tên, email, nội dung
- Không cần backend thật

## 8. Những gì không nên thêm trong giai đoạn này

Không tự thêm các module ngoài source hiện có nếu chưa được yêu cầu, đặc biệt:

- Không thêm module truy xuất nguồn gốc đầy đủ
- Không thêm nhà cung cấp/lô nguyên liệu/lô sản xuất nếu không nằm trong scope hiện tại
- Không thêm backend thật
- Không thêm database thật
- Không thêm phân quyền thật
- Không thêm dữ liệu giả quá xa nội dung source

Nếu cần dữ liệu mẫu, phải bám sát thuật ngữ có trong source: Event Trace, Raise Ticket, Supplier Evaluation, Labelling, QA, R&D, ticket, checklist, report, dashboard.

## 9. Hướng dẫn cho Stitch khi tạo screen mới

Khi tạo screen mới, Stitch cần:

1. Kế thừa dark mode, teal accent và card-based layout.
2. Dùng nội dung thật từ source, không dùng lorem ipsum.
3. Ưu tiên sidebar app layout thay vì landing page marketing.
4. Thiết kế các page như một hệ thống nội bộ thống nhất.
5. Dùng card, table, badge, form và dashboard grid làm pattern chính.
6. Labelling chỉ cần page trung gian mở prototype `/labelling/index.html`.
7. Không tự mở rộng sang truy xuất nguồn gốc nếu không được yêu cầu.

## 10. Cấu trúc source code mong muốn sau thiết kế

```text
src/
├── components/
│   ├── Sidebar.jsx
│   ├── Header.jsx
│   ├── Card.jsx
│   └── Button.jsx
├── pages/
│   ├── Home.jsx
│   ├── Dashboard.jsx
│   ├── Login.jsx
│   ├── EventTrace.jsx
│   ├── RaiseTicket.jsx
│   ├── SupplierEval.jsx
│   ├── TrainingChatbot.jsx
│   ├── OKRSystem.jsx
│   ├── Labelling.jsx
│   └── Contact.jsx
├── styles/
│   └── global.css
├── App.jsx
└── main.jsx
```

## 11. One-line design direction

Build a dark, teal-accented internal operations dashboard that unifies Event Trace, Raise Ticket, Supplier Evaluation, Training Chatbot, OKR System and Labelling into one consistent React prototype.
