# Design brief — ExamFlow

## Theme Name
**Editorial Focus / Tạp chí học tập hiện đại**

## Giới thiệu
Một không gian làm bài thi có cảm giác như sổ tay học tập cao cấp: nền giấy ấm, chữ đậm dễ đọc, các thẻ thông tin gọn và một màu teal làm điểm neo để giữ sự tập trung.

## Xác suất
0.08

## Direction mở rộng
- **Design movement:** editorial utility — tối giản có chủ đích, ưu tiên nhịp đọc và thông tin phân cấp rõ.
- **Core principles:** một hành động chính mỗi vùng; trạng thái luôn nhìn thấy; màu dùng để truyền đạt chứ không trang trí.
- **Color philosophy:** nền parchment `#f7f5f0`, ink navy `#1d2935`, teal `#1f5c5c`, coral `#e86f51` cho cảnh báo/điểm nhấn, mustard `#f6c752` cho trạng thái cần chú ý.
- **Layout paradigm:** desktop hai cột với nội dung câu hỏi lớn và rail điều hướng; mobile chuyển thành một cột, rail thành hàng cuộn ngang.
- **Signature elements:** logo dấu ngoặc nhọn tạo từ hai nét teal/coral; nhãn số câu dạng capsule; vòng điểm dạng conic-gradient; thanh tiến độ mảnh.
- **Interaction philosophy:** phản hồi tức thì, focus ring rõ, lựa chọn đã chọn có outline teal; không dùng chuyển động gây xao nhãng.
- **Animation:** fade/slide nhẹ khi đổi trạng thái, pulse tiết chế khi timer dưới 60 giây.
- **Typography system:** font sans-serif hệ thống, tiêu đề đậm, số liệu dùng tabular numerals; line-height thoáng.
- **Brand essence:** bình tĩnh, chắc tay, có cấu trúc.
- **Brand voice:** ngắn gọn, động viên, không khoa trương.
- **Wordmark/logo:** `EXAMFLOW` với dấu `<>` cách điệu thành lối vào bài thi.
- **Signature brand color:** Teal `#1f5c5c`.

## Asset workflow
Đây là tiện ích chức năng nên không cần ảnh minh họa ngoài logo. Logo riêng sẽ được tạo bằng hình học phẳng, dùng nhất quán trong header và favicon.


## Bản mở rộng AI Question Studio

AI Question Studio giữ cùng ngôn ngữ editorial nhưng chuyển sang nền xanh xám nhạt để phân biệt khu vực tạo nội dung. Các bước được thể hiện bằng nhãn `BƯỚC 01 / 02 / 03`, input nguồn là thẻ lớn, trạng thái Groq là chấm xanh, và mỗi câu hỏi tạo ra có badge `AI GENERATED`. Màu vàng chỉ dùng cho vùng lưu ý về AI; teal là hành động chính và coral là lỗi/cảnh báo.
