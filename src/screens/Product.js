import { ActivityIndicator, Animated, Image, Pressable, ScrollView, StyleSheet, Text, View, Platform, Alert, Modal, Dimensions } from 'react-native';
import React, { useEffect, useRef, useState } from 'react';
import Wrapper from '../components/Wrapper/Wrapper';
import tw from 'tailwind-react-native-classnames';
import ThemeText from '../components/ThemeText';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Icon } from 'react-native-elements';
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useDispatch } from 'react-redux';
import { addToBasket, removeFromBasket } from '../store/slices/siteSlice';
import { getAuthToken } from '../utils/auth';

const Product = ({ route, navigation }) => {
  const translateAnim = useRef(new Animated.Value(-10)).current;
  const dispatch = useDispatch()
  const [product, setproduct] = useState(null);
  const [amount, setamount] = useState(1);
  const [isBigScroll, setisBigScroll] = useState(false);
  const [scrollOffset, setscrollOffset] = useState(0);
  const [selectedColor, setSelectedColor] = useState(null);
  const [addingToCart, setAddingToCart] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [relatedVariants, setRelatedVariants] = useState([]);
  const [loadingRelatedVariants, setLoadingRelatedVariants] = useState(false);

  // DEBUG: Log selectedColor changes
  useEffect(() => {
    console.log('=== DEBUG SELECTED COLOR STATE CHANGED ===');
    console.log('Selected Color:', selectedColor);
    console.log('Selected Color Type:', typeof selectedColor);
    if (product && product.colors) {
      const selectedColorItem = product.colors.find(c => c.color?.id === selectedColor);
      console.log('Selected Color Item:', selectedColorItem ? JSON.stringify(selectedColorItem, null, 2) : 'Not found');
    }
    console.log('=== END DEBUG SELECTED COLOR STATE ===');
  }, [selectedColor, product]);
  const imageScrollViewRef = useRef(null);

  const { id } = route.params

  const translateUp = () => {
    Animated.timing(translateAnim, {
      toValue: -260,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const fetchProduct = async () => {
    try {
      setproduct(null);
      // Use 10.0.2.2 for Android emulator, localhost for iOS simulator
      const API_BASE_URL = Platform.OS === 'android' 
        ? 'http://10.0.2.2:3000'
        : 'http://localhost:3000';
      
      console.log('=== DEBUG FETCH PRODUCT ===');
      console.log('Product ID (variantId):', id);
      console.log('API URL:', `${API_BASE_URL}/api/v1/phones/variants/${id}`);
      
      const response = await fetch(`${API_BASE_URL}/api/v1/phones/variants/${id}`);
      const result = await response.json();
      
      console.log('Response Status:', response.status);
      console.log('Response Data:', JSON.stringify(result, null, 2));
      
      if (result.status === 200 && result.data) {
        const variant = result.data;
        
        // DEBUG: Log variant structure
        console.log('Variant ID:', variant.id);
        console.log('Variant keys:', Object.keys(variant));
        console.log('Variant full data:', JSON.stringify(variant, null, 2));
        
        // DEBUG: Log colors information
        console.log('=== COLORS DEBUG ===');
        console.log('Colors count:', variant.colors?.length || 0);
        console.log('Colors array (JSON):', JSON.stringify(variant.colors, null, 2));
        if (variant.colors && variant.colors.length > 0) {
          console.log('Colors array structure:', {
            length: variant.colors.length,
            isArray: Array.isArray(variant.colors),
            items: variant.colors.map((item, idx) => ({
              index: idx,
              variantId: item.variantId,
              imageId: item.imageId,
              colorId: item.color?.id,
              colorName: item.color?.name,
              colorHex: item.color?.hex,
            })),
          });
          variant.colors.forEach((colorItem, index) => {
            console.log(`Color ${index + 1} details:`, {
              colorItem: JSON.stringify(colorItem, null, 2),
              colorId: colorItem.color?.id,
              colorName: colorItem.color?.name,
              colorHex: colorItem.color?.hex,
              hasColor: !!colorItem.color,
              colorKeys: colorItem.color ? Object.keys(colorItem.color) : [],
              variantId: colorItem.variantId,
              imageId: colorItem.imageId,
            });
          });
        } else {
          console.warn('No colors found in variant');
        }
        console.log('=== END COLORS DEBUG ===');
        
        // DEBUG: Log inventories information
        console.log('=== INVENTORIES DEBUG ===');
        console.log('Inventories count:', variant.inventories?.length || 0);
        console.log('Inventories array (JSON):', JSON.stringify(variant.inventories, null, 2));
        if (variant.inventories && variant.inventories.length > 0) {
          console.log('Inventories array structure:', {
            length: variant.inventories.length,
            isArray: Array.isArray(variant.inventories),
            items: variant.inventories.map((item, idx) => ({
              index: idx,
              inventoryId: item.id,
              variantId: item.variantId,
              colorId: item.colorId,
              sku: item.sku,
              stockQuantity: item.stockQuantity,
            })),
          });
          variant.inventories.forEach((inventory, index) => {
            console.log(`Inventory ${index + 1} details:`, {
              inventoryId: inventory.id,
              variantId: inventory.variantId,
              colorId: inventory.colorId,
              sku: inventory.sku,
              stockQuantity: inventory.stockQuantity,
              color: inventory.color,
              quantity: inventory.quantity,
              fullInventory: JSON.stringify(inventory, null, 2),
            });
          });
        } else {
          console.warn('No inventories found in variant');
        }
        console.log('=== END INVENTORIES DEBUG ===');
        
        // Get original price and discount
        const originalPrice = variant.price?.price || 0;
        const discountPercent = variant.discount?.discountPercent || 0;
        const finalPrice = discountPercent > 0 
          ? originalPrice * (1 - discountPercent / 100)
          : originalPrice;
        
        // Get images array
        const images = variant.images && variant.images.length > 0
          ? variant.images.map(img => img.image.imageUrl)
          : ['https://via.placeholder.com/300'];
        
        // Get thumbnail (first image)
        const thumbnail = images[0];
        
        // Transform variant data to match component structure
        const transformedProduct = {
          id: variant.id,
          title: `${variant.phone.name} ${variant.variantName}`,
          description: variant.description || '',
          thumbnail: thumbnail,
          images: images,
          price: finalPrice,
          originalPrice: originalPrice,
          discountPercentage: discountPercent,
          brand: variant.phone.brand?.name || '',
          category: variant.phone.category?.name || '',
          rating: variant.averageRating || 0,
          specifications: variant.specifications || [],
          colors: variant.colors || [],
          reviews: variant.reviews || [],
          inventories: variant.inventories || [],
          variantData: variant, // Keep original data
        };
        
        console.log('Transformed Product:', {
          id: transformedProduct.id,
          title: transformedProduct.title,
          colorsCount: transformedProduct.colors.length,
          inventoriesCount: transformedProduct.inventories.length,
          colors: transformedProduct.colors.map(c => ({
            colorId: c.color?.id,
            colorName: c.color?.name,
          })),
        });
        
        setproduct(transformedProduct);
        
        // Set default selected color (first color)
        if (variant.colors && variant.colors.length > 0) {
          const firstColorId = variant.colors[0].color?.id || null;
          console.log('Setting default selected color:', {
            firstColorId,
            firstColor: variant.colors[0].color,
            firstColorItem: JSON.stringify(variant.colors[0], null, 2),
          });
          setSelectedColor(firstColorId);
        } else {
          console.warn('No colors available, selectedColor will be null');
          setSelectedColor(null);
        }
        
        console.log('=== END DEBUG FETCH PRODUCT ===');
        
        // Sau khi fetch product thành công, gọi API lấy variant liên quan
        fetchRelatedVariants(id);
      } else {
        console.error('Failed to fetch product:', result);
        Alert.alert('Lỗi', 'Không thể tải thông tin sản phẩm');
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      Alert.alert('Lỗi', 'Không thể kết nối đến server');
    }
  }

  // Fetch related variants
  const fetchRelatedVariants = async (variantId) => {
    try {
      setLoadingRelatedVariants(true);
      const API_BASE_URL = Platform.OS === 'android' 
        ? 'http://10.0.2.2:3000'
        : 'http://localhost:3000';
      
      const response = await fetch(`${API_BASE_URL}/api/v1/phones/variants/${variantId}/related`);
      const result = await response.json();
      
      console.log('[Product] Related variants response:', JSON.stringify(result, null, 2));
      
      if (result.status === 200 && result.data && Array.isArray(result.data)) {
        // Transform variant data giống như fetchProduct
        const transformedVariants = result.data.map((variant) => {
          // Get original price and discount
          const originalPrice = variant.price?.price || 0;
          const discountPercent = variant.discount?.discountPercent || 0;
          const finalPrice = discountPercent > 0 
            ? originalPrice * (1 - discountPercent / 100)
            : originalPrice;
          
          // Get images array
          const images = variant.images && variant.images.length > 0
            ? variant.images.map(img => img.image.imageUrl)
            : ['https://via.placeholder.com/300'];
          
          // Get thumbnail (first image)
          const thumbnail = images[0];
          
          return {
            id: variant.id,
            title: `${variant.phone.name} ${variant.variantName}`,
            description: variant.description || '',
            thumbnail: thumbnail,
            images: images,
            price: finalPrice,
            originalPrice: originalPrice,
            discountPercentage: discountPercent,
            brand: variant.phone.brand?.name || '',
            category: variant.phone.category?.name || '',
            rating: variant.averageRating || 0,
          };
        });
        
        setRelatedVariants(transformedVariants);
        console.log('[Product] Transformed related variants:', transformedVariants);
      } else {
        setRelatedVariants([]);
      }
    } catch (error) {
      console.error('[Product] Error fetching related variants:', error);
      setRelatedVariants([]);
    } finally {
      setLoadingRelatedVariants(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchProduct()
    }
  }, [id]);


  const scrollbegin = (nativeEvent) => {
    if (nativeEvent.contentOffset.y - scrollOffset > 50) {
      translateUp()
      setisBigScroll(true)
    }
    setscrollOffset(nativeEvent.contentOffset.y)
  }

  const amountHandler = (type) => {
    switch (type) {
      case "lower":
        if (amount > 1)
          setamount(amount - 1)
        break;
      case "higher":
        setamount(amount + 1)
      default:
        break;
    }
  }

  const addToCart = async () => {
    try {
      const token = await getAuthToken();
      if (!token) {
        Alert.alert(
          'Cần đăng nhập',
          'Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng',
          [
            { text: 'Hủy', style: 'cancel' },
            { 
              text: 'Đăng nhập', 
              onPress: () => navigation.navigate('LoginScreen') 
            }
          ]
        );
        return;
      }

      if (!selectedColor) {
        Alert.alert('Thông báo', 'Vui lòng chọn màu sắc');
        return;
      }

      setAddingToCart(true);

      // Use 10.0.2.2 for Android emulator, localhost for iOS simulator
      const API_BASE_URL = Platform.OS === 'android' 
        ? 'http://10.0.2.2:3000'
        : 'http://localhost:3000';

      const requestBody = {
        variantId: product.id,
        colorId: selectedColor,
        quantity: amount,
        price: product.originalPrice,
        discount: product.price, // Giá sau discount
      };

      // DEBUG: Log add to cart request
      console.log('=== DEBUG ADD TO CART ===');
      console.log('Request Body:', JSON.stringify(requestBody, null, 2));
      console.log('Selected Color ID:', selectedColor);
      console.log('Product ID (variantId):', product.id);

      const response = await fetch(`${API_BASE_URL}/api/v1/cart/add`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      // DEBUG: Log add to cart response
      console.log('Response Status:', response.status);
      console.log('Response Data:', JSON.stringify(result, null, 2));
      if (result.data) {
        console.log('Response Data Details:', {
          cartItemId: result.data.id || result.data.cartItemId,
          colorId: result.data.colorId,
          variantId: result.data.variantId,
          hasColorId: result.data.colorId !== null && result.data.colorId !== undefined,
          fullData: JSON.stringify(result.data, null, 2),
        });
      }
      console.log('=== END DEBUG ADD TO CART ===');

      if (result.status === 200 && result.data) {
        // Lưu colorId vào AsyncStorage để dự phòng nếu API cart không trả về
        const cartItemId = result.data.id || result.data.cartItemId;
        if (cartItemId && selectedColor) {
          try {
            const colorIdMapKey = 'cart_colorId_map';
            let colorIdMap = {};
            const existingMap = await AsyncStorage.getItem(colorIdMapKey);
            if (existingMap) {
              colorIdMap = JSON.parse(existingMap);
            }
            // Lưu mapping cartItemId -> colorId
            colorIdMap[cartItemId] = selectedColor;
            await AsyncStorage.setItem(colorIdMapKey, JSON.stringify(colorIdMap));
            console.log('Saved colorId to AsyncStorage:', { cartItemId, colorId: selectedColor });
          } catch (error) {
            console.error('Error saving colorId to AsyncStorage:', error);
          }
        }

        Alert.alert(
          'Thành công',
          'Đã thêm sản phẩm vào giỏ hàng',
          [
            { text: 'Tiếp tục mua sắm', style: 'cancel' },
            { 
              text: 'Xem giỏ hàng', 
              onPress: () => {
                // Navigate về HomeScreen trước, sau đó navigate đến Basket tab
                navigation.navigate('HomeScreen', { screen: 'Basket' });
              }
            }
          ]
        );
      } else {
        const errorMessage = result.message || 'Không thể thêm sản phẩm vào giỏ hàng';
        Alert.alert('Lỗi', errorMessage);
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Lỗi', 'Không thể kết nối đến server');
    } finally {
      setAddingToCart(false);
    }
  };

  const buyNow = async () => {
    try {
      const token = await getAuthToken();
      if (!token) {
        Alert.alert(
          'Cần đăng nhập',
          'Vui lòng đăng nhập để mua hàng',
          [
            { text: 'Hủy', style: 'cancel' },
            { 
              text: 'Đăng nhập', 
              onPress: () => navigation.navigate('LoginScreen') 
            }
          ]
        );
        return;
      }

      if (!selectedColor) {
        Alert.alert('Thông báo', 'Vui lòng chọn màu sắc');
        return;
      }

      // Tạo item để gửi đến Checkout (format giống basket item)
      const checkoutItem = {
        id: product.id, // variantId
        product: {
          id: product.id, // variantId
          title: product.title,
          thumbnail: product.images && product.images.length > 0 ? product.images[0].imageUrl : 'https://via.placeholder.com/300',
          price: product.price,
          originalPrice: product.originalPrice,
          amount: amount,
          variantId: product.id,
          colorId: selectedColor,
        }
      };

      // Navigate đến Checkout với source='product'
      navigation.navigate('CheckoutScreen', {
        selectedItems: [checkoutItem],
        source: 'product' // Đánh dấu mua trực tiếp từ trang sản phẩm
      });
    } catch (error) {
      console.error('Error in buyNow:', error);
      Alert.alert('Lỗi', 'Không thể thực hiện mua hàng');
    }
  };


  return (
    <Wrapper header={false} mt="0" notscrollable={true}>
      {
        product !== null ?
          <View style={tw`flex-1`}>
            <View style={tw`flex-1 relative -mb-3`}>
              <View style={tw`w-full h-72 relative`}>
                <Pressable onPress={() => {
                  setSelectedImageIndex(0);
                  setImageModalVisible(true);
                }}>
                  <Image
                    source={{
                      uri: product.thumbnail,
                    }}
                    resizeMethod="resize"
                    style={tw`w-full h-full`}
                  />
                </Pressable>
                <View style={tw`w-14 h-14 rounded-full bg-white shadow-2xl absolute left-4 top-10 justify-center`}>
                  <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon
                      type="ionicon"
                      name="chevron-back"
                      size={25}
                      color="gray"
                    />
                  </TouchableOpacity>
                </View>
              </View>
              <Animated.View style={[tw`${isBigScroll ? "h-full" : "flex-1"}`, { transform: [{ translateY: translateAnim }] }]}>
                <ScrollView
                  style={[tw`bg-white flex-1 ${isBigScroll && "absolute left-0 bottom-6 h-5/6"} rounded-t-3xl shadow-2xl p-6`,]}
                  showsVerticalScrollIndicator={false}
                  onScroll={({ nativeEvent }) => scrollbegin(nativeEvent)}
                >
                  <View style={tw`pb-10`}>
                    <View style={tw`my-4`}>
                      <ThemeText weight={700} style={tw`text-2xl text-black`}>{product.title}</ThemeText>
                      {product.brand && (
                        <ThemeText style={tw`text-gray-500 text-sm mt-1`}>Nhãn hàng: {product.brand}</ThemeText>
                      )}
                      {product.rating > 0 && (
                        <View style={tw`flex-row items-center mt-2`}>
                          <Icon type="ionicon" name="star" size={16} color="#FFD700" />
                          <ThemeText style={tw`text-gray-600 ml-1`}>{product.rating.toFixed(1)}</ThemeText>
                        </View>
                      )}
                    </View>
                    
                    {product.description && (
                      <ThemeText style={tw`text-gray-500 my-2`}>{product.description}</ThemeText>
                    )}
                    
                    {/* Images */}
                    {product.images && product.images.length > 0 && (
                      <View style={tw`flex-row justify-around my-4 flex-wrap`}>
                        {product.images.slice(0, 3).map((imageUri, index) => (
                          <Pressable
                            key={index}
                            onPress={() => {
                              setSelectedImageIndex(index);
                              setImageModalVisible(true);
                            }}
                          >
                            <Image
                              source={{ uri: imageUri }}
                              resizeMode="contain"
                              resizeMethod="resize"
                              style={tw`w-24 h-24 mb-2`}
                            />
                          </Pressable>
                        ))}
                      </View>
                    )}
                    
                    {/* Specifications */}
                    {product.specifications && product.specifications.length > 0 && (
                      <View style={tw`my-4`}>
                        <ThemeText weight={700} style={tw`text-lg text-black mb-3`}>Thông số kỹ thuật</ThemeText>
                        {product.specifications.map((spec, index) => (
                          <View key={index} style={tw`flex-row justify-between py-2 border-b border-gray-200`}>
                            <ThemeText style={tw`text-gray-600 flex-1`}>{spec.specification?.name || ''}:</ThemeText>
                            <ThemeText style={tw`text-black flex-1 text-right`}>{spec.info || ''}</ThemeText>
                          </View>
                        ))}
                      </View>
                    )}
                    
                    {/* Colors */}
                    {product.colors && product.colors.length > 0 && (
                      <View style={tw`my-4`}>
                        <ThemeText weight={700} style={tw`text-lg text-black mb-3`}>Màu sắc có sẵn</ThemeText>
                        <View style={tw`flex-row flex-wrap`}>
                          {product.colors.map((colorItem, index) => {
                            const colorId = colorItem.color?.id;
                            const isSelected = selectedColor === colorId;
                            return (
                              <Pressable
                                key={index}
                                onPress={() => {
                                  console.log('=== DEBUG COLOR SELECTION ===');
                                  console.log('Selected color:', {
                                    colorId,
                                    colorName: colorItem.color?.name,
                                    colorHex: colorItem.color?.hex,
                                    previousSelectedColor: selectedColor,
                                    colorItem: JSON.stringify(colorItem, null, 2),
                                  });
                                  setSelectedColor(colorId);
                                  console.log('Color selected, new selectedColor:', colorId);
                                  console.log('=== END DEBUG COLOR SELECTION ===');
                                }}
                                style={tw`mr-2 mb-2`}
                              >
                                <View style={[
                                  tw`rounded-full px-4 py-2`,
                                  isSelected 
                                    ? tw`bg-blue-500 border-2 border-blue-700` 
                                    : tw`bg-gray-100`
                                ]}>
                                  <ThemeText style={tw`${isSelected ? 'text-white' : 'text-gray-800'}`}>
                                    {colorItem.color?.name || ''}
                                  </ThemeText>
                                </View>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    )}
                    
                    {/* Reviews */}
                    {product.reviews && product.reviews.length > 0 && (
                      <View style={tw`my-4`}>
                        <ThemeText weight={700} style={tw`text-lg text-black mb-3`}>Đánh giá ({product.reviews.length})</ThemeText>
                        {product.reviews.map((review, index) => (
                          <View key={index} style={tw`bg-gray-50 rounded-lg p-3 mb-2`}>
                            <View style={tw`flex-row items-center mb-2`}>
                              {[...Array(5)].map((_, i) => (
                                <Icon
                                  key={i}
                                  type="ionicon"
                                  name="star"
                                  size={16}
                                  color={i < review.rating ? "#FFD700" : "#E0E0E0"}
                                />
                              ))}
                              <ThemeText style={tw`text-gray-600 ml-2 text-xs`}>
                                {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                              </ThemeText>
                            </View>
                            {review.comment && (
                              <ThemeText style={tw`text-gray-700`}>{review.comment}</ThemeText>
                            )}
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Related Variants */}
                    <View style={tw`my-4`}>
                      <ThemeText weight={700} style={tw`text-lg text-black mb-3`}>
                        Sản phẩm liên quan
                      </ThemeText>
                      {loadingRelatedVariants ? (
                        <View style={tw`flex-row items-center justify-center py-4`}>
                          <ActivityIndicator size="small" color="#e7474a" />
                          <ThemeText style={tw`text-gray-500 ml-2`}>Đang tải...</ThemeText>
                        </View>
                      ) : relatedVariants.length > 0 ? (
                        <View style={tw`relative`}>
                          <ScrollView 
                            horizontal 
                            showsHorizontalScrollIndicator={true}
                            style={tw`-mx-1`}
                            contentContainerStyle={tw`pr-2`}
                          >
                          {relatedVariants.map((variant) => (
                            <Pressable
                              key={variant.id}
                              onPress={() => {
                                navigation.navigate('ProductScreen', { id: variant.id });
                              }}
                              style={tw`bg-white rounded-lg shadow-sm mr-3 mb-2 w-48`}
                            >
                              <Image
                                source={{ uri: variant.thumbnail }}
                                style={tw`w-full h-32 rounded-t-lg`}
                                resizeMode="cover"
                              />
                              <View style={tw`p-3`}>
                                <ThemeText 
                                  weight={600} 
                                  style={tw`text-sm text-gray-800 mb-1`}
                                  numberOfLines={2}
                                >
                                  {variant.title}
                                </ThemeText>
                                <View style={tw`flex-row items-center mt-2`}>
                                  {variant.discountPercentage > 0 && (
                                    <View style={tw`mr-2`}>
                                      <ThemeText style={tw`text-xs text-gray-500 line-through`}>
                                        {variant.originalPrice.toLocaleString('vi-VN')}đ
                                      </ThemeText>
                                    </View>
                                  )}
                                  <ThemeText weight={700} style={tw`text-base text-red-600`}>
                                    {variant.price.toLocaleString('vi-VN')}đ
                                  </ThemeText>
                                  {variant.discountPercentage > 0 && (
                                    <View style={tw`ml-2 bg-red-100 px-2 py-1 rounded`}>
                                      <ThemeText style={tw`text-xs text-red-600 font-bold`}>
                                        -{variant.discountPercentage}%
                                      </ThemeText>
                                    </View>
                                  )}
                                </View>
                                {variant.rating > 0 && (
                                  <View style={tw`flex-row items-center mt-2`}>
                                    {[...Array(5)].map((_, i) => (
                                      <Icon
                                        key={i}
                                        type="ionicon"
                                        name="star"
                                        size={12}
                                        color={i < Math.round(variant.rating) ? "#FFD700" : "#E0E0E0"}
                                      />
                                    ))}
                                    <ThemeText style={tw`text-xs text-gray-500 ml-1`}>
                                      ({variant.rating})
                                    </ThemeText>
                                  </View>
                                )}
                              </View>
                            </Pressable>
                          ))}
                          </ScrollView>
                          {/* Gradient overlay hint ở cuối để gợi ý có thể scroll */}
                          {relatedVariants.length > 1 && (
                            <View 
                              style={{
                                position: 'absolute',
                                right: 0,
                                top: 0,
                                bottom: 0,
                                width: 32,
                                backgroundColor: 'transparent',
                                pointerEvents: 'none',
                              }}
                            >
                              <View 
                                style={{
                                  flex: 1,
                                  backgroundColor: 'rgba(255, 255, 255, 0.7)',
                                }}
                              />
                            </View>
                          )}
                        </View>
                      ) : (
                        <View style={tw`py-4 items-center`}>
                          <ThemeText style={tw`text-gray-500`}>
                            Không có sản phẩm liên quan
                          </ThemeText>
                        </View>
                      )}
                    </View>

                  </View>

                </ScrollView>
              </Animated.View>
            </View>
            <View style={[tw`bg-white border-t border-gray-200 flex-row items-center p-6`, { minHeight: 96 }]}>
              <View style={tw`flex-col flex-shrink-0 mr-4`}>
                {product.discountPercentage > 0 && (
                  <View style={tw`flex-row items-center mb-1`}>
                    <ThemeText style={tw`text-gray-400 line-through text-sm`}>
                      {product.originalPrice.toLocaleString('vi-VN')}đ
                    </ThemeText>
                    <View style={tw`bg-red-500 rounded px-2 py-1 ml-2`}>
                      <ThemeText style={tw`text-white text-xs font-bold`}>
                        -{product.discountPercentage}%
                      </ThemeText>
                    </View>
                  </View>
                )}
                <View style={tw`flex-row items-center`}>
                  <ThemeText weight={800} style={tw`text-2xl text-gray-800`}>
                    {product.price.toLocaleString('vi-VN')}đ
                  </ThemeText>
                </View>
              </View>
              <View style={tw`relative flex-1 min-w-0`}>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ 
                    alignItems: 'center', 
                    paddingRight: 20,
                    paddingLeft: 0,
                    minWidth: '100%'
                  }}
                  style={{ flexGrow: 0 }}
                  nestedScrollEnabled={true}
                >
                  <View style={tw`flex-row items-center`}>
                    <View style={tw`flex-row bg-gray-200 rounded-full flex-shrink-0`}>
                      <TouchableOpacity style={tw`p-2 w-7 items-center`} onPress={() => amountHandler("lower")}><Text style={tw`font-bold`}>-</Text></TouchableOpacity>
                      <View style={tw`p-2 bg-gray-300 w-7 items-center`}><Text style={tw`font-bold`}>{amount}</Text></View>
                      <TouchableOpacity style={tw`p-2 w-7 items-center`} onPress={() => amountHandler("higher")}><Text style={tw`font-bold`}>+</Text></TouchableOpacity>
                    </View>
                    <Pressable
                      onPress={addToCart}
                      disabled={addingToCart || !selectedColor}
                      android_ripple={{ color: '#dddddd' }} 
                      style={[
                        tw`items-center px-4 flex-row h-14 rounded-full ml-2 flex-shrink-0`,
                        addingToCart || !selectedColor 
                          ? tw`bg-gray-400` 
                          : tw`bg-blue-600`
                      ]}>
                      {addingToCart ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <>
                          <Icon type="ionicon" name="cart" size={18} color="white" style={tw`mr-1`} />
                          <ThemeText weight={600} style={tw`text-white mt-1`}>Thêm vào giỏ</ThemeText>
                        </>
                      )}
                    </Pressable>
                    <Pressable
                      onPress={buyNow}
                      android_ripple={{ color: '#dddddd' }} 
                      style={tw`bg-red-600 items-center px-4 flex-row h-14 rounded-full ml-2 flex-shrink-0`}>
                      <ThemeText weight={600} style={tw`text-white mt-1`}>Mua ngay</ThemeText>
                    </Pressable>
                  </View>
                </ScrollView>
              </View>
            </View>

          </View>
          :
          <View style={tw`flex-1 h-80 items-center justify-center`}>
            <ActivityIndicator size="large" color="#e7474a" />
          </View>
      }

      {/* Modal xem ảnh lớn */}
      <Modal
        visible={imageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
        onShow={() => {
          // Scroll đến ảnh được chọn khi modal mở
          if (imageScrollViewRef.current && product && product.images) {
            setTimeout(() => {
              imageScrollViewRef.current?.scrollTo({
                x: selectedImageIndex * Dimensions.get('window').width,
                animated: false,
              });
            }, 100);
          }
        }}
      >
        <View style={tw`flex-1 bg-black`}>
          {/* Header với nút đóng */}
          <View style={tw`absolute top-12 right-4 z-10`}>
            <Pressable
              onPress={() => setImageModalVisible(false)}
              style={tw`w-10 h-10 rounded-full bg-black bg-opacity-50 items-center justify-center`}
            >
              <Icon type="ionicon" name="close" size={24} color="white" />
            </Pressable>
          </View>

          {/* ScrollView để xem các ảnh */}
          <ScrollView
            ref={imageScrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / Dimensions.get('window').width);
              setSelectedImageIndex(index);
            }}
          >
            {product && product.images && product.images.map((imageUri, index) => (
              <View
                key={index}
                style={{ width: Dimensions.get('window').width, height: Dimensions.get('window').height, justifyContent: 'center', alignItems: 'center' }}
              >
                <Image
                  source={{ uri: imageUri }}
                  resizeMode="contain"
                  style={{ width: Dimensions.get('window').width, height: Dimensions.get('window').height }}
                />
              </View>
            ))}
          </ScrollView>

          {/* Indicators để biết ảnh hiện tại */}
          {product && product.images && product.images.length > 1 && (
            <View style={tw`absolute bottom-8 left-0 right-0 flex-row justify-center`}>
              {product.images.map((_, index) => (
                <View
                  key={index}
                  style={[
                    tw`w-2 h-2 rounded-full mx-1`,
                    { backgroundColor: index === selectedImageIndex ? 'white' : 'rgba(255,255,255,0.5)' }
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      </Modal>
    </Wrapper>
  );
};

export default Product;

const styles = StyleSheet.create({});
