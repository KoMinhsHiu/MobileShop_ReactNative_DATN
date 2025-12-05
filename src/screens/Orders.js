import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
  Platform,
  Alert,
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

const Orders = ({navigation}) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const orders = useSelector(selectOrders);

  // Format ngày tháng
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
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

  // Load dữ liệu đơn hàng từ API
  useEffect(() => {
    const loadOrders = async () => {
      setLoading(true);
      try {
        // Lấy token từ AsyncStorage
        const token = await getAuthToken();
        
        if (!token) {
          // Nếu không có token, hiển thị mảng rỗng
          dispatch(setOrders([]));
          setLoading(false);
          return;
        }

        // Xác định API base URL
        const API_BASE_URL = Platform.OS === 'android' 
          ? 'http://10.0.2.2:3000'
          : 'http://localhost:3000';

        // Gọi API để lấy danh sách đơn hàng
        const response = await fetch(`${API_BASE_URL}/api/v1/orders/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        const result = await response.json();

        // Xử lý kết quả
        if (result.status === 200 && result.data) {
          // Transform dữ liệu từ API về format mà component đang sử dụng
          const transformedOrders = result.data.map((order) => ({
            id: order.id,
            orderId: order.orderCode || order.id,
            orderCode: order.orderCode, // Thêm orderCode để dùng cho navigation
            date: order.orderDate,
            total: order.finalAmount, // Giữ nguyên số tiền VND từ API
            status: mapStatusToVietnamese(order.status),
            originalStatus: order.status,
            recipientName: order.recipientName,
            recipientPhone: order.recipientPhone,
            address: `${order.street}, ${order.commune?.name || ''}, ${order.province?.name || ''}`,
            items: order.items || [],
            statusHistory: order.statusHistory || [],
            transactions: order.transactions || [],
            shipments: order.shipments || [],
          }));

          dispatch(setOrders(transformedOrders));
        } else if (result.status === 503) {
          // Service unavailable - hiển thị mảng rỗng
          console.warn('Order service is temporary unavailable');
          dispatch(setOrders([]));
        } else {
          // Lỗi khác - hiển thị mảng rỗng
          console.error('Error fetching orders:', result.message);
          dispatch(setOrders([]));
        }
      } catch (error) {
        // Nếu có lỗi network hoặc lỗi khác, hiển thị mảng rỗng
        console.error('Error loading orders:', error);
        dispatch(setOrders([]));
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, []);

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
    if (!orders || orders.length === 0) return [];
    
    return [...orders].sort((a, b) => {
      // So sánh theo orderDate (mới nhất lên trên)
      const dateA = new Date(a.date || a.orderDate || 0);
      const dateB = new Date(b.date || b.orderDate || 0);
      
      // Nếu không có date, so sánh theo id (id lớn hơn = mới hơn)
      if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) {
        return (b.id || 0) - (a.id || 0);
      }
      
      // Nếu một trong hai không có date hợp lệ
      if (isNaN(dateA.getTime())) return 1; // a lên sau
      if (isNaN(dateB.getTime())) return -1; // b lên sau
      
      // Sắp xếp mới nhất lên trên (dateB - dateA)
      return dateB.getTime() - dateA.getTime();
    });
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
        <ScrollView style={tw`flex-1`} showsVerticalScrollIndicator={false}>
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
                    {order.total.toLocaleString('vi-VN')} ₫
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
    </Wrapper>
  );
};

export default Orders;

