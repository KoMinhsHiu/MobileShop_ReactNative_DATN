import React, {useState} from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {Icon} from 'react-native-elements';
import {useNavigation} from '@react-navigation/native';
import tw from 'tailwind-react-native-classnames';
import {TitleText, BodyText} from '../components/ThemeText';
import {COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY} from '../constants/theme';
import {SafeAreaView} from 'react-native-safe-area-context';
import {saveAuthData, saveUsername, getSavedUsername, clearSavedCredentials, getAuthToken} from '../utils/auth';
import {getApiUrl, API_ENDPOINTS} from '../config/api';
import {useDispatch} from 'react-redux';
import {setBasket} from '../store/slices/siteSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {GoogleSignin, statusCodes} from '@react-native-google-signin/google-signin';

const Login = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Cấu hình Google Sign-In
  React.useEffect(() => {
    GoogleSignin.configure({
      // Web Client ID từ Google Cloud Console
      webClientId: '504133907493-loka5aeg5o0bmsdd09ppjtqqrj81dh69.apps.googleusercontent.com',
      offlineAccess: true, // Nếu bạn cần truy cập offline
    });
  }, []);

  // Load saved username khi component mount
  React.useEffect(() => {
    const loadSavedUsername = async () => {
      const savedUsername = await getSavedUsername();
      if (savedUsername) {
        setUsername(savedUsername);
        setRememberMe(true);
      }
    };
    loadSavedUsername();
  }, []);

  // Hàm fetch giỏ hàng từ API
  const fetchCartFromAPI = async (token) => {
    try {
      if (!token) {
        return;
      }

      // Use 10.0.2.2 for Android emulator, localhost for iOS simulator
      const API_BASE_URL = Platform.OS === 'android' 
        ? 'http://10.0.2.2:3000'
        : 'http://localhost:3000';

      const response = await fetch(`${API_BASE_URL}/api/v1/cart/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.status === 200 && result.data && result.data.items) {
        // Get colorId map from AsyncStorage as fallback
        let colorIdMap = {};
        try {
          const colorIdMapKey = 'cart_colorId_map';
          const storedMap = await AsyncStorage.getItem(colorIdMapKey);
          if (storedMap) {
            colorIdMap = JSON.parse(storedMap);
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

        dispatch(setBasket(transformedBasket));
      }
    } catch (error) {
      console.error('Error fetching cart after login:', error);
      // Không hiển thị lỗi cho user vì đây là background operation
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!username.trim()) {
      newErrors.username = 'Vui lòng nhập tên đăng nhập';
    }
    if (!password.trim()) {
      newErrors.password = 'Vui lòng nhập mật khẩu';
    } else if (password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (validateForm()) {
      setLoading(true);
      setErrors({}); // Clear previous errors
      
      try {
        const apiUrl = getApiUrl(API_ENDPOINTS.LOGIN);
        console.log('Calling API:', apiUrl);
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: username.trim(),
            password: password,
          }),
        });

        // Kiểm tra status code của HTTP response
        if (!response.ok) {
          // Nếu response không ok, thử parse error message
          let errorMessage = 'Đăng nhập thất bại. Vui lòng thử lại.';
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.errors || errorMessage;
          } catch (e) {
            errorMessage = `Lỗi ${response.status}: ${response.statusText}`;
          }
          setErrors({general: errorMessage});
          return;
        }

        const data = await response.json();
        console.log('API Response:', data);

        if (data.status === 200 && data.data) {
          // Đăng nhập thành công
          const {userId, tokens} = data.data;
          const {accessToken, refreshToken, expiresIn} = tokens;

          // Lưu thông tin đăng nhập
          const userData = {
            userId: userId,
            username: username.trim(),
          };

          // Lưu username nếu remember me được chọn
          if (rememberMe) {
            await saveUsername(username.trim());
          } else {
            await clearSavedCredentials(); // Xóa username đã lưu
          }

          const saved = await saveAuthData(
            accessToken,
            userData,
            refreshToken,
            expiresIn,
            rememberMe
          );

          if (saved) {
            // Gọi API lấy giỏ hàng sau khi đăng nhập thành công
            await fetchCartFromAPI(accessToken);
            
            // Chuyển đến màn hình Home sau khi đăng nhập thành công
            navigation.replace('HomeScreen');
          } else {
            setErrors({general: 'Có lỗi xảy ra khi lưu thông tin đăng nhập.'});
          }
        } else {
          // Xử lý lỗi từ API
          const errorMessage = data.message || data.errors || 'Đăng nhập thất bại. Vui lòng thử lại.';
          setErrors({general: errorMessage});
        }
      } catch (error) {
        console.error('Login error:', error);
        console.error('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack,
        });
        
        // Xử lý lỗi network hoặc lỗi khác
        if (error.message && error.message.includes('Network request failed')) {
          setErrors({
            general: 'Không thể kết nối đến server. Vui lòng:\n- Kiểm tra server đã chạy chưa\n- Kiểm tra kết nối mạng\n- Thử lại sau',
          });
        } else if (error.message && error.message.includes('Failed to connect')) {
          setErrors({
            general: 'Không thể kết nối đến server. Vui lòng kiểm tra lại.',
          });
        } else {
          setErrors({
            general: `Đăng nhập thất bại: ${error.message || 'Vui lòng thử lại.'}`,
          });
        }
      } finally {
        setLoading(false);
      }
    }
  };

  // Handler đăng nhập bằng Google - Sử dụng Google Sign-In SDK
  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      setErrors({});

      // Kiểm tra xem Google Play Services có sẵn không (chỉ trên Android)
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});
      }

      // Đăng nhập với Google
      console.log('[Google Sign-In] Bắt đầu đăng nhập...');
      const userInfo = await GoogleSignin.signIn();
      console.log('[Google Sign-In] Response:', JSON.stringify(userInfo, null, 2));
      
      // Response từ Google Sign-In có cấu trúc trực tiếp, không có .data
      // Kiểm tra idToken trực tiếp từ response
      if (!userInfo.idToken) {
        console.error('[Google Sign-In] Không có idToken trong response:', userInfo);
        setErrors({
          general: 'Không thể lấy idToken từ Google. Vui lòng kiểm tra:\n1. Android Client ID đã được tạo với đúng SHA-1\n2. Package name khớp: com.shoppingappnew\n3. Web Client ID đã được cấu hình đúng',
        });
        setGoogleLoading(false);
        return;
      }

      if (!userInfo.user) {
        console.error('[Google Sign-In] Không có user info trong response:', userInfo);
        setErrors({general: 'Không thể lấy thông tin user từ Google. Vui lòng thử lại.'});
        setGoogleLoading(false);
        return;
      }

      const {idToken, user} = userInfo;
      console.log('[Google Sign-In] Thành công! idToken received, length:', idToken.length);
      console.log('[Google Sign-In] User info:', {email: user?.email, name: user?.name});

      // Gửi idToken lên backend để xác thực
      // Backend sẽ verify idToken và trả về access token
      const apiUrl = getApiUrl(API_ENDPOINTS.GOOGLE_MOBILE_CALLBACK);
      console.log('[Google Sign-In] Calling mobile callback API:', apiUrl);
      console.log('[Google Sign-In] Request body:', {
        idToken: idToken.substring(0, 50) + '...',
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idToken: idToken, // Chỉ gửi idToken, backend sẽ extract thông tin từ token
        }),
      });

      console.log('[Google Sign-In] Response status:', response.status);

      // Parse response
      let data;
      const responseText = await response.text();
      
      try {
        data = JSON.parse(responseText);
        console.log('[Google Sign-In] Response data:', data);
      } catch (parseError) {
        console.error('[Google Sign-In] JSON Parse Error:', parseError);
        console.error('[Google Sign-In] Response text:', responseText.substring(0, 1000));
        setErrors({
          general: `Lỗi từ server: Server trả về dữ liệu không hợp lệ. Status: ${response.status}`,
        });
        setGoogleLoading(false);
        return;
      }

      // Xử lý các trường hợp response
      if (response.status === 200 && data.status === 200 && data.data) {
        // Đăng nhập thành công
        const {userId, tokens} = data.data;
        const {accessToken, refreshToken, expiresIn} = tokens;

        // Lưu thông tin đăng nhập
        // Backend đã verify và lấy thông tin từ idToken, nhưng vẫn dùng thông tin từ Google SDK để hiển thị
        const userData = {
          userId: userId,
          username: user.email || user.name || 'Google User',
          email: user.email,
          name: user.name,
          photo: user.photo,
        };

        const saved = await saveAuthData(
          accessToken,
          userData,
          refreshToken,
          expiresIn,
          true // Google login luôn remember
        );

        if (saved) {
          // Gọi API lấy giỏ hàng sau khi đăng nhập thành công
          await fetchCartFromAPI(accessToken);
          
          // Chuyển đến màn hình Home sau khi đăng nhập thành công
          navigation.replace('HomeScreen');
        } else {
          setErrors({general: 'Có lỗi xảy ra khi lưu thông tin đăng nhập.'});
        }
      } else if (response.status === 401) {
        // Lỗi xác thực: thiếu hoặc invalid idToken
        const errorMessage = data.message || 'ID Token không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.';
        setErrors({general: errorMessage});
      } else if (response.status === 404 && data.status === 404) {
        // User chưa tồn tại trong hệ thống - chuyển đến màn hình đăng ký
        const googleUser = data.data?.googleUser;
        console.log('[Google Sign-In] User chưa tồn tại, chuyển đến màn hình đăng ký');
        console.log('[Google Sign-In] Google user info:', googleUser);
        
        // Navigate đến Register screen với thông tin Google user
        // Sử dụng thông tin từ Google SDK (user) nếu backend không trả về googleUser
        const googleInfo = googleUser || {
          id: user.id,
          email: user.email,
          firstName: user.givenName || user.name?.split(' ')[0] || '',
          lastName: user.familyName || user.name?.split(' ').slice(1).join(' ') || '',
        };
        
        navigation.navigate('RegisterScreen', {
          googleUser: googleInfo,
          fromGoogle: true,
        });
      } else if (response.status === 503) {
        // Service không khả dụng
        setErrors({
          general: data.message || 'Dịch vụ xác thực tạm thời không khả dụng. Vui lòng thử lại sau.',
        });
      } else {
        // Các lỗi khác
        const errorMessage = data.message || data.errors || 'Đăng nhập bằng Google thất bại. Vui lòng thử lại.';
        setErrors({general: errorMessage});
      }
    } catch (error) {
      console.error('Google Login error:', error);
      
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // User đã hủy đăng nhập
        console.log('User cancelled Google login');
        // Không hiển thị lỗi nếu user tự hủy
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // Đang xử lý
        console.log('Google login in progress');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setErrors({general: 'Google Play Services không khả dụng. Vui lòng cài đặt hoặc cập nhật.'});
      } else {
        setErrors({
          general: `Đăng nhập bằng Google thất bại: ${error.message || 'Vui lòng thử lại.'}`,
        });
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={tw`flex-1`}>
        <ScrollView
          contentContainerStyle={tw`flex-grow justify-center px-6 py-8`}
          keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={tw`items-center mb-8`}>
            <View
              style={[
                tw`w-24 h-24 rounded-full bg-red-500 items-center justify-center mb-4`,
                styles.logoShadow,
              ]}>
              <Icon
                type="ionicon"
                name="person"
                size={48}
                color="white"
              />
            </View>
            <TitleText
              style={tw`text-3xl text-gray-900 mb-2`}
              weight={800}>
              Đăng Nhập
            </TitleText>
            <BodyText style={tw`text-gray-600 text-center`}>
              Chào mừng bạn trở lại
            </BodyText>
          </View>

          {/* Form */}
          <View style={tw`mb-6`}>
            {/* Username Input */}
            <View style={tw`mb-4`}>
              <BodyText
                style={tw`text-gray-700 mb-2`}
                weight={500}>
                Tên đăng nhập
              </BodyText>
              <View
                style={[
                  tw`flex-row items-center bg-gray-50 rounded-lg px-4 py-3 border`,
                  errors.username
                    ? tw`border-red-500`
                    : tw`border-gray-200`,
                  styles.inputShadow,
                ]}>
                <Icon
                  type="ionicon"
                  name="person-outline"
                  size={20}
                  color={errors.username ? COLORS.primary : '#9ca3af'}
                  style={tw`mr-3`}
                />
                <TextInput
                  style={[
                    tw`flex-1 text-gray-900`,
                    {fontSize: TYPOGRAPHY.sizes.md},
                  ]}
                  placeholder="Nhập tên đăng nhập"
                  placeholderTextColor="#9ca3af"
                  value={username}
                  onChangeText={text => {
                    setUsername(text);
                    if (errors.username) {
                      setErrors({...errors, username: null});
                    }
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              {errors.username && (
                <BodyText style={tw`text-red-500 mt-1 text-xs`}>
                  {errors.username}
                </BodyText>
              )}
            </View>

            {/* Password Input */}
            <View style={tw`mb-4`}>
              <BodyText
                style={tw`text-gray-700 mb-2`}
                weight={500}>
                Mật khẩu
              </BodyText>
              <View
                style={[
                  tw`flex-row items-center bg-gray-50 rounded-lg px-4 py-3 border`,
                  errors.password
                    ? tw`border-red-500`
                    : tw`border-gray-200`,
                  styles.inputShadow,
                ]}>
                <Icon
                  type="ionicon"
                  name="lock-closed-outline"
                  size={20}
                  color={errors.password ? COLORS.primary : '#9ca3af'}
                  style={tw`mr-3`}
                />
                <TextInput
                  style={[
                    tw`flex-1 text-gray-900`,
                    {fontSize: TYPOGRAPHY.sizes.md},
                  ]}
                  placeholder="Nhập mật khẩu"
                  placeholderTextColor="#9ca3af"
                  value={password}
                  onChangeText={text => {
                    setPassword(text);
                    if (errors.password) {
                      setErrors({...errors, password: null});
                    }
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={tw`ml-2`}>
                  <Icon
                    type="ionicon"
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color="#9ca3af"
                  />
                </TouchableOpacity>
              </View>
              {errors.password && (
                <BodyText style={tw`text-red-500 mt-1 text-xs`}>
                  {errors.password}
                </BodyText>
              )}
            </View>

            {/* Remember Me Checkbox */}
            <View style={tw`flex-row items-center mb-4`}>
              <TouchableOpacity
                onPress={() => setRememberMe(!rememberMe)}
                style={tw`flex-row items-center`}
                activeOpacity={0.7}>
                <View
                  style={[
                    tw`w-5 h-5 rounded border-2 items-center justify-center mr-2`,
                    rememberMe
                      ? tw`bg-red-600 border-red-600`
                      : tw`border-gray-300 bg-white`,
                  ]}>
                  {rememberMe && (
                    <Icon
                      type="ionicon"
                      name="checkmark"
                      size={14}
                      color="white"
                    />
                  )}
                </View>
                <BodyText style={tw`text-gray-700`} weight={400}>
                  Ghi nhớ đăng nhập
                </BodyText>
              </TouchableOpacity>
            </View>

            {/* Error Message */}
            {errors.general && (
              <View style={tw`mb-4 bg-red-50 rounded-lg p-3 border border-red-200`}>
                <BodyText style={tw`text-red-600 text-center`}>
                  {errors.general}
                </BodyText>
              </View>
            )}

            {/* Login Button */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading || googleLoading}
              style={[
                tw`bg-red-600 rounded-lg py-4 items-center justify-center mt-2`,
                (loading || googleLoading) && tw`opacity-50`,
                styles.buttonShadow,
              ]}>
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <TitleText style={tw`text-white text-lg`} weight={700}>
                  Đăng Nhập
                </TitleText>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={tw`flex-row items-center my-6`}>
              <View style={tw`flex-1 h-px bg-gray-300`} />
              <BodyText style={tw`mx-4 text-gray-500`}>hoặc</BodyText>
              <View style={tw`flex-1 h-px bg-gray-300`} />
            </View>

            {/* Google Login Button */}
            <TouchableOpacity
              onPress={handleGoogleLogin}
              disabled={loading || googleLoading}
              style={[
                tw`bg-white rounded-lg py-4 items-center justify-center flex-row border border-gray-300`,
                (loading || googleLoading) && tw`opacity-50`,
                styles.buttonShadow,
              ]}>
              {googleLoading ? (
                <ActivityIndicator size="small" color="#4285F4" />
              ) : (
                <>
                  <View
                    style={[
                      tw`w-6 h-6 mr-3 items-center justify-center rounded-full`,
                      {backgroundColor: '#4285F4'},
                    ]}>
                    <TitleText style={tw`text-white text-sm`} weight={700}>
                      G
                    </TitleText>
                  </View>
                  <TitleText style={tw`text-gray-700 text-lg`} weight={600}>
                    Đăng nhập bằng Google
                  </TitleText>
                </>
              )}
            </TouchableOpacity>

            {/* Register Link */}
            <View style={tw`flex-row justify-center items-center mt-6`}>
              <BodyText style={tw`text-gray-600`}>
                Chưa có tài khoản?{' '}
              </BodyText>
              <TouchableOpacity
                onPress={() => navigation.navigate('RegisterScreen')}>
                <BodyText
                  style={tw`text-red-600`}
                  weight={600}>
                  Đăng ký ngay
                </BodyText>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  logoShadow: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  inputShadow: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonShadow: {
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});

export default Login;
