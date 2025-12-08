import React, {useState, useRef} from 'react';
import {View, ActivityIndicator, Alert, BackHandler, Platform, Text} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {WebView} from 'react-native-webview';
import {useNavigation, useRoute} from '@react-navigation/native';
import tw from 'tailwind-react-native-classnames';
import {API_BASE_URL} from '../config/api';

/**
 * VNPayPayment component
 * Displays VNPay payment page in a WebView
 */
const VNPayPayment = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const {paymentUrl, orderId} = route.params || {};
  const [loading, setLoading] = useState(true);
  const [processingCallback, setProcessingCallback] = useState(false);
  const webViewRef = useRef(null);
  const isProcessingCallback = useRef(false); // Flag để tránh xử lý callback nhiều lần

  /**
   * Handle hardware back button on Android
   */
  React.useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleGoBack();
      return true;
    });

    return () => backHandler.remove();
  }, []);

  /**
   * Handle navigation back
   */
  const handleGoBack = () => {
    // Reset flag khi user bấm back để tránh block callback sau này
    isProcessingCallback.current = false;
    
    Alert.alert(
      'Hủy thanh toán',
      'Đơn hàng của bạn đã được lưu. Bạn có thể thanh toán lại sau từ trang đơn hàng. Bạn có chắc chắn muốn hủy thanh toán?',
      [
        {
          text: 'Tiếp tục thanh toán',
          style: 'cancel',
        },
        {
          text: 'Hủy và về trang đơn hàng',
          onPress: () => {
            // Navigate về trang Orders để user có thể thanh toán lại sau
            navigation.navigate('HomeScreen', {
              screen: 'Orders',
            });
          },
          style: 'destructive',
        },
        {
          text: 'Hủy và quay lại',
          onPress: () => {
            navigation.goBack();
          },
        },
      ]
    );
  };

  /**
   * Extract query string from URL
   */
  const extractQueryString = (url) => {
    try {
      const urlObj = new URL(url);
      return urlObj.search; // Returns "?key=value&key2=value2"
    } catch (error) {
      console.error('[VNPayPayment] Error extracting query string:', error);
      return '';
    }
  };

  /**
   * Check if URL is a VNPay return URL
   * Chỉ trả về true khi URL thực sự chứa callback parameters từ VNPay
   */
  const isVNPayReturnUrl = (url) => {
    if (!url) return false;
    
    // Phải có ít nhất một trong các parameters VNPay callback
    const hasVNPayParams = url.includes('vnp_ResponseCode') || 
                          url.includes('vnp_TransactionStatus') ||
                          url.includes('vnp_TxnRef');
    
    // Phải có ReturnUrl trong path hoặc đây là callback URL
    const hasReturnUrl = url.includes('/ReturnUrl') || 
                        url.includes('ReturnUrl') ||
                        url.includes('/callback');
    
    // Chỉ trả về true khi có cả VNPay params và ReturnUrl/callback path
    return hasVNPayParams && hasReturnUrl;
  };

  /**
   * Handle VNPay callback by calling API
   */
  const handleVNPayCallback = async (originalUrl) => {
    // Prevent duplicate callback handling
    if (isProcessingCallback.current) {
      console.log('[VNPayPayment] Callback already processing, skipping...');
      return;
    }

    try {
      isProcessingCallback.current = true;
      setProcessingCallback(true);
      console.log('[VNPayPayment] ========== HANDLING VNPAY CALLBACK ==========');
      console.log('[VNPayPayment] Original URL:', originalUrl);

      // Extract query string from original URL
      const queryString = extractQueryString(originalUrl);
      console.log('[VNPayPayment] Query string:', queryString);

      // Build callback URL
      const callbackUrl = `${API_BASE_URL}/api/v1/payments/vnpay/mobile/callback${queryString}`;
      console.log('[VNPayPayment] Callback URL:', callbackUrl);

      // Call API callback
      const response = await fetch(callbackUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Get response text first to check content type
      const responseText = await response.text();
      console.log('[VNPayPayment] Callback response text:', responseText);
      console.log('[VNPayPayment] Response status:', response.status);
      console.log('[VNPayPayment] Response headers:', response.headers);

      let result;
      try {
        // Try to parse as JSON
        result = JSON.parse(responseText);
        console.log('[VNPayPayment] Callback response JSON:', result);
      } catch (parseError) {
        // If not JSON, check if it's a successful response based on status
        console.warn('[VNPayPayment] Response is not JSON, treating as success if status is 200');
        if (response.ok || response.status === 200) {
          // Assume success if status is 200 even without JSON
          result = {
            status: 200,
            message: 'Thanh toán thành công',
            data: {
              success: true,
            },
          };
        } else {
          result = {
            status: response.status,
            message: 'Có lỗi xảy ra khi xử lý thanh toán',
            data: {
              success: false,
            },
          };
        }
      }

      // Handle response
      if (result.status === 200 || response.ok) {
        const isSuccess = result.data?.success || false;
        const message = result.message || (isSuccess ? 'Thanh toán thành công' : 'Thanh toán thất bại');

        Alert.alert(
          isSuccess ? 'Thanh toán thành công' : 'Thanh toán thất bại',
          message,
          [
            {
              text: 'Xem đơn hàng',
              onPress: () => {
                if (orderId) {
                  navigation.navigate('OrderDetailScreen', { orderId: orderId });
                } else {
                  navigation.navigate('HomeScreen', { screen: 'Orders' });
                }
              },
            },
            {
              text: 'Đóng',
              style: 'cancel',
              onPress: () => {
                navigation.navigate('HomeScreen', { screen: 'Orders' });
              },
            },
          ],
          { cancelable: false }
        );
      } else {
        Alert.alert(
          'Lỗi',
          result.message || 'Có lỗi xảy ra khi xử lý thanh toán. Vui lòng kiểm tra lại đơn hàng.',
          [
            {
              text: 'OK',
              onPress: () => {
                if (orderId) {
                  navigation.navigate('OrderDetailScreen', { orderId: orderId });
                } else {
                  navigation.navigate('HomeScreen', { screen: 'Orders' });
                }
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('[VNPayPayment] Error handling callback:', error);
      Alert.alert(
        'Lỗi',
        'Không thể kết nối đến server. Vui lòng kiểm tra lại đơn hàng sau.',
        [
          {
            text: 'OK',
            onPress: () => {
              if (orderId) {
                navigation.navigate('OrderDetailScreen', { orderId: orderId });
              } else {
                navigation.navigate('HomeScreen', { screen: 'Orders' });
              }
            },
          },
        ]
      );
    } finally {
      setProcessingCallback(false);
      isProcessingCallback.current = false;
    }
  };

  /**
   * Intercept WebView navigation before it loads (iOS)
   * This will block redirects to ReturnUrl and handle them via API instead
   */
  const handleShouldStartLoadWithRequest = (request) => {
    const {url} = request;
    console.log('[VNPayPayment] Navigation request (iOS):', url);

    // Check if this is a VNPay return URL và chưa được xử lý
    if (isVNPayReturnUrl(url) && !isProcessingCallback.current) {
      console.log('[VNPayPayment] Blocking redirect to ReturnUrl, handling via API...');
      
      // Block the navigation
      // Handle callback asynchronously
      setTimeout(() => {
        handleVNPayCallback(url);
      }, 100);

      return false; // Block the navigation
    }

    // Nếu đã đang xử lý callback, block để tránh duplicate
    if (isVNPayReturnUrl(url) && isProcessingCallback.current) {
      console.log('[VNPayPayment] Callback already processing, blocking duplicate...');
      return false;
    }

    // Allow all other navigations
    return true;
  };

  /**
   * Handle WebView navigation state change (Android)
   * This is used as fallback for Android since onShouldStartLoadWithRequest is iOS only
   */
  const handleNavigationStateChange = (navState) => {
    const {url, loading} = navState;
    
    // Skip if already processing callback
    if (isProcessingCallback.current) {
      console.log('[VNPayPayment] Callback already processing, skipping...');
      return;
    }
    
    // Only handle on Android và chỉ khi URL thực sự là callback URL
    if (Platform.OS === 'android' && isVNPayReturnUrl(url) && loading) {
      console.log('[VNPayPayment] Detected ReturnUrl on Android, handling via API...');
      console.log('[VNPayPayment] Callback URL:', url);
      
      // Stop loading and handle callback
      if (webViewRef.current) {
        webViewRef.current.stopLoading();
      }
      
      // Set flag ngay để tránh duplicate
      isProcessingCallback.current = true;
      
      setTimeout(() => {
        handleVNPayCallback(url);
      }, 100);
    }
  };

  /**
   * Handle WebView load end
   */
  const handleLoadEnd = () => {
    setLoading(false);
  };

  /**
   * Handle WebView errors
   */
  const handleError = (syntheticEvent) => {
    const {nativeEvent} = syntheticEvent;
    console.error('WebView error:', nativeEvent);
    Alert.alert(
      'Lỗi',
      'Không thể tải trang thanh toán. Vui lòng thử lại.',
      [
        {
          text: 'Quay lại',
          onPress: () => navigation.goBack(),
        },
        {
          text: 'Tải lại',
          onPress: () => {
            setLoading(true);
          },
        },
      ]
    );
  };

  if (!paymentUrl) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white justify-center items-center`}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      {(loading || processingCallback) && (
        <View style={tw`absolute top-0 left-0 right-0 z-10 bg-white justify-center items-center`}>
          <ActivityIndicator size="large" color="#3B82F6" />
          {processingCallback && (
            <View style={tw`mt-4`}>
              <View style={tw`bg-blue-100 px-4 py-2 rounded-lg`}>
                <View style={tw`flex-row items-center`}>
                  <ActivityIndicator size="small" color="#3B82F6" style={tw`mr-2`} />
                  <Text style={tw`text-sm text-blue-800`}>Đang xử lý thanh toán...</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      )}
      <WebView
        ref={webViewRef}
        source={{uri: paymentUrl}}
        onShouldStartLoadWithRequest={Platform.OS === 'ios' ? handleShouldStartLoadWithRequest : undefined}
        onNavigationStateChange={handleNavigationStateChange}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={tw`flex-1 justify-center items-center bg-white`}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        )}
        style={tw`flex-1`}
      />
    </SafeAreaView>
  );
};

export default VNPayPayment;
