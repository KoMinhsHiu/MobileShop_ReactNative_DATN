import {Platform} from 'react-native';

// API Base URL Configuration
// Trên Android Emulator: dùng 10.0.2.2 thay vì localhost
// Trên iOS Simulator: có thể dùng localhost
// Trên thiết bị thật: dùng IP của máy tính trong mạng LAN
const getBaseURL = () => {
  if (__DEV__) {
    // Development mode
    if (Platform.OS === 'android') {
      // Android Emulator sử dụng 10.0.2.2 để trỏ về localhost của máy host
      return 'http://10.0.2.2:3000';
    } else {
      // iOS Simulator có thể dùng localhost
      return 'http://localhost:3000';
    }
  } else {
    // Production mode - thay đổi URL này thành production API
    return 'https://your-production-api.com';
  }
};

export const API_BASE_URL = getBaseURL();

export const API_ENDPOINTS = {
  LOGIN: '/api/v1/auth/login',
  REGISTER: '/api/v1/auth/register',
  LOGOUT: '/api/v1/auth/logout',
  REFRESH_TOKEN: '/api/v1/auth/refresh',
  GOOGLE_LOGIN: '/api/v1/auth/google',
  GOOGLE_CALLBACK: '/api/v1/auth/google/callback',
  GOOGLE_MOBILE_CALLBACK: '/api/v1/auth/google/mobile/callback', // Endpoint cho mobile - nhận idToken
  GET_CUSTOMER_ME: '/api/v1/customers/me',
  GET_CUSTOMER_ADDRESSES: '/api/v1/customers/addresses',
  CREATE_CUSTOMER_ADDRESS: '/api/v1/customers/addresses',
  UPDATE_CUSTOMER_ADDRESS: '/api/v1/customers/addresses/update', // Will append /:addressId
  DELETE_CUSTOMER_ADDRESS: '/api/v1/customers/addresses/delete', // Will append /:addressId
  GET_PAYMENT_METHODS: '/api/v1/payments/methods',
  CREATE_ORDER: '/api/v1/orders/create',
  VNPAY_MOBILE_CREATE: '/api/v1/payments/vnpay/mobile/create',
  VNPAY_MOBILE_CALLBACK: '/api/v1/payments/vnpay/mobile/callback',
  AI_CHAT: '/api/v1/ai/chat',
  SHIPMENT_FEE: '/api/v1/shipment/fee',
  // Thêm các endpoints khác ở đây
};

// Helper function để tạo full URL
export const getApiUrl = (endpoint) => {
  return `${API_BASE_URL}${endpoint}`;
};
