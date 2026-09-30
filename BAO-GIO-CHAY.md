# Chạy huongmuoi trên Windows bằng VS Code

## Bước 1: Cài Node.js

Tải bản **LTS** tại https://nodejs.org rồi cài theo hướng dẫn mặc định.

## Bước 2: Mở dự án

1. Giải nén file ZIP.
2. Mở VS Code.
3. Chọn **File → Open Folder**.
4. Chọn thư mục `huongmuoi`.
5. Chọn **Terminal → New Terminal**.

## Bước 3: Tạo file bí mật `.env`

1. Trong khung Explorer bên trái, bấm chuột phải vào tên dự án.
2. Chọn **New File**.
3. Đặt tên chính xác là `.env`.
4. Mở file đó và dán dòng dưới đây:

```text
GROQ_API_KEY=DÁN_API_KEY_GROQ_CỦA_BẠN_VÀO_ĐÂY
```

Không để khoảng trắng giữa dấu `=` và API key. Ví dụ:

```text
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxx
```

App hỗ trợ tối đa **4 tài khoản Groq**. Bạn nhập 4 key trong file `.env` như sau:

```text
GROQ_API_KEY_1=key_tai_khoan_1
GROQ_MODELS_1=openai/gpt-oss-20b
GROQ_API_KEY_2=key_tai_khoan_2
GROQ_MODELS_2=openai/gpt-oss-120b
GROQ_API_KEY_3=key_tai_khoan_3
GROQ_MODELS_3=qwen/qwen3.8-27b
GROQ_API_KEY_4=key_tai_khoan_4
GROQ_MODELS_4=openai/gpt-oss-20b
```

App sẽ luân phiên 4 tài khoản và tự chuyển sang tài khoản/model tiếp theo nếu tài khoản trước bị giới hạn hoặc lỗi. Không nhập key trực tiếp vào code, giao diện hoặc GitHub. Việc sử dụng nhiều tài khoản phải tuân thủ điều khoản của Groq; nếu Groq áp dụng hạn mức chung hoặc chặn hoạt động bất thường thì app không thể vượt qua.

5. Bấm **Ctrl + S** để lưu.

## Bước 4: Cài và chạy

Trong Terminal của VS Code, chạy từng dòng:

```bash
npm install
npm run dev
```

Sau đó mở trình duyệt tại:

```text
http://localhost:3000
```

## Nếu chỉ muốn chạy thử không có AI

Bạn vẫn có thể mở bài thi mẫu. Chỉ các tính năng tạo câu hỏi AI, đọc file, quét URL bằng AI mới cần `GROQ_API_KEY`.

## Quan trọng

Không gửi file `.env` cho người khác và không upload nó lên GitHub. File `.env.example` chỉ là file mẫu, không chứa key thật.
