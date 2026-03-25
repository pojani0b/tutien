# Hồng Hoang Text RPG — Hướng Dẫn Triển Khai (Deployment Guide)

Hệ thống được thiết kế để chạy 24/7 với PM2 cho Game Server và Nginx phục vụ React Client. Database sử dụng Supabase.

## 1. Cấu hình Database (Supabase)

1. Tạo một project trên [Supabase](https://supabase.com).
2. Lấy thông tin `URL`, `anon key` và `service_role key`.
3. Chạy toàn bộ file SQL trong thư mục `supabase/migrations/` và `supabase/seeds/` vào SQL Editor của Supabase.
4. (Quan trọng) Vào phần **Database > Replication** trên Supabase, gạt bật bảng `world_events`, `world_entities`, `characters`, và `servers` để cho phép `Realtime` hoạt động.

## 2. Cấu hình Biến Môi Trường (.env)

Trong thư mục gốc của project (hoặc trong thư mục `server/`), tạo file `.env` dựa trên `.env.example`:

```env
# Supabase
SUPABASE_URL="YOUR_SUPABASE_URL"
SUPABASE_ANON_KEY="YOUR_ANON_KEY"
SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"

# Server Settings
PORT=3001
JWT_SECRET="mot-chuoi-bi-mat-rat-dai-va-an-toan"
CLIENT_ORIGIN="http://your-domain.com"
NODE_ENV="production"
```

Trong thư mục `client/`, tạo file `.env`:

```env
VITE_API_BASE_URL="http://your-domain.com/api"
VITE_SUPABASE_URL="YOUR_SUPABASE_URL"
VITE_SUPABASE_ANON_KEY="YOUR_ANON_KEY"
```

## 3. Biên Dịch (Build) Frontend và Backend

### Backend (Node/Express):
```bash
cd server
npm install
npm run build
```

### Frontend (React/Vite):
```bash
cd client
npm install
npm run build
```
*(Thư mục tĩnh sẽ được tạo tại `client/dist`)*

## 4. Chạy Server 24/7 với PM2

Sử dụng PM2 để chạy Game Server (đã bao gồm Cron Job chạy thế giới).

1. Cài đặt PM2 toàn cục:
```bash
npm install -g pm2
```

2. Mở terminal ở thư mục gốc của project (`my-new-project`) và khởi động qua file ecosystem:
```bash
pm2 start ecosystem.config.js
```

3. (Tùy chọn) Lưu danh sách ứng dụng PM2 để tự khởi động cùng OS:
```bash
pm2 save
pm2 startup
```

## 5. Cấu hình Nginx (Web Server)

Sử dụng Nginx để vửa host thư mục `client/dist` (React), vừa làm Reverse Proxy trỏ URL `/api` tới PM2 (Port 3001).

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Phục vụ file Frontend tĩnh
    location / {
        root /path/to/my-new-project/client/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Reverse Proxy cho Backend API
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 6. Lời Khuyên Sử Dụng & Vận Hành Bằng AI (Admin)

- Vào game với quyền admin (Đăng ký một tài khoản, vào Supabase SQL chạy: `UPDATE users SET is_admin = true WHERE username = 'ten_admin';`).
- Vào giao diện chọn Server, mở **AI Settings**. Thêm các API key của bạn vào hệ thống. Các key sẽ được frontend lưu lại và tự động xoay vòng mỗi khi gọi AI.
- Hệ thống AI NSFW bị tắt theo mặc định ở mọi nhân vật. Bật bằng **Code Đặc Biệt: 161982** khi tạo nhân vật.
