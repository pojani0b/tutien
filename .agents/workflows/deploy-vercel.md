---
description: Tự động Deploy thư mục Frontend (client/) lên Vercel
---

Kịch bản (Workflow) này sẽ tự động cài đặt Vercel CLI và tiến hành đẩy mã nguồn frontend lên nền tảng Vercel một cách hoàn toàn tự động, **không cần hỏi xác nhận (nhờ có thẻ // turbo-all)**.

Lưu ý: Bạn cần phải đăng nhập tài khoản Vercel một lần trước khi lệnh này có thể tự động hoàn chỉnh. Nếu chưa đăng nhập, Vercel sẽ tự hiện trình duyệt yêu cầu bạn log in.

// turbo-all
1. Cài đặt Vercel CLI trên máy (nếu chưa có)
```bash
npm install -g vercel
```

2. Tiến hành đóng gói và đẩy thư mục client/ lên Vercel (Production)
```bash
cd client && vercel --prod --yes
```
