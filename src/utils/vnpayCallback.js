/**
 * Utility functions để xử lý VNPay callback cho mobile app
 */

/**
 * Parse VNPay callback URL và extract query parameters
 * @param {string} url - URL callback từ VNPay
 * @returns {Object|null} - Object chứa các query parameters hoặc null nếu không phải VNPay callback
 */
export const parseVNPayCallback = (url) => {
  try {
    // Kiểm tra nếu URL chứa vnp_ prefix (VNPay callback)
    if (!url || !url.includes('vnp_')) {
      return null;
    }

    const urlObj = new URL(url);
    const params = {};

    // Extract tất cả các query parameters có prefix vnp_
    urlObj.searchParams.forEach((value, key) => {
      if (key.startsWith('vnp_')) {
        params[key] = value;
      }
    });

    // Kiểm tra nếu có ít nhất một VNPay parameter
    if (Object.keys(params).length === 0) {
      return null;
    }

    return {
      vnp_Amount: params.vnp_Amount,
      vnp_BankCode: params.vnp_BankCode,
      vnp_BankTranNo: params.vnp_BankTranNo,
      vnp_CardType: params.vnp_CardType,
      vnp_PayDate: params.vnp_PayDate,
      vnp_OrderInfo: params.vnp_OrderInfo,
      vnp_TransactionNo: params.vnp_TransactionNo,
      vnp_ResponseCode: params.vnp_ResponseCode,
      vnp_TransactionStatus: params.vnp_TransactionStatus,
      vnp_TxnRef: params.vnp_TxnRef,
      vnp_SecureHash: params.vnp_SecureHash,
    };
  } catch (error) {
    console.error('[VNPay Callback] Error parsing URL:', error);
    return null;
  }
};

/**
 * Kiểm tra xem payment có thành công không
 * @param {Object} callbackData - Data từ parseVNPayCallback
 * @returns {boolean} - true nếu payment thành công
 */
export const isPaymentSuccess = (callbackData) => {
  if (!callbackData) {
    return false;
  }

  // Payment thành công khi:
  // - vnp_ResponseCode === '00'
  // - vnp_TransactionStatus === '00'
  return (
    callbackData.vnp_ResponseCode === '00' &&
    callbackData.vnp_TransactionStatus === '00'
  );
};

/**
 * Extract orderId từ vnp_TxnRef
 * Format: orderCode_randomString hoặc orderId_randomString
 * @param {string} txnRef - vnp_TxnRef từ callback
 * @returns {string|null} - orderId hoặc orderCode
 */
export const extractOrderIdFromTxnRef = (txnRef) => {
  if (!txnRef) {
    return null;
  }

  // TxnRef format: PH1710257334_ZY4PY hoặc 123_ABC
  // Lấy phần trước dấu _
  const parts = txnRef.split('_');
  if (parts.length > 0) {
    return parts[0];
  }

  return txnRef;
};

/**
 * Xử lý VNPay callback và trả về thông tin cần thiết
 * @param {string} url - URL callback từ VNPay
 * @returns {Object|null} - { success: boolean, orderId: string, message: string, data: Object }
 */
export const handleVNPayCallback = (url) => {
  console.log('[VNPay Callback] ========== HANDLING CALLBACK ==========');
  console.log('[VNPay Callback] URL:', url);

  const callbackData = parseVNPayCallback(url);
  
  if (!callbackData) {
    console.log('[VNPay Callback] Not a VNPay callback URL');
    return null;
  }

  console.log('[VNPay Callback] Parsed callback data:', JSON.stringify(callbackData, null, 2));

  const isSuccess = isPaymentSuccess(callbackData);
  const orderId = extractOrderIdFromTxnRef(callbackData.vnp_TxnRef);

  // Map response code to message
  const responseCodeMessages = {
    '00': 'Giao dịch thành công',
    '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường)',
    '09': 'Thẻ/Tài khoản chưa đăng ký dịch vụ InternetBanking',
    '10': 'Xác thực thông tin thẻ/tài khoản không đúng quá 3 lần',
    '11': 'Đã hết hạn chờ thanh toán. Xin vui lòng thực hiện lại giao dịch',
    '12': 'Thẻ/Tài khoản bị khóa',
    '13': 'Nhập sai mật khẩu xác thực giao dịch (OTP). Xin vui lòng thực hiện lại giao dịch',
    '51': 'Tài khoản không đủ số dư để thực hiện giao dịch',
    '65': 'Tài khoản đã vượt quá hạn mức giao dịch trong ngày',
    '75': 'Ngân hàng thanh toán đang bảo trì',
    '79': 'Nhập sai mật khẩu thanh toán quá số lần quy định',
    '99': 'Lỗi không xác định',
  };

  const message = responseCodeMessages[callbackData.vnp_ResponseCode] || 
                  `Mã lỗi: ${callbackData.vnp_ResponseCode}`;

  const result = {
    success: isSuccess,
    orderId: orderId,
    message: message,
    data: callbackData,
    responseCode: callbackData.vnp_ResponseCode,
    transactionNo: callbackData.vnp_TransactionNo,
    amount: callbackData.vnp_Amount ? parseInt(callbackData.vnp_Amount) / 100 : null, // Convert từ xu sang VND
  };

  console.log('[VNPay Callback] Processed result:', JSON.stringify(result, null, 2));
  console.log('[VNPay Callback] ========== CALLBACK HANDLED ==========');

  return result;
};




