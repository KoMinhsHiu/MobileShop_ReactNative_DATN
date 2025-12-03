# Hướng Dẫn Thiết Lập Ngrok cho VNPay Callback

## Mục Đích

Ngrok giúp expose local backend (localhost:3000) ra internet để VNPay có thể gọi callback URL.

## Bước 0: Đăng Ký Tài Khoản Ngrok (Bắt Buộc)

### 1. Đăng ký tài khoản miễn phí

Truy cập: https://dashboard.ngrok.com/signup

- Đăng ký bằng email hoặc Google/GitHub
- Tài khoản miễn phí đủ để test VNPay callback

### 2. Lấy Authtoken

Sau khi đăng ký, truy cập: https://dashboard.ngrok.com/get-started/your-authtoken

- Copy authtoken của bạn (dạng: `2abc123def456ghi789jkl012mno345pq_6rStUvWxYz7AbCdEfGhIjKl`)

### 3. Cài đặt Authtoken

Chạy lệnh sau trong terminal (thay `YOUR_AUTHTOKEN` bằng authtoken của bạn):

**Windows (PowerShell hoặc CMD):**
```bash
ngrok config add-authtoken YOUR_AUTHTOKEN
```

**Mac/Linux:**
```bash
ngrok config add-authtoken YOUR_AUTHTOKEN
```

**Ví dụ:**
```bash
ngrok config add-authtoken 2abc123def456ghi789jkl012mno345pq_6rStUvWxYz7AbCdEfGhIjKl
```

Sau khi cài đặt thành công, bạn sẽ thấy:
```
Authtoken saved to configuration file: C:\Users\YourName\AppData\Local\ngrok\ngrok.yml
```

### 4. Kiểm tra cài đặt

Chạy lệnh để kiểm tra:
```bash
ngrok config check
```

Nếu thấy "Valid configuration file" nghĩa là đã cài đặt thành công.

## Bước 1: Chạy Ngrok

### Cách 1: Sử dụng Command Line

1. Mở terminal/command prompt
2. Chạy lệnh sau (giả sử backend đang chạy ở port 3000):

```bash
ngrok http 3000
```

### Cách 2: Sử dụng Ngrok với Domain Cố Định (Nếu có tài khoản)

```bash
ngrok http 3000 --domain=your-domain.ngrok-free.app
```

## Bước 2: Lấy Ngrok URL

Sau khi chạy ngrok, bạn sẽ thấy output như sau:

```
Forwarding    https://abc123.ngrok-free.app -> http://localhost:3000
```

**Lưu ý:** URL sẽ có dạng `https://xxxx-xxx-xxx-xxx-xxx.ngrok-free.app`

## Bước 3: Cấu Hình Backend

### Cấu hình VNPay Mobile Return URL

Trong backend, cần cấu hình biến môi trường `VNPAY_MOBILE_RETURN_URL`:

```env
VNPAY_MOBILE_RETURN_URL=https://your-ngrok-url.ngrok-free.app/api/v1/payments/vnpay/mobile/callback
```

**Ví dụ:**
```env
VNPAY_MOBILE_RETURN_URL=https://abc123.ngrok-free.app/api/v1/payments/vnpay/mobile/callback
```

### Cấu hình trong Backend Code

Nếu backend sử dụng file config, cập nhật như sau:

```javascript
// config/vnpay.js hoặc tương tự
const VNPAY_CONFIG = {
  mobileReturnUrl: process.env.VNPAY_MOBILE_RETURN_URL || 'https://your-ngrok-url.ngrok-free.app/api/v1/payments/vnpay/mobile/callback',
  // ... các config khác
};
```

## Bước 4: Kiểm Tra

1. **Kiểm tra ngrok đang chạy:**
   - Truy cập: `http://localhost:4040` (ngrok web interface)
   - Xem các request đang được forward

2. **Test callback URL:**
   - Truy cập: `https://your-ngrok-url.ngrok-free.app/api/v1/payments/vnpay/mobile/callback`
   - Nếu thấy response (có thể là lỗi vì thiếu params), nghĩa là ngrok đã hoạt động

## Lưu Ý Quan Trọng

### 1. URL Ngrok Thay Đổi Mỗi Lần Chạy (Free Plan)

- Mỗi lần chạy `ngrok http 3000`, URL sẽ khác
- Cần cập nhật lại `VNPAY_MOBILE_RETURN_URL` trong backend mỗi lần
- Hoặc dùng ngrok với domain cố định (cần tài khoản)

### 2. Ngrok Free Plan Có Giới Hạn

- Có thể bị giới hạn số lượng request
- URL có thể bị thay đổi sau một thời gian
- Cân nhắc dùng ngrok paid plan cho production testing

### 3. Security

- Ngrok URL là public, ai cũng có thể truy cập
- Chỉ dùng cho development/testing
- Không dùng cho production

## Script Tự Động (Tùy Chọn)

Có thể tạo script để tự động lấy ngrok URL và cập nhật config:

```bash
#!/bin/bash
# get-ngrok-url.sh

# Chạy ngrok và lấy URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o 'https://[^"]*\.ngrok-free\.app' | head -1)

if [ -z "$NGROK_URL" ]; then
    echo "Ngrok không chạy hoặc chưa có tunnel"
    exit 1
fi

echo "Ngrok URL: $NGROK_URL"
echo "VNPay Callback URL: $NGROK_URL/api/v1/payments/vnpay/mobile/callback"

# Cập nhật vào file .env (nếu cần)
# echo "VNPAY_MOBILE_RETURN_URL=$NGROK_URL/api/v1/payments/vnpay/mobile/callback" >> .env
```

## Troubleshooting

### Lỗi: "authentication failed: Usage of ngrok requires a verified account and authtoken"
**Giải pháp:**
1. Đăng ký tài khoản tại: https://dashboard.ngrok.com/signup
2. Lấy authtoken tại: https://dashboard.ngrok.com/get-started/your-authtoken
3. Cài đặt authtoken: `ngrok config add-authtoken YOUR_AUTHTOKEN`
4. Chạy lại: `ngrok http 3000`

### Lỗi: "Invalid configuration property value for 'update_channel'"
**Giải pháp:**

File config ngrok có property `update_channel` không hợp lệ. Sửa như sau:

**Windows:**
1. Mở file config: `C:\Users\YourName\AppData\Local\ngrok\ngrok.yml`
2. Tìm dòng `update_channel: ''` hoặc `update_channel:`
3. Sửa thành một trong các giá trị sau:
   ```yaml
   update_channel: stable
   ```
   Hoặc xóa dòng đó đi nếu không cần thiết.

**Mac/Linux:**
1. Mở file config: `~/.ngrok2/ngrok.yml` hoặc `~/.config/ngrok/ngrok.yml`
2. Sửa tương tự như trên

**Hoặc xóa file config và cài đặt lại:**
```bash
# Windows - Xóa file config
del C:\Users\YourName\AppData\Local\ngrok\ngrok.yml

# Mac/Linux - Xóa file config
rm ~/.ngrok2/ngrok.yml
# hoặc
rm ~/.config/ngrok/ngrok.yml

# Sau đó cài đặt lại authtoken
ngrok config add-authtoken YOUR_AUTHTOKEN
```

### Lỗi: "ngrok: command not found"
- Cài đặt ngrok: https://ngrok.com/download
- Hoặc dùng: `npm install -g ngrok`

### Lỗi: "port 3000 is already in use"
- Kiểm tra xem backend đã chạy chưa
- Hoặc dùng port khác: `ngrok http 3001`

### VNPay vẫn không gọi được callback
- Kiểm tra ngrok URL có đúng không
- Kiểm tra backend có nhận được request không (xem ngrok web interface)
- Kiểm tra firewall/antivirus có chặn không

### Lỗi: "ERR_NGROK_4018"
- Đây là lỗi authentication
- Đảm bảo đã đăng ký tài khoản và cài đặt authtoken
- Xem hướng dẫn ở Bước 0 ở trên

## Ví Dụ Cấu Hình Hoàn Chỉnh

1. **Chạy Backend:**
   ```bash
   npm start
   # Backend chạy ở http://localhost:3000
   ```

2. **Chạy Ngrok:**
   ```bash
   ngrok http 3000
   # Ngrok URL: https://abc123.ngrok-free.app
   ```

3. **Cấu hình Backend .env:**
   ```env
   VNPAY_MOBILE_RETURN_URL=https://abc123.ngrok-free.app/api/v1/payments/vnpay/mobile/callback
   ```

4. **Restart Backend** để load config mới

5. **Test từ Mobile App:**
   - Đặt hàng với VNPay
   - VNPay sẽ redirect về ngrok URL
   - Backend sẽ nhận được callback từ VNPay

