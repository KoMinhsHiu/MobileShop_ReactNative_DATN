import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Image,
  Alert,
  TextInput,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import React, { useState, useEffect } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import Wrapper from '../components/Wrapper/Wrapper';
import CustomStatusBar from '../components/CustomStatusBar';
import { Icon } from 'react-native-elements';
import tw from 'tailwind-react-native-classnames';
import { useSelector } from 'react-redux';
import { selectBasket } from '../store/slices/siteSlice';
import { getProvinces, getCommunes } from '../utils/locations';
import { getAuthToken } from '../utils/auth';
import { getApiUrl, API_ENDPOINTS } from '../config/api';

const Checkout = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const allBasket = useSelector(selectBasket);
  
  // Lấy danh sách sản phẩm được chọn từ route params, nếu không có thì dùng tất cả
  const basket = route.params?.selectedItems || allBasket;
  
  // Xác định nguồn đặt hàng: 'cart' (từ giỏ hàng) hoặc 'product' (mua trực tiếp từ trang sản phẩm)
  const source = route.params?.source || 'cart'; // Mặc định là 'cart' để tương thích ngược
  const isFromCart = source === 'cart';

  // Loading states
  const [loading, setLoading] = useState(true);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCommunes, setLoadingCommunes] = useState(false);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    recipientName: '',
    recipientPhone: '',
    provinceId: null,
    communeId: null,
    street: '',
    note: '',
    paymentMethod: '', // Will be set after loading payment methods from API
  });

  // Options
  const [provinces, setProvinces] = useState([]);
  const [communes, setCommunes] = useState([]);
  const [selectedProvince, setSelectedProvince] = useState(null);
  const [selectedCommune, setSelectedCommune] = useState(null);

  // Modals
  const [showProvinceModal, setShowProvinceModal] = useState(false);
  const [showCommuneModal, setShowCommuneModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Payment methods from API
  const [paymentMethods, setPaymentMethods] = useState([]);

  // Lưu orderCode sau khi tạo đơn hàng thành công
  const [createdOrderCode, setCreatedOrderCode] = useState(null);

  // Map payment code to icon
  const getPaymentIcon = (code) => {
    const iconMap = {
      'COD': 'cash',
      'VNPAY': 'card',
      'MOMO': 'wallet',
      'PAYPAL': 'logo-paypal',
    };
    return iconMap[code?.toUpperCase()] || 'card';
  };

  // Calculate total price
  const calculateTotal = () => {
    let total = 0;
    basket.forEach((item) => {
      const itemPrice = item.product.price || 0;
      const quantity = item.product.amount || 1;
      total += itemPrice * quantity;
    });
    return total;
  };

  // Fetch customer info to pre-fill form
  const fetchCustomerInfo = async () => {
    try {
      const token = await getAuthToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const apiUrl = getApiUrl(API_ENDPOINTS.GET_CUSTOMER_ME);
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.status === 200 && result.data) {
        const customerData = result.data;
        const userData = customerData.user || {};
        
        // Pre-fill form with customer data
        setFormData((prev) => ({
          ...prev,
          recipientName: `${customerData.firstName || ''} ${customerData.lastName || ''}`.trim(),
          recipientPhone: userData.phone || '',
        }));
      }
    } catch (error) {
      console.error('Error fetching customer info:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch payment methods from API
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
        // Transform API data to match component structure
        const transformedMethods = result.data
          .filter(method => !method.isDeleted) // Filter out deleted methods
          .map(method => ({
            id: method.code.toLowerCase(), // For UI selection (internal)
            apiId: method.id, // Real ID from API (for request body)
            code: method.code,
            name: method.name,
            icon: getPaymentIcon(method.code),
          }));
        
        setPaymentMethods(transformedMethods);
        
        // Set default payment method to first one if not set
        if (transformedMethods.length > 0) {
          setFormData((prev) => ({
            ...prev,
            paymentMethod: prev.paymentMethod || transformedMethods[0].id,
          }));
        }
      } else {
        console.error('Error loading payment methods:', result.message);
        // Fallback to default methods if API fails
        const fallbackMethods = [
          { id: 'cod', name: 'Thanh toán khi nhận hàng', icon: 'cash', code: 'COD' },
        ];
        setPaymentMethods(fallbackMethods);
        setFormData((prev) => ({
          ...prev,
          paymentMethod: prev.paymentMethod || fallbackMethods[0].id,
        }));
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
      // Fallback to default methods if API fails
      const fallbackMethods = [
        { id: 'cod', name: 'Thanh toán khi nhận hàng', icon: 'cash', code: 'COD' },
      ];
      setPaymentMethods(fallbackMethods);
      setFormData((prev) => ({
        ...prev,
        paymentMethod: prev.paymentMethod || fallbackMethods[0].id,
      }));
    } finally {
      setLoadingPaymentMethods(false);
    }
  };

  // Fetch provinces
  const loadProvinces = async () => {
    try {
      setLoadingProvinces(true);
      const provincesList = await getProvinces();
      setProvinces(provincesList);
    } catch (error) {
      console.error('Error loading provinces:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách tỉnh/thành phố');
    } finally {
      setLoadingProvinces(false);
    }
  };

  // Fetch communes when province is selected
  const loadCommunes = async (provinceCode) => {
    if (!provinceCode) {
      setCommunes([]);
      return;
    }

    try {
      setLoadingCommunes(true);
      const communesList = await getCommunes(provinceCode);
      setCommunes(communesList);
    } catch (error) {
      console.error('Error loading communes:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách phường/xã');
    } finally {
      setLoadingCommunes(false);
    }
  };

  // Handle province selection
  const handleProvinceSelect = (province) => {
    setSelectedProvince(province);
    setFormData((prev) => ({
      ...prev,
      provinceId: province.id,
      communeId: null, // Reset commune when province changes
    }));
    setSelectedCommune(null);
    setCommunes([]);
    setShowProvinceModal(false);
    
    // Load communes for selected province
    if (province.code) {
      loadCommunes(province.code);
    }
  };

  // Handle commune selection
  const handleCommuneSelect = (commune) => {
    setSelectedCommune(commune);
    setFormData((prev) => ({
      ...prev,
      communeId: commune.id,
    }));
    setShowCommuneModal(false);
  };

  // Handle payment method selection
  const handlePaymentSelect = (methodId) => {
    setFormData((prev) => ({
      ...prev,
      paymentMethod: methodId,
    }));
    setShowPaymentModal(false);
  };

  // Validate form
  const validateForm = () => {
    if (!formData.recipientName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập họ tên người nhận');
      return false;
    }
    if (!formData.recipientPhone.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại');
      return false;
    }
    if (!formData.provinceId) {
      Alert.alert('Lỗi', 'Vui lòng chọn tỉnh/thành phố');
      return false;
    }
    if (!formData.communeId) {
      Alert.alert('Lỗi', 'Vui lòng chọn phường/xã');
      return false;
    }
    if (!formData.street.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập số nhà/đường');
      return false;
    }
    if (!formData.paymentMethod) {
      Alert.alert('Lỗi', 'Vui lòng chọn phương thức thanh toán');
      return false;
    }
    return true;
  };

  // Handle checkout submission
  const handleCheckout = async () => {
    if (!validateForm()) {
      return;
    }

    if (basket.length === 0) {
      Alert.alert('Lỗi', 'Giỏ hàng trống');
      return;
    }

    setSubmitting(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        Alert.alert('Lỗi', 'Vui lòng đăng nhập để đặt hàng');
        setSubmitting(false);
        return;
      }

      // DEBUG: Log basket data
      console.log('=== DEBUG CHECKOUT ===');
      console.log('[Checkout] Source:', source);
      console.log('[Checkout] Is from cart:', isFromCart);
      console.log('Basket length:', basket?.length || 0);
      console.log('Basket is array:', Array.isArray(basket));
      console.log('Basket data (full):', JSON.stringify(basket, null, 2));
      
      // DEBUG: Log each item in basket with colorId check
      if (basket && Array.isArray(basket)) {
        basket.forEach((item, index) => {
          console.log(`Checkout Basket Item ${index + 1}:`, {
            id: item.id,
            cartItemId: item.product?.cartItemId,
            variantId: item.product?.variantId,
            colorId: item.product?.colorId,
            productId: item.product?.id,
            title: item.product?.title,
            price: item.product?.price,
            originalPrice: item.product?.originalPrice,
            amount: item.product?.amount,
            colorIdValue: item.product?.colorId,
            colorIdType: typeof item.product?.colorId,
            hasColorId: item.product?.colorId !== null && item.product?.colorId !== undefined,
            fullProduct: JSON.stringify(item.product, null, 2),
          });
        });
      }

      // Calculate order values
      let totalAmount = 0; // Tổng giá gốc
      let discountAmount = 0; // Tổng số tiền giảm giá
      
      // Prepare items array
      const items = basket.map((item) => {
        const originalPrice = item.product.originalPrice || item.product.price || 0;
        const discountPrice = item.product.price || 0;
        const quantity = item.product.amount || 1;
        const itemTotal = originalPrice * quantity;
        const itemDiscount = (originalPrice - discountPrice) * quantity;
        
        totalAmount += itemTotal;
        discountAmount += itemDiscount;
        
        const itemData = {
          variantId: item.product.variantId || item.product.id,
          colorId: item.product.colorId || null, // Có thể null nếu không có
          quantity: quantity,
          price: originalPrice,
          discount: discountPrice,
        };
        
        // DEBUG: Log each item
        console.log('Item processed:', {
          productId: item.product.id,
          variantId: itemData.variantId,
          colorId: itemData.colorId,
          originalPrice,
          discountPrice,
          quantity,
          itemTotal,
          itemDiscount,
        });
        
        return itemData;
      });

      // Calculate shipping fee (có thể lấy từ API hoặc tính toán, tạm thời để 0 hoặc giá cố định)
      const shippingFee = 34000; // Có thể tính toán dựa trên địa chỉ
      
      // Calculate final amount
      const finalAmount = totalAmount - discountAmount + shippingFee;

      // DEBUG: Log calculated values
      console.log('Calculated values:', {
        totalAmount,
        discountAmount,
        shippingFee,
        finalAmount,
      });

      // Get payment method object from selected payment method
      const selectedPayment = paymentMethods.find(m => m.id === formData.paymentMethod);
      
      // Prepare payment method object (required format: {id, code, name})
      let paymentMethodObj = null;
      if (selectedPayment) {
        paymentMethodObj = {
          id: selectedPayment.apiId, // Real ID from API
          code: selectedPayment.code,
          name: selectedPayment.name,
        };
      }

      // Prepare request body
      const requestBody = {
        totalAmount: totalAmount,
        discountAmount: discountAmount,
        shippingFee: shippingFee,
        finalAmount: finalAmount,
        recipientName: formData.recipientName.trim(),
        recipientPhone: formData.recipientPhone.trim(),
        street: formData.street.trim(),
        communeId: formData.communeId,
        provinceId: formData.provinceId,
        items: items,
      };

      // Add payment method if available (required field)
      if (paymentMethodObj) {
        requestBody.paymentMethod = paymentMethodObj;
      }

      // Add optional fields if available
      if (formData.postalCode) {
        requestBody.postalCode = formData.postalCode.trim();
      }
      if (formData.voucherIdsApplied && Array.isArray(formData.voucherIdsApplied) && formData.voucherIdsApplied.length > 0) {
        requestBody.voucherIdsApplied = formData.voucherIdsApplied;
      }
      if (formData.pointUsed) {
        requestBody.pointUsed = formData.pointUsed;
      }

      // DEBUG: Log form data
      console.log('Form data:', JSON.stringify(formData, null, 2));

      // DEBUG: Log full request body
      console.log('Request Body:', JSON.stringify(requestBody, null, 2));
      console.log('Request Body (compact):', JSON.stringify(requestBody));

      // API Base URL
      const API_BASE_URL = Platform.OS === 'android' 
        ? 'http://10.0.2.2:3000'
        : 'http://localhost:3000';

      console.log('API URL:', `${API_BASE_URL}/api/v1/orders/create`);
      console.log('Request Method: POST');
      console.log('Request Headers:', {
        'Authorization': `Bearer ${token ? token.substring(0, 20) + '...' : 'NO TOKEN'}`,
        'Content-Type': 'application/json',
      });

      // Call API
      const response = await fetch(`${API_BASE_URL}/api/v1/orders/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      // DEBUG: Log response status
      console.log('Response status:', response.status);
      console.log('Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries())));

      const result = await response.json();

      // DEBUG: Log API response
      console.log('API Response:', JSON.stringify(result, null, 2));
      console.log('=== END DEBUG CHECKOUT ===');

      if (result.status === 200 && result.data) {
        // Lấy orderCode/orderId từ response - thử nhiều cách để tương thích với các cấu trúc response khác nhau
        const orderData = result.data;
        let orderCode = orderData.orderCode 
          || orderData.order?.orderCode 
          || orderData.orderId // API trả về orderId
          || orderData.id 
          || (orderData.order && orderData.order.id)
          || orderData.data?.orderCode
          || orderData.data?.id
          || orderData.data?.orderId
          || null;
        
        // Debug log để kiểm tra orderCode
        console.log('[Checkout] ========== ORDER CREATED ==========');
        console.log('[Checkout] Full response:', JSON.stringify(result, null, 2));
        console.log('[Checkout] Order data:', JSON.stringify(orderData, null, 2));
        console.log('[Checkout] All possible orderCode values:', {
          'orderData.orderCode': orderData.orderCode,
          'orderData.orderId': orderData.orderId, // Thêm orderId
          'orderData.order?.orderCode': orderData.order?.orderCode,
          'orderData.id': orderData.id,
          'orderData.order?.id': orderData.order?.id,
          'orderData.data?.orderCode': orderData.data?.orderCode,
          'orderData.data?.id': orderData.data?.id,
          'orderData.data?.orderId': orderData.data?.orderId,
        });
        console.log('[Checkout] Extracted orderCode:', orderCode);
        
        // Nếu vẫn không có orderCode, thử lấy từ đơn hàng mới nhất
        if (!orderCode) {
          console.log('[Checkout] No orderCode found, fetching latest order...');
          try {
            const token = await getAuthToken();
            if (token) {
              const API_BASE_URL = Platform.OS === 'android' 
                ? 'http://10.0.2.2:3000'
                : 'http://localhost:3000';
              
              // Đợi một chút để đảm bảo đơn hàng đã được lưu vào database
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Lấy danh sách đơn hàng và lấy đơn mới nhất (sửa endpoint thành /me)
              const ordersResponse = await fetch(`${API_BASE_URL}/api/v1/orders/me`, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });
              
              const ordersResult = await ordersResponse.json();
              console.log('[Checkout] Orders list response:', JSON.stringify(ordersResult, null, 2));
              
              if (ordersResult.status === 200 && ordersResult.data && ordersResult.data.length > 0) {
                // Lấy đơn hàng đầu tiên (mới nhất, thường được sắp xếp theo ngày đặt mới nhất)
                const latestOrder = ordersResult.data[0];
                orderCode = latestOrder.orderCode || latestOrder.orderId || latestOrder.id;
                console.log('[Checkout] Got orderCode from latest order:', orderCode);
                console.log('[Checkout] Latest order:', JSON.stringify(latestOrder, null, 2));
              } else {
                console.log('[Checkout] No orders found in list');
              }
            }
          } catch (error) {
            console.error('[Checkout] Error getting latest order:', error);
          }
        }
        
        console.log('[Checkout] Final orderCode before alert:', orderCode);
        
        // Lưu orderCode vào state để dùng sau
        if (orderCode) {
          setCreatedOrderCode(orderCode);
          console.log('[Checkout] Saved orderCode to state:', orderCode);
        }
        
        // Nếu đặt hàng từ giỏ hàng, xóa các sản phẩm đã chọn khỏi giỏ hàng
        if (isFromCart && basket.length > 0) {
          try {
            const token = await getAuthToken();
            if (token) {
              // Lấy danh sách cartItemId từ các sản phẩm đã đặt hàng
              const cartItemIds = basket
                .map(item => item.product?.cartItemId || item.id)
                .filter(id => id !== null && id !== undefined);
              
              if (cartItemIds.length > 0) {
                console.log('[Checkout] Removing items from cart:', cartItemIds);
                
                // Gọi API xóa các items khỏi giỏ hàng
                const API_BASE_URL = Platform.OS === 'android' 
                  ? 'http://10.0.2.2:3000'
                  : 'http://localhost:3000';
                
                const deleteResponse = await fetch(`${API_BASE_URL}/api/v1/cart/items`, {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    itemIds: cartItemIds,
                  }),
                });
                
                const deleteResult = await deleteResponse.json();
                
                if (deleteResult.status === 200) {
                  console.log('[Checkout] Successfully removed items from cart');
                } else {
                  console.warn('[Checkout] Failed to remove items from cart:', deleteResult.message);
                }
              }
            }
          } catch (error) {
            console.error('[Checkout] Error removing items from cart:', error);
            // Không hiển thị lỗi cho user vì đơn hàng đã được tạo thành công
          }
        }
        
        // Success - Hiển thị thông báo với 2 nút: "Quay lại" và "Xem đơn hàng"
        // Luôn hiển thị cả 2 nút, nếu không có orderCode thì dùng fallback
        const alertButtons = [
            {
            text: 'Quay lại',
            style: 'cancel',
              onPress: () => {
                // Navigate to HomeScreen and then to Orders tab
                navigation.navigate('HomeScreen', {
                  screen: 'Orders'
                });
              },
            },
          {
            text: 'Xem đơn hàng',
            onPress: async () => {
              console.log('[Checkout] Button "Xem đơn hàng" pressed');
              console.log('[Checkout] orderCode from closure:', orderCode);
              console.log('[Checkout] createdOrderCode from state:', createdOrderCode);
              
              // Ưu tiên dùng orderCode từ state, sau đó từ closure
              let finalOrderCode = createdOrderCode || orderCode;
              
              // Nếu không có orderCode, thử lấy từ đơn hàng mới nhất
              if (!finalOrderCode) {
                console.log('[Checkout] orderCode is null/undefined, fetching latest order...');
                try {
                  const token = await getAuthToken();
                  if (token) {
                    const API_BASE_URL = Platform.OS === 'android' 
                      ? 'http://10.0.2.2:3000'
                      : 'http://localhost:3000';
                    
                    // Đợi một chút để đảm bảo đơn hàng đã được lưu
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    const ordersResponse = await fetch(`${API_BASE_URL}/api/v1/orders/me`, {
                      method: 'GET',
                      headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                      },
                    });
                    
                    const ordersResult = await ordersResponse.json();
                    console.log('[Checkout] Orders list in button press:', JSON.stringify(ordersResult, null, 2));
                    
                    if (ordersResult.status === 200 && ordersResult.data && ordersResult.data.length > 0) {
                      const latestOrder = ordersResult.data[0];
                      finalOrderCode = latestOrder.orderCode || latestOrder.orderId || latestOrder.id;
                      console.log('[Checkout] Found orderCode in button press:', finalOrderCode);
                    } else {
                      console.log('[Checkout] No orders found in button press');
                    }
                  }
                } catch (error) {
                  console.error('[Checkout] Error getting orderCode in button press:', error);
                }
              }
              
              console.log('[Checkout] Final orderCode for navigation:', finalOrderCode);
              
              if (finalOrderCode) {
                // Navigate to OrderDetailScreen với orderCode hoặc orderId
                console.log('[Checkout] Navigating to OrderDetailScreen with orderCode/orderId:', finalOrderCode);
                // Nếu finalOrderCode là number, truyền như orderId, nếu là string thì như orderCode
                const isNumber = typeof finalOrderCode === 'number' || !isNaN(finalOrderCode);
                if (isNumber) {
                  navigation.navigate('OrderDetailScreen', { orderId: finalOrderCode });
                } else {
                  navigation.navigate('OrderDetailScreen', { orderCode: finalOrderCode });
                }
              } else {
                // Nếu vẫn không có orderCode, chuyển đến danh sách đơn hàng
                console.log('[Checkout] No orderCode found, navigating to Orders list');
                Alert.alert('Thông báo', 'Vui lòng xem đơn hàng trong danh sách đơn hàng.');
                navigation.navigate('HomeScreen', {
                  screen: 'Orders'
                });
              }
            },
          },
        ];

        Alert.alert(
          'Thành công', 
          'Đơn hàng đã được đặt thành công!', 
          alertButtons
        );
      } else {
        // Handle errors
        let errorMessage = 'Đã xảy ra lỗi khi đặt hàng. Vui lòng thử lại.';
        
        if (result.status === 400) {
          errorMessage = result.message || 'Một hoặc nhiều sản phẩm đã hết hàng.';
        } else if (result.status === 503) {
          errorMessage = 'Dịch vụ đặt hàng tạm thời không khả dụng. Vui lòng thử lại sau.';
        } else if (result.message) {
          errorMessage = result.message;
        }
        
        Alert.alert('Lỗi', errorMessage);
      }
    } catch (error) {
      console.error('Error during checkout:', error);
      Alert.alert('Lỗi', 'Đã xảy ra lỗi khi đặt hàng. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      await Promise.all([
        fetchCustomerInfo(),
        loadProvinces(),
        loadPaymentMethods(),
      ]);
    };
    initialize();
  }, []);

  if (loading) {
    return (
      <>
        <CustomStatusBar backgroundColor="red" barStyle="white-content" />
        <Wrapper header={false}>
          <View style={tw`flex-1 justify-center items-center`}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={tw`text-gray-600 mt-4`}>Đang tải...</Text>
          </View>
        </Wrapper>
      </>
    );
  }

  const selectedPaymentMethod = paymentMethods.find((m) => m.id === formData.paymentMethod);

  return (
    <>
      <CustomStatusBar backgroundColor="red" barStyle="white-content" />
      <Wrapper header={false}>
        {/* Custom Header với nút back */}
        <View style={tw`flex-row items-center justify-between px-4 py-3 border-b border-gray-200 bg-white`}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={tw`p-2 -ml-2`}
          >
            <Icon
              type="ionicon"
              name="arrow-back"
              size={28}
              color="#374151"
            />
          </Pressable>
          <Text style={tw`text-lg font-bold text-gray-900`}>
            Thanh toán
          </Text>
          <View style={tw`w-10`} />
        </View>

        <ScrollView style={tw`flex-1 bg-gray-100`}>
          <View style={tw`p-4`}>

            {/* Products Section */}
            <View style={tw`bg-white rounded-lg mb-4 shadow-sm`}>
              <View style={tw`p-4 border-b border-gray-100`}>
                <Text style={tw`text-lg font-bold text-gray-800`}>Sản phẩm</Text>
              </View>
              <View style={tw`p-4`}>
                {basket.map((item, index) => (
                  <View key={index} style={tw`flex-row mb-4 ${index !== basket.length - 1 ? 'border-b border-gray-100 pb-4' : ''}`}>
                    <Image
                      source={{ uri: item.product.thumbnail }}
                      style={tw`w-16 h-16 rounded-lg mr-3`}
                      resizeMode="cover"
                    />
                    <View style={tw`flex-1`}>
                      <Text style={tw`text-base font-medium text-gray-800 mb-1`} numberOfLines={2}>
                        {item.product.title}
                      </Text>
                      <Text style={tw`text-gray-500 text-sm mb-1`}>
                        Số lượng: {item.product.amount}
                      </Text>
                      <Text style={tw`text-lg font-bold text-blue-600`}>
                        {(item.product.price * item.product.amount).toLocaleString('vi-VN')}đ
                      </Text>
                    </View>
                  </View>
                ))}
                <View style={tw`flex-row justify-between items-center pt-4 border-t border-gray-200 mt-2`}>
                  <Text style={tw`text-lg font-bold text-gray-800`}>Tổng tiền:</Text>
                  <Text style={tw`text-xl font-bold text-red-600`}>
                    {calculateTotal().toLocaleString('vi-VN')}đ
                  </Text>
                </View>
              </View>
            </View>

            {/* Shipping Information Section */}
            <View style={tw`bg-white rounded-lg mb-4 shadow-sm`}>
              <View style={tw`p-4 border-b border-gray-100`}>
                <Text style={tw`text-lg font-bold text-gray-800`}>Thông tin giao hàng</Text>
              </View>
              <View style={tw`p-4`}>
                {/* Recipient Name */}
                <View style={tw`mb-4`}>
                  <Text style={tw`text-gray-700 font-medium mb-2`}>Họ tên người nhận *</Text>
                  <TextInput
                    style={tw`border border-gray-300 rounded-lg p-3 text-gray-800`}
                    value={formData.recipientName}
                    onChangeText={(text) => setFormData((prev) => ({ ...prev, recipientName: text }))}
                    placeholder="Nhập họ tên người nhận"
                  />
                </View>

                {/* Phone Number */}
                <View style={tw`mb-4`}>
                  <Text style={tw`text-gray-700 font-medium mb-2`}>Số điện thoại *</Text>
                  <TextInput
                    style={tw`border border-gray-300 rounded-lg p-3 text-gray-800`}
                    value={formData.recipientPhone}
                    onChangeText={(text) => setFormData((prev) => ({ ...prev, recipientPhone: text }))}
                    placeholder="Nhập số điện thoại"
                    keyboardType="phone-pad"
                  />
                </View>

                {/* Province */}
                <View style={tw`mb-4`}>
                  <Text style={tw`text-gray-700 font-medium mb-2`}>Tỉnh/Thành phố *</Text>
                  <Pressable
                    style={tw`border border-gray-300 rounded-lg p-3 flex-row justify-between items-center`}
                    onPress={() => setShowProvinceModal(true)}
                  >
                    <Text style={tw`text-gray-800 ${selectedProvince ? '' : 'text-gray-400'}`}>
                      {selectedProvince ? selectedProvince.name : 'Chọn tỉnh/thành phố'}
                    </Text>
                    <Icon name="chevron-down" type="ionicon" size={20} color="#666" />
                  </Pressable>
                </View>

                {/* Commune */}
                <View style={tw`mb-4`}>
                  <Text style={tw`text-gray-700 font-medium mb-2`}>Phường/Xã *</Text>
                  <Pressable
                    style={tw`border border-gray-300 rounded-lg p-3 flex-row justify-between items-center ${!selectedProvince ? 'opacity-50' : ''}`}
                    onPress={() => selectedProvince && setShowCommuneModal(true)}
                    disabled={!selectedProvince}
                  >
                    <Text style={tw`text-gray-800 ${selectedCommune ? '' : 'text-gray-400'}`}>
                      {selectedCommune ? selectedCommune.name : 'Chọn phường/xã'}
                    </Text>
                    <Icon name="chevron-down" type="ionicon" size={20} color="#666" />
                  </Pressable>
                </View>

                {/* Street Address */}
                <View style={tw`mb-4`}>
                  <Text style={tw`text-gray-700 font-medium mb-2`}>Số nhà/Đường *</Text>
                  <TextInput
                    style={tw`border border-gray-300 rounded-lg p-3 text-gray-800`}
                    value={formData.street}
                    onChangeText={(text) => setFormData((prev) => ({ ...prev, street: text }))}
                    placeholder="Nhập số nhà, tên đường"
                    multiline
                  />
                </View>

                {/* Note */}
                <View style={tw`mb-4`}>
                  <Text style={tw`text-gray-700 font-medium mb-2`}>Ghi chú đơn hàng</Text>
                  <TextInput
                    style={tw`border border-gray-300 rounded-lg p-3 text-gray-800`}
                    value={formData.note}
                    onChangeText={(text) => setFormData((prev) => ({ ...prev, note: text }))}
                    placeholder="Ghi chú (tùy chọn)"
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </View>
            </View>

            {/* Payment Method Section */}
            <View style={tw`bg-white rounded-lg mb-4 shadow-sm`}>
              <View style={tw`p-4 border-b border-gray-100`}>
                <Text style={tw`text-lg font-bold text-gray-800`}>Phương thức thanh toán</Text>
              </View>
              <View style={tw`p-4`}>
                {loadingPaymentMethods ? (
                  <View style={tw`flex-row items-center justify-center py-4`}>
                    <ActivityIndicator size="small" color="#2563eb" />
                    <Text style={tw`text-gray-600 ml-2`}>Đang tải phương thức thanh toán...</Text>
                  </View>
                ) : paymentMethods.length === 0 ? (
                  <Text style={tw`text-gray-500 text-center py-4`}>
                    Không có phương thức thanh toán khả dụng
                  </Text>
                ) : (
                  <Pressable
                    style={tw`border border-gray-300 rounded-lg p-3 flex-row justify-between items-center`}
                    onPress={() => setShowPaymentModal(true)}
                  >
                    <View style={tw`flex-row items-center flex-1`}>
                      {selectedPaymentMethod && (
                        <Icon
                          name={selectedPaymentMethod.icon}
                          type="ionicon"
                          size={24}
                          color="#2563eb"
                          style={tw`mr-3`}
                        />
                      )}
                      <Text style={tw`text-gray-800 font-medium`}>
                        {selectedPaymentMethod ? selectedPaymentMethod.name : 'Chọn phương thức thanh toán'}
                      </Text>
                    </View>
                    <Icon name="chevron-forward" type="ionicon" size={20} color="#666" />
                  </Pressable>
                )}
              </View>
            </View>

            {/* Checkout Button */}
            <Pressable
              style={tw`bg-blue-600 rounded-lg p-4 mb-4 ${submitting ? 'opacity-50' : ''}`}
              onPress={handleCheckout}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={tw`text-white text-center font-bold text-lg`}>
                  Đặt hàng - {calculateTotal().toLocaleString('vi-VN')}đ
                </Text>
              )}
            </Pressable>
          </View>
        </ScrollView>

        {/* Province Modal */}
        <Modal
          visible={showProvinceModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowProvinceModal(false)}
        >
          <View style={tw`flex-1 bg-black bg-opacity-50 justify-end`}>
            <View style={tw`bg-white rounded-t-3xl max-h-96`}>
              <View style={tw`p-4 border-b border-gray-200 flex-row justify-between items-center`}>
                <Text style={tw`text-lg font-bold text-gray-800`}>Chọn tỉnh/thành phố</Text>
                <Pressable onPress={() => setShowProvinceModal(false)}>
                  <Icon name="close" type="ionicon" size={24} color="#666" />
                </Pressable>
              </View>
              <ScrollView style={tw`max-h-80`}>
                {loadingProvinces ? (
                  <View style={tw`p-8 items-center`}>
                    <ActivityIndicator size="large" color="#2563eb" />
                  </View>
                ) : (
                  provinces.map((province) => (
                    <Pressable
                      key={province.id}
                      style={tw`p-4 border-b border-gray-100 ${formData.provinceId === province.id ? 'bg-blue-50' : ''}`}
                      onPress={() => handleProvinceSelect(province)}
                    >
                      <Text style={tw`text-gray-800 ${formData.provinceId === province.id ? 'font-bold' : ''}`}>
                        {province.name}
                      </Text>
                    </Pressable>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Commune Modal */}
        <Modal
          visible={showCommuneModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowCommuneModal(false)}
        >
          <View style={tw`flex-1 bg-black bg-opacity-50 justify-end`}>
            <View style={tw`bg-white rounded-t-3xl max-h-96`}>
              <View style={tw`p-4 border-b border-gray-200 flex-row justify-between items-center`}>
                <Text style={tw`text-lg font-bold text-gray-800`}>Chọn phường/xã</Text>
                <Pressable onPress={() => setShowCommuneModal(false)}>
                  <Icon name="close" type="ionicon" size={24} color="#666" />
                </Pressable>
              </View>
              <ScrollView style={tw`max-h-80`}>
                {loadingCommunes ? (
                  <View style={tw`p-8 items-center`}>
                    <ActivityIndicator size="large" color="#2563eb" />
                  </View>
                ) : communes.length === 0 ? (
                  <View style={tw`p-8 items-center`}>
                    <Text style={tw`text-gray-500`}>Không có dữ liệu</Text>
                  </View>
                ) : (
                  communes.map((commune) => (
                    <Pressable
                      key={commune.id}
                      style={tw`p-4 border-b border-gray-100 ${formData.communeId === commune.id ? 'bg-blue-50' : ''}`}
                      onPress={() => handleCommuneSelect(commune)}
                    >
                      <Text style={tw`text-gray-800 ${formData.communeId === commune.id ? 'font-bold' : ''}`}>
                        {commune.name}
                      </Text>
                    </Pressable>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Payment Method Modal */}
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
                      style={tw`p-4 border-b border-gray-100 flex-row items-center ${formData.paymentMethod === method.id ? 'bg-blue-50' : ''}`}
                      onPress={() => handlePaymentSelect(method.id)}
                    >
                      <Icon
                        name={method.icon}
                        type="ionicon"
                        size={24}
                        color={formData.paymentMethod === method.id ? '#2563eb' : '#666'}
                        style={tw`mr-3`}
                      />
                      <Text style={tw`text-gray-800 flex-1 ${formData.paymentMethod === method.id ? 'font-bold' : ''}`}>
                        {method.name}
                      </Text>
                      {formData.paymentMethod === method.id && (
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
    </>
  );
};

export default Checkout;

const styles = StyleSheet.create({});

