# Yêu Cầu API Backend cho Google Sign-In (Android Mobile)

## Tổng Quan

Android app sử dụng Google Sign-In SDK để lấy `idToken` từ Google, sau đó gửi lên backend để verify và nhận access token.

## Endpoint Cần Tạo

### Option 1: Tạo Endpoint Mới (Khuyến nghị)

**Endpoint:** `POST /api/v1/auth/google/verify`

**Mục đích:** Xử lý đăng nhập Google từ mobile app (Android/iOS) sử dụng idToken

---

## Chi Tiết API

### Request

**Method:** `POST`

**URL:** `/api/v1/auth/google/verify`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjkzYTkzNThjY2Y5OWYxYmIwNDBiYzYyMjFkNTQ5M2UxZmZkOGFkYTEiLCJ0eXAiOiJKV1QifQ...",
  "email": "user@gmail.com",
  "name": "User Name",
  "photo": "https://lh3.googleusercontent.com/a/..."
}
```

**Giải thích các field:**
- `idToken`: JWT token từ Google Sign-In SDK (bắt buộc)
- `email`: Email của user từ Google (optional, có thể lấy từ idToken)
- `name`: Tên của user từ Google (optional, có thể lấy từ idToken)
- `photo`: URL ảnh đại diện từ Google (optional)

---

### Response

#### Thành công (200 OK)

**Khi user đã tồn tại trong hệ thống:**

```json
{
  "status": 200,
  "message": "User logged in with Google successfully",
  "data": {
    "userId": 1,
    "tokens": {
      "accessToken": "someAccessToken",
      "refreshToken": "someRefreshToken",
      "expiresIn": 3600
    }
  },
  "errors": null
}
```

#### User chưa tồn tại (404 Not Found)

**Khi user chưa có trong hệ thống:**

```json
{
  "status": 404,
  "message": "User not found in the system. Please register an account.",
  "data": {
    "googleUser": {
      "id": "104209119844155702671",
      "email": "user@gmail.com",
      "firstName": "User",
      "lastName": "Name"
    },
    "isNewUser": true
  },
  "errors": null
}
```

#### Service không khả dụng (503 Service Unavailable)

```json
{
  "status": 503,
  "message": "Auth service is temporarily unavailable",
  "data": null,
  "errors": null
}
```

#### Lỗi xác thực (400/401 Bad Request/Unauthorized)

```json
{
  "status": 400,
  "message": "Invalid idToken",
  "data": null,
  "errors": {
    "idToken": "Token is invalid or expired"
  }
}
```

---

## Logic Xử Lý Backend

### Bước 1: Verify idToken

1. **Verify idToken với Google:**
   - Gọi Google API để verify idToken
   - URL: `https://oauth2.googleapis.com/tokeninfo?id_token={idToken}`
   - Hoặc dùng Google Auth Library để verify

2. **Kiểm tra idToken hợp lệ:**
   - Token chưa hết hạn
   - Token được cấp bởi đúng Google Client ID
   - Audience (aud) khớp với Web Client ID của bạn

### Bước 2: Extract User Info từ idToken

Từ idToken (JWT), decode để lấy thông tin:
- `sub`: Google User ID
- `email`: Email
- `name`: Tên đầy đủ
- `picture`: URL ảnh đại diện
- `email_verified`: Email đã verify chưa

### Bước 3: Tìm hoặc tạo User

1. **Tìm user trong database:**
   - Tìm theo `email` hoặc `googleId` (sub từ idToken)

2. **Nếu user tồn tại:**
   - Tạo access token và refresh token
   - Trả về response 200 với tokens

3. **Nếu user chưa tồn tại:**
   - Trả về response 404 với thông tin Google user
   - App sẽ hiển thị thông báo yêu cầu đăng ký

---

## Ví Dụ Code Backend (Node.js/Express)

```javascript
const { OAuth2Client } = require('google-auth-library');

// Web Client ID từ Google Cloud Console
const CLIENT_ID = '504133907493-loka5aeg5o0bmsdd09ppjtqqrj81dh69.apps.googleusercontent.com';
const client = new OAuth2Client(CLIENT_ID);

app.post('/api/v1/auth/google/verify', async (req, res) => {
  try {
    const { idToken, email, name, photo } = req.body;

    if (!idToken) {
      return res.status(400).json({
        status: 400,
        message: 'idToken is required',
        data: null,
        errors: { idToken: 'idToken is required' }
      });
    }

    // Verify idToken với Google
    const ticket = await client.verifyIdToken({
      idToken: idToken,
      audience: CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const googleUserId = payload['sub'];
    const googleEmail = payload['email'] || email;
    const googleName = payload['name'] || name;
    const googlePhoto = payload['picture'] || photo;

    // Tìm user trong database
    let user = await User.findOne({ 
      $or: [
        { email: googleEmail },
        { googleId: googleUserId }
      ]
    });

    if (!user) {
      // User chưa tồn tại
      return res.status(404).json({
        status: 404,
        message: 'User not found in the system. Please register an account.',
        data: {
          googleUser: {
            id: googleUserId,
            email: googleEmail,
            firstName: googleName?.split(' ')[0] || '',
            lastName: googleName?.split(' ').slice(1).join(' ') || ''
          },
          isNewUser: true
        },
        errors: null
      });
    }

    // User tồn tại - tạo tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    const expiresIn = 3600; // 1 hour

    return res.status(200).json({
      status: 200,
      message: 'User logged in with Google successfully',
      data: {
        userId: user.id,
        tokens: {
          accessToken: accessToken,
          refreshToken: refreshToken,
          expiresIn: expiresIn
        }
      },
      errors: null
    });

  } catch (error) {
    console.error('Google verify error:', error);
    
    if (error.message.includes('Token used too early') || 
        error.message.includes('Token expired')) {
      return res.status(400).json({
        status: 400,
        message: 'Invalid or expired idToken',
        data: null,
        errors: { idToken: error.message }
      });
    }

    return res.status(503).json({
      status: 503,
      message: 'Auth service is temporarily unavailable',
      data: null,
      errors: null
    });
  }
});
```

---

## So Sánh với Endpoint Hiện Tại

### Endpoint hiện tại: `POST /api/v1/auth/google/callback`
- **Input:** `{ "code": "authorizationCodeFromGoogle" }`
- **Dùng cho:** OAuth2 flow (Web browser)
- **Flow:** Redirect → Google → Callback với code

### Endpoint mới: `POST /api/v1/auth/google/verify`
- **Input:** `{ "idToken": "jwtTokenFromGoogle" }`
- **Dùng cho:** Mobile app (Android/iOS)
- **Flow:** Mobile SDK → idToken → Verify → Token

---

## Lưu Ý Quan Trọng

1. **Web Client ID:**
   - Dùng Web Client ID để verify idToken: `504133907493-loka5aeg5o0bmsdd09ppjtqqrj81dh69.apps.googleusercontent.com`
   - Không dùng Android Client ID

2. **Security:**
   - Luôn verify idToken với Google trước khi xử lý
   - Không trust thông tin từ client (email, name, photo)
   - Lấy thông tin từ idToken đã verify

3. **Error Handling:**
   - Xử lý các trường hợp: token expired, invalid token, network error
   - Trả về status code và message rõ ràng

4. **Database:**
   - Lưu `googleId` (sub từ idToken) để link với Google account
   - Có thể dùng email làm unique identifier

---

## Testing

### Test với Postman/Thunder Client:

```http
POST http://localhost:3000/api/v1/auth/google/verify
Content-Type: application/json

{
  "idToken": "eyJhbGciOiJSUzI1NiIs...",
  "email": "test@gmail.com",
  "name": "Test User",
  "photo": "https://..."
}
```

### Expected Response (200):
```json
{
  "status": 200,
  "message": "User logged in with Google successfully",
  "data": {
    "userId": 1,
    "tokens": {
      "accessToken": "...",
      "refreshToken": "...",
      "expiresIn": 3600
    }
  },
  "errors": null
}
```

---

## Tóm Tắt

1. ✅ Tạo endpoint: `POST /api/v1/auth/google/verify`
2. ✅ Nhận `idToken` từ request body
3. ✅ Verify `idToken` với Google API
4. ✅ Extract user info từ verified token
5. ✅ Tìm user trong database
6. ✅ Trả về tokens nếu user tồn tại
7. ✅ Trả về 404 với Google user info nếu user chưa tồn tại








