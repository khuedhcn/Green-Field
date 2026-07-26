# Archive — lịch sử của project GreenField

Thư mục này chỉ để lưu trữ tham khảo. Không được import/sử dụng bởi source code
đang chạy trong `src/`. Không commit lên GitHub (đã thêm vào `.gitignore`).

- `original-jsx-uploads/` — 3 file `.jsx` gốc bạn upload ban đầu, đã được tách
  và tổ chức lại thành `src/apps/RaiseTicket.jsx`, `src/apps/SupplierEval.jsx`,
  `src/apps/ExtraordinaryEventTraces.jsx`. Giữ lại để đối chiếu nếu cần logic gốc.
- `greenfield.zip` — bản build tĩnh cũ (trước khi có cấu trúc Vite + Router).
- `old-static-build-greenfield/` — bản giải nén của `greenfield.zip` ở trên.
- `Stitch-design/` — tài liệu thiết kế (`DESIGN.md`) dùng để lên ý tưởng giao
  diện GreenField ban đầu, cùng bản build tĩnh mẫu.
- `UPDATE-duplicate-export/` — bản export trùng lặp 100% với project hiện tại
  (cùng `package.json`, `App.jsx`...), giữ lại làm bản sao lưu phòng khi cần.
