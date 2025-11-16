import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
  Alert,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import React, {useEffect, useState} from 'react';
import tw from 'tailwind-react-native-classnames';
import {Icon} from 'react-native-elements';
import {getAuthToken} from '../utils/auth';
import {getLocationNames} from '../utils/locations';

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

  // Lấy màu theo trạng thái
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
      default:
        return '#6b7280'; // gray
    }
  };

  // Map status từ API sang tiếng Việt
  const mapStatusToVietnamese = (status) => {
    const statusMap = {
      pending: 'Chờ xác nhận',
      confirmed: 'Đã xác nhận',
      processing: 'Đang xử lý',
      shipping: 'Đang giao',
      delivered: 'Đã giao',
      cancelled: 'Đã hủy',
    };
    return statusMap[status] || status;
  };

  // Load chi tiết đơn hàng từ API
  useEffect(() => {
    const loadOrderDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        // Lấy token từ AsyncStorage
        const token = await getAuthToken();

        if (!token) {
          setError('Bạn cần đăng nhập để xem chi tiết đơn hàng');
          setLoading(false);
          return;
        }

        // Xác định API base URL
        const API_URL = Platform.OS === 'android'
          ? 'http://10.0.2.2:3000'
          : 'http://localhost:3000';

        // Gọi API để lấy chi tiết đơn hàng
        // Thử dùng orderCode trước, nếu không có thì thử dùng orderId
        let apiUrl;
        if (orderCode) {
          // Nếu có orderCode, dùng endpoint code
          apiUrl = `${API_URL}/api/v1/orders/code/${orderCode}`;
        } else if (orderId) {
          // Nếu chỉ có orderId, thử dùng endpoint id
          apiUrl = `${API_URL}/api/v1/orders/${orderId}`;
        } else {
          setError('Mã đơn hàng không hợp lệ');
          setLoading(false);
          return;
        }
        
        console.log('[OrderDetail] Fetching order from:', apiUrl);
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
        });

        const result = await response.json();

        // Xử lý kết quả
        if (result.status === 200 && result.data) {
          setOrder(result.data);
          
          // Lấy tên tỉnh/thành phố và phường/xã
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
    };

    if (orderIdentifier) {
      loadOrderDetail();
    } else {
      setError('Mã đơn hàng không hợp lệ');
      setLoading(false);
    }
  }, [orderCode, orderId]);

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
    </SafeAreaView>
  );
};

export default OrderDetail;

