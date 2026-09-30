# huongmuoi

huongmuoi là tiện ích làm bài thi online bằng tiếng Việt, nay có thêm **AI Question Studio** để tạo bộ câu hỏi từ nội dung người dùng cung cấp.

## Tính năng

- Làm bài trắc nghiệm: đồng hồ **đếm ngược**, cảnh báo sắp hết giờ, tự động nộp khi về `00:00`, nút **Nộp bài** luôn hiện, chế độ **Toàn màn hình**, chấm điểm chi tiết đúng/sai/chưa trả lời, phân tích theo chủ đề và giải thích từng câu sau khi nộp.
- Nhập nguồn bằng cách dán văn bản, upload **TXT/PDF/DOCX**, hoặc đọc một trang web **HTTP/HTTPS công khai**; tài liệu là tùy chọn nếu người dùng đã nhập chủ đề.
- Tạo câu hỏi bằng Groq: chọn chủ đề, độ khó và số lượng từ **10 đến 100 câu**; backend chia thành nhóm 10 câu, mỗi câu có 4 lựa chọn, đáp án đúng và giải thích.
- Mỗi nhóm được chạy qua bước **kiểm định độc lập lần hai** để rà đáp án, lựa chọn trùng, câu mơ hồ và sự phù hợp với nguồn; hệ thống không tuyên bố độ chính xác tuyệt đối khi chỉ tạo theo chủ đề không có tài liệu chuẩn.
- Xuất file **`.docx`** theo hai lựa chọn: **Xuất có đáp án** (đáp án đúng được đánh dấu ✓/☑ và có phần giải thích) hoặc **Xuất đề trống** (không kèm đáp án để phát cho người làm); câu hỏi dùng chữ đậm màu đen, khoảng cách dễ in và font Unicode.
- Khi tạo nhiều câu, các nhóm 10 câu được xử lý song song có giới hạn để giảm thời gian chờ mà không gửi quá tải lên Groq.
- Trang đầu phân biệt rõ **Bắt đầu bài thi mẫu** (mở ngay bộ đề mẫu) và **Tạo bộ đề kiểm tra** (mở khu vực tạo đề theo chủ đề/tài liệu).
- Backend hỗ trợ tối đa 4 tài khoản qua `GROQ_API_KEY_1` đến `GROQ_API_KEY_4`, mỗi tài khoản có thể gắn model bằng `GROQ_MODELS_1` đến `GROQ_MODELS_4`; app tự luân phiên và fallback khi tài khoản/model trước lỗi. Không chia sẻ key và chỉ dùng theo điều khoản Groq.

## Chạy local

```bash
npm install
npm run dev
```

Mở `http://localhost:3000`.

## Secret an toàn

Groq API key không nằm trong frontend, source code, Git hay file `.env`. Ứng dụng đọc key từ biến môi trường backend `GROQ_API_KEY`, được lưu qua Project Secrets. Khi chạy ở môi trường riêng, hãy thiết lập secret ở runtime thay vì chèn key vào code.

Khi chạy trên Windows/VS Code, tạo file `.env` ở thư mục gốc dự án rồi thêm `GROQ_API_KEY=...`. Server đã tích hợp dotenv nên sẽ tự đọc file này. Xem [BAO-GIO-CHAY.md](BAO-GIO-CHAY.md) để làm theo từng bước.

Ứng dụng không có payment, checkout, Stripe hay luồng thu phí. Preview hiện tại không yêu cầu mua gì; chi phí/hạn mức của dịch vụ Groq bên ngoài vẫn phụ thuộc tài khoản và key Groq đang sử dụng.

## Kiểm tra

```bash
npm run typecheck
npm run build
```

Backend có các endpoint nội bộ: `GET /api/health`, `POST /api/extract-file`, `POST /api/scrape-url`, `POST /api/generate-questions` và `POST /api/export-docx`.
