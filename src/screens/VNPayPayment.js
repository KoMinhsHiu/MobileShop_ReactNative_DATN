import React, {useState} from 'react';
import {View, ActivityIndicator, Alert, BackHandler} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {WebView} from 'react-native-webview';
import {useNavigation, useRoute} from '@react-navigation/native';
import tw from 'tailwind-react-native-classnames';

/**
 * VNPayPayment component
 * Displays VNPay payment page in a WebView
 */
const VNPayPayment = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const {paymentUrl, orderId} = route.params || {};
  const [loading, setLoading] = useState(true);

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
    Alert.alert(
      'Hủy thanh toán',
      'Bạn có chắc chắn muốn hủy thanh toán?',
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
          style: 'destructive',
        },
      ]
    );
  };

  /**
   * Handle WebView navigation state change
   */
  const handleNavigationStateChange = (navState) => {
    const {url} = navState;
    
    /**
     * Check if URL contains VNPay callback indicators
     * VNPay typically redirects to a callback URL after payment
     */
    if (url && (url.includes('vnp_ResponseCode') || url.includes('vnp_TransactionStatus'))) {
      /**
       * Payment callback detected - navigation will be handled by deep linking
       * in App.js, so we can navigate back
       */
      setTimeout(() => {
        navigation.goBack();
      }, 1000);
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
      {loading && (
        <View style={tw`absolute top-0 left-0 right-0 z-10 bg-white justify-center items-center`}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      )}
      <WebView
        source={{uri: paymentUrl}}
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
