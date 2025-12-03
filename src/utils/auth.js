import AsyncStorage from '@react-native-async-storage/async-storage';
import {getApiUrl, API_ENDPOINTS} from '../config/api';

const AUTH_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_DATA_KEY = 'user_data';
const TOKEN_EXPIRES_KEY = 'token_expires';
const REMEMBER_ME_KEY = 'remember_me';
const SAVED_USERNAME_KEY = 'saved_username';
const SAVED_PASSWORD_KEY = 'saved_password';

/**
 * Lưu thông tin đăng nhập
 */
export const saveAuthData = async (token, userData, refreshToken = null, expiresIn = null, rememberMe = false) => {
  try {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
    await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
    
    if (refreshToken) {
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
    
    // Lưu remember me setting
    await AsyncStorage.setItem(REMEMBER_ME_KEY, rememberMe.toString());
    
    // Tính toán thời gian hết hạn
    if (expiresIn) {
      // Nếu remember me, tăng thời gian hết hạn lên 30 ngày thay vì dùng expiresIn từ API
      // Điều này giúp token có thời gian sống lâu hơn khi user chọn remember me
      const expirationTime = rememberMe 
        ? Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 ngày cho remember me
        : Date.now() + (expiresIn * 1000); // Dùng expiresIn từ API cho trường hợp bình thường
      await AsyncStorage.setItem(TOKEN_EXPIRES_KEY, expirationTime.toString());
    } else if (rememberMe) {
      // Nếu remember me nhưng không có expiresIn, set 30 ngày
      const expirationTime = Date.now() + (30 * 24 * 60 * 60 * 1000);
      await AsyncStorage.setItem(TOKEN_EXPIRES_KEY, expirationTime.toString());
    } else if (expiresIn === null) {
      // Nếu không có expiresIn và không remember me, set mặc định 24 giờ
      const expirationTime = Date.now() + (24 * 60 * 60 * 1000);
      await AsyncStorage.setItem(TOKEN_EXPIRES_KEY, expirationTime.toString());
    }
    
    return true;
  } catch (error) {
    console.error('Error saving auth data:', error);
    return false;
  }
};

/**
 * Lấy token đăng nhập
 */
export const getAuthToken = async () => {
  try {
    const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    return token;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

/**
 * Lấy thông tin user
 */
export const getUserData = async () => {
  try {
    const userData = await AsyncStorage.getItem(USER_DATA_KEY);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};

/**
 * Refresh access token bằng refresh token
 */
export const refreshAccessToken = async () => {
  try {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      console.log('No refresh token available');
      return false;
    }

    const apiUrl = getApiUrl(API_ENDPOINTS.REFRESH_TOKEN);
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refreshToken: refreshToken,
      }),
    });

    if (!response.ok) {
      console.log('Failed to refresh token');
      return false;
    }

    const data = await response.json();
    if (data.status === 200 && data.data) {
      const {tokens, userId} = data.data;
      const {accessToken, refreshToken: newRefreshToken, expiresIn} = tokens;
      
      // Lấy thông tin user hiện tại
      const userData = await getUserData();
      if (!userData) {
        console.log('No user data found');
        return false;
      }

      // Lấy remember me setting
      const rememberMe = await AsyncStorage.getItem(REMEMBER_ME_KEY);
      const rememberMeBool = rememberMe === 'true';

      // Lưu token mới
      const saved = await saveAuthData(
        accessToken,
        userData,
        newRefreshToken || refreshToken,
        expiresIn,
        rememberMeBool
      );

      if (saved) {
        console.log('Token refreshed successfully');
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return false;
  }
};

/**
 * Kiểm tra xem user đã đăng nhập chưa
 */
export const isAuthenticated = async () => {
  try {
    const token = await getAuthToken();
    if (!token || token === '') {
      return false;
    }
    
    // Kiểm tra token có hết hạn không
    const expired = await isTokenExpired();
    if (expired) {
      // Token đã hết hạn, thử refresh token
      const refreshToken = await getRefreshToken();
      
      // Nếu có refresh token, thử refresh (bất kể remember me hay không)
      // Điều này giúp tự động làm mới token khi token hết hạn trong quá trình sử dụng
      if (refreshToken) {
        console.log('Token expired, attempting to refresh...');
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          return true; // Refresh thành công, vẫn đăng nhập
        }
      }
      
      // Nếu không thể refresh hoặc không có refresh token
      const rememberMe = await AsyncStorage.getItem(REMEMBER_ME_KEY);
      
      // Nếu có remember me, không xóa token ngay lập tức
      // Token có thể vẫn còn hợp lệ ở server (server có thể có thời gian hết hạn khác)
      // Hoặc có thể refresh sau khi kết nối mạng được khôi phục
      if (rememberMe === 'true') {
        console.log('Token expired locally but remember me is enabled, keeping token for server validation');
        // Vẫn trả về true để cho phép request đến server
        // Server sẽ từ chối nếu token thực sự đã hết hạn
        return true;
      }
      
      // Nếu không có remember me và không thể refresh, xóa dữ liệu đăng nhập
      console.log('Token expired and cannot refresh, clearing auth data');
      await clearAuthData();
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
};

/**
 * Lấy refresh token
 */
export const getRefreshToken = async () => {
  try {
    const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    return refreshToken;
  } catch (error) {
    console.error('Error getting refresh token:', error);
    return null;
  }
};

/**
 * Kiểm tra token có hết hạn không
 */
export const isTokenExpired = async () => {
  try {
    const expiresAt = await AsyncStorage.getItem(TOKEN_EXPIRES_KEY);
    if (!expiresAt) {
      // Nếu không có thời gian hết hạn, kiểm tra remember me
      const rememberMe = await AsyncStorage.getItem(REMEMBER_ME_KEY);
      if (rememberMe === 'true') {
        // Nếu remember me nhưng không có expiresAt, coi như chưa hết hạn
        // (có thể là token cũ chưa có expiresAt)
        return false;
      }
      return true; // Không có thời gian hết hạn và không remember me, coi như đã hết hạn
    }
    
    // Kiểm tra xem token có hết hạn không
    const isExpired = Date.now() >= parseInt(expiresAt, 10);
    
    // Nếu token hết hạn nhưng có remember me, vẫn cần refresh token
    // Nhưng ở đây chúng ta vẫn trả về true để trigger refresh logic
    return isExpired;
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true;
  }
};

/**
 * Lưu username khi remember me được chọn
 */
export const saveUsername = async (username) => {
  try {
    await AsyncStorage.setItem(SAVED_USERNAME_KEY, username);
    return true;
  } catch (error) {
    console.error('Error saving username:', error);
    return false;
  }
};

/**
 * Lấy username đã lưu
 */
export const getSavedUsername = async () => {
  try {
    const username = await AsyncStorage.getItem(SAVED_USERNAME_KEY);
    return username;
  } catch (error) {
    console.error('Error getting saved username:', error);
    return null;
  }
};

/**
 * Xóa username đã lưu
 */
export const clearSavedUsername = async () => {
  try {
    await AsyncStorage.removeItem(SAVED_USERNAME_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing saved username:', error);
    return false;
  }
};

/**
 * Xóa tất cả thông tin đăng nhập đã lưu (username)
 */
export const clearSavedCredentials = async () => {
  try {
    await clearSavedUsername();
    // Xóa password nếu có (từ phiên bản cũ)
    try {
      await AsyncStorage.removeItem(SAVED_PASSWORD_KEY);
    } catch (e) {
      // Ignore error if key doesn't exist
    }
    return true;
  } catch (error) {
    console.error('Error clearing saved credentials:', error);
    return false;
  }
};

/**
 * Xóa thông tin đăng nhập (logout)
 */
export const clearAuthData = async () => {
  try {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
    await AsyncStorage.removeItem(USER_DATA_KEY);
    await AsyncStorage.removeItem(TOKEN_EXPIRES_KEY);
    await AsyncStorage.removeItem(REMEMBER_ME_KEY);
    // Xóa saved credentials khi logout (bảo mật)
    await clearSavedCredentials();
    return true;
  } catch (error) {
    console.error('Error clearing auth data:', error);
    return false;
  }
};
