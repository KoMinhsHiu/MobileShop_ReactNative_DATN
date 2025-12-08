import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
  Platform,
  Alert,
  Modal,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import React, {useEffect, useState, useMemo} from 'react';
import Wrapper from '../components/Wrapper/Wrapper';
import {useDispatch, useSelector} from 'react-redux';
import {selectOrders, setOrders} from '../store/slices/siteSlice';
import tw from 'tailwind-react-native-classnames';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {mockOrdersData} from '../data/mockData';
import {Icon} from 'react-native-elements';
import {getAuthToken} from '../utils/auth';
import {API_ENDPOINTS, getApiUrl} from '../config/api';

const Orders = ({navigation}) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const orders = useSelector(selectOrders);
  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  const [processingPaymentOrderId, setProcessingPaymentOrderId] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);

  // Format ngày tháng
  const formatDate = (dateString) => {
    try {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.warn('[Orders] Invalid date string:', dateString);
        return 'N/A';
      }
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (error) {
      console.error('[Orders] Error formatting date:', dateString, error);
      return 'N/A';
    }
  };

  // Lấy màu theo trạng thái
  const getStatusColor = (status) => {
    switch (status) {
      case 'đã giao':
      case 'delivered':
        return '#10b981'; // green
      case 'đang giao':
      case 'shipping':
        return '#3b82f6'; // blue
      case 'chờ xác nhận':
      case 'pending':
        return '#f59e0b'; // yellow
      case 'đã hủy':
      case 'cancelled':
        return '#ef4444'; // red
      case 'confirmed':
        return '#3b82f6'; // blue
      case 'processing':
        return '#8b5cf6'; // purple
      default:
        return '#6b7280'; // gray
    }
  };

  // Map status từ API sang tiếng Việt
  const mapStatusToVietnamese = (status) => {
    const statusMap = {
      pending: 'chờ xác nhận',
      confirmed: 'đã xác nhận',
      processing: 'đang xử lý',
      shipping: 'đang giao',
      delivered: 'đã giao',
      cancelled: 'đã hủy',
    };
    return statusMap[status] || status;
  };

  /**
   * Kiểm tra xem đơn hàng có payments rỗng không
   */
  const hasEmptyPayments = (order) => {
    if (!order) return false;
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

      if (result.status === 200 && result.data && Array.isArray(result.data)) {
        const transformedMethods = result.data
          .filter(method => !method.isDeleted)
          .map(method => ({
            id: method.code.toLowerCase(),
            apiId: method.id,
            code: method.code,
            name: method.name,
            icon: getPaymentIcon(method.code),
          }));
        
        if (transformedMethods.length > 0) {
          setPaymentMethods(transformedMethods);
          if (!selectedPaymentMethod) {
            setSelectedPaymentMethod(transformedMethods[0]);
          }
        } else {
          setPaymentMethods([]);
        }
      } else {
        setPaymentMethods([]);
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
      setPaymentMethods([]);
    } finally {
      setLoadingPaymentMethods(false);
    }
  };

  /**
   * Xử lý hủy đơn hàng
   */
  const handleCancelOrder = (order) => {
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
            setCancellingOrderId(order.id);
            try {
              const API_URL = Platform.OS === 'android'
                ? 'http://10.0.2.2:3000'
                : 'http://localhost:3000';

              const token = await getAuthToken();
              
              if (!token) {
                Alert.alert('Lỗi', 'Vui lòng đăng nhập để hủy đơn hàng.');
                setCancellingOrderId(null);
                return;
              }

              const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              };

              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 10000);

              const cancelApiUrl = `${API_URL}/api/v1/orders/cancel`;
              
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

              if (statusCode === 200 || response.ok) {
                Alert.alert(
                  'Thành công',
                  'Đơn hàng đã được hủy thành công. Points (nếu có) sẽ được hoàn lại tự động.',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        // Reload orders list
                        loadOrders();
                      },
                    },
                  ]
                );
              } else if (statusCode === 401 || response.status === 401) {
                Alert.alert('Lỗi xác thực', 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
              } else if (statusCode === 400 || response.status === 400) {
                Alert.alert('Không thể hủy', result.message || 'Chỉ có thể hủy đơn hàng ở trạng thái "Chờ xác nhận".');
              } else if (statusCode === 403 || response.status === 403) {
                Alert.alert('Không có quyền', result.message || 'Bạn không có quyền hủy đơn hàng này.');
              } else if (statusCode === 404 || response.status === 404) {
                Alert.alert('Không tìm thấy', result.message || 'Không tìm thấy đơn hàng.');
              } else if (statusCode === 503 || response.status === 503) {
                Alert.alert('Dịch vụ tạm thời không khả dụng', result.message || 'Dịch vụ đơn hàng tạm thời không khả dụng. Vui lòng thử lại sau.');
              } else {
                Alert.alert('Lỗi', result.message || 'Không thể hủy đơn hàng. Vui lòng thử lại sau.');
              }
            } catch (error) {
              console.error('Error cancelling order:', error);
              if (error.name === 'AbortError') {
                Alert.alert('Lỗi', 'Yêu cầu đã hết thời gian chờ (10 giây). Vui lòng thử lại.');
              } else {
                Alert.alert('Lỗi', 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối và thử lại.');
              }
            } finally {
              setCancellingOrderId(null);
            }
          },
        },
      ]
    );
  };

  /**
   * Mở modal chọn phương thức thanh toán
   */
  const handlePayAgain = async (order) => {
    setSelectedOrderForPayment(order);
    if (paymentMethods.length === 0) {
      await loadPaymentMethods();
    }
    setShowPaymentModal(true);
  };

  /**
   * Xử lý khi chọn phương thức thanh toán
   */
  const handlePaymentSelect = (method) => {
    setSelectedPaymentMethod(method);
    setShowPaymentModal(false);
    processPaymentWithMethod(selectedOrderForPayment, method);
  };

  /**
   * Xử lý thanh toán với phương thức đã chọn
   */
  const processPaymentWithMethod = async (order, method) => {
    setProcessingPaymentOrderId(order.id);
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

      // Nếu là COD
      if (method.code === 'COD' || method.id === 'cod') {
        try {
          if (!token) {
            Alert.alert('Lỗi', 'Vui lòng đăng nhập để thanh toán.');
            setProcessingPaymentOrderId(null);
            return;
          }

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);

          const codApiUrl = `${API_URL}/api/v1/payments/cod`;
          
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

          if (statusCode === 200 || response.ok) {
            Alert.alert(
              'Thành công',
              'Thanh toán COD đã được tạo thành công. Bạn sẽ thanh toán khi nhận hàng.',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    loadOrders();
                  },
                },
              ]
            );
          } else {
            Alert.alert('Lỗi', result.message || 'Không thể tạo thanh toán COD. Vui lòng thử lại sau.');
          }
        } catch (error) {
          if (error.name === 'AbortError') {
            Alert.alert('Lỗi', 'Yêu cầu đã hết thời gian chờ (10 giây). Vui lòng thử lại.');
          } else {
            Alert.alert('Lỗi', 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối và thử lại.');
          }
        } finally {
          setProcessingPaymentOrderId(null);
        }
        return;
      }

      // Với các phương thức thanh toán online (VNPay, MoMo, etc.)
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
        navigation.navigate('VNPayPaymentScreen', {
          paymentUrl: paymentUrl,
          orderId: order.id,
        });
      } else {
        Alert.alert('Lỗi', result.message || 'Không thể tạo URL thanh toán. Vui lòng thử lại sau.');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      Alert.alert('Lỗi', 'Không thể kết nối đến server. Vui lòng thử lại sau.');
    } finally {
      setProcessingPaymentOrderId(null);
    }
  };

  /**
   * Reload orders list
   */
  const loadOrders = React.useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      // Lấy token từ AsyncStorage
      const token = await getAuthToken();
      
      if (!token) {
        // Nếu không có token, hiển thị mảng rỗng
        dispatch(setOrders([]));
        if (isRefresh) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
        return;
      }

      // Xác định API base URL
      const API_BASE_URL = Platform.OS === 'android' 
        ? 'http://10.0.2.2:3000'
        : 'http://localhost:3000';

      // Gọi API để lấy danh sách đơn hàng
      console.log('[Orders] Loading orders from API:', `${API_BASE_URL}/api/v1/orders/me`);
      const response = await fetch(`${API_BASE_URL}/api/v1/orders/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('[Orders] API Response status:', response.status);
      const result = await response.json();
      console.log('[Orders] API Response:', JSON.stringify(result, null, 2));
      console.log('[Orders] Result status:', result.status);
      console.log('[Orders] Result data type:', typeof result.data);
      console.log('[Orders] Result data is array:', Array.isArray(result.data));
      console.log('[Orders] Result data length:', Array.isArray(result.data) ? result.data.length : 'N/A');

      // Xử lý kết quả
      if (result.status === 200 && result.data) {
        // Đảm bảo result.data là array
        const ordersData = Array.isArray(result.data) ? result.data : [];
        console.log('[Orders] Processing orders data, count:', ordersData.length);
        
        // Transform dữ liệu từ API về format mà component đang sử dụng
        const transformedOrders = ordersData
          .map((order, index) => {
            try {
              const transformed = {
                id: order.id,
                orderId: order.orderCode || order.id,
                orderCode: order.orderCode, // Thêm orderCode để dùng cho navigation
                date: order.orderDate,
                total: order.finalAmount || 0, // Giữ nguyên số tiền VND từ API
                status: mapStatusToVietnamese(order.status),
                originalStatus: order.status,
                recipientName: order.recipientName || '',
                recipientPhone: order.recipientPhone || '',
                address: `${order.street || ''}, ${order.commune?.name || ''}, ${order.province?.name || ''}`,
                items: order.items || [],
                statusHistory: order.statusHistory || [],
                transactions: order.transactions || [],
                shipments: order.shipments || [],
                payments: order.payments || [],
              };
              
              if (index < 3) {
                console.log(`[Orders] Transformed order ${index + 1}:`, JSON.stringify(transformed, null, 2));
              }
              
              return transformed;
            } catch (error) {
              console.error(`[Orders] Error transforming order ${order.id || index}:`, error);
              console.error(`[Orders] Problematic order data:`, JSON.stringify(order, null, 2));
              // Trả về null để filter ra sau
              return null;
            }
          })
          .filter(order => order !== null); // Loại bỏ các orders bị lỗi khi transform
        
        console.log('[Orders] Total transformed orders:', transformedOrders.length);
        console.log('[Orders] Dispatching orders to Redux...');

        dispatch(setOrders(transformedOrders));
        console.log('[Orders] Orders dispatched successfully. Redux orders count:', transformedOrders.length);
      } else if (result.status === 503) {
        // Service unavailable - hiển thị mảng rỗng
        console.warn('[Orders] Order service is temporary unavailable');
        dispatch(setOrders([]));
      } else {
        // Lỗi khác - hiển thị mảng rỗng
        console.error('[Orders] Error fetching orders. Status:', result.status, 'Message:', result.message);
        console.error('[Orders] Full error response:', JSON.stringify(result, null, 2));
        dispatch(setOrders([]));
      }
    } catch (error) {
      // Nếu có lỗi network hoặc lỗi khác, hiển thị mảng rỗng
      console.error('Error loading orders:', error);
      dispatch(setOrders([]));
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [dispatch]);

  /**
   * Handle pull-to-refresh
   */
  const onRefresh = React.useCallback(() => {
    loadOrders(true);
  }, [loadOrders]);

  // Load dữ liệu đơn hàng từ API khi component mount
  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Auto reload khi màn hình được focus lại (khi quay về từ màn hình khác)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('[Orders] Screen focused, reloading orders...');
      loadOrders();
    });

    return unsubscribe;
  }, [navigation, loadOrders]);

  /**
   * Handle view order detail
   * API mới chỉ hỗ trợ orderId, không hỗ trợ orderCode
   */
  const handleViewDetail = (order) => {
    /**
     * Lấy orderId từ order (ưu tiên orderId, sau đó id)
     */
    const orderId = order.id || order.orderId;
    
    if (orderId) {
      /**
       * Navigate đến màn hình chi tiết đơn hàng với orderId
       */
      navigation.navigate('OrderDetailScreen', { orderId: orderId });
    } else {
      console.error('Order ID not found:', order);
      Alert.alert('Lỗi', 'Không tìm thấy ID đơn hàng');
    }
  };

  // Sắp xếp đơn hàng theo thứ tự mới nhất lên trên
  const sortedOrders = useMemo(() => {
    console.log('[Orders] Sorting orders. Current orders count:', orders?.length || 0);
    if (!orders || orders.length === 0) {
      console.log('[Orders] No orders to sort');
      return [];
    }
    
    // Filter out any invalid orders trước khi sort
    const validOrders = orders.filter(order => {
      if (!order || !order.id) {
        console.warn('[Orders] Invalid order found:', order);
        return false;
      }
      return true;
    });
    
    console.log('[Orders] Valid orders count after filtering:', validOrders.length);
    
    const sorted = [...validOrders].sort((a, b) => {
      // Ưu tiên sắp xếp theo ID giảm dần (id lớn hơn = mới hơn)
      const idA = a.id || 0;
      const idB = b.id || 0;
      
      // Nếu có ID, sắp xếp theo ID giảm dần
      if (idA !== idB) {
        return idB - idA; // ID lớn hơn (mới hơn) lên trên
      }
      
      // Nếu ID bằng nhau, mới sắp xếp theo ngày
      const dateA = new Date(a.date || a.orderDate || 0);
      const dateB = new Date(b.date || b.orderDate || 0);
      
      // Nếu một trong hai không có date hợp lệ
      if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) {
        return 0; // Giữ nguyên thứ tự
      }
      
      if (isNaN(dateA.getTime())) return 1; // a lên sau
      if (isNaN(dateB.getTime())) return -1; // b lên sau
      
      // Sắp xếp theo ngày giảm dần
      return dateB.getTime() - dateA.getTime();
    });
    
    console.log('[Orders] Sorted orders count:', sorted.length);
    if (sorted.length > 0) {
      console.log('[Orders] First sorted order:', sorted[0].orderCode || sorted[0].id);
      console.log('[Orders] Last sorted order:', sorted[sorted.length - 1].orderCode || sorted[sorted.length - 1].id);
    }
    return sorted;
  }, [orders]);
  
  // Debug: Log orders từ Redux
  useEffect(() => {
    console.log('[Orders] Redux orders updated. Count:', orders?.length || 0);
    if (orders && orders.length > 0) {
      console.log('[Orders] First order sample:', JSON.stringify(orders[0], null, 2));
    }
  }, [orders]);

  return (
    <Wrapper header={false}>
      {loading ? (
        <View style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator size="large" color="#e7474a" />
          <Text style={tw`text-gray-600 text-base mt-4`}>
            Đang tải đơn hàng...
          </Text>
        </View>
      ) : sortedOrders && sortedOrders.length > 0 ? (
        <ScrollView
          style={tw`flex-1`}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#e7474a']} // Android
              tintColor="#e7474a" // iOS
            />
          }>
          {sortedOrders.map((order, index) => (
            <Pressable
              key={order.id || index}
              android_ripple={{color: '#f3f4f6'}}
              style={tw`bg-white mx-4 my-2 rounded-lg shadow-sm border border-gray-200`}
              onPress={() => handleViewDetail(order)}>
              <View style={tw`p-4`}>
                {/* Header: Mã đơn hàng và Ngày */}
                <View style={tw`flex-row justify-between items-center mb-3`}>
                  <View>
                    <Text style={tw`text-gray-500 text-xs mb-1`}>Mã đơn hàng</Text>
                    <Text style={tw`text-lg font-bold text-gray-900`}>
                      #{order.orderId || order.id}
                    </Text>
                  </View>
                  <View style={tw`items-end`}>
                    <Text style={tw`text-gray-500 text-xs mb-1`}>Ngày đặt</Text>
                    <Text style={tw`text-sm font-medium text-gray-700`}>
                      {formatDate(order.date)}
                    </Text>
                  </View>
                </View>

                {/* Divider */}
                <View style={tw`h-px bg-gray-200 my-3`} />

                {/* Tổng tiền */}
                <View style={tw`flex-row justify-between items-center mb-3`}>
                  <Text style={tw`text-gray-600 text-sm`}>Tổng tiền</Text>
                  <Text style={tw`text-lg font-bold text-gray-900`}>
                    {(order.total || 0).toLocaleString('vi-VN')} ₫
                  </Text>
                </View>

                {/* Trạng thái */}
                <View style={tw`flex-row justify-between items-center mb-4`}>
                  <Text style={tw`text-gray-600 text-sm`}>Trạng thái</Text>
                  <View
                    style={[
                      tw`px-3 py-1 rounded-full`,
                      {backgroundColor: `${getStatusColor(order.status)}20`},
                    ]}>
                    <Text
                      style={[
                        tw`text-xs font-semibold uppercase`,
                        {color: getStatusColor(order.status)},
                      ]}>
                      {order.status}
                    </Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={tw`mt-2`}>
                  {/* Nút Huỷ đơn hàng - chỉ hiển thị nếu status là pending */}
                  {order.originalStatus === 'pending' && (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        handleCancelOrder(order);
                      }}
                      disabled={cancellingOrderId === order.id}
                      style={[
                        tw`flex-row items-center justify-center py-3 rounded-lg border mb-2`,
                        {borderColor: '#ef4444', backgroundColor: '#fff'},
                        cancellingOrderId === order.id && tw`opacity-50`,
                      ]}>
                      {cancellingOrderId === order.id ? (
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
                  {hasEmptyPayments(order) && (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        handlePayAgain(order);
                      }}
                      disabled={processingPaymentOrderId === order.id}
                      style={[
                        tw`flex-row items-center justify-center py-3 rounded-lg mb-2`,
                        {backgroundColor: '#e7474a'},
                        processingPaymentOrderId === order.id && tw`opacity-50`,
                      ]}>
                      {processingPaymentOrderId === order.id ? (
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

                  {/* Nút Xem chi tiết */}
                  <Pressable
                    android_ripple={{color: '#e7474a20'}}
                    style={[
                      tw`flex-row items-center justify-center py-3 rounded-lg border`,
                      {borderColor: '#e7474a', backgroundColor: '#fff'},
                    ]}
                    onPress={() => handleViewDetail(order)}>
                    <Text style={[tw`text-base font-semibold mr-2`, {color: '#e7474a'}]}>
                      Xem chi tiết
                    </Text>
                    <Icon
                      type="ionicon"
                      name="chevron-forward"
                      size={18}
                      color="#e7474a"
                    />
                  </Pressable>
                </View>
              </View>
            </Pressable>
              ))}
        </ScrollView>
      ) : (
        <View style={tw`flex-1 items-center justify-center px-4`}>
          <Icon
            type="ionicon"
            name="receipt-outline"
            size={64}
            color="#9ca3af"
            style={tw`mb-4`}
          />
          <Text style={tw`text-xl font-semibold text-gray-700 mb-2`}>
            Chưa có đơn hàng nào
          </Text>
          <Text style={tw`text-sm text-gray-500 text-center`}>
            Bạn chưa có đơn hàng nào. Hãy đặt hàng ngay!
          </Text>
        </View>
      )}

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
    </Wrapper>
  );
};

export default Orders;

