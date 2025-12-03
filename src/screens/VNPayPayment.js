import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Alert,
  BackHandler,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Icon } from 'react-native-elements';
import { TouchableOpacity } from 'react-native';
import tw from 'tailwind-react-native-classnames';
import { getApiUrl, API_ENDPOINTS } from '../config/api';
import { getAuthToken } from '../utils/auth';

const VNPayPayment = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { paymentUrl, orderId } = route.params;
  const webViewRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);

  // Handle back button
  React.useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      handleClose();
      return true;
    });

    return () => backHandler.remove();
  }, [canGoBack]);

  const handleClose = () => {
    Alert.alert(
      'Hủy thanh toán',
      'Bạn có chắc muốn hủy thanh toán?',
      [
        {
          text: 'Tiếp tục thanh toán',
          style: 'cancel',
        },
        {
          text: 'Hủy',
          onPress: () => {
            navigation.goBack();
          },
        },
      ]
    );
  };

  // Extract query parameters from URL
  const extractQueryParams = (url) => {
    try {
      const urlObj = new URL(url);
      const params = {};
      urlObj.searchParams.forEach((value, key) => {
        params[key] = value;
      });
      return params;
    } catch (error) {
      console.error('[VNPayPayment] Error parsing URL:', error);
      return null;
    }
  };

  // Handle VNPay callback
  const handleVNPayCallback = async (url) => {
    console.log('[VNPayPayment] ========== HANDLING VNPAY CALLBACK ==========');
    console.log('[VNPayPayment] Callback URL:', url);

    // Extract query parameters
    const params = extractQueryParams(url);
    
    if (!params || Object.keys(params).length === 0) {
      console.log('[VNPayPayment] No query parameters found');
      return false;
    }

    // Check if this is a VNPay callback (has vnp_ prefix)
    const hasVNPayParams = Object.keys(params).some(key => key.startsWith('vnp_'));
    
    if (!hasVNPayParams) {
      console.log('[VNPayPayment] Not a VNPay callback');
      return false;
    }

    console.log('[VNPayPayment] VNPay callback detected');
    console.log('[VNPayPayment] Query parameters:', JSON.stringify(params, null, 2));

    try {
      const token = await getAuthToken();
      if (!token) {
        console.error('[VNPayPayment] No auth token');
        Alert.alert('Lỗi', 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        navigation.goBack();
        return true;
      }

      // Build callback URL with query parameters
      const callbackUrl = getApiUrl(API_ENDPOINTS.VNPAY_MOBILE_CALLBACK);
      const queryString = new URLSearchParams(params).toString();
      const fullCallbackUrl = `${callbackUrl}?${queryString}`;

      console.log('[VNPayPayment] Calling backend callback:', fullCallbackUrl);

      // Call backend callback API
      const response = await fetch(fullCallbackUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('[VNPayPayment] Backend callback response status:', response.status);

      // Parse response
      let result = {};
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          result = await response.json();
        } else {
          // Backend có thể không trả về body (chỉ log)
          result = { status: response.status };
        }
      } catch (error) {
        console.log('[VNPayPayment] Backend callback may not return body (this is OK)');
        result = { status: response.status };
      }

      // Check payment result from query parameters
      const responseCode = params.vnp_ResponseCode;
      const transactionStatus = params.vnp_TransactionStatus;
      const isSuccess = responseCode === '00' && transactionStatus === '00';

      // Extract orderId from vnp_TxnRef (format: orderCode_randomString)
      const txnRef = params.vnp_TxnRef || '';
      const extractedOrderId = txnRef.split('_')[0] || orderId;

      console.log('[VNPayPayment] Payment result:', {
        isSuccess,
        responseCode,
        transactionStatus,
        orderId: extractedOrderId,
      });

      // Map response code to message
      const responseCodeMessages = {
        '00': 'Giao dịch thành công',
        '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ',
        '09': 'Thẻ/Tài khoản chưa đăng ký dịch vụ InternetBanking',
        '10': 'Xác thực thông tin thẻ/tài khoản không đúng quá 3 lần',
        '11': 'Đã hết hạn chờ thanh toán. Xin vui lòng thực hiện lại giao dịch',
        '12': 'Thẻ/Tài khoản bị khóa',
        '13': 'Nhập sai mật khẩu xác thực giao dịch (OTP)',
        '51': 'Tài khoản không đủ số dư để thực hiện giao dịch',
        '65': 'Tài khoản đã vượt quá hạn mức giao dịch trong ngày',
        '75': 'Ngân hàng thanh toán đang bảo trì',
        '79': 'Nhập sai mật khẩu thanh toán quá số lần quy định',
        '99': 'Lỗi không xác định',
      };

      const message = responseCodeMessages[responseCode] || `Mã lỗi: ${responseCode}`;

      // Show result alert
      const alertTitle = isSuccess ? 'Thanh toán thành công' : 'Thanh toán thất bại';
      
      Alert.alert(
        alertTitle,
        message,
        [
          {
            text: 'Xem đơn hàng',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [
                  { name: 'HomeScreen', params: { screen: 'Orders' } },
                  { 
                    name: 'OrderDetailScreen', 
                    params: { orderId: extractedOrderId } 
                  },
                ],
              });
            },
            style: isSuccess ? 'default' : 'cancel',
          },
          {
            text: 'Đóng',
            style: 'cancel',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'HomeScreen', params: { screen: 'Orders' } }],
              });
            },
          },
        ],
        { cancelable: false }
      );

      return true; // Intercepted, don't navigate
    } catch (error) {
      console.error('[VNPayPayment] Error handling callback:', error);
      Alert.alert('Lỗi', 'Đã xảy ra lỗi khi xử lý kết quả thanh toán. Vui lòng thử lại.');
      return true;
    }
  };

  // Handle navigation state change
  const handleNavigationStateChange = (navState) => {
    setCanGoBack(navState.canGoBack);
    setLoading(navState.loading);

    const { url } = navState;
    
    // Check if this is a callback URL (VNPay redirect)
    if (url && (url.includes('/ReturnUrl') || url.includes('/callback') || url.includes('vnp_'))) {
      console.log('[VNPayPayment] Detected callback URL:', url);
      
      // Handle callback
      handleVNPayCallback(url).then((handled) => {
        if (handled) {
          // Stop loading and prevent navigation
          if (webViewRef.current) {
            webViewRef.current.stopLoading();
          }
        }
      });
    }
  };

  // Handle shouldStartLoadWithRequest (iOS)
  const handleShouldStartLoadWithRequest = (request) => {
    const { url } = request;
    
    // Check if this is a callback URL
    if (url && (url.includes('/ReturnUrl') || url.includes('/callback') || url.includes('vnp_'))) {
      console.log('[VNPayPayment] Intercepted callback URL:', url);
      
      // Handle callback
      handleVNPayCallback(url).then((handled) => {
        if (handled) {
          // Prevent loading this URL
          return false;
        }
      });
      
      return false; // Prevent loading
    }
    
    return true; // Allow loading
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Icon name="close" type="material" color="#000" size={24} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Icon name="payment" type="material" color="#000" size={24} />
        </View>
      </View>

      {/* Loading indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      )}

      {/* WebView */}
      <WebView
        ref={webViewRef}
        source={{ uri: paymentUrl }}
        style={styles.webview}
        onNavigationStateChange={handleNavigationStateChange}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        startInLoadingState={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        sharedCookiesEnabled={true}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('[VNPayPayment] WebView error:', nativeEvent);
          Alert.alert('Lỗi', 'Không thể tải trang thanh toán. Vui lòng thử lại.');
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    alignItems: 'center',
  },
  loadingContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1,
  },
  webview: {
    flex: 1,
  },
});

export default VNPayPayment;



