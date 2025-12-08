import {
  ActivityIndicator,
  ScrollView,
  Text,
  View,
  Platform,
  Alert,
  TouchableOpacity,
  StatusBar,
  Image,
  Modal,
  Pressable,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import React, {useEffect, useState, useCallback} from 'react';
import tw from 'tailwind-react-native-classnames';
import {Icon} from 'react-native-elements';
import {getAuthToken} from '../utils/auth';
import {getLocationNames} from '../utils/locations';
import {API_ENDPOINTS, getApiUrl} from '../config/api';

const OrderDetail = ({route, navigation}) => {
  // Hỗ trợ cả orderCode và orderId
  const {orderCode, orderId} = route.params;
  const orderIdentifier = orderCode || orderId;
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [locationNames, setLocationNames] = useState({
    provinceName: null,
    communeName: null,
  });
  const [cancelling, setCancelling] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);

  // Format ngày tháng
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  // Format số tiền
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '0 ₫';
    return `${amount.toLocaleString('vi-VN')} ₫`;
  };

  /**
   * Lấy màu theo trạng thái
   */
  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered':
        return '#10b981'; // green
      case 'shipping':
        return '#3b82f6'; // blue
      case 'pending':
        return '#f59e0b'; // yellow
      case 'cancelled':
        return '#ef4444'; // red
      case 'confirmed':
        return '#3b82f6'; // blue
      case 'processing':
        return '#8b5cf6'; // purple
      case 'paid':
        return '#10b981'; // green - đã thanh toán
      default:
        return '#6b7280'; // gray
    }
  };

  /**
   * Map status từ API sang tiếng Việt
   */
  const mapStatusToVietnamese = (status) => {
    const statusMap = {
      pending: 'Chờ xác nhận',
      confirmed: 'Đã xác nhận',
      processing: 'Đang xử lý',
      shipping: 'Đang giao',
      delivered: 'Đã giao',
      cancelled: 'Đã hủy',
      paid: 'Đã thanh toán',
    };
    return statusMap[status] || status;
  };

  /**
   * Kiểm tra xem đơn hàng có payments rỗng không
   */
  const hasEmptyPayments = () => {
    if (!order) return false;
    // Kiểm tra cả payments và transactions
    const payments = order.payments || [];
    const transactions = order.transactions || [];
    return (payments.length === 0 && transactions.length === 0);
  };

  /**
   * Lấy icon cho payment method
   */
  const getPaymentIcon = (code) => {
    const iconMap = {
      'COD': 'cash',
      'VNPAY': 'card',
      'MOMO': 'wallet',
      'PAYPAL': 'logo-paypal',
    };
    return iconMap[code?.toUpperCase()] || 'card';
  };

  /**
   * Load payment methods từ API
   * GET /api/v1/payments/methods - Public endpoint, không cần authentication
   */
  const loadPaymentMethods = async () => {
    try {
      setLoadingPaymentMethods(true);
      const apiUrl = getApiUrl(API_ENDPOINTS.GET_PAYMENT_METHODS);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      // Xử lý response theo API spec
      if (result.status === 200 && result.data && Array.isArray(result.data)) {
        // Transform API data to match component structure
        // API đã filter isDeleted: false, nhưng double-check để đảm bảo
        const transformedMethods = result.data
          .filter(method => !method.isDeleted) // Filter out deleted methods
          .map(method => ({
            id: method.code.toLowerCase(), // For UI selection (internal)
            apiId: method.id, // Real ID from API (for request body)
            code: method.code,
            name: method.name,
            icon: getPaymentIcon(method.code),
          }));
        
        if (transformedMethods.length > 0) {
          setPaymentMethods(transformedMethods);
          
          // Set default payment method to first one if available
          if (!selectedPaymentMethod) {
            setSelectedPaymentMethod(transformedMethods[0]);
          }
        } else {
          // Không có payment methods nào khả dụng
          console.warn('[OrderDetail] No active payment methods available');
          setPaymentMethods([]);
        }
      } else if (result.status === 503) {
        // 503 Service Unavailable - Payment service không khả dụng
        console.error('[OrderDetail] Payment service unavailable:', result.message);
        setPaymentMethods([]);
        // Không cần hiển thị alert, modal sẽ hiển thị "Không có phương thức thanh toán khả dụng"
      } else if (result.status === 400) {
        // 400 Bad Request - Lỗi từ server
        console.error('[OrderDetail] Failed to load payment methods:', result.message, result.errors);
        setPaymentMethods([]);
      } else {
        // Lỗi khác không xác định
        console.error('[OrderDetail] Unknown error loading payment methods:', result);
        setPaymentMethods([]);
      }
    } catch (error) {
      // Network error hoặc lỗi khác
      console.error('[OrderDetail] Error loading payment methods:', error);
      setPaymentMethods([]);
    } finally {
      setLoadingPaymentMethods(false);
    }
  };

  /**
   * Xử lý hủy đơn hàng
   * API: POST /api/v1/orders/cancel với orderCode trong body
   */
  const handleCancelOrder = () => {
    // Kiểm tra xem có orderCode không
    if (!order || !order.orderCode) {
      Alert.alert('Lỗi', 'Không tìm thấy mã đơn hàng. Vui lòng thử lại sau.');
      return;
    }

    Alert.alert(
      'Xác nhận hủy đơn hàng',
      'Bạn có chắc chắn muốn hủy đơn hàng này? Đơn hàng đã hủy không thể khôi phục.',
      [
        {
          text: 'Không',
          style: 'cancel',
        },
        {
          text: 'Có, hủy đơn hàng',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              const API_URL = Platform.OS === 'android'
                ? 'http://10.0.2.2:3000'
                : 'http://localhost:3000';

              const token = await getAuthToken();
              
              if (!token) {
                Alert.alert('Lỗi', 'Vui lòng đăng nhập để hủy đơn hàng.');
                setCancelling(false);
                return;
              }

              const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              };

              // Setup timeout 10 seconds
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 10000);

              const cancelApiUrl = `${API_URL}/api/v1/orders/cancel`;
              console.log('[OrderDetail] Cancelling order with orderCode:', order.orderCode);
              console.log('[OrderDetail] Cancel API URL:', cancelApiUrl);

              const response = await fetch(cancelApiUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                  orderCode: order.orderCode,
                }),
                signal: controller.signal,
              });

              clearTimeout(timeoutId);

              const result = await response.json();
              const statusCode = result.statusCode || result.status;

              console.log('[OrderDetail] Cancel order response:', result);

              if (statusCode === 200 || response.ok) {
                // Success
                Alert.alert(
                  'Thành công',
                  'Đơn hàng đã được hủy thành công. Points (nếu có) sẽ được hoàn lại tự động.',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        // Reload order detail
                        loadOrderDetail();
                      },
                    },
                  ]
                );
              } else if (statusCode === 401 || response.status === 401) {
                // Unauthorized
                Alert.alert(
                  'Lỗi xác thực',
                  'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        navigation.navigate('HomeScreen');
                      },
                    },
                  ]
                );
              } else if (statusCode === 400 || response.status === 400) {
                // Bad Request - Order không ở trạng thái PENDING
                Alert.alert(
                  'Không thể hủy',
                  result.message || 'Chỉ có thể hủy đơn hàng ở trạng thái "Chờ xác nhận".',
                  [
                    {
                      text: 'OK',
                    },
                  ]
                );
              } else if (statusCode === 403 || response.status === 403) {
                // Forbidden - Order không thuộc về customer
                Alert.alert(
                  'Không có quyền',
                  result.message || 'Bạn không có quyền hủy đơn hàng này.',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        navigation.goBack();
                      },
                    },
                  ]
                );
              } else if (statusCode === 404 || response.status === 404) {
                // Not Found
                Alert.alert(
                  'Không tìm thấy',
                  result.message || 'Không tìm thấy đơn hàng.',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        loadOrderDetail();
                      },
                    },
                  ]
                );
              } else if (statusCode === 503 || response.status === 503) {
                // Service Unavailable
                Alert.alert(
                  'Dịch vụ tạm thời không khả dụng',
                  result.message || 'Dịch vụ đơn hàng tạm thời không khả dụng. Vui lòng thử lại sau.',
                  [
                    {
                      text: 'OK',
                    },
                  ]
                );
              } else {
                // Other errors
                Alert.alert(
                  'Lỗi',
                  result.message || 'Không thể hủy đơn hàng. Vui lòng thử lại sau.',
                  [
                    {
                      text: 'OK',
                    },
                  ]
                );
              }
            } catch (error) {
              console.error('[OrderDetail] Error cancelling order:', error);
              
              if (error.name === 'AbortError') {
                Alert.alert(
                  'Lỗi',
                  'Yêu cầu đã hết thời gian chờ (10 giây). Vui lòng thử lại.',
                  [
                    {
                      text: 'OK',
                    },
                  ]
                );
              } else {
                Alert.alert(
                  'Lỗi',
                  'Không thể kết nối đến server. Vui lòng kiểm tra kết nối và thử lại.',
                  [
                    {
                      text: 'OK',
                    },
                  ]
                );
              }
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  /**
   * Mở modal chọn phương thức thanh toán
   */
  const handlePayAgain = async () => {
    // Load payment methods nếu chưa có
    if (paymentMethods.length === 0) {
      await loadPaymentMethods();
    }
    // Mở modal (modal sẽ hiển thị loading/empty state nếu cần)
    setShowPaymentModal(true);
  };

  /**
   * Xử lý khi chọn phương thức thanh toán
   */
  const handlePaymentSelect = (method) => {
    setSelectedPaymentMethod(method);
    setShowPaymentModal(false);
    // Tiến hành thanh toán với phương thức đã chọn
    processPaymentWithMethod(method);
  };

  /**
   * Xử lý thanh toán với phương thức đã chọn
   */
  const processPaymentWithMethod = async (method) => {
    setProcessingPayment(true);
    try {
      const API_URL = Platform.OS === 'android'
        ? 'http://10.0.2.2:3000'
        : 'http://localhost:3000';

      const token = await getAuthToken();
      const headers = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Nếu là COD, gọi API để tạo COD payment
      if (method.code === 'COD' || method.id === 'cod') {
        try {
          if (!token) {
            Alert.alert('Lỗi', 'Vui lòng đăng nhập để thanh toán.');
            setProcessingPayment(false);
            return;
          }

          // Setup timeout 10 seconds
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);

          const codApiUrl = `${API_URL}/api/v1/payments/cod`;
          console.log('[OrderDetail] Creating COD payment for orderId:', order.id);
          console.log('[OrderDetail] COD API URL:', codApiUrl);

          const response = await fetch(codApiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
              orderId: order.id,
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          const result = await response.json();
          const statusCode = result.statusCode || result.status;

          console.log('[OrderDetail] COD payment response:', result);

          if (statusCode === 200 || response.ok) {
            // Success
            Alert.alert(
              'Thành công',
              'Thanh toán COD đã được tạo thành công. Bạn sẽ thanh toán khi nhận hàng.',
              [
                {
                  text: 'Xem đơn hàng',
                  onPress: () => {
                    // Reload order detail
                    loadOrderDetail();
                  },
                },
              ]
            );
          } else if (statusCode === 401 || response.status === 401) {
            // Unauthorized
            Alert.alert(
              'Lỗi xác thực',
              'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    // Có thể navigate về login screen
                    navigation.navigate('HomeScreen');
                  },
                },
              ]
            );
          } else if (statusCode === 400 || response.status === 400) {
            // Bad Request - Payment already completed
            Alert.alert(
              'Lỗi',
              result.message || 'Payment đã được hoàn thành. Không thể tạo payment mới.',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    loadOrderDetail();
                  },
                },
              ]
            );
          } else if (statusCode === 403 || response.status === 403) {
            // Forbidden - Order does not belong to customer
            Alert.alert(
              'Lỗi',
              result.message || 'Bạn không có quyền thanh toán đơn hàng này.',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    navigation.goBack();
                  },
                },
              ]
            );
          } else if (statusCode === 404 || response.status === 404) {
            // Not Found
            Alert.alert(
              'Lỗi',
              result.message || 'Không tìm thấy đơn hàng hoặc khách hàng.',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    loadOrderDetail();
                  },
                },
              ]
            );
          } else if (statusCode === 503 || response.status === 503) {
            // Service Unavailable
            Alert.alert(
              'Dịch vụ tạm thời không khả dụng',
              result.message || 'Dịch vụ thanh toán tạm thời không khả dụng. Vui lòng thử lại sau.',
              [
                {
                  text: 'OK',
                },
              ]
            );
          } else {
            // Other errors
            Alert.alert(
              'Lỗi',
              result.message || 'Không thể tạo thanh toán COD. Vui lòng thử lại sau.',
              [
                {
                  text: 'OK',
                },
              ]
            );
          }
        } catch (error) {
          console.error('[OrderDetail] Error creating COD payment:', error);
          
          if (error.name === 'AbortError') {
            Alert.alert(
              'Lỗi',
              'Yêu cầu đã hết thời gian chờ (10 giây). Vui lòng thử lại.',
              [
                {
                  text: 'OK',
                },
              ]
            );
          } else {
            Alert.alert(
              'Lỗi',
              'Không thể kết nối đến server. Vui lòng kiểm tra kết nối và thử lại.',
              [
                {
                  text: 'OK',
                },
              ]
            );
          }
        } finally {
          setProcessingPayment(false);
        }
        return;
      }

      // Với các phương thức thanh toán online (VNPay, MoMo, etc.)
      // Gọi API để tạo payment URL
      const response = await fetch(`${API_URL}/api/v1/payments/vnpay/mobile/create`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          orderId: order.id,
          paymentMethodId: method.apiId || method.id,
        }),
      });

      const result = await response.json();
      const statusCode = result.statusCode || result.status;

      if ((statusCode === 200 || response.ok) && result.data?.paymentUrl) {
        const paymentUrl = result.data.paymentUrl;
        
        // Navigate đến WebView screen để thanh toán
        navigation.navigate('VNPayPaymentScreen', {
          paymentUrl: paymentUrl,
          orderId: order.id,
        });
      } else {
        Alert.alert(
          'Lỗi',
          result.message || 'Không thể tạo URL thanh toán. Vui lòng thử lại sau.'
        );
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      Alert.alert('Lỗi', 'Không thể kết nối đến server. Vui lòng thử lại sau.');
    } finally {
      setProcessingPayment(false);
    }
  };

  /**
   * Load chi tiết đơn hàng từ API
   * Sử dụng endpoint GET /v1/orders/{orderId}
   */
  const loadOrderDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const API_URL = Platform.OS === 'android'
        ? 'http://10.0.2.2:3000'
        : 'http://localhost:3000';

      let orderIdToUse = orderId;
      
      if (!orderIdToUse && orderCode) {
        setError('Vui lòng sử dụng ID đơn hàng để xem chi tiết');
        setLoading(false);
        return;
      }

      if (!orderIdToUse) {
        setError('Mã đơn hàng không hợp lệ');
        setLoading(false);
        return;
      }

      const apiUrl = `${API_URL}/api/v1/orders/${orderIdToUse}`;
      const token = await getAuthToken();
      const headers = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: headers,
      });

      const result = await response.json();

      if (result.status === 200 && result.data) {
        setOrder(result.data);
        const names = await getLocationNames(result.data);
        setLocationNames(names);
      } else if (result.status === 404) {
        setError('Không tìm thấy đơn hàng');
      } else if (result.status === 503) {
        setError('Dịch vụ đơn hàng tạm thời không khả dụng');
      } else {
        setError(result.message || 'Có lỗi xảy ra khi tải chi tiết đơn hàng');
      }
    } catch (error) {
      console.error('Error loading order detail:', error);
      setError('Không thể kết nối đến server. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  }, [orderCode, orderId]);

  /**
   * Load chi tiết đơn hàng từ API
   * Sử dụng endpoint GET /v1/orders/{orderId}
   */
  useEffect(() => {
    if (orderIdentifier) {
      loadOrderDetail();
    } else {
      setError('Mã đơn hàng không hợp lệ');
      setLoading(false);
    }
  }, [orderIdentifier, loadOrderDetail]);

  const renderContent = () => {
    if (loading) {
      return (
        <View style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator size="large" color="#e7474a" />
          <Text style={tw`text-gray-600 text-base mt-4`}>
            Đang tải chi tiết đơn hàng...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={tw`flex-1 items-center justify-center px-4`}>
          <Icon
            type="ionicon"
            name="alert-circle-outline"
            size={64}
            color="#ef4444"
            style={tw`mb-4`}
          />
          <Text style={tw`text-xl font-semibold text-gray-700 mb-2 text-center`}>
            {error}
          </Text>
          <Text style={tw`text-sm text-gray-500 text-center`}>
            Mã đơn hàng: {orderIdentifier}
          </Text>
        </View>
      );
    }

    if (!order) {
      return (
        <View style={tw`flex-1 items-center justify-center px-4`}>
          <Text style={tw`text-xl font-semibold text-gray-700 mb-2`}>
            Không có dữ liệu đơn hàng
          </Text>
        </View>
      );
    }

    return (
      <ScrollView
        style={tw`flex-1`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`pb-6`}>
        {/* Header Card */}
        <View style={tw`bg-white mx-4 my-4 rounded-lg shadow-sm border border-gray-200 p-4`}>
          <View style={tw`flex-row justify-between items-center mb-3`}>
            <View>
              <Text style={tw`text-gray-500 text-xs mb-1`}>Mã đơn hàng</Text>
              <Text style={tw`text-xl font-bold text-gray-900`}>
                #{order.orderCode}
              </Text>
            </View>
            <View
              style={[
                tw`px-3 py-2 rounded-full`,
                {backgroundColor: `${getStatusColor(order.status)}20`},
              ]}>
              <Text
                style={[
                  tw`text-xs font-semibold uppercase`,
                  {color: getStatusColor(order.status)},
                ]}>
                {mapStatusToVietnamese(order.status)}
              </Text>
            </View>
          </View>

          <View style={tw`flex-row items-center mb-2`}>
            <Icon
              type="ionicon"
              name="calendar-outline"
              size={16}
              color="#6b7280"
              style={tw`mr-2`}
            />
            <Text style={tw`text-gray-600 text-sm`}>
              Ngày đặt: {formatDate(order.orderDate)}
            </Text>
          </View>
        </View>

        {/* Danh sách sản phẩm */}
        {order.items && order.items.length > 0 && (
          <View style={tw`bg-white mx-4 my-2 rounded-lg shadow-sm border border-gray-200 p-4`}>
            <Text style={tw`text-lg font-bold text-gray-900 mb-4`}>
              Sản phẩm ({order.items.length})
            </Text>
            {order.items.map((item, index) => (
              <View
                key={item.id || index}
                style={[
                  tw`flex-row mb-4 pb-4`,
                  index < order.items.length - 1 && tw`border-b border-gray-200`,
                ]}>
                {/* Hình ảnh sản phẩm */}
                <Image
                  source={{
                    uri: item.variant?.imageUrl || 'https://via.placeholder.com/100',
                  }}
                  style={tw`w-20 h-20 rounded-lg bg-gray-100`}
                  resizeMode="cover"
                />
                
                {/* Thông tin sản phẩm */}
                <View style={tw`flex-1 ml-3`}>
                  <Text style={tw`text-base font-semibold text-gray-900 mb-1`} numberOfLines={2}>
                    {item.variant?.name || 'N/A'}
                  </Text>
                  <Text style={tw`text-sm text-gray-600 mb-1`}>
                    {item.variant?.variantName || ''}
                  </Text>
                  {item.variant?.color && (
                    <View style={tw`flex-row items-center mb-2`}>
                      <View
                        style={[
                          tw`w-4 h-4 rounded-full mr-2 border border-gray-300`,
                          {backgroundColor: item.variant.color.toLowerCase()},
                        ]}
                      />
                      <Text style={tw`text-sm text-gray-600`}>
                        Màu: {item.variant.color}
                      </Text>
                    </View>
                  )}
                  <View style={tw`flex-row justify-between items-center`}>
                    <Text style={tw`text-sm text-gray-500`}>
                      Số lượng: {item.quantity}
                    </Text>
                    <View style={tw`flex-row items-center`}>
                      {item.discount && item.discount < item.price && (
                        <Text style={tw`text-sm text-gray-400 line-through mr-2`}>
                          {formatCurrency(item.price)}
                        </Text>
                      )}
                      <Text style={tw`text-base font-semibold text-red-600`}>
                        {formatCurrency(item.discount || item.price)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Thông tin người nhận */}
        <View style={tw`bg-white mx-4 my-2 rounded-lg shadow-sm border border-gray-200 p-4`}>
          <Text style={tw`text-lg font-bold text-gray-900 mb-4`}>
            Thông tin người nhận
          </Text>
          <View style={tw`mb-3`}>
            <Text style={tw`text-gray-500 text-xs mb-1`}>Họ và tên</Text>
            <Text style={tw`text-base text-gray-900 font-medium`}>
              {order.recipientName || 'N/A'}
            </Text>
          </View>
          <View style={tw`mb-3`}>
            <Text style={tw`text-gray-500 text-xs mb-1`}>Số điện thoại</Text>
            <Text style={tw`text-base text-gray-900 font-medium`}>
              {order.recipientPhone || 'N/A'}
            </Text>
          </View>
          <View>
            <Text style={tw`text-gray-500 text-xs mb-1`}>Địa chỉ</Text>
            <Text style={tw`text-base text-gray-900 font-medium`}>
              {order.street || 'N/A'}
              {locationNames.communeName ? `, ${locationNames.communeName}` : ''}
              {locationNames.provinceName ? `, ${locationNames.provinceName}` : ''}
            </Text>
          </View>
        </View>

        {/* Thông tin thanh toán */}
        <View style={tw`bg-white mx-4 my-2 rounded-lg shadow-sm border border-gray-200 p-4`}>
          <Text style={tw`text-lg font-bold text-gray-900 mb-4`}>
            Thông tin thanh toán
          </Text>
          <View style={tw`flex-row justify-between items-center mb-3`}>
            <Text style={tw`text-gray-600 text-base`}>Tổng tiền hàng</Text>
            <Text style={tw`text-base text-gray-900 font-medium`}>
              {formatCurrency(order.totalAmount)}
            </Text>
          </View>
          {order.discountAmount > 0 && (
            <View style={tw`flex-row justify-between items-center mb-3`}>
              <Text style={tw`text-gray-600 text-base`}>Giảm giá</Text>
              <Text style={tw`text-base text-green-600 font-medium`}>
                -{formatCurrency(order.discountAmount)}
              </Text>
            </View>
          )}
          <View style={tw`flex-row justify-between items-center mb-3`}>
            <Text style={tw`text-gray-600 text-base`}>Phí vận chuyển</Text>
            <Text style={tw`text-base text-gray-900 font-medium`}>
              {formatCurrency(order.shippingFee)}
            </Text>
          </View>
          <View style={tw`h-px bg-gray-200 my-3`} />
          <View style={tw`flex-row justify-between items-center`}>
            <Text style={tw`text-lg font-bold text-gray-900`}>
              Tổng thanh toán
            </Text>
            <Text style={tw`text-xl font-bold text-red-600`}>
              {formatCurrency(order.finalAmount)}
            </Text>
          </View>
        </View>

        {/* Thông tin bổ sung */}
        {(order.createdAt || order.updatedAt) && (
          <View style={tw`bg-white mx-4 my-2 rounded-lg shadow-sm border border-gray-200 p-4`}>
            <Text style={tw`text-lg font-bold text-gray-900 mb-4`}>
              Thông tin bổ sung
            </Text>
            {order.createdAt && (
              <View style={tw`mb-3`}>
                <Text style={tw`text-gray-500 text-xs mb-1`}>Ngày tạo</Text>
                <Text style={tw`text-base text-gray-900 font-medium`}>
                  {formatDate(order.createdAt)}
                </Text>
              </View>
            )}
            {order.updatedAt && (
              <View>
                <Text style={tw`text-gray-500 text-xs mb-1`}>Ngày cập nhật</Text>
                <Text style={tw`text-base text-gray-900 font-medium`}>
                  {formatDate(order.updatedAt)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Action Buttons */}
        {order && (
          <View style={tw`mx-4 my-4`}>
            {/* Nút Huỷ đơn hàng - chỉ hiển thị nếu status là pending */}
            {order.status === 'pending' && (
              <TouchableOpacity
                onPress={handleCancelOrder}
                disabled={cancelling}
                style={[
                  tw`flex-row items-center justify-center py-4 rounded-lg border mb-3`,
                  {borderColor: '#ef4444', backgroundColor: '#fff'},
                  cancelling && tw`opacity-50`,
                ]}>
                {cancelling ? (
                  <ActivityIndicator size="small" color="#ef4444" />
                ) : (
                  <>
                    <Icon
                      type="ionicon"
                      name="close-circle-outline"
                      size={20}
                      color="#ef4444"
                      style={tw`mr-2`}
                    />
                    <Text style={[tw`text-base font-semibold`, {color: '#ef4444'}]}>
                      Huỷ đơn hàng
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* Nút Thanh toán lại - chỉ hiển thị nếu payments rỗng */}
            {hasEmptyPayments() && (
              <TouchableOpacity
                onPress={handlePayAgain}
                disabled={processingPayment}
                style={[
                  tw`flex-row items-center justify-center py-4 rounded-lg`,
                  {backgroundColor: '#e7474a'},
                  processingPayment && tw`opacity-50`,
                ]}>
                {processingPayment ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Icon
                      type="ionicon"
                      name="card-outline"
                      size={20}
                      color="#fff"
                      style={tw`mr-2`}
                    />
                    <Text style={tw`text-base font-semibold text-white`}>
                      Thanh toán lại
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={tw`flex-1`} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={tw`flex-1 bg-white`}>
        {/* Custom Header với nút back */}
        <View
          style={tw`flex-row items-center justify-between px-4 py-3 border-b border-gray-200 bg-white`}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={tw`p-2 -ml-2`}>
            <Icon
              type="ionicon"
              name="arrow-back"
              size={28}
              color="#374151"
            />
          </TouchableOpacity>
          <Text style={tw`text-lg font-bold text-gray-900`}>
            Chi tiết đơn hàng
          </Text>
          <View style={tw`w-10`} />
        </View>

        {/* Content */}
        {renderContent()}
      </View>

      {/* Payment Method Selection Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={tw`flex-1 bg-black bg-opacity-50 justify-end`}>
          <View style={tw`bg-white rounded-t-3xl max-h-96`}>
            <View style={tw`p-4 border-b border-gray-200 flex-row justify-between items-center`}>
              <Text style={tw`text-lg font-bold text-gray-800`}>Chọn phương thức thanh toán</Text>
              <Pressable onPress={() => setShowPaymentModal(false)}>
                <Icon name="close" type="ionicon" size={24} color="#666" />
              </Pressable>
            </View>
            <ScrollView style={tw`max-h-80`}>
              {loadingPaymentMethods ? (
                <View style={tw`p-8 items-center`}>
                  <ActivityIndicator size="large" color="#2563eb" />
                  <Text style={tw`text-gray-600 mt-2`}>Đang tải...</Text>
                </View>
              ) : paymentMethods.length === 0 ? (
                <View style={tw`p-8 items-center`}>
                  <Text style={tw`text-gray-500`}>Không có phương thức thanh toán khả dụng</Text>
                </View>
              ) : (
                paymentMethods.map((method) => (
                  <Pressable
                    key={method.id}
                    style={tw`p-4 border-b border-gray-100 flex-row items-center ${selectedPaymentMethod?.id === method.id ? 'bg-blue-50' : ''}`}
                    onPress={() => handlePaymentSelect(method)}
                  >
                    <Icon
                      name={method.icon}
                      type="ionicon"
                      size={24}
                      color={selectedPaymentMethod?.id === method.id ? '#2563eb' : '#666'}
                      style={tw`mr-3`}
                    />
                    <Text style={tw`text-gray-800 flex-1 ${selectedPaymentMethod?.id === method.id ? 'font-bold' : ''}`}>
                      {method.name}
                    </Text>
                    {selectedPaymentMethod?.id === method.id && (
                      <Icon name="checkmark-circle" type="ionicon" size={24} color="#2563eb" />
                    )}
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default OrderDetail;

