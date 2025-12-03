import { ActivityIndicator, Animated, Image, Pressable, StyleSheet, Text, View, Platform, Alert, ScrollView, RefreshControl } from 'react-native';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import Wrapper from '../components/Wrapper/Wrapper';
import CustomStatusBar from '../components/CustomStatusBar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tw from 'tailwind-react-native-classnames';
import { useDispatch, useSelector } from 'react-redux';
import { addToBasket, selectBasket, setBasket } from '../store/slices/siteSlice';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Icon } from 'react-native-elements';
import { mockBasketData, mockAsyncStorageData, mockProducts } from '../data/mockData';
import { getAuthToken } from '../utils/auth';

const Basket = ({ navigation }) => {
  const dispatch = useDispatch()
  const [loading, setloading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [totalprice, settotalprice] = useState(0)
  const [selectedItem, setselectedItem] = useState(null)
  const [showSwipeHint, setShowSwipeHint] = useState(true)
  const swipeableRef = useRef(null);
  const basket = useSelector(selectBasket)
  const [selectedItems, setSelectedItems] = useState(new Set()) // Set để lưu các item ID được chọn

  // DEBUG: Log basket state whenever it changes (simplified)
  useEffect(() => {
    console.log('[Basket] State changed - Items:', basket?.length || 0);
  }, [basket]);

  const fetchCartFromAPI = async () => {
    try {
      const token = await getAuthToken();
      if (!token) {
        console.log('[Basket] No token, skipping API fetch');
        // Không có token, fallback về AsyncStorage
        return false;
      }

      // Use 10.0.2.2 for Android emulator, localhost for iOS simulator
      const API_BASE_URL = Platform.OS === 'android' 
        ? 'http://10.0.2.2:3000'
        : 'http://localhost:3000';

      console.log('[Basket] Fetching cart from API...');
      const response = await fetch(`${API_BASE_URL}/api/v1/cart/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.status === 200 && result.data && result.data.items) {
        console.log('[Basket] API response received - Items:', result.data.items.length);

        // Get colorId map from AsyncStorage as fallback
        let colorIdMap = {};
        try {
          const colorIdMapKey = 'cart_colorId_map';
          const storedMap = await AsyncStorage.getItem(colorIdMapKey);
          if (storedMap) {
            colorIdMap = JSON.parse(storedMap);
            // console.log('Loaded colorId map from AsyncStorage:', colorIdMap);
          }
        } catch (error) {
          console.error('Error loading colorId map from AsyncStorage:', error);
        }

        // Transform API data to match component structure
        const transformedBasket = result.data.items.map((item) => {
          const variant = item.variant;
          
          // Try to get colorId from different possible locations (comprehensive check)
          let colorId = null;
          
          // 1. Direct colorId field
          if (item.colorId !== null && item.colorId !== undefined) {
            colorId = item.colorId;
          }
          // 2. Color object with id property
          else if (item.color && typeof item.color === 'object' && item.color !== null) {
            if (item.color.id !== null && item.color.id !== undefined) {
              colorId = item.color.id;
            }
          }
          // 3. Color is directly a number
          else if (item.color && typeof item.color === 'number') {
            colorId = item.color;
          }
          // 4. Check inventory.colorId
          else if (item.inventory && item.inventory.colorId !== null && item.inventory.colorId !== undefined) {
            colorId = item.inventory.colorId;
          }
          // 5. Check inventory.color.id
          else if (item.inventory && item.inventory.color && typeof item.inventory.color === 'object' && item.inventory.color.id) {
            colorId = item.inventory.color.id;
          }
          // 6. Fallback: Get from AsyncStorage using cartItemId
          else if (item.id && colorIdMap[item.id]) {
            colorId = colorIdMap[item.id];
          }
          
          if (colorId === null) {
            // Only log warning if really needed
            // console.warn(`Item ${item.id}: colorId is NULL - all checks failed`);
          }
          
          // Get category ID from variant.phone.category if available
          const categoryId = variant.phone?.category?.id ||
                            variant.phone?.categoryId ||
                            variant.category?.id ||
                            variant.categoryId ||
                            null;
          
          return {
            id: item.id, // Cart item ID
            product: {
              id: variant.id, // Variant ID (for navigation)
              title: `${variant.name} ${variant.variantName}${variant.color ? ` - ${variant.color}` : ''}`,
              thumbnail: variant.imageUrl || 'https://via.placeholder.com/300',
              price: item.discount || item.price, // Use discount price if available, else use original price
              originalPrice: item.price,
              amount: item.quantity,
              variantId: variant.id,
              colorId: colorId, // Lưu colorId từ API response
              cartItemId: item.id, // Keep cart item ID for update/delete operations
              categoryId: categoryId, // Lưu categoryId để check voucher
              variantData: variant, // Lưu toàn bộ variant data để có thể truy cập category sau này
            }
          };
        });

        // Only dispatch if data actually changed
        const currentBasketString = JSON.stringify(basket);
        const newBasketString = JSON.stringify(transformedBasket);
        
        if (currentBasketString !== newBasketString) {
          console.log('[Basket] Updating basket from API - Items:', transformedBasket.length);
          dispatch(setBasket(transformedBasket));
        } else {
          console.log('[Basket] No changes detected, skipping dispatch');
        }
        
        return true;
      } else {
        console.log('[Basket] API returned no items or error - Status:', result.status);
        // API trả về lỗi hoặc không có dữ liệu
        return false;
      }
    } catch (error) {
      console.error('[Basket] Error fetching cart from API:', error);
      return false;
    }
  };

  const getBasketFromStorage = async (forceRefresh = false) => {
    try {
      console.log('[Basket] getBasketFromStorage called - forceRefresh:', forceRefresh, 'current items:', basket?.length || 0);
      // Nếu forceRefresh = true hoặc basket rỗng, luôn fetch từ API trước
      if (forceRefresh || !basket || !Array.isArray(basket) || basket.length < 1) {
        // Thử fetch từ API trước
        const apiSuccess = await fetchCartFromAPI();
        
        if (apiSuccess) {
          console.log('[Basket] Successfully loaded from API');
          // Đã lấy được từ API, không cần làm gì thêm
          return;
        }
        
        console.log('[Basket] API fetch failed, falling back to AsyncStorage');

        // Nếu không lấy được từ API, fallback về AsyncStorage
        let basketFromStorage = await AsyncStorage.getItem('basket')
        
        if (!basketFromStorage) {
          // Nếu không có dữ liệu trong AsyncStorage, sử dụng dữ liệu giả
          await AsyncStorage.setItem('basket', JSON.stringify({ basket: mockAsyncStorageData.basket }))
          dispatch(setBasket(mockBasketData))
        } else {
          // Nếu có dữ liệu trong AsyncStorage, parse và sử dụng
          basketFromStorage = JSON.parse(basketFromStorage)
          
          // Kiểm tra cấu trúc dữ liệu
          if (basketFromStorage && basketFromStorage.basket && Array.isArray(basketFromStorage.basket)) {
            let newProduct = [];
            for (const item of basketFromStorage.basket) {
              // Tìm sản phẩm trong mockProducts thay vì fetch từ API
              const product = mockProducts.find(p => p.id === item.id);
              if (product) {
                newProduct.push({ 
                  product: { 
                    ...product, 
                    price: item.amount * product.price, 
                    amount: item.amount 
                  } 
                })
              }
            }
            dispatch(setBasket(newProduct))
          } else {
            dispatch(setBasket(mockBasketData))
          }
        }
      }
    } catch (error) {
      console.error('Error getting basket from storage:', error);
      // Fallback to mock data
      dispatch(setBasket(mockBasketData))
    }
  }

  const sumprice = () => {
    let price = 0
    // Nếu không có sản phẩm nào được chọn, tính tất cả (mặc định)
    if (selectedItems.size === 0) {
      for (const item of basket) {
        const itemPrice = item.product.price || 0;
        const quantity = item.product.amount || 1;
        price += itemPrice * quantity;
      }
    } else {
      // Chỉ tính giá của các sản phẩm được chọn
      for (const item of basket) {
        const itemId = item.product.cartItemId || item.id || item.product.id;
        if (selectedItems.has(itemId)) {
          const itemPrice = item.product.price || 0;
          const quantity = item.product.amount || 1;
          price += itemPrice * quantity;
        }
      }
    }
    settotalprice(price)
  }

  // Toggle chọn/bỏ chọn một sản phẩm
  const toggleItemSelection = (itemId) => {
    const newSelectedItems = new Set(selectedItems);
    if (newSelectedItems.has(itemId)) {
      newSelectedItems.delete(itemId);
    } else {
      newSelectedItems.add(itemId);
    }
    setSelectedItems(newSelectedItems);
  }

  // Chọn tất cả / Bỏ chọn tất cả
  const toggleSelectAll = () => {
    if (selectedItems.size === basket.length) {
      // Nếu đã chọn tất cả, bỏ chọn tất cả
      setSelectedItems(new Set());
    } else {
      // Chọn tất cả
      const allItemIds = new Set();
      basket.forEach((item) => {
        const itemId = item.product.cartItemId || item.id || item.product.id;
        allItemIds.add(itemId);
      });
      setSelectedItems(allItemIds);
    }
  }

  // Lấy danh sách sản phẩm được chọn để thanh toán
  const getSelectedBasketItems = () => {
    let selectedItemsList;
    if (selectedItems.size === 0) {
      // Nếu không có sản phẩm nào được chọn, trả về tất cả
      selectedItemsList = basket;
    } else {
      selectedItemsList = basket.filter((item) => {
        const itemId = item.product.cartItemId || item.id || item.product.id;
        return selectedItems.has(itemId);
      });
    }
    
    // DEBUG: Log selected items for checkout
    console.log('[Basket] Selected items for checkout:', selectedItemsList?.length || 0);
    
    return selectedItemsList;
  }

  // Reset selected items khi basket thay đổi
  useEffect(() => {
    // Khi basket thay đổi, reset selected items nếu các item đã chọn không còn trong basket
    if (selectedItems.size > 0) {
      const validSelectedItems = new Set();
      basket.forEach((item) => {
        const itemId = item.product.cartItemId || item.id || item.product.id;
        if (selectedItems.has(itemId)) {
          validSelectedItems.add(itemId);
        }
      });
      if (validSelectedItems.size !== selectedItems.size) {
        setSelectedItems(validSelectedItems);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basket]);

  // Hàm xử lý pull-to-refresh
  const onRefresh = useCallback(async () => {
    console.log('[Basket] Pull-to-refresh triggered');
    setRefreshing(true);
    try {
      // Reset selected items khi refresh
      setSelectedItems(new Set());
      // Fetch lại giỏ hàng từ API (force refresh)
      await getBasketFromStorage(true);
      console.log('[Basket] Refresh completed');
    } catch (error) {
      console.error('[Basket] Error refreshing basket:', error);
      Alert.alert('Lỗi', 'Không thể làm mới giỏ hàng. Vui lòng thử lại.');
    } finally {
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh giỏ hàng mỗi khi màn hình được focus
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      
      const refreshBasket = async () => {
        if (!isMounted) return;
        
        console.log('[Basket] Screen focused, refreshing basket...');
        setloading(true);
        try {
          // Reset selected items khi refresh
          setSelectedItems(new Set());
          // Fetch lại giỏ hàng từ API hoặc storage
          await getBasketFromStorage(true); // Force refresh từ API
          console.log('[Basket] Focus refresh completed');
        } catch (error) {
          console.error('[Basket] Error refreshing basket on focus:', error);
        } finally {
          if (isMounted) {
            setloading(false);
          }
        }
      };
      
      refreshBasket();
      
      return () => {
        isMounted = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  useEffect(() => {
    sumprice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basket, selectedItems]);

  // Hàm xóa item trong giỏ hàng thông qua API
  const deleteCartItems = async (itemIds) => {
    try {
      const token = await getAuthToken();
      if (!token) {
        // Không có token, không thể xóa qua API
        return false;
      }

      // Use 10.0.2.2 for Android emulator, localhost for iOS simulator
      const API_BASE_URL = Platform.OS === 'android' 
        ? 'http://10.0.2.2:3000'
        : 'http://localhost:3000';

      const response = await fetch(`${API_BASE_URL}/api/v1/cart/items`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemIds: itemIds, // Mảng các itemId cần xóa
        }),
      });

      const result = await response.json();

      if (result.status === 200 && result.data && result.data.success) {
        return true;
      } else {
        // Xử lý các lỗi
        if (result.status === 404) {
          console.error('Cart not found:', result.message);
        } else if (result.status === 503) {
          console.error('Service unavailable:', result.message);
        } else {
          console.error('Error deleting cart items:', result.message);
        }
        return false;
      }
    } catch (error) {
      console.error('Error deleting cart items:', error);
      return false;
    }
  };

  // Hàm cập nhật số lượng thông qua API
  const updateCartQuantity = async (itemId, quantity) => {
    try {
      const token = await getAuthToken();
      if (!token) {
        // Không có token, không thể update qua API
        return false;
      }

      // Use 10.0.2.2 for Android emulator, localhost for iOS simulator
      const API_BASE_URL = Platform.OS === 'android' 
        ? 'http://10.0.2.2:3000'
        : 'http://localhost:3000';

      const response = await fetch(`${API_BASE_URL}/api/v1/cart/quantity`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId: itemId,
          quantity: quantity,
        }),
      });

      const result = await response.json();

      if (result.status === 200 && result.data && result.data.success) {
        return true;
      } else {
        // Xử lý các lỗi
        if (result.status === 404) {
          console.error('Cart not found:', result.message);
        } else if (result.status === 503) {
          console.error('Service unavailable:', result.message);
        } else {
          console.error('Error updating quantity:', result.message);
        }
        return false;
      }
    } catch (error) {
      console.error('Error updating cart quantity:', error);
      return false;
    }
  };

  const updateAmount = async (updatetype, itemId) => {
    // Tìm item trong basket - itemId có thể là product.id (variantId), cartItemId, hoặc item.id
    const basketItem = basket.find(item => 
      item.product.cartItemId === itemId || 
      item.id === itemId || 
      item.product.id === itemId
    );
    
    if (!basketItem) {
      console.warn('Item not found in basket:', itemId);
      return;
    }

    // Ưu tiên lấy cartItemId từ product.cartItemId, nếu không có thì dùng item.id
    const cartItemId = basketItem.product.cartItemId || basketItem.id;
    const currentQuantity = basketItem.product.amount || 1;
    let newQuantity = currentQuantity;

    // Tính toán số lượng mới
    if (updatetype === 'DECREASE' && currentQuantity > 1) {
      newQuantity = currentQuantity - 1;
    } else if (updatetype === 'INCREASE') {
      newQuantity = currentQuantity + 1;
    } else if (updatetype === 'DECREASE' && currentQuantity === 1) {
      // Nếu giảm về 0 thì xóa item
      removeItemFromBasket(cartItemId);
      return;
    }

    // Nếu có token và cartItemId, gọi API để update
    const token = await getAuthToken();
    if (token && cartItemId) {
      const apiSuccess = await updateCartQuantity(cartItemId, newQuantity);
      
      if (!apiSuccess) {
        // Nếu API fail, hiển thị thông báo lỗi và không update local state
        Alert.alert('Lỗi', 'Không thể cập nhật số lượng. Vui lòng thử lại.');
        return;
      }
    }

    // Cập nhật local state (Redux) sau khi API thành công hoặc không có token
    const updatedBasket = basket.map(item => {
      // So sánh với cartItemId hoặc các id khác
      if (item.product.cartItemId === cartItemId || 
          item.id === cartItemId || 
          (item.product.cartItemId === undefined && item.product.id === itemId)) {
        return {
          ...item,
          product: {
            ...item.product,
            amount: newQuantity,
          }
        };
      }
      return item;
    });

    dispatch(setBasket(updatedBasket));
  };

  // Ẩn gợi ý vuốt sau 3 giây
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSwipeHint(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const removeItemFromBasket = async (itemId) => {
    // Tìm item trong basket để lấy cartItemId - itemId có thể là product.id (variantId), cartItemId, hoặc item.id
    const basketItem = basket.find(item => 
      item.product.cartItemId === itemId || 
      item.id === itemId || 
      item.product.id === itemId
    );
    
    if (!basketItem) {
      console.warn('Item not found in basket:', itemId);
      return;
    }

    // Ưu tiên lấy cartItemId từ product.cartItemId, nếu không có thì dùng item.id
    const cartItemId = basketItem.product.cartItemId || basketItem.id;

    // Nếu có token và cartItemId, gọi API để xóa
    const token = await getAuthToken();
    if (token && cartItemId) {
      const apiSuccess = await deleteCartItems([cartItemId]);
      
      if (!apiSuccess) {
        // Nếu API fail, hiển thị thông báo lỗi và không xóa local state
        Alert.alert('Lỗi', 'Không thể xóa sản phẩm khỏi giỏ hàng. Vui lòng thử lại.');
        return;
      }
    }

    // Xóa khỏi AsyncStorage (nếu có)
    let getbasketfromstorage = await AsyncStorage.getItem('basket');
    if (getbasketfromstorage) {
      try {
        let obj = JSON.parse(getbasketfromstorage);
        if (obj && obj.basket && Array.isArray(obj.basket)) {
          let removedBasket = obj.basket.filter((item) => {
            // Xóa item dựa trên id trong AsyncStorage (có thể khác với cartItemId)
            return item.id !== itemId && item.id !== cartItemId;
          });
          removedBasket = JSON.stringify({ basket: removedBasket });
          await AsyncStorage.setItem('basket', removedBasket);
        }
      } catch (error) {
        console.error('Error updating AsyncStorage:', error);
      }
    }
    
    // Xóa khỏi Redux store
    const newBasket = basket.filter((item) => {
      return item.product.cartItemId !== cartItemId && 
             item.id !== cartItemId && 
             item.product.id !== itemId;
    });
    dispatch(setBasket(newBasket));
  }

  const closeSwipable = () => {
    swipeableRef.current.close()
  }

  // ========== CHỨC NĂNG VUỐT (ĐÃ COMMENT) ==========
  // Có thể bỏ comment để khôi phục chức năng vuốt nếu cần

  // const renderLeftActions = (progress, dragX) => {
  //   const trans = dragX.interpolate({
  //     inputRange: [0, 50, 100, 101],
  //     outputRange: [-20, 0, 0, 1],
  //   });
  //   return (
  //     <View>
  //       <Animated.View style={[
  //         {
  //           transform: [{ translateX: trans }],
  //         },
  //         tw`flex-1 bg-white`
  //       ]}>
  //         <Pressable
  //           android_ripple={{ color: '#dddddd', borderless: false, radius: 70 }}
  //           style={tw`bg-red-600 w-24 flex-1 items-center justify-center`}
  //           onPress={removeItemFromBasket}
  //         >
  //           <Icon
  //             type="ionicon"
  //             name="trash"
  //             size={25}
  //             color="white"
  //           />
  //         </Pressable>
  //       </Animated.View>
  //     </View>
  //   );
  // };

  // const renderRightActions = (progress, dragX) => {
  //   const trans = dragX.interpolate({
  //     inputRange: [0, 50, 100, 101],
  //     outputRange: [0, 0, 0, 1],
  //   });
  //   return (
  //     <View>
  //       <Animated.View style={[
  //         {
  //           transform: [{ translateX: trans }],
  //         },
  //         tw`flex-1 bg-white flex-row`
  //       ]}>
  //         <Pressable
  //           android_ripple={{ color: '#dddddd', borderless: false, radius: 70 }}
  //           style={tw`bg-red-600 w-24 items-center justify-center`}
  //           onPress={() => updateAmount('DECREASE')}
  //         >
  //           <Icon
  //             type="ionicon"
  //             name="remove"
  //             size={25}
  //             color="white"
  //           />
  //         </Pressable>
  //         <Pressable
  //           android_ripple={{ color: '#dddddd', borderless: false, radius: 70 }}
  //           style={tw`bg-blue-600 w-24 items-center justify-center`}
  //           onPress={() => updateAmount('INCREASE')}
  //         >
  //           <Icon
  //             type="ionicon"
  //             name="add"
  //             size={25}
  //             color="white"
  //           />
  //         </Pressable>
  //         <Pressable
  //           android_ripple={{ color: '#dddddd', borderless: false, radius: 70 }}
  //           style={tw`bg-black w-24 items-center justify-center`}
  //           onPress={() => navigation.navigate('ProductScreen', { id: selectedItem })}
  //         >
  //           <Icon
  //             type="ionicon"
  //             name="search"
  //             size={25}
  //             color="white"
  //           />
  //         </Pressable>
  //       </Animated.View>
  //     </View>
  //   );
  // };
  // ========== KẾT THÚC CHỨC NĂNG VUỐT ==========

  return (
    <>
      <CustomStatusBar backgroundColor="red" barStyle="white-content" />
      <Wrapper header={false}>
        {loading && !refreshing ? (
          // Hiển thị loading indicator khi đang tải dữ liệu lần đầu
          <View style={tw`flex-1 items-center justify-center`}>
            <ActivityIndicator size="large" color="#e7474a" />
            <Text style={tw`mt-4 text-gray-600`}>Đang tải giỏ hàng...</Text>
          </View>
        ) : (
          <ScrollView
            style={tw`flex-1`}
            contentContainerStyle={tw`flex-grow`}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#e7474a']} // Android
                tintColor="#e7474a" // iOS
                title="Đang làm mới..." // iOS
                titleColor="#666" // iOS
              />
            }
          >
            {/* Hiển thị header và danh sách sản phẩm khi đã tải xong */}
            {
              basket.length > 0 && (
                <View>
                  {/* Thông báo hướng dẫn vuốt */}
                  {showSwipeHint && (
                    <View style={tw`bg-blue-50 border-l-4 border-blue-400 p-3 mx-4 mt-2`}>
                      <View style={tw`flex-row items-center`}>
                        <Icon
                          type="ionicon"
                          name="information-circle"
                          size={20}
                          color="#3B82F6"
                        />
                        <Text style={tw`text-blue-800 text-sm ml-2 flex-1`}>
                          Nhấn vào tên sản phẩm để xem chi tiết • Nút +/- để điều chỉnh số lượng • Nút thùng rác để xóa
                        </Text>
                      </View>
                    </View>
                  )}
                  
                  <View style={tw`py-2 px-4 bg-black flex-row justify-between items-center`}>
                    <View style={tw`h-24 flex-row items-center`}>
                      <Text style={tw`font-bold text-white text-xs mr-2`}>Tổng tiền:</Text>
                      <View style={tw`flex-row`}>
                        <Text style={tw`font-bold text-white text-lg mt-1`}>
                          {totalprice.toLocaleString('vi-VN')}đ
                        </Text>
                      </View>
                    </View>
                    <View style={tw`bg-blue-700 rounded-xl overflow-hidden`}>
                      <Pressable 
                        android_ripple={{ color: '#dddddd', borderless: false, radius: 70, foreground: true }} 
                        style={tw`p-4`}
                        onPress={() => {
                          const selectedBasketItems = getSelectedBasketItems();
                          if (selectedBasketItems.length === 0) {
                            Alert.alert('Thông báo', 'Vui lòng chọn ít nhất một sản phẩm để thanh toán');
                            return;
                          }
                          navigation.navigate('CheckoutScreen', { 
                            selectedItems: selectedBasketItems,
                            source: 'cart' // Đánh dấu đặt hàng từ giỏ hàng
                          });
                        }}
                      >
                        <Text style={tw`text-white`}>Thanh toán</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              )
            }
            {
              basket.length > 0 ? (
                <>
                  {/* Nút chọn tất cả */}
                  <View style={tw`flex-row items-center p-4 bg-white border-b border-gray-200`}>
                    <Pressable
                      style={tw`flex-row items-center flex-1`}
                      onPress={toggleSelectAll}
                    >
                      <View style={tw`w-6 h-6 border-2 rounded mr-3 items-center justify-center ${
                        selectedItems.size === basket.length ? 'bg-blue-600 border-blue-600' : 'border-gray-400'
                      }`}>
                        {selectedItems.size === basket.length && (
                          <Icon name="checkmark" type="ionicon" size={16} color="white" />
                        )}
                      </View>
                      <Text style={tw`text-gray-800 font-medium`}>
                        {selectedItems.size === basket.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                      </Text>
                      <Text style={tw`text-gray-500 text-sm ml-2`}>
                        ({selectedItems.size}/{basket.length})
                      </Text>
                    </Pressable>
                  </View>

                  {basket.map((item, index) => {
                    const itemId = item.product.cartItemId || item.id || item.product.id;
                    const isSelected = selectedItems.has(itemId);
                    
                    return (
                      <View key={index} style={tw`relative`}>
                        {/* CHỨC NĂNG VUỐT (ĐÃ COMMENT) - Bỏ comment để khôi phục */}
                        {/* <Swipeable ref={swipeableRef} renderLeftActions={renderLeftActions} renderRightActions={renderRightActions} onSwipeableOpen={() => setselectedItem(item.product.id)}> */}
                          <View style={tw`flex-row p-4 bg-white border-b border-gray-100 justify-between items-center`}>
                            {/* Checkbox */}
                            <Pressable
                              style={tw`mr-3`}
                              onPress={() => toggleItemSelection(itemId)}
                            >
                              <View style={tw`w-6 h-6 border-2 rounded items-center justify-center ${
                                isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-400'
                              }`}>
                                {isSelected && (
                                  <Icon name="checkmark" type="ionicon" size={16} color="white" />
                                )}
                              </View>
                            </Pressable>

                            <View style={tw`flex-row items-center flex-1`}>
                              <Image
                                source={{
                                  uri: item.product.thumbnail,
                                }}
                                resizeMode="stretch"
                                resizeMethod="resize"
                                style={tw`w-16 h-16 mr-4 rounded-full`}
                              />
                              <View style={tw`flex-1`}>
                                <Pressable
                                  onPress={() => navigation.navigate('ProductScreen', { id: item.product.id })}
                                  android_ripple={{ color: '#e5e7eb', borderless: false }}
                                >
                                  <Text style={tw`text-base font-medium text-blue-600`} numberOfLines={2}>{item.product.title}</Text>
                                </Pressable>
                                <View style={tw`flex-col`}>
                                  {item.product.originalPrice && item.product.originalPrice > item.product.price && (
                                    <Text style={tw`text-gray-400 line-through text-sm`}>
                                      {item.product.originalPrice.toLocaleString('vi-VN')}đ
                                    </Text>
                                  )}
                                  <Text style={tw`font-bold text-lg text-gray-800`}>
                                    {item.product.price.toLocaleString('vi-VN')}đ
                                  </Text>
                                </View>
                              </View>
                            </View>
                      
                      {/* Điều khiển số lượng và xóa */}
                      <View style={tw`flex-row items-center`}>
                        {/* Điều khiển số lượng */}
                        <View style={tw`flex-row items-center bg-gray-100 rounded-lg mr-2`}>
                          <Pressable
                            style={tw`w-8 h-8 items-center justify-center rounded-l-lg`}
                            onPress={() => updateAmount('DECREASE', item.product.id)}
                            android_ripple={{ color: '#e5e7eb', borderless: false }}
                          >
                            <Icon
                              type="ionicon"
                              name="remove"
                              size={18}
                              color="#374151"
                            />
                          </Pressable>
                          
                          <View style={tw`w-12 h-8 items-center justify-center bg-white border-l border-r border-gray-200`}>
                            <Text style={tw`font-bold text-gray-800`}>{item.product.amount}</Text>
                          </View>
                          
                          <Pressable
                            style={tw`w-8 h-8 items-center justify-center rounded-r-lg`}
                            onPress={() => updateAmount('INCREASE', item.product.id)}
                            android_ripple={{ color: '#e5e7eb', borderless: false }}
                          >
                            <Icon
                              type="ionicon"
                              name="add"
                              size={18}
                              color="#374151"
                            />
                          </Pressable>
                        </View>
                        
                        {/* Nút xóa */}
                        <Pressable
                          style={tw`w-8 h-8 items-center justify-center bg-red-100 rounded-lg`}
                          onPress={() => removeItemFromBasket(item.product.id)}
                          android_ripple={{ color: '#fecaca', borderless: false }}
                        >
                          <Icon
                            type="ionicon"
                            name="trash"
                            size={16}
                            color="#dc2626"
                          />
                        </Pressable>
                      </View>
                    </View>
                  {/* </Swipeable> */}
                </View>
                    );
                  })}
                </>
              ) : (
                <View style={tw`flex-row p-4 bg-white border-b border-gray-100 justify-between items-center justify-center`}>
                  <Text style={tw`text-gray-500 text-center`}>Giỏ hàng trống</Text>
                </View>
              )
            }
          </ScrollView>
        )}
      </Wrapper>
    </>
  );
};

export default Basket;

const styles = StyleSheet.create({});
