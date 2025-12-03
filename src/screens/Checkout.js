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
import { getProvinces, getCommunes, findProvinceById, findCommuneById } from '../utils/locations';
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
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [loadingShippingFee, setLoadingShippingFee] = useState(false);
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
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [isSelectingForNewAddress, setIsSelectingForNewAddress] = useState(false);

  // Payment methods from API
  const [paymentMethods, setPaymentMethods] = useState([]);

  // Customer addresses from API
  const [customerAddresses, setCustomerAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);

  // New address form data
  const [newAddressForm, setNewAddressForm] = useState({
    recipientName: '',
    recipientPhone: '',
    street: '',
    provinceId: null,
    communeId: null,
    postalCode: '',
    isDefault: false,
  });
  const [selectedProvinceForNew, setSelectedProvinceForNew] = useState(null);
  const [selectedCommuneForNew, setSelectedCommuneForNew] = useState(null);
  const [communesForNew, setCommunesForNew] = useState([]);
  const [savingAddress, setSavingAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [deletingAddressId, setDeletingAddressId] = useState(null);

  // Lưu orderCode sau khi tạo đơn hàng thành công
  const [createdOrderCode, setCreatedOrderCode] = useState(null);

  /**
   * Shipping fee state - null khi chưa chọn địa chỉ
   */
  const [shippingFee, setShippingFee] = useState(null);
  const [shippingFeeError, setShippingFeeError] = useState(null);

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

  /**
   * Calculate total price of products
   */
  const calculateTotal = () => {
    let total = 0;
    basket.forEach((item) => {
      const itemPrice = item.product.price || 0;
      const quantity = item.product.amount || 1;
      total += itemPrice * quantity;
    });
    return total;
  };

  /**
   * Get shipping fee from state
   * Returns 0 if shipping fee hasn't been calculated yet
   */
  const getShippingFee = () => {
    return shippingFee !== null ? shippingFee : 0;
  };

  /**
   * Check if shipping fee has been calculated
   */
  const hasShippingFee = () => {
    return shippingFee !== null;
  };

  /**
   * Parse shipping fee from API response (format: "34.000 ₫")
   * Returns number in VND
   */
  const parseShippingFee = (feeString) => {
    if (!feeString) {
      console.warn('[Checkout] parseShippingFee: Empty input, using default 22000');
      return 22000; // Default fallback
    }
    
    /**
     * Remove currency symbol and spaces, then parse
     * Example: "34.000 ₫" -> 34000
     */
    const cleaned = feeString
      .replace(/₫/g, '')
      .replace(/\s/g, '')
      .replace(/\./g, '');
    
    const parsed = parseInt(cleaned, 10);
    
    if (isNaN(parsed)) {
      console.warn('[Checkout] parseShippingFee: Failed to parse, using default 22000');
      return 22000; // Default fallback if parsing fails
    }
    
    return parsed;
  };

  /**
   * Calculate shipping fee from API based on province and commune
   */
  const calculateShippingFee = async (provinceName, communeName) => {
    if (!provinceName || !communeName) {
      console.warn('[Checkout] Missing province or commune name for shipping fee calculation');
      setShippingFee(null);
      setLoadingShippingFee(false);
      return;
    }

    try {
      setLoadingShippingFee(true);
      const apiUrl = getApiUrl(API_ENDPOINTS.SHIPMENT_FEE);
      
      /**
       * Timeout 10 seconds as per API spec
       */
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const requestBody = {
        province: provinceName,
        commune: communeName,
      };
      
      console.log('[Checkout] Calculating shipping fee:', { province: provinceName, commune: communeName });
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      const result = await response.json();
      
      console.log('[Checkout] Shipping fee API response:', {
        status: result.status,
        message: result.message,
        shippingFee: result.data?.shippingFee,
      });

      if (result.status === 200 && result.data && result.data.shippingFee) {
        const fee = parseShippingFee(result.data.shippingFee);
        setShippingFee(fee);
        setShippingFeeError(null);
        console.log('[Checkout] ✅ Shipping fee calculated:', fee.toLocaleString('vi-VN'), 'VND');
      } else {
        /**
         * Handle errors - don't set fee, let user know there's an issue
         */
        const errorMessage = result.message || 'Không thể tính phí vận chuyển. Vui lòng thử lại.';
        console.warn('[Checkout] ❌ Failed to calculate shipping fee:', errorMessage);
        setShippingFee(null);
        setShippingFeeError(errorMessage);
      }
    } catch (error) {
      console.error('[Checkout] ❌ Error calculating shipping fee:', error.message);
      
      /**
       * Handle timeout or network errors
       */
      if (error.name === 'AbortError') {
        console.warn('[Checkout] Shipping fee calculation timeout (10s exceeded)');
      }
      
      /**
       * Don't set default fee on error - let user know there's an issue
       */
      const errorMessage = error.name === 'AbortError' 
        ? 'Tính phí vận chuyển đã hết thời gian chờ. Vui lòng thử lại.'
        : 'Đã xảy ra lỗi khi tính phí vận chuyển. Vui lòng thử lại.';
      setShippingFee(null);
      setShippingFeeError(errorMessage);
    } finally {
      setLoadingShippingFee(false);
    }
  };

  /**
   * Calculate final amount including shipping fee
   */
  const calculateFinalAmount = () => {
    return calculateTotal() + getShippingFee();
  };

  // Fetch customer addresses from API
  const loadCustomerAddresses = async () => {
    try {
      setLoadingAddresses(true);
      const token = await getAuthToken();
      if (!token) {
        setLoadingAddresses(false);
        return;
      }

      const apiUrl = getApiUrl(API_ENDPOINTS.GET_CUSTOMER_ADDRESSES);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.status === 200 && result.data && Array.isArray(result.data)) {
        // Filter out deleted addresses
        const activeAddresses = result.data.filter(addr => !addr.isDeleted);
        setCustomerAddresses(activeAddresses);
        
        // Auto-select default address if available
        const defaultAddress = activeAddresses.find(addr => addr.isDefault);
        if (defaultAddress) {
          handleAddressSelect(defaultAddress);
        }
      }
    } catch (error) {
      console.error('[Checkout] Error loading customer addresses:', error);
    } finally {
      setLoadingAddresses(false);
    }
  };

  /**
   * Handle address selection and calculate shipping fee
   */
  const handleAddressSelect = async (address) => {
    if (!address) {
      console.error('[Checkout] ❌ Address is null or undefined!');
      return;
    }
    
    setSelectedAddress(address);
    setShowAddressModal(false);
    
    /**
     * Reset shipping fee và error trước khi tính lại
     */
    setShippingFee(null);
    setShippingFeeError(null);
    setLoadingShippingFee(false);
    
    /**
     * Try to get provinceId and communeId from various possible field names
     */
    const getProvinceId = (addr) => {
      return addr?.provinceId || 
             addr?.province?.id || 
             addr?.cityId ||
             null;
    };
    
    const getCommuneId = (addr) => {
      return addr?.communeId || 
             addr?.commune?.id || 
             addr?.wardId ||
             null;
    };
    
    const provinceId = getProvinceId(address);
    const communeId = getCommuneId(address);
    
    /**
     * Check if we can get province and commune names directly from address object
     */
    const provinceNameFromObject = address?.province?.name;
    const communeNameFromObject = address?.commune?.name;
    
    /**
     * If we have names directly, use them; otherwise fetch by ID
     */
    if (provinceNameFromObject && communeNameFromObject) {
      await calculateShippingFee(provinceNameFromObject, communeNameFromObject);
    } else if (address && provinceId && communeId) {
      try {
        /**
         * Convert to number if it's a string
         */
        const provinceIdNum = typeof provinceId === 'string' ? parseInt(provinceId, 10) : provinceId;
        const province = await findProvinceById(provinceIdNum);
        
        if (province && province.code) {
          const communeIdNum = typeof communeId === 'string' ? parseInt(communeId, 10) : communeId;
          const commune = await findCommuneById(communeIdNum, province.code);
          
          if (province.name && commune && commune.name) {
            await calculateShippingFee(province.name, commune.name);
          } else {
            console.warn('[Checkout] Could not find province or commune names');
            setShippingFee(null);
            setShippingFeeError('Không thể lấy thông tin địa chỉ. Vui lòng thử lại.');
            setLoadingShippingFee(false);
          }
        } else {
          console.warn('[Checkout] Could not find province or province.code');
          setShippingFee(null);
          setShippingFeeError('Không thể tìm thấy tỉnh/thành phố. Vui lòng thử lại.');
          setLoadingShippingFee(false);
        }
      } catch (error) {
        console.error('[Checkout] Error getting location names for shipping fee:', error.message);
        setShippingFee(null);
        setShippingFeeError('Đã xảy ra lỗi khi lấy thông tin địa chỉ. Vui lòng thử lại.');
        setLoadingShippingFee(false);
      }
    } else {
      console.warn('[Checkout] Address missing provinceId or communeId', {
        hasProvinceId: !!provinceId,
        hasCommuneId: !!communeId,
      });
      setShippingFee(null);
      setShippingFeeError('Địa chỉ không đầy đủ thông tin. Vui lòng chọn địa chỉ khác.');
      setLoadingShippingFee(false);
    }
  };

  // Handle province selection for new address
  const handleProvinceSelectForNew = async (province) => {
    setSelectedProvinceForNew(province);
    setNewAddressForm((prev) => ({
      ...prev,
      provinceId: province.id,
      communeId: null, // Reset commune when province changes
    }));
    setSelectedCommuneForNew(null);
    setCommunesForNew([]);
    
    // Load communes for selected province
    if (province.code) {
      try {
        setLoadingCommunes(true);
        const communesList = await getCommunes(province.code);
        setCommunesForNew(communesList);
      } catch (error) {
        console.error('Error loading communes:', error);
        Alert.alert('Lỗi', 'Không thể tải danh sách phường/xã');
      } finally {
        setLoadingCommunes(false);
      }
    }
  };

  // Handle commune selection for new address
  const handleCommuneSelectForNew = (commune) => {
    setSelectedCommuneForNew(commune);
    setNewAddressForm((prev) => ({
      ...prev,
      communeId: commune.id,
    }));
  };

  // Validate new address form
  const validateNewAddressForm = () => {
    if (!newAddressForm.recipientName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập họ tên người nhận');
      return false;
    }
    if (!newAddressForm.recipientPhone.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại');
      return false;
    }
    if (!newAddressForm.provinceId) {
      Alert.alert('Lỗi', 'Vui lòng chọn tỉnh/thành phố');
      return false;
    }
    if (!newAddressForm.communeId) {
      Alert.alert('Lỗi', 'Vui lòng chọn phường/xã');
      return false;
    }
    if (!newAddressForm.street.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập số nhà/đường');
      return false;
    }
    return true;
  };

  // Reset address form
  const resetAddressForm = () => {
    setNewAddressForm({
      recipientName: '',
      recipientPhone: '',
      street: '',
      provinceId: null,
      communeId: null,
      postalCode: '',
      isDefault: false,
    });
    setSelectedProvinceForNew(null);
    setSelectedCommuneForNew(null);
    setCommunesForNew([]);
    setEditingAddressId(null);
  };

  // Delete address
  const handleDeleteAddress = (address) => {
    Alert.alert(
      'Xác nhận xóa',
      `Bạn có chắc chắn muốn xóa địa chỉ "${address.recipientName}"?`,
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            await deleteAddress(address.id);
          },
        },
      ]
    );
  };

  // Delete address API call
  const deleteAddress = async (addressId) => {
    setDeletingAddressId(addressId);
    try {
      const token = await getAuthToken();
      if (!token) {
        Alert.alert('Lỗi', 'Vui lòng đăng nhập để xóa địa chỉ');
        setDeletingAddressId(null);
        return;
      }

      const apiUrl = getApiUrl(`${API_ENDPOINTS.DELETE_CUSTOMER_ADDRESS}/${addressId}`);
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.status === 200 && result.data && result.data.success === true) {
        Alert.alert('Thành công', 'Địa chỉ đã được xóa thành công');
        
        // If the deleted address was selected, clear selection
        if (selectedAddress && selectedAddress.id === addressId) {
          setSelectedAddress(null);
        }
        
        // Reload addresses
        await loadCustomerAddresses();
      } else {
        Alert.alert('Lỗi', result.message || 'Không thể xóa địa chỉ. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('Error deleting address:', error);
      Alert.alert('Lỗi', 'Đã xảy ra lỗi khi xóa địa chỉ. Vui lòng thử lại.');
    } finally {
      setDeletingAddressId(null);
    }
  };

  // Load address data into edit form
  const loadAddressForEdit = async (address) => {
    setEditingAddressId(address.id);
    
    // Fill form with address data
    setNewAddressForm({
      recipientName: address.recipientName || '',
      recipientPhone: address.recipientPhone || '',
      street: address.street || '',
      provinceId: address.provinceId,
      communeId: address.communeId,
      postalCode: address.postalCode || '',
      isDefault: address.isDefault || false,
    });

    // Load province and commune data
    if (address.provinceId) {
      const province = await findProvinceById(address.provinceId);
      if (province) {
        setSelectedProvinceForNew(province);
        // Load communes for this province
        if (province.code) {
          try {
            setLoadingCommunes(true);
            const communesList = await getCommunes(province.code);
            setCommunesForNew(communesList);
            
            // Find and set selected commune
            if (address.communeId) {
              const commune = await findCommuneById(address.communeId, province.code);
              if (commune) {
                setSelectedCommuneForNew(commune);
              }
            }
          } catch (error) {
            console.error('Error loading communes:', error);
            Alert.alert('Lỗi', 'Không thể tải danh sách phường/xã');
          } finally {
            setLoadingCommunes(false);
          }
        }
      }
    }
    
    setShowAddAddressModal(true);
  };

  // Create or update address
  const handleSaveAddress = async () => {
    if (!validateNewAddressForm()) {
      return;
    }

    setSavingAddress(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        Alert.alert('Lỗi', 'Vui lòng đăng nhập để thêm/chỉnh sửa địa chỉ');
        setSavingAddress(false);
        return;
      }

      const requestBody = {
        recipientName: newAddressForm.recipientName.trim(),
        recipientPhone: newAddressForm.recipientPhone.trim(),
        street: newAddressForm.street.trim(),
        communeId: newAddressForm.communeId,
        provinceId: newAddressForm.provinceId,
        isDefault: newAddressForm.isDefault,
      };

      // Add postalCode if provided
      if (newAddressForm.postalCode.trim()) {
        requestBody.postalCode = newAddressForm.postalCode.trim();
      }

      let apiUrl;
      let method;
      
      if (editingAddressId) {
        // Update existing address
        apiUrl = getApiUrl(`${API_ENDPOINTS.UPDATE_CUSTOMER_ADDRESS}/${editingAddressId}`);
        method = 'PUT';
      } else {
        // Create new address
        apiUrl = getApiUrl(API_ENDPOINTS.CREATE_CUSTOMER_ADDRESS);
        method = 'POST';
      }

      const response = await fetch(apiUrl, {
        method: method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      // Check success for both create and update
      const isSuccess = editingAddressId 
        ? (result.status === 200 && result.data && result.data.success === true)
        : (result.status === 200 && result.data);

      if (isSuccess) {
        const successMessage = editingAddressId 
          ? 'Địa chỉ đã được cập nhật thành công'
          : 'Địa chỉ đã được thêm thành công';
        Alert.alert('Thành công', successMessage);
        
        // Reset form
        resetAddressForm();
        setShowAddAddressModal(false);
        
        // Reload addresses
        await loadCustomerAddresses();
        
        // If editing and this was the selected address, update selection
        if (editingAddressId && selectedAddress && selectedAddress.id === editingAddressId) {
          // Wait a bit for the address to be available
          setTimeout(async () => {
            await loadCustomerAddresses();
            const token = await getAuthToken();
            if (token) {
              const apiUrl = getApiUrl(API_ENDPOINTS.GET_CUSTOMER_ADDRESSES);
              const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });
              const addressesResult = await response.json();
              if (addressesResult.status === 200 && addressesResult.data && Array.isArray(addressesResult.data)) {
                const activeAddresses = addressesResult.data.filter(addr => !addr.isDeleted);
                const updatedAddress = activeAddresses.find(addr => addr.id === editingAddressId);
                if (updatedAddress) {
                  handleAddressSelect(updatedAddress);
                }
              }
            }
          }, 500);
        } else if (!editingAddressId) {
          // If creating new, auto-select it
          const newAddressId = result.data.addressId;
          if (newAddressId) {
            setTimeout(async () => {
              await loadCustomerAddresses();
              const token = await getAuthToken();
              if (token) {
                const apiUrl = getApiUrl(API_ENDPOINTS.GET_CUSTOMER_ADDRESSES);
                const response = await fetch(apiUrl, {
                  method: 'GET',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                });
                const addressesResult = await response.json();
                if (addressesResult.status === 200 && addressesResult.data && Array.isArray(addressesResult.data)) {
                  const activeAddresses = addressesResult.data.filter(addr => !addr.isDeleted);
                  const newAddress = activeAddresses.find(addr => addr.id === newAddressId);
                  if (newAddress) {
                    handleAddressSelect(newAddress);
                  }
                }
              }
            }, 500);
          }
        }
      } else {
        const errorMessage = editingAddressId
          ? 'Không thể cập nhật địa chỉ. Vui lòng thử lại.'
          : 'Không thể thêm địa chỉ. Vui lòng thử lại.';
        Alert.alert('Lỗi', result.message || errorMessage);
      }
    } catch (error) {
      console.error('Error saving address:', error);
      const errorMessage = editingAddressId
        ? 'Đã xảy ra lỗi khi cập nhật địa chỉ. Vui lòng thử lại.'
        : 'Đã xảy ra lỗi khi thêm địa chỉ. Vui lòng thử lại.';
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setSavingAddress(false);
    }
  };

  // Fetch customer info to pre-fill form (fallback if no addresses)
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
        
        // Only pre-fill if no address is selected
        if (!selectedAddress) {
          setFormData((prev) => ({
            ...prev,
            recipientName: `${customerData.firstName || ''} ${customerData.lastName || ''}`.trim(),
            recipientPhone: userData.phone || '',
          }));
        }
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
          const defaultMethod = transformedMethods[0].id;
          setFormData((prev) => ({
            ...prev,
            paymentMethod: prev.paymentMethod || defaultMethod,
          }));
        }
      } else {
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
      console.error('[Checkout] Error loading payment methods:', error);
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
  const handleProvinceSelect = async (province) => {
    if (isSelectingForNewAddress) {
      // Handle for new address form
      await handleProvinceSelectForNew(province);
      setShowProvinceModal(false);
      setIsSelectingForNewAddress(false);
    } else {
      // Handle for main form
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
        await loadCommunes(province.code);
      }
    }
  };

  // Handle commune selection
  const handleCommuneSelect = (commune) => {
    if (isSelectingForNewAddress) {
      // Handle for new address form
      handleCommuneSelectForNew(commune);
      setShowCommuneModal(false);
      setIsSelectingForNewAddress(false);
    } else {
      // Handle for main form
      setSelectedCommune(commune);
      setFormData((prev) => ({
        ...prev,
        communeId: commune.id,
      }));
      setShowCommuneModal(false);
    }
  };

  // Handle payment method selection
  const handlePaymentSelect = (methodId) => {
    setFormData((prev) => ({
      ...prev,
      paymentMethod: methodId,
    }));
    setShowPaymentModal(false);
  };

  /**
   * Validate form before checkout
   */
  const validateForm = () => {
    if (!selectedAddress) {
      Alert.alert('Lỗi', 'Vui lòng chọn địa chỉ giao hàng');
      return false;
    }
    if (loadingShippingFee) {
      Alert.alert('Lỗi', 'Đang tính phí vận chuyển. Vui lòng đợi...');
      return false;
    }
    if (!hasShippingFee()) {
      Alert.alert('Lỗi', 'Phí vận chuyển chưa được tính. Vui lòng chọn lại địa chỉ giao hàng.');
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

      // Calculate order values
      // Theo mẫu:
      // - totalAmount = tổng (price * quantity) của tất cả items (giá gốc)
      // - discountAmount = tổng ((price - discount) * quantity) của tất cả items (số tiền giảm)
      // - finalAmount = totalAmount - discountAmount + shippingFee
      let totalAmount = 0; // Tổng giá gốc (tổng price * quantity)
      let discountAmount = 0; // Tổng số tiền giảm giá (tổng (price - discount) * quantity)
      
      // Validate items - phải có ít nhất 1 item
      if (basket.length === 0) {
        Alert.alert('Lỗi', 'Giỏ hàng trống');
        setSubmitting(false);
        return;
      }

      // Prepare items array theo OrderItemCreateDto schema
      const items = basket.map((item, index) => {
        // price = giá gốc (originalPrice hoặc price)
        const originalPrice = item.product.originalPrice || item.product.price || 0;
        // discount = giá sau giảm (price hiện tại)
        const discountPrice = item.product.price || 0;
        const quantity = item.product.amount || 1;
        
        // Tính toán cho item này
        // itemTotal = price * quantity (giá gốc * số lượng)
        const itemTotal = originalPrice * quantity;
        // itemDiscount = (price - discount) * quantity (số tiền giảm * số lượng)
        const itemDiscount = (originalPrice - discountPrice) * quantity;
        
        totalAmount += itemTotal;
        discountAmount += itemDiscount;
        
        // Validate required fields
        const variantId = item.product.variantId || item.product.id;
        if (!variantId) {
          console.error(`[Checkout] Item ${index + 1} missing variantId`);
          Alert.alert('Lỗi', `Sản phẩm "${item.product.title}" thiếu variantId. Vui lòng thử lại.`);
          setSubmitting(false);
          return;
        }
        
        // colorId là required theo spec mới
        const colorId = item.product.colorId !== null && item.product.colorId !== undefined 
          ? item.product.colorId 
          : 0; // Default value nếu không có colorId
        
        const itemData = {
          variantId: variantId,
          colorId: colorId, // Required field
          quantity: quantity,
          price: originalPrice, // Giá gốc
          discount: discountPrice, // Giá sau giảm
        };
        
        return itemData;
      });

      /**
       * Use shipping fee from state (must be calculated before checkout)
       */
      if (!hasShippingFee()) {
        Alert.alert('Lỗi', 'Phí vận chuyển chưa được tính. Vui lòng chọn lại địa chỉ giao hàng.');
        setSubmitting(false);
        return;
      }
      
      const currentShippingFee = shippingFee;
      
      /**
       * Calculate final amount
       */
      const finalAmount = totalAmount - discountAmount + currentShippingFee;

      // Get payment method object from selected payment method
      const selectedPayment = paymentMethods.find(m => m.id === formData.paymentMethod);
      
      if (!selectedPayment) {
        console.error('[Checkout] No payment method found');
        Alert.alert('Lỗi', 'Vui lòng chọn phương thức thanh toán');
        setSubmitting(false);
        return;
      }
      
      // Prepare payment method object theo PaymentMethodDto schema
      const paymentMethodObj = {
        ...(selectedPayment.apiId && { id: selectedPayment.apiId }),
        code: selectedPayment.code,
        name: selectedPayment.name,
      };

      // Validate address fields before creating request
      
      // Helper function to convert to number if needed
      const toNumber = (value) => {
        if (value === null || value === undefined) return null;
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
          const num = parseInt(value, 10);
          return isNaN(num) ? null : num;
        }
        return null;
      };
      
      // Try to get communeId and provinceId from various possible field names
      // API có thể trả về với tên field khác nhau
      const getCommuneId = (address) => {
        return address?.communeId || 
               address?.commune?.id || 
               address?.communeId || 
               address?.wardId ||
               null;
      };
      
      const getProvinceId = (address) => {
        return address?.provinceId || 
               address?.province?.id || 
               address?.provinceId || 
               address?.cityId ||
               null;
      };
      
      // Get communeId and provinceId với fallback
      const communeIdRaw = getCommuneId(selectedAddress);
      const provinceIdRaw = getProvinceId(selectedAddress);
      
      console.log('[Checkout] Extracting IDs with fallback:');
      console.log('[Checkout]   communeId sources:', {
        'communeId': selectedAddress?.communeId,
        'commune.id': selectedAddress?.commune?.id,
        'wardId': selectedAddress?.wardId,
        'final': communeIdRaw,
      });
      console.log('[Checkout]   provinceId sources:', {
        'provinceId': selectedAddress?.provinceId,
        'province.id': selectedAddress?.province?.id,
        'cityId': selectedAddress?.cityId,
        'final': provinceIdRaw,
      });
      
      // Convert communeId and provinceId to numbers if they are strings
      const communeIdNum = toNumber(communeIdRaw);
      const provinceIdNum = toNumber(provinceIdRaw);
      
      
      const addressValidation = {
        recipientName: {
          value: selectedAddress?.recipientName,
          originalValue: selectedAddress?.recipientName,
          type: typeof selectedAddress?.recipientName,
          isValid: !!selectedAddress?.recipientName && 
                   typeof selectedAddress.recipientName === 'string' && 
                   selectedAddress.recipientName.trim().length > 0,
          required: true,
          error: !selectedAddress?.recipientName 
            ? 'Missing recipientName' 
            : typeof selectedAddress.recipientName !== 'string'
            ? 'recipientName is not a string'
            : selectedAddress.recipientName.trim().length === 0
            ? 'recipientName is empty'
            : null,
        },
        recipientPhone: {
          value: selectedAddress?.recipientPhone,
          originalValue: selectedAddress?.recipientPhone,
          type: typeof selectedAddress?.recipientPhone,
          isValid: !!selectedAddress?.recipientPhone && 
                   typeof selectedAddress.recipientPhone === 'string' && 
                   selectedAddress.recipientPhone.trim().length > 0,
          required: true,
          error: !selectedAddress?.recipientPhone 
            ? 'Missing recipientPhone' 
            : typeof selectedAddress.recipientPhone !== 'string'
            ? 'recipientPhone is not a string'
            : selectedAddress.recipientPhone.trim().length === 0
            ? 'recipientPhone is empty'
            : null,
        },
        street: {
          value: selectedAddress?.street,
          originalValue: selectedAddress?.street,
          type: typeof selectedAddress?.street,
          isValid: !!selectedAddress?.street && 
                   typeof selectedAddress.street === 'string' && 
                   selectedAddress.street.trim().length > 0,
          required: true,
          error: !selectedAddress?.street 
            ? 'Missing street' 
            : typeof selectedAddress.street !== 'string'
            ? 'street is not a string'
            : selectedAddress.street.trim().length === 0
            ? 'street is empty'
            : null,
        },
        communeId: {
          value: communeIdNum,
          originalValue: communeIdRaw,
          originalType: typeof communeIdRaw,
          allSources: {
            'communeId': selectedAddress?.communeId,
            'commune.id': selectedAddress?.commune?.id,
            'wardId': selectedAddress?.wardId,
          },
          isValid: communeIdNum !== null && communeIdNum > 0,
          required: true,
          error: communeIdNum === null 
            ? 'Missing or invalid communeId (checked: communeId, commune.id, wardId)' 
            : communeIdNum <= 0
            ? 'communeId must be greater than 0'
            : null,
        },
        provinceId: {
          value: provinceIdNum,
          originalValue: provinceIdRaw,
          originalType: typeof provinceIdRaw,
          allSources: {
            'provinceId': selectedAddress?.provinceId,
            'province.id': selectedAddress?.province?.id,
            'cityId': selectedAddress?.cityId,
          },
          isValid: provinceIdNum !== null && provinceIdNum > 0,
          required: true,
          error: provinceIdNum === null 
            ? 'Missing or invalid provinceId (checked: provinceId, province.id, cityId)' 
            : provinceIdNum <= 0
            ? 'provinceId must be greater than 0'
            : null,
        },
        postalCode: {
          value: selectedAddress?.postalCode,
          originalValue: selectedAddress?.postalCode,
          type: typeof selectedAddress?.postalCode,
          isValid: true, // Optional field
          required: false,
          defaultValue: '700000',
        },
      };
      
      console.log('[Checkout] Address validation results:', JSON.stringify(addressValidation, null, 2));
      
      // Check if all required fields are valid
      const allRequiredValid = Object.values(addressValidation)
        .filter(field => field.required)
        .every(field => field.isValid);
      
      if (!allRequiredValid) {
        console.log('[Checkout] ❌ Address validation failed!');
        const invalidFields = Object.entries(addressValidation)
          .filter(([key, field]) => field.required && !field.isValid)
          .map(([key, field]) => ({
            field: key,
            value: field.originalValue,
            type: field.originalType || field.type,
            error: field.error,
          }));
        
        console.log('[Checkout] Invalid required fields details:', JSON.stringify(invalidFields, null, 2));
        
        // Create detailed error message (sửa typo: communeld -> communeId, provinceld -> provinceId)
        const fieldNameMap = {
          'communeId': 'communeId',
          'provinceId': 'provinceId',
        };
        
        const errorMessages = invalidFields.map(f => {
          const fieldName = fieldNameMap[f.field] || f.field;
          return `- ${fieldName}: ${f.error || 'Invalid'} (value: ${f.value}, type: ${f.type})`;
        }).join('\n');
        
        const errorMessage = `Thông tin địa chỉ giao hàng không hợp lệ:\n\n${errorMessages}\n\nVui lòng kiểm tra lại địa chỉ hoặc chọn địa chỉ khác.`;
        
        console.log('[Checkout] Error message:', errorMessage);
        console.log('[Checkout] Full address object for debugging:', JSON.stringify(selectedAddress, null, 2));
        Alert.alert('Lỗi', errorMessage);
        setSubmitting(false);
        return;
      }
      console.log('[Checkout] ✅ All required address fields are valid');
      
      // Note: Sử dụng communeIdNum và provinceIdNum đã convert trong request body
      console.log('[Checkout] Using converted IDs in request:');
      console.log('[Checkout]   communeId:', communeIdNum, '(original was:', selectedAddress?.communeId, ')');
      console.log('[Checkout]   provinceId:', provinceIdNum, '(original was:', selectedAddress?.provinceId, ')');

      // Prepare request body theo OrderCreateDto schema
      console.log('[Checkout] ========== PREPARING REQUEST BODY ==========');
      // Sử dụng converted IDs (communeIdNum, provinceIdNum) và trim text fields
      const requestBody = {
        totalAmount: totalAmount, // Required
        discountAmount: discountAmount, // Required
        shippingFee: currentShippingFee, // Required
        finalAmount: finalAmount, // Required
        recipientName: selectedAddress.recipientName.trim(), // Required - trim whitespace
        recipientPhone: selectedAddress.recipientPhone.trim(), // Required - trim whitespace
        street: selectedAddress.street.trim(), // Required - trim whitespace
        communeId: communeIdNum, // Required - use converted number
        provinceId: provinceIdNum, // Required - use converted number
        items: items, // Required, min 1 item
        paymentMethod: paymentMethodObj, // Required
      };
      
      console.log('[Checkout] Request body address fields:');
      console.log('[Checkout]   recipientName:', requestBody.recipientName);
      console.log('[Checkout]   recipientPhone:', requestBody.recipientPhone);
      console.log('[Checkout]   street:', requestBody.street);
      console.log('[Checkout]   communeId:', requestBody.communeId, '(type:', typeof requestBody.communeId, ')');
      console.log('[Checkout]   provinceId:', requestBody.provinceId, '(type:', typeof requestBody.provinceId, ')');

      // Add optional fields if available
      // postalCode: default "700000" nếu không có
      const postalCode = selectedAddress.postalCode || '700000';
      requestBody.postalCode = postalCode;
      console.log('[Checkout] Postal code (with default):', postalCode);
      
      // voucherIdsApplied: optional array
      if (formData.voucherIdsApplied && Array.isArray(formData.voucherIdsApplied) && formData.voucherIdsApplied.length > 0) {
        requestBody.voucherIdsApplied = formData.voucherIdsApplied;
        console.log('[Checkout] Vouchers applied:', formData.voucherIdsApplied);
      } else {
        console.log('[Checkout] No vouchers applied');
      }
      
      // pointUsed: optional, min 0
      if (formData.pointUsed && formData.pointUsed > 0) {
        requestBody.pointUsed = formData.pointUsed;
        console.log('[Checkout] Points used:', formData.pointUsed);
      } else {
        console.log('[Checkout] No points used');
      }
      
      // DEBUG: Log shipping information that will be sent
      console.log('[Checkout] ========== SHIPPING INFORMATION TO SEND ==========');
      console.log('[Checkout] Recipient Name:', requestBody.recipientName);
      console.log('[Checkout] Recipient Phone:', requestBody.recipientPhone);
      console.log('[Checkout] Street Address:', requestBody.street);
      console.log('[Checkout] Commune ID:', requestBody.communeId);
      console.log('[Checkout] Province ID:', requestBody.provinceId);
      console.log('[Checkout] Postal Code:', requestBody.postalCode);
      console.log('[Checkout] Shipping Fee:', requestBody.shippingFee);
      
      // DEBUG: Log order summary
      console.log('[Checkout] ========== ORDER SUMMARY ==========');
      console.log('[Checkout] Total Amount:', requestBody.totalAmount);
      console.log('[Checkout] Discount Amount:', requestBody.discountAmount);
      console.log('[Checkout] Shipping Fee:', requestBody.shippingFee);
      console.log('[Checkout] Final Amount:', requestBody.finalAmount);
      console.log('[Checkout] Number of Items:', requestBody.items.length);
      console.log('[Checkout] Payment Method:', JSON.stringify(requestBody.paymentMethod, null, 2));

      // DEBUG: Log form data
      console.log('[Checkout] ========== REQUEST BODY PREPARED ==========');
      console.log('[Checkout] Form data:', JSON.stringify(formData, null, 2));
      console.log('[Checkout] Full request body:', JSON.stringify(requestBody, null, 2));
      console.log('[Checkout] Request body (compact):', JSON.stringify(requestBody));
      console.log('[Checkout] Request body size:', JSON.stringify(requestBody).length, 'bytes');

      // Get API URL using getApiUrl helper
      const apiUrl = getApiUrl(API_ENDPOINTS.CREATE_ORDER);

      // Prepare request headers
      const requestHeaders = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // Prepare request body as JSON string
      const requestBodyString = JSON.stringify(requestBody);

      // DEBUG: Log complete request details
      console.log('[Checkout] ========== API REQUEST DETAILS ==========');
      console.log('[Checkout] Endpoint:', API_ENDPOINTS.CREATE_ORDER);
      console.log('[Checkout] Full API URL:', apiUrl);
      console.log('[Checkout] Request Method: POST');
      console.log('[Checkout] Request Headers:', JSON.stringify({
        'Authorization': `Bearer ${token ? token.substring(0, 20) + '...' : 'NO TOKEN'}`,
        'Content-Type': 'application/json',
      }, null, 2));
      console.log('[Checkout] Token present:', !!token);
      console.log('[Checkout] Token length:', token ? token.length : 0);
      console.log('[Checkout] Timeout: 30 seconds');
      console.log('[Checkout] Request body string length:', requestBodyString.length, 'bytes');
      
      // DEBUG: Log request body structure
      console.log('[Checkout] ========== REQUEST BODY STRUCTURE ==========');
      console.log('[Checkout] Request body keys:', Object.keys(requestBody));
      console.log('[Checkout] Request body has totalAmount:', 'totalAmount' in requestBody);
      console.log('[Checkout] Request body has discountAmount:', 'discountAmount' in requestBody);
      console.log('[Checkout] Request body has shippingFee:', 'shippingFee' in requestBody);
      console.log('[Checkout] Request body has finalAmount:', 'finalAmount' in requestBody);
      console.log('[Checkout] Request body has recipientName:', 'recipientName' in requestBody);
      console.log('[Checkout] Request body has recipientPhone:', 'recipientPhone' in requestBody);
      console.log('[Checkout] Request body has street:', 'street' in requestBody);
      console.log('[Checkout] Request body has communeId:', 'communeId' in requestBody);
      console.log('[Checkout] Request body has provinceId:', 'provinceId' in requestBody);
      console.log('[Checkout] Request body has postalCode:', 'postalCode' in requestBody);
      console.log('[Checkout] Request body has items:', 'items' in requestBody);
      console.log('[Checkout] Request body has paymentMethod:', 'paymentMethod' in requestBody);
      console.log('[Checkout] Request body has voucherIdsApplied:', 'voucherIdsApplied' in requestBody);
      console.log('[Checkout] Request body has pointUsed:', 'pointUsed' in requestBody);
      
      // DEBUG: Log request body by sections
      console.log('[Checkout] ========== REQUEST BODY BREAKDOWN ==========');
      console.log('[Checkout] --- Order Amounts ---');
      console.log('[Checkout] totalAmount:', requestBody.totalAmount, '(type:', typeof requestBody.totalAmount, ')');
      console.log('[Checkout] discountAmount:', requestBody.discountAmount, '(type:', typeof requestBody.discountAmount, ')');
      console.log('[Checkout] shippingFee:', requestBody.shippingFee, '(type:', typeof requestBody.shippingFee, ')');
      console.log('[Checkout] finalAmount:', requestBody.finalAmount, '(type:', typeof requestBody.finalAmount, ')');
      
      console.log('[Checkout] --- Shipping Address ---');
      console.log('[Checkout] recipientName:', requestBody.recipientName, '(type:', typeof requestBody.recipientName, ', length:', requestBody.recipientName?.length, ')');
      console.log('[Checkout] recipientPhone:', requestBody.recipientPhone, '(type:', typeof requestBody.recipientPhone, ', length:', requestBody.recipientPhone?.length, ')');
      console.log('[Checkout] street:', requestBody.street, '(type:', typeof requestBody.street, ', length:', requestBody.street?.length, ')');
      console.log('[Checkout] communeId:', requestBody.communeId, '(type:', typeof requestBody.communeId, ')');
      console.log('[Checkout] provinceId:', requestBody.provinceId, '(type:', typeof requestBody.provinceId, ')');
      console.log('[Checkout] postalCode:', requestBody.postalCode, '(type:', typeof requestBody.postalCode, ')');
      
      console.log('[Checkout] --- Items ---');
      console.log('[Checkout] items count:', requestBody.items.length);
      requestBody.items.forEach((item, index) => {
        console.log(`[Checkout] Item ${index + 1}:`, {
          variantId: item.variantId,
          colorId: item.colorId,
          quantity: item.quantity,
          price: item.price,
          discount: item.discount,
        });
      });
      
      console.log('[Checkout] --- Payment Method ---');
      console.log('[Checkout] paymentMethod:', JSON.stringify(requestBody.paymentMethod, null, 2));
      
      if (requestBody.voucherIdsApplied) {
        console.log('[Checkout] --- Vouchers ---');
        console.log('[Checkout] voucherIdsApplied:', JSON.stringify(requestBody.voucherIdsApplied, null, 2));
      }
      
      if (requestBody.pointUsed) {
        console.log('[Checkout] --- Points ---');
        console.log('[Checkout] pointUsed:', requestBody.pointUsed, '(type:', typeof requestBody.pointUsed, ')');
      }
      
      // DEBUG: Log final request body (formatted)
      console.log('[Checkout] ========== FINAL REQUEST BODY (JSON) ==========');
      console.log('[Checkout] Request body (formatted):', JSON.stringify(requestBody, null, 2));
      console.log('[Checkout] Request body (compact):', requestBodyString);
      
      // DEBUG: Log example request body format for comparison (theo mẫu chuẩn)
      console.log('[Checkout] ========== EXAMPLE REQUEST FORMAT (MẪU CHUẨN) ==========');
      const exampleRequest = {
        totalAmount: 44000000,
        discountAmount: 8800000,
        shippingFee: 22000,
        finalAmount: 35222000,
        recipientName: "Nguyễn Văn A",
        recipientPhone: "0987654321",
        street: "123 Đường Nguyễn Huệ",
        communeId: 2677,
        provinceId: 28,
        postalCode: "700000",
        items: [
          {
            variantId: 1,
            colorId: 1,
            quantity: 1,
            price: 44000000,
            discount: 35200000
          }
        ],
        paymentMethod: {
          id: 1,
          code: "VNPAY",
          name: "VNPay"
        }
      };
      console.log('[Checkout] Example request format (mẫu chuẩn):', JSON.stringify(exampleRequest, null, 2));
      console.log('[Checkout] --- Structure Comparison ---');
      
      // So sánh structure (chỉ so sánh required fields, không so sánh optional)
      const requiredFields = ['totalAmount', 'discountAmount', 'shippingFee', 'finalAmount', 
                              'recipientName', 'recipientPhone', 'street', 'communeId', 
                              'provinceId', 'postalCode', 'items', 'paymentMethod'];
      const actualRequiredFields = requiredFields.filter(field => field in requestBody);
      const exampleRequiredFields = requiredFields.filter(field => field in exampleRequest);
      
      console.log('[Checkout] Required fields in actual request:', actualRequiredFields);
      console.log('[Checkout] Required fields in example:', exampleRequiredFields);
      console.log('[Checkout] All required fields present:', 
        requiredFields.every(field => field in requestBody));
      
      // Kiểm tra optional fields - chỉ nên có nếu có giá trị
      const optionalFields = ['voucherIdsApplied', 'pointUsed'];
      const actualOptionalFields = optionalFields.filter(field => field in requestBody);
      console.log('[Checkout] Optional fields in actual request:', actualOptionalFields);
      console.log('[Checkout] Optional fields should only be present if they have values');
      
      // DEBUG: Compare actual request with example format (theo mẫu chuẩn)
      console.log('[Checkout] ========== REQUEST FORMAT COMPARISON ==========');
      const comparison = {
        totalAmount: {
          example: 'number (44000000)',
          actual: `${typeof requestBody.totalAmount} (${requestBody.totalAmount})`,
          match: typeof requestBody.totalAmount === 'number'
        },
        discountAmount: {
          example: 'number (8800000)',
          actual: `${typeof requestBody.discountAmount} (${requestBody.discountAmount})`,
          match: typeof requestBody.discountAmount === 'number'
        },
        shippingFee: {
          example: 'number (22000)',
          actual: `${typeof requestBody.shippingFee} (${requestBody.shippingFee})`,
          match: typeof requestBody.shippingFee === 'number'
        },
        finalAmount: {
          example: 'number (35222000)',
          actual: `${typeof requestBody.finalAmount} (${requestBody.finalAmount})`,
          match: typeof requestBody.finalAmount === 'number'
        },
        recipientName: {
          example: 'string ("Nguyễn Văn A")',
          actual: `${typeof requestBody.recipientName} ("${requestBody.recipientName}")`,
          match: typeof requestBody.recipientName === 'string'
        },
        recipientPhone: {
          example: 'string ("0987654321")',
          actual: `${typeof requestBody.recipientPhone} ("${requestBody.recipientPhone}")`,
          match: typeof requestBody.recipientPhone === 'string'
        },
        street: {
          example: 'string ("123 Đường Nguyễn Huệ")',
          actual: `${typeof requestBody.street} ("${requestBody.street}")`,
          match: typeof requestBody.street === 'string'
        },
        communeId: {
          example: 'number (2677)',
          actual: `${typeof requestBody.communeId} (${requestBody.communeId})`,
          match: typeof requestBody.communeId === 'number'
        },
        provinceId: {
          example: 'number (28)',
          actual: `${typeof requestBody.provinceId} (${requestBody.provinceId})`,
          match: typeof requestBody.provinceId === 'number'
        },
        postalCode: {
          example: 'string ("700000")',
          actual: `${typeof requestBody.postalCode} ("${requestBody.postalCode}")`,
          match: typeof requestBody.postalCode === 'string'
        },
        items: {
          example: 'array with variantId, colorId, quantity, price, discount',
          actual: `array with ${requestBody.items.length} item(s)`,
          match: Array.isArray(requestBody.items) && requestBody.items.length > 0
        },
        paymentMethod: {
          example: 'object with id, code, name',
          actual: `object with keys: ${Object.keys(requestBody.paymentMethod).join(', ')}`,
          match: typeof requestBody.paymentMethod === 'object' && 
                 'code' in requestBody.paymentMethod && 
                 'name' in requestBody.paymentMethod
        }
      };
      
      // Optional fields - chỉ log nếu có trong request
      if ('voucherIdsApplied' in requestBody) {
        comparison.voucherIdsApplied = {
          example: 'optional - only if has value',
          actual: `array ${JSON.stringify(requestBody.voucherIdsApplied)}`,
          match: Array.isArray(requestBody.voucherIdsApplied) && requestBody.voucherIdsApplied.length > 0
        };
      }
      
      if ('pointUsed' in requestBody) {
        comparison.pointUsed = {
          example: 'optional - only if has value',
          actual: `${typeof requestBody.pointUsed} (${requestBody.pointUsed})`,
          match: typeof requestBody.pointUsed === 'number' && requestBody.pointUsed > 0
        };
      }
      
      console.log('[Checkout] Format comparison:', JSON.stringify(comparison, null, 2));
      
      const allFormatsMatch = Object.values(comparison).every(item => item.match === true);
      console.log('[Checkout] All formats match example:', allFormatsMatch);
      
      // Kiểm tra request body có đúng format như mẫu không
      const hasOnlyRequiredFields = !('voucherIdsApplied' in requestBody) && !('pointUsed' in requestBody);
      const hasOptionalFieldsOnlyIfNeeded = 
        (!('voucherIdsApplied' in requestBody) || 
         (Array.isArray(requestBody.voucherIdsApplied) && requestBody.voucherIdsApplied.length > 0)) &&
        (!('pointUsed' in requestBody) || 
         (typeof requestBody.pointUsed === 'number' && requestBody.pointUsed > 0));
      
      console.log('[Checkout] Request has only required fields (no optional):', hasOnlyRequiredFields);
      console.log('[Checkout] Optional fields only present if they have values:', hasOptionalFieldsOnlyIfNeeded);
      
      if (!allFormatsMatch) {
        const mismatchedFields = Object.entries(comparison)
          .filter(([key, item]) => !item.match)
          .map(([key]) => key);
        console.log('[Checkout] ⚠️ Fields with format mismatch:', mismatchedFields);
      } else {
        console.log('[Checkout] ✅ Request format matches example perfectly!');
      }
      
      // Final validation - đảm bảo request body đúng như mẫu
      console.log('[Checkout] ========== FINAL REQUEST BODY VALIDATION ==========');
      const finalValidation = {
        hasAllRequiredFields: requiredFields.every(field => field in requestBody),
        hasCorrectTypes: {
          totalAmount: typeof requestBody.totalAmount === 'number',
          discountAmount: typeof requestBody.discountAmount === 'number',
          shippingFee: typeof requestBody.shippingFee === 'number',
          finalAmount: typeof requestBody.finalAmount === 'number',
          recipientName: typeof requestBody.recipientName === 'string',
          recipientPhone: typeof requestBody.recipientPhone === 'string',
          street: typeof requestBody.street === 'string',
          communeId: typeof requestBody.communeId === 'number',
          provinceId: typeof requestBody.provinceId === 'number',
          postalCode: typeof requestBody.postalCode === 'string',
          items: Array.isArray(requestBody.items),
          paymentMethod: typeof requestBody.paymentMethod === 'object',
        },
        itemsStructure: requestBody.items.every(item => 
          typeof item.variantId === 'number' &&
          typeof item.colorId === 'number' &&
          typeof item.quantity === 'number' &&
          typeof item.price === 'number' &&
          typeof item.discount === 'number'
        ),
        paymentMethodStructure: 
          typeof requestBody.paymentMethod.code === 'string' &&
          typeof requestBody.paymentMethod.name === 'string' &&
          (requestBody.paymentMethod.id === undefined || typeof requestBody.paymentMethod.id === 'number'),
        noUnnecessaryFields: Object.keys(requestBody).every(key => 
          requiredFields.includes(key) || 
          (key === 'voucherIdsApplied' && Array.isArray(requestBody.voucherIdsApplied) && requestBody.voucherIdsApplied.length > 0) ||
          (key === 'pointUsed' && typeof requestBody.pointUsed === 'number' && requestBody.pointUsed > 0)
        )
      };
      
      console.log('[Checkout] Final validation results:', JSON.stringify(finalValidation, null, 2));
      
      const allValid = 
        finalValidation.hasAllRequiredFields &&
        Object.values(finalValidation.hasCorrectTypes).every(v => v === true) &&
        finalValidation.itemsStructure &&
        finalValidation.paymentMethodStructure &&
        finalValidation.noUnnecessaryFields;
      
      if (allValid) {
        console.log('[Checkout] ✅ Request body is valid and matches the example format!');
      } else {
        console.log('[Checkout] ❌ Request body validation failed!');
        const issues = [];
        if (!finalValidation.hasAllRequiredFields) issues.push('Missing required fields');
        if (!Object.values(finalValidation.hasCorrectTypes).every(v => v)) issues.push('Incorrect field types');
        if (!finalValidation.itemsStructure) issues.push('Invalid items structure');
        if (!finalValidation.paymentMethodStructure) issues.push('Invalid paymentMethod structure');
        if (!finalValidation.noUnnecessaryFields) issues.push('Has unnecessary fields');
        console.log('[Checkout] Issues found:', issues);
      }
      
      // Validate request body structure
      console.log('[Checkout] ========== REQUEST BODY VALIDATION ==========');
      const requestValidationResults = {
        hasRequiredFields: {
          totalAmount: typeof requestBody.totalAmount === 'number',
          discountAmount: typeof requestBody.discountAmount === 'number',
          shippingFee: typeof requestBody.shippingFee === 'number',
          finalAmount: typeof requestBody.finalAmount === 'number',
          recipientName: typeof requestBody.recipientName === 'string' && requestBody.recipientName.length > 0,
          recipientPhone: typeof requestBody.recipientPhone === 'string' && requestBody.recipientPhone.length > 0,
          street: typeof requestBody.street === 'string' && requestBody.street.length > 0,
          communeId: typeof requestBody.communeId === 'number' && requestBody.communeId > 0,
          provinceId: typeof requestBody.provinceId === 'number' && requestBody.provinceId > 0,
          items: Array.isArray(requestBody.items) && requestBody.items.length > 0,
          paymentMethod: typeof requestBody.paymentMethod === 'object' && requestBody.paymentMethod !== null,
        },
        hasOptionalFields: {
          postalCode: 'postalCode' in requestBody,
          voucherIdsApplied: 'voucherIdsApplied' in requestBody,
          pointUsed: 'pointUsed' in requestBody,
        },
      };
      
      const allRequestFieldsValid = Object.values(requestValidationResults.hasRequiredFields).every(v => v === true);
      console.log('[Checkout] Request validation results:', JSON.stringify(requestValidationResults, null, 2));
      console.log('[Checkout] All required request fields valid:', allRequestFieldsValid);
      
      if (!allRequestFieldsValid) {
        const invalidRequestFields = Object.entries(requestValidationResults.hasRequiredFields)
          .filter(([key, valid]) => !valid)
          .map(([key]) => key);
        console.log('[Checkout] ❌ Invalid required request fields:', invalidRequestFields);
        Alert.alert('Lỗi', 'Request body không hợp lệ. Vui lòng thử lại.');
        setSubmitting(false);
        return;
      }
      console.log('[Checkout] ✅ Request body validation passed');

      // DEBUG: Log request in curl format for testing
      console.log('[Checkout] ========== REQUEST IN CURL FORMAT ==========');
      console.log('[Checkout] curl -X POST "' + apiUrl + '" \\');
      console.log('[Checkout]   -H "Authorization: Bearer ' + (token ? token.substring(0, 20) + '...' : 'YOUR_TOKEN') + '" \\');
      console.log('[Checkout]   -H "Content-Type: application/json" \\');
      console.log('[Checkout]   -d \'' + requestBodyString + '\'');
      
      // DEBUG: Log request in readable format
      console.log('[Checkout] ========== REQUEST READABLE FORMAT ==========');
      console.log('[Checkout] POST ' + apiUrl);
      console.log('[Checkout] Headers:');
      console.log('[Checkout]   Authorization: Bearer ' + (token ? token.substring(0, 20) + '...' : 'NO_TOKEN'));
      console.log('[Checkout]   Content-Type: application/json');
      console.log('[Checkout] Body:');
      console.log(JSON.stringify(requestBody, null, 2));

      // Call API với timeout 30 giây (theo spec)
      console.log('[Checkout] ========== SENDING API REQUEST ==========');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout
      
      console.log('[Checkout] Starting fetch request...');
      console.log('[Checkout] Request timestamp:', new Date().toISOString());

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: requestHeaders,
        body: requestBodyString,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log('[Checkout] Request completed at:', new Date().toISOString());

      // DEBUG: Log response status
      console.log('[Checkout] ========== API RESPONSE ==========');
      console.log('[Checkout] Response status:', response.status);
      console.log('[Checkout] Response status text:', response.statusText);
      console.log('[Checkout] Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries())));
      console.log('[Checkout] Response OK:', response.ok);

      const result = await response.json();

      // DEBUG: Log API response
      console.log('[Checkout] Full API response:', JSON.stringify(result, null, 2));
      console.log('[Checkout] Response status code:', result.status);
      console.log('[Checkout] Response message:', result.message);
      console.log('[Checkout] Response data:', JSON.stringify(result.data, null, 2));
      console.log('[Checkout] Response errors:', JSON.stringify(result.errors, null, 2));

      // Xử lý response theo spec mới
      if (result.status === 200 && result.data) {
        // Response format: { status: 200, message: "Order created successfully", data: { orderId: 1 } }
        const orderId = result.data.orderId;
        
        console.log('[Checkout] ========== ORDER CREATED ==========');
        console.log('[Checkout] Full response:', JSON.stringify(result, null, 2));
        console.log('[Checkout] Order ID:', orderId);
        
        // Lưu orderId vào state để dùng sau
        if (orderId) {
          setCreatedOrderCode(orderId);
          console.log('[Checkout] Saved orderId to state:', orderId);
        }
        
        // Lưu orderId vào biến để dùng trong alert buttons
        const savedOrderId = orderId;
        
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
        
        // Kiểm tra nếu payment method là VNPay, tạo payment URL và mở
        const currentPaymentMethod = paymentMethods.find(m => m.id === formData.paymentMethod);
        // Check case-insensitive để đảm bảo nhận diện đúng VNPay
        const isVNPay = currentPaymentMethod && (
          currentPaymentMethod.code?.toUpperCase() === 'VNPAY' || 
          currentPaymentMethod.id?.toLowerCase() === 'vnpay'
        );
        
        // Nếu là VNPay, xử lý thanh toán và return (không hiển thị alert "Thành công")
        if (isVNPay && orderId) {
          console.log('[Checkout] ========== CREATING VNPAY PAYMENT URL ==========');
          console.log('[Checkout] Order ID:', orderId);
          console.log('[Checkout] Payment method: VNPAY');
          
          try {
            const token = await getAuthToken();
            if (!token) {
              console.error('[Checkout] ❌ No auth token for VNPay payment');
              Alert.alert('Lỗi', 'Không thể tạo URL thanh toán. Vui lòng thử lại.');
              setSubmitting(false);
              return;
            }
            
            const vnpayApiUrl = getApiUrl(API_ENDPOINTS.VNPAY_MOBILE_CREATE);
            
            // Timeout 10 giây theo spec
            const vnpayController = new AbortController();
            const vnpayTimeoutId = setTimeout(() => vnpayController.abort(), 10000);
            
            const vnpayResponse = await fetch(vnpayApiUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                orderId: orderId,
              }),
              signal: vnpayController.signal,
            });
            
            clearTimeout(vnpayTimeoutId);
            
            const vnpayResult = await vnpayResponse.json();
            
            // Kiểm tra cả statusCode và status (một số API dùng status thay vì statusCode)
            const statusCode = vnpayResult.statusCode || vnpayResult.status;
            const isSuccess = statusCode === 200 && vnpayResponse.ok;
            
            // Log chi tiết để debug lỗi VNPay
            if (!isSuccess || !vnpayResult.data?.paymentUrl) {
              console.error('[Checkout] VNPay API Error:', {
                httpStatus: vnpayResponse.status,
                statusCode: statusCode,
                message: vnpayResult.message,
                data: vnpayResult.data,
                errors: vnpayResult.errors,
              });
            }
            
            if (isSuccess && vnpayResult.data && vnpayResult.data.paymentUrl) {
              const paymentUrl = vnpayResult.data.paymentUrl;
              console.log('[Checkout] ✅ VNPay payment URL created successfully');
              
              // Kiểm tra URL có hợp lệ không
              if (!paymentUrl || (!paymentUrl.startsWith('http://') && !paymentUrl.startsWith('https://'))) {
                console.error('[Checkout] ❌ Invalid payment URL format');
                Alert.alert('Lỗi', 'URL thanh toán không hợp lệ. Vui lòng thử lại.');
                setSubmitting(false);
                return;
              }
              
              // Navigate đến WebView screen để thanh toán
              // KHÔNG hiển thị alert "Thành công" vì chưa thanh toán
              setSubmitting(false);
              navigation.navigate('VNPayPaymentScreen', {
                paymentUrl: paymentUrl,
                orderId: orderId,
              });
              // Return ngay để không chạy tiếp phần hiển thị alert "Thành công"
              return;
            } else {
              // Xử lý lỗi từ API
              let errorMessage = 'Không thể tạo URL thanh toán. Vui lòng thử lại.';
              
              // Kiểm tra HTTP status code
              if (vnpayResponse.status === 503 || statusCode === 503) {
                errorMessage = vnpayResult.message || 'Dịch vụ thanh toán tạm thời không khả dụng. Vui lòng thử lại sau.';
              } else if (vnpayResponse.status === 400 || statusCode === 400) {
                errorMessage = vnpayResult.message || 'Không thể tạo URL thanh toán.';
                if (vnpayResult.errors) {
                  const errorDetails = Object.values(vnpayResult.errors)
                    .flat()
                    .map(e => typeof e === 'string' ? e : e.message || e)
                    .join('\n');
                  if (errorDetails) {
                    errorMessage += '\n\n' + errorDetails;
                  }
                }
              } else if (vnpayResponse.status === 404 || statusCode === 404) {
                errorMessage = vnpayResult.message || 'Không tìm thấy đơn hàng hoặc thông tin khách hàng.';
              } else if (vnpayResponse.status === 403 || statusCode === 403) {
                errorMessage = vnpayResult.message || 'Bạn không có quyền thanh toán đơn hàng này.';
              } else if (vnpayResult.message) {
                errorMessage = vnpayResult.message;
              } else if (!vnpayResult.data || !vnpayResult.data.paymentUrl) {
                errorMessage = 'Không nhận được payment URL từ server. Vui lòng thử lại.';
              }
              
              console.error('[Checkout] ❌ VNPay payment URL creation failed:', errorMessage);
              Alert.alert('Lỗi', errorMessage);
              setSubmitting(false);
              return;
            }
          } catch (error) {
            console.error('[Checkout] ========== VNPAY PAYMENT ERROR ==========');
            console.error('[Checkout] Error name:', error.name);
            console.error('[Checkout] Error message:', error.message);
            
            if (error.name === 'AbortError') {
              console.log('[Checkout] ❌ VNPay request timeout (10s exceeded)');
              Alert.alert('Lỗi', 'Yêu cầu tạo URL thanh toán đã hết thời gian chờ. Vui lòng thử lại.');
            } else {
              console.log('[Checkout] ❌ Unexpected error during VNPay payment');
              Alert.alert('Lỗi', 'Đã xảy ra lỗi khi tạo URL thanh toán. Vui lòng thử lại.');
            }
            setSubmitting(false);
            return;
          }
        }
        
        // Success - Chỉ hiển thị thông báo cho payment methods KHÔNG phải VNPay (như COD)
        // VNPay đã được xử lý ở trên và đã return, nên code chỉ chạy đến đây nếu KHÔNG phải VNPay
        if (!isVNPay) {
          const alertButtons = [
          {
            text: 'Quay lại',
            style: 'cancel',
            onPress: () => {
              navigation.navigate('HomeScreen', {
                screen: 'Orders'
              });
            },
          },
          {
            text: 'Xem đơn hàng',
            onPress: () => {
              const orderIdToUse = savedOrderId || createdOrderCode;
              
              if (orderIdToUse) {
                navigation.navigate('OrderDetailScreen', { orderId: orderIdToUse });
              } else {
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
        }
        setSubmitting(false);
      } else {
        // Handle errors theo spec
        let errorMessage = 'Đã xảy ra lỗi khi đặt hàng. Vui lòng thử lại.';
        
        if (result.status === 400) {
          // 400 Bad Request: Sản phẩm hết hàng, voucher không hợp lệ, giá trị đơn hàng tối thiểu không đạt
          errorMessage = result.message || 'Một hoặc nhiều sản phẩm đã hết hàng.';
        } else if (result.status === 503) {
          // 503 Service Unavailable: Order service không khả dụng
          errorMessage = result.message || 'Dịch vụ đặt hàng tạm thời không khả dụng. Vui lòng thử lại sau.';
        } else if (result.status === 404) {
          // 404 Not Found: Customer không tồn tại, Point configuration không tồn tại
          errorMessage = result.message || 'Không tìm thấy thông tin khách hàng.';
        } else if (result.message) {
          errorMessage = result.message;
        }
        
        // Hiển thị chi tiết lỗi nếu có
        if (result.errors && Array.isArray(result.errors) && result.errors.length > 0) {
          const errorDetails = result.errors.map(e => e.message).join('\n');
          errorMessage += '\n\n' + errorDetails;
        }
        
        Alert.alert('Lỗi', errorMessage);
      }
    } catch (error) {
      console.error('[Checkout] ========== CHECKOUT ERROR ==========');
      console.error('[Checkout] Error name:', error.name);
      console.error('[Checkout] Error message:', error.message);
      console.error('[Checkout] Error stack:', error.stack);
      console.error('[Checkout] Full error:', JSON.stringify(error, null, 2));
      
      // Xử lý timeout error
      if (error.name === 'AbortError') {
        console.log('[Checkout] ❌ Request timeout (30s exceeded)');
        Alert.alert('Lỗi', 'Yêu cầu đặt hàng đã hết thời gian chờ. Vui lòng thử lại.');
      } else {
        console.log('[Checkout] ❌ Unexpected error during checkout');
        Alert.alert('Lỗi', 'Đã xảy ra lỗi khi đặt hàng. Vui lòng thử lại.');
      }
    } finally {
      setSubmitting(false);
      console.log('[Checkout] ========== CHECKOUT PROCESS ENDED ==========');
    }
  };

  useEffect(() => {
    const initialize = async () => {
      await Promise.all([
        loadProvinces(),
        loadPaymentMethods(),
        loadCustomerAddresses(),
      ]);
      // Fetch customer info after addresses (as fallback)
      await fetchCustomerInfo();
    };
    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
                
                {/* Order Summary */}
                <View style={tw`pt-4 border-t border-gray-200 mt-2`}>
                  <View style={tw`flex-row justify-between items-center mb-2`}>
                    <Text style={tw`text-gray-700`}>Tổng tiền sản phẩm:</Text>
                    <Text style={tw`text-gray-800 font-medium`}>
                      {calculateTotal().toLocaleString('vi-VN')}đ
                    </Text>
                  </View>
                  <View style={tw`mb-2`}>
                    <View style={tw`flex-row justify-between items-center`}>
                      <Text style={tw`text-gray-700`}>Phí vận chuyển:</Text>
                      {loadingShippingFee ? (
                        <View style={tw`flex-row items-center`}>
                          <ActivityIndicator size="small" color="#2563eb" style={tw`mr-2`} />
                          <Text style={tw`text-gray-500 text-sm`}>Đang tính...</Text>
                        </View>
                      ) : hasShippingFee() ? (
                        <Text style={tw`text-gray-800 font-medium`}>
                          {getShippingFee().toLocaleString('vi-VN')}đ
                        </Text>
                      ) : shippingFeeError ? (
                        <View style={tw`flex-1 items-end`}>
                          <Text style={tw`text-red-600 text-sm`} numberOfLines={2}>
                            {shippingFeeError}
                          </Text>
                          <Pressable
                            onPress={async () => {
                              if (selectedAddress && selectedAddress.provinceId && selectedAddress.communeId) {
                                const province = await findProvinceById(selectedAddress.provinceId);
                                if (province && province.code) {
                                  const commune = await findCommuneById(selectedAddress.communeId, province.code);
                                  if (province.name && commune && commune.name) {
                                    await calculateShippingFee(province.name, commune.name);
                                  }
                                }
                              }
                            }}
                            style={tw`mt-1`}
                          >
                            <Text style={tw`text-blue-600 text-xs underline`}>Thử lại</Text>
                          </Pressable>
                        </View>
                      ) : (
                        <Text style={tw`text-gray-400 text-sm italic`}>
                          Chưa chọn địa chỉ
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={tw`flex-row justify-between items-center pt-2 border-t border-gray-300 mt-2`}>
                    <Text style={tw`text-lg font-bold text-gray-800`}>Tổng cộng:</Text>
                    <Text style={tw`text-xl font-bold text-red-600`}>
                      {calculateFinalAmount().toLocaleString('vi-VN')}đ
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Shipping Information Section */}
            <View style={tw`bg-white rounded-lg mb-4 shadow-sm`}>
              <View style={tw`p-4 border-b border-gray-100`}>
                <Text style={tw`text-lg font-bold text-gray-800`}>Thông tin giao hàng</Text>
              </View>
              <View style={tw`p-4`}>
                {/* Address Selection */}
                <View style={tw`mb-4`}>
                  <Text style={tw`text-gray-700 font-medium mb-2`}>Chọn địa chỉ giao hàng *</Text>
                  {loadingAddresses ? (
                    <View style={tw`border border-gray-300 rounded-lg p-3 flex-row items-center justify-center`}>
                      <ActivityIndicator size="small" color="#2563eb" />
                      <Text style={tw`text-gray-600 ml-2`}>Đang tải địa chỉ...</Text>
                    </View>
                  ) : customerAddresses.length === 0 ? (
                    <View style={tw`border border-red-300 rounded-lg p-3 bg-red-50`}>
                      <Text style={tw`text-red-600 text-center mb-3`}>
                        Bạn chưa có địa chỉ nào.
                      </Text>
                      <Pressable
                        style={tw`bg-blue-600 rounded-lg px-4 py-2`}
                        onPress={() => {
                          resetAddressForm();
                          setShowAddAddressModal(true);
                        }}
                      >
                        <Text style={tw`text-white font-bold text-center`}>Thêm địa chỉ mới</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      style={tw`border border-gray-300 rounded-lg p-3 flex-row justify-between items-center ${!selectedAddress ? 'border-red-400 bg-red-50' : ''}`}
                      onPress={() => setShowAddressModal(true)}
                    >
                      <View style={tw`flex-1`}>
                        {selectedAddress ? (
                          <>
                            <Text style={tw`text-gray-800 font-medium mb-1`}>
                              {selectedAddress.recipientName} - {selectedAddress.recipientPhone}
                            </Text>
                            <Text style={tw`text-gray-600 text-sm`} numberOfLines={2}>
                              {selectedAddress.street}
                            </Text>
                            {selectedAddress.isDefault && (
                              <View style={tw`mt-1`}>
                                <Text style={tw`text-blue-600 text-xs font-medium`}>Địa chỉ mặc định</Text>
                              </View>
                            )}
                          </>
                        ) : (
                          <Text style={tw`text-gray-400`}>Chọn địa chỉ giao hàng</Text>
                        )}
                      </View>
                      <Icon name="chevron-forward" type="ionicon" size={20} color="#666" />
                    </Pressable>
                  )}
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
                  Đặt hàng - {calculateFinalAmount().toLocaleString('vi-VN')}đ
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
                  provinces.map((province) => {
                    const isSelected = isSelectingForNewAddress
                      ? newAddressForm.provinceId === province.id
                      : formData.provinceId === province.id;
                    return (
                      <Pressable
                        key={province.id}
                        style={tw`p-4 border-b border-gray-100 ${isSelected ? 'bg-blue-50' : ''}`}
                        onPress={() => handleProvinceSelect(province)}
                      >
                        <Text style={tw`text-gray-800 ${isSelected ? 'font-bold' : ''}`}>
                          {province.name}
                        </Text>
                      </Pressable>
                    );
                  })
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
                ) : (isSelectingForNewAddress ? communesForNew : communes).length === 0 ? (
                  <View style={tw`p-8 items-center`}>
                    <Text style={tw`text-gray-500`}>Không có dữ liệu</Text>
                  </View>
                ) : (
                  (isSelectingForNewAddress ? communesForNew : communes).map((commune) => {
                    const isSelected = isSelectingForNewAddress
                      ? newAddressForm.communeId === commune.id
                      : formData.communeId === commune.id;
                    return (
                      <Pressable
                        key={commune.id}
                        style={tw`p-4 border-b border-gray-100 ${isSelected ? 'bg-blue-50' : ''}`}
                        onPress={() => handleCommuneSelect(commune)}
                      >
                        <Text style={tw`text-gray-800 ${isSelected ? 'font-bold' : ''}`}>
                          {commune.name}
                        </Text>
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Address Selection Modal */}
        <Modal
          visible={showAddressModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowAddressModal(false)}
        >
          <View style={tw`flex-1 bg-black bg-opacity-50 justify-end`}>
            <View style={tw`bg-white rounded-t-3xl max-h-96`}>
              <View style={tw`p-4 border-b border-gray-200 flex-row justify-between items-center`}>
                <Text style={tw`text-lg font-bold text-gray-800`}>Chọn địa chỉ giao hàng</Text>
                <Pressable onPress={() => setShowAddressModal(false)}>
                  <Icon name="close" type="ionicon" size={24} color="#666" />
                </Pressable>
              </View>
              <ScrollView style={tw`max-h-80`}>
                {loadingAddresses ? (
                  <View style={tw`p-8 items-center`}>
                    <ActivityIndicator size="large" color="#2563eb" />
                    <Text style={tw`text-gray-600 mt-2`}>Đang tải...</Text>
                  </View>
                ) : customerAddresses.length === 0 ? (
                  <View style={tw`p-8 items-center`}>
                    <Text style={tw`text-gray-500 text-center mb-4`}>
                      Bạn chưa có địa chỉ nào.
                    </Text>
                    <Pressable
                      style={tw`bg-blue-600 rounded-lg px-6 py-3`}
                      onPress={() => {
                        setShowAddressModal(false);
                        resetAddressForm();
                        setShowAddAddressModal(true);
                      }}
                    >
                      <Text style={tw`text-white font-bold`}>Thêm địa chỉ mới</Text>
                    </Pressable>
                  </View>
                ) : (
                  <>
                    {customerAddresses.map((address) => (
                      <View key={address.id} style={tw`border-b border-gray-100`}>
                        <Pressable
                          style={tw`p-4 ${selectedAddress?.id === address.id ? 'bg-blue-50' : ''}`}
                          onPress={() => handleAddressSelect(address)}
                        >
                          <View style={tw`flex-row items-start justify-between mb-2`}>
                            <View style={tw`flex-1`}>
                              <Text style={tw`text-gray-800 font-bold text-base mb-1`}>
                                {address.recipientName}
                              </Text>
                              <Text style={tw`text-gray-600 text-sm mb-1`}>
                                {address.recipientPhone}
                              </Text>
                              <Text style={tw`text-gray-700 text-sm`} numberOfLines={2}>
                                {address.street}
                              </Text>
                            </View>
                            {selectedAddress?.id === address.id && (
                              <Icon name="checkmark-circle" type="ionicon" size={24} color="#2563eb" />
                            )}
                          </View>
                          {address.isDefault && (
                            <View style={tw`mt-2`}>
                              <View style={tw`bg-blue-100 px-2 py-1 rounded self-start`}>
                                <Text style={tw`text-blue-600 text-xs font-medium`}>Địa chỉ mặc định</Text>
                              </View>
                            </View>
                          )}
                        </Pressable>
                        <View style={tw`px-4 pb-3 flex-row justify-end`}>
                          <Pressable
                            style={tw`flex-row items-center mr-4`}
                            onPress={() => loadAddressForEdit(address)}
                          >
                            <Icon name="create-outline" type="ionicon" size={20} color="#2563eb" />
                            <Text style={tw`text-blue-600 ml-1 text-sm font-medium`}>Chỉnh sửa</Text>
                          </Pressable>
                          <Pressable
                            style={tw`flex-row items-center`}
                            onPress={() => handleDeleteAddress(address)}
                            disabled={deletingAddressId === address.id}
                          >
                            {deletingAddressId === address.id ? (
                              <ActivityIndicator size="small" color="#ef4444" />
                            ) : (
                              <Icon name="trash-outline" type="ionicon" size={20} color="#ef4444" />
                            )}
                            <Text style={tw`text-red-600 ml-1 text-sm font-medium`}>
                              {deletingAddressId === address.id ? 'Đang xóa...' : 'Xóa'}
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    ))}
                    <Pressable
                      style={tw`p-4 border-t border-gray-200 flex-row items-center justify-center bg-gray-50`}
                      onPress={() => {
                        setShowAddressModal(false);
                        resetAddressForm();
                        setShowAddAddressModal(true);
                      }}
                    >
                      <Icon name="add-circle-outline" type="ionicon" size={24} color="#2563eb" />
                      <Text style={tw`text-blue-600 font-bold ml-2`}>Thêm địa chỉ mới</Text>
                    </Pressable>
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Add New Address Modal */}
        <Modal
          visible={showAddAddressModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowAddAddressModal(false)}
        >
          <View style={tw`flex-1 bg-black bg-opacity-50 justify-end`}>
            <View style={tw`bg-white rounded-t-3xl max-h-5/6`}>
              <View style={tw`p-4 border-b border-gray-200 flex-row justify-between items-center`}>
                <Text style={tw`text-lg font-bold text-gray-800`}>
                  {editingAddressId ? 'Chỉnh sửa địa chỉ' : 'Thêm địa chỉ mới'}
                </Text>
                <Pressable onPress={() => {
                  setShowAddAddressModal(false);
                  resetAddressForm();
                }}>
                  <Icon name="close" type="ionicon" size={24} color="#666" />
                </Pressable>
              </View>
              <ScrollView style={tw`max-h-96 p-4`}>
                {/* Recipient Name */}
                <View style={tw`mb-4`}>
                  <Text style={tw`text-gray-700 font-medium mb-2`}>Họ tên người nhận *</Text>
                  <TextInput
                    style={tw`border border-gray-300 rounded-lg p-3 text-gray-800`}
                    value={newAddressForm.recipientName}
                    onChangeText={(text) => setNewAddressForm((prev) => ({ ...prev, recipientName: text }))}
                    placeholder="Nhập họ tên người nhận"
                  />
                </View>

                {/* Phone Number */}
                <View style={tw`mb-4`}>
                  <Text style={tw`text-gray-700 font-medium mb-2`}>Số điện thoại *</Text>
                  <TextInput
                    style={tw`border border-gray-300 rounded-lg p-3 text-gray-800`}
                    value={newAddressForm.recipientPhone}
                    onChangeText={(text) => setNewAddressForm((prev) => ({ ...prev, recipientPhone: text }))}
                    placeholder="Nhập số điện thoại"
                    keyboardType="phone-pad"
                  />
                </View>

                {/* Province */}
                <View style={tw`mb-4`}>
                  <Text style={tw`text-gray-700 font-medium mb-2`}>Tỉnh/Thành phố *</Text>
                  <Pressable
                    style={tw`border border-gray-300 rounded-lg p-3 flex-row justify-between items-center`}
                    onPress={() => {
                      setIsSelectingForNewAddress(true);
                      setShowProvinceModal(true);
                    }}
                  >
                    <Text style={tw`text-gray-800 ${selectedProvinceForNew ? '' : 'text-gray-400'}`}>
                      {selectedProvinceForNew ? selectedProvinceForNew.name : 'Chọn tỉnh/thành phố'}
                    </Text>
                    <Icon name="chevron-down" type="ionicon" size={20} color="#666" />
                  </Pressable>
                </View>

                {/* Commune */}
                <View style={tw`mb-4`}>
                  <Text style={tw`text-gray-700 font-medium mb-2`}>Phường/Xã *</Text>
                  <Pressable
                    style={tw`border border-gray-300 rounded-lg p-3 flex-row justify-between items-center ${!selectedProvinceForNew ? 'opacity-50' : ''}`}
                    onPress={() => {
                      if (selectedProvinceForNew) {
                        setIsSelectingForNewAddress(true);
                        setShowCommuneModal(true);
                      }
                    }}
                    disabled={!selectedProvinceForNew}
                  >
                    <Text style={tw`text-gray-800 ${selectedCommuneForNew ? '' : 'text-gray-400'}`}>
                      {selectedCommuneForNew ? selectedCommuneForNew.name : 'Chọn phường/xã'}
                    </Text>
                    <Icon name="chevron-down" type="ionicon" size={20} color="#666" />
                  </Pressable>
                </View>

                {/* Street Address */}
                <View style={tw`mb-4`}>
                  <Text style={tw`text-gray-700 font-medium mb-2`}>Số nhà/Đường *</Text>
                  <TextInput
                    style={tw`border border-gray-300 rounded-lg p-3 text-gray-800`}
                    value={newAddressForm.street}
                    onChangeText={(text) => setNewAddressForm((prev) => ({ ...prev, street: text }))}
                    placeholder="Nhập số nhà, tên đường"
                    multiline
                  />
                </View>

                {/* Postal Code */}
                <View style={tw`mb-4`}>
                  <Text style={tw`text-gray-700 font-medium mb-2`}>Mã bưu điện</Text>
                  <TextInput
                    style={tw`border border-gray-300 rounded-lg p-3 text-gray-800`}
                    value={newAddressForm.postalCode}
                    onChangeText={(text) => setNewAddressForm((prev) => ({ ...prev, postalCode: text }))}
                    placeholder="Nhập mã bưu điện (tùy chọn)"
                    keyboardType="numeric"
                  />
                </View>

                {/* Is Default Checkbox */}
                <View style={tw`mb-4 flex-row items-center`}>
                  <Pressable
                    style={tw`flex-row items-center`}
                    onPress={() => setNewAddressForm((prev) => ({ ...prev, isDefault: !prev.isDefault }))}
                  >
                    <Icon
                      name={newAddressForm.isDefault ? 'checkbox' : 'checkbox-outline'}
                      type="ionicon"
                      size={24}
                      color={newAddressForm.isDefault ? '#2563eb' : '#666'}
                      style={tw`mr-2`}
                    />
                    <Text style={tw`text-gray-700`}>Đặt làm địa chỉ mặc định</Text>
                  </Pressable>
                </View>

                {/* Save Button */}
                <Pressable
                  style={tw`bg-blue-600 rounded-lg p-4 mb-4 ${savingAddress ? 'opacity-50' : ''}`}
                  onPress={handleSaveAddress}
                  disabled={savingAddress}
                >
                  {savingAddress ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={tw`text-white text-center font-bold text-lg`}>
                      {editingAddressId ? 'Cập nhật địa chỉ' : 'Lưu địa chỉ'}
                    </Text>
                  )}
                </Pressable>
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
