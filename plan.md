# Kế hoạch triển khai huongmuoi

## Mục tiêu
Xây dựng một tiện ích web làm bài thi online bằng tiếng Việt với nhận diện huongmuoi. Bản hiện tại gồm luồng làm bài mẫu và AI Question Studio để biến văn bản, file học tập hoặc một trang web công khai thành bộ câu hỏi có thể dùng làm bài thi.

## Phạm vi chức năng

Màn hình chính cung cấp bài thi mẫu với 8 câu trắc nghiệm, thời lượng 12 phút, điều hướng, tiến độ, đánh dấu câu, tự động nộp khi hết giờ, chấm điểm, phân tích theo chủ đề và xem lại giải thích. Trạng thái bài đang làm được lưu trong `sessionStorage`.

AI Question Studio cho phép người dùng dán văn bản, upload TXT/PDF/DOCX, hoặc nhập URL HTTP/HTTPS công khai. Tài liệu là tùy chọn: nếu chỉ nhập chủ đề, backend yêu cầu Groq tự xây dựng bộ kiến thức và câu hỏi theo chủ đề đó. Backend gọi Groq bằng secret `GROQ_API_KEY` ở server để tạo 10–100 câu hỏi theo các nhóm 10 câu, xử lý tối đa 3 nhóm song song, sau đó gọi thêm một bước audit độc lập để rà đáp án đúng duy nhất, lựa chọn trùng, câu mơ hồ và độ bám nguồn. Mỗi câu có 4 lựa chọn, đáp án đúng và giải thích. Người dùng có thể xem lại, xuất `.docx` dạng phần đề thi + phần đáp án/giải thích, hoặc dùng bộ câu hỏi đó để bắt đầu bài thi. Trong màn hình làm bài có countdown, cảnh báo sắp hết giờ, tự nộp tại `00:00`, nút Nộp bài luôn hiển thị, nút Toàn màn hình và sau nộp tự mở phần chấm điểm chi tiết. Project không tích hợp thanh toán hoặc checkout. Với chế độ chỉ nhập chủ đề, không thể đảm bảo tuyệt đối các dữ kiện chuyên ngành hoặc thời sự nếu không có nguồn chuẩn để đối chiếu.

## Kiến trúc và cấu trúc

- React + TypeScript + Vite cho giao diện browser-rendered.
- `src/App.tsx`: state machine cho welcome / builder / quiz / result, bao gồm bài thi mẫu và bộ câu hỏi động.
- `src/QuestionBuilder.tsx`: UI nhập nguồn, điều chỉnh số lượng/độ khó, gọi API, xem kết quả và tải Word.
- `src/styles.css`: design system, layout responsive và các trạng thái tương tác.
- `server/index.mjs`: Express backend, upload memory-limited, trích xuất TXT/PDF/DOCX, đọc HTML URL có chặn mạng nội bộ, gọi Groq structured JSON và tạo DOCX.
- `public/manus-routes.json`: route manifest chỉ khai báo `/` vì builder là một view trong SPA.
- `Dockerfile`: build và chạy container backend ở port platform cung cấp.

## Triển khai và cache

Do có API key, scraping và xuất tài liệu, project dùng server-capable container. Backend phục vụ `/api/*` và static `dist` cùng origin; secret chỉ được inject lúc runtime. Không bật database. Frontend assets có thể cache theo mặc định nền tảng; HTML/API không được coi là dữ liệu cache dùng chung.

## Kiểm tra

Chạy `npm run typecheck` và `npm run build`. Kiểm tra `GET /api/health`, route manifest, upload TXT, export DOCX, quét `https://example.com` và một request thật tới Groq. Quét bundle để đảm bảo không có `GROQ_API_KEY` hoặc chuỗi key trong mã trình duyệt.
