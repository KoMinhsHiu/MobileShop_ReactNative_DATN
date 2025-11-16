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
import {saveAuthData} from '../utils/auth';
import {getApiUrl, API_ENDPOINTS} from '../config/api';

const Register = () => {
  const navigation = useNavigation();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    phone: '',
    roleId: '1',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Vui lòng nhập tên đăng nhập';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Vui lòng nhập email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Vui lòng nhập mật khẩu';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Vui lòng nhập số điện thoại';
    } else if (!/^[0-9]{10,11}$/.test(formData.phone)) {
      newErrors.phone = 'Số điện thoại không hợp lệ';
    }

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Vui lòng nhập họ';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Vui lòng nhập tên';
    }

    if (!formData.dateOfBirth.trim()) {
      newErrors.dateOfBirth = 'Vui lòng nhập ngày sinh';
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(formData.dateOfBirth)) {
      newErrors.dateOfBirth = 'Định dạng ngày sinh: YYYY-MM-DD';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (validateForm()) {
      setLoading(true);
      setErrors({}); // Clear previous errors
      
      try {
        const apiUrl = getApiUrl(API_ENDPOINTS.REGISTER);
        console.log('Calling Register API:', apiUrl);
        
        const registerData = {
          username: formData.username.trim(),
          email: formData.email.trim(),
          password: formData.password,
          phone: formData.phone.trim(),
          roleId: parseInt(formData.roleId, 10),
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          dateOfBirth: formData.dateOfBirth.trim(),
        };
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(registerData),
        });

        // Kiểm tra status code của HTTP response
        if (!response.ok) {
          // Nếu response không ok, thử parse error message
          let errorMessage = 'Đăng ký thất bại. Vui lòng thử lại.';
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
        console.log('Register API Response:', data);

        // API trả về status 201 (Created) cho đăng ký thành công
        if (data.status === 201 && data.data) {
          // Đăng ký thành công
          const {userId, tokens} = data.data;
          const {accessToken, refreshToken, expiresIn} = tokens;

          // Lưu thông tin đăng nhập (tự động đăng nhập sau khi đăng ký)
          const userData = {
            userId: userId,
            username: registerData.username,
            email: registerData.email,
            firstName: registerData.firstName,
            lastName: registerData.lastName,
            phone: registerData.phone,
            roleId: registerData.roleId,
          };

          const saved = await saveAuthData(
            accessToken,
            userData,
            refreshToken,
            expiresIn
          );

          if (saved) {
            // Chuyển đến màn hình Home sau khi đăng ký thành công
            navigation.replace('HomeScreen');
          } else {
            setErrors({general: 'Có lỗi xảy ra khi lưu thông tin đăng nhập.'});
          }
        } else {
          // Xử lý lỗi từ API
          const errorMessage = data.message || data.errors || 'Đăng ký thất bại. Vui lòng thử lại.';
          setErrors({general: errorMessage});
        }
      } catch (error) {
        console.error('Register error:', error);
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
            general: `Đăng ký thất bại: ${error.message || 'Vui lòng thử lại.'}`,
          });
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const updateField = (field, value) => {
    setFormData({...formData, [field]: value});
    if (errors[field]) {
      setErrors({...errors, [field]: null});
    }
  };

  const renderInput = (
    label,
    field,
    icon,
    placeholder,
    options = {},
  ) => {
    const isPassword = field === 'password';
    return (
      <View style={tw`mb-4`}>
        <BodyText
          style={tw`text-gray-700 mb-2`}
          weight={500}>
          {label}
        </BodyText>
        <View
          style={[
            tw`flex-row items-center bg-gray-50 rounded-lg px-4 py-3 border`,
            errors[field]
              ? tw`border-red-500`
              : tw`border-gray-200`,
            styles.inputShadow,
          ]}>
          <Icon
            type="ionicon"
            name={icon}
            size={20}
            color={errors[field] ? COLORS.primary : '#9ca3af'}
            style={tw`mr-3`}
          />
          {isPassword ? (
            <>
              <TextInput
                style={[
                  tw`flex-1 text-gray-900`,
                  {fontSize: TYPOGRAPHY.sizes.md},
                ]}
                placeholder={placeholder}
                placeholderTextColor="#9ca3af"
                value={formData[field]}
                onChangeText={text => updateField(field, text)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                {...options}
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
            </>
          ) : (
            <TextInput
              style={[
                tw`flex-1 text-gray-900`,
                {fontSize: TYPOGRAPHY.sizes.md},
              ]}
              placeholder={placeholder}
              placeholderTextColor="#9ca3af"
              value={formData[field]}
              onChangeText={text => updateField(field, text)}
              autoCapitalize={field === 'email' ? 'none' : 'words'}
              autoCorrect={false}
              {...options}
            />
          )}
        </View>
        {errors[field] && (
          <BodyText style={tw`text-red-500 mt-1 text-xs`}>
            {errors[field]}
          </BodyText>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={tw`flex-1`}>
        <ScrollView
          contentContainerStyle={tw`px-6 py-8`}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={tw`items-center mb-6`}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={tw`absolute left-0 top-0 p-2`}>
              <Icon
                type="ionicon"
                name="arrow-back"
                size={28}
                color="#374151"
              />
            </TouchableOpacity>
            <View
              style={[
                tw`w-20 h-20 rounded-full bg-red-500 items-center justify-center mb-4`,
                styles.logoShadow,
              ]}>
              <Icon
                type="ionicon"
                name="person-add"
                size={40}
                color="white"
              />
            </View>
            <TitleText
              style={tw`text-3xl text-gray-900 mb-2`}
              weight={800}>
              Đăng Ký
            </TitleText>
            <BodyText style={tw`text-gray-600 text-center`}>
              Tạo tài khoản mới để bắt đầu
            </BodyText>
          </View>

          {/* Form */}
          <View style={tw`mb-6`}>
            {renderInput(
              'Tên đăng nhập',
              'username',
              'person-outline',
              'Nhập tên đăng nhập',
            )}

            {renderInput(
              'Email',
              'email',
              'mail-outline',
              'Nhập email',
              {keyboardType: 'email-address'},
            )}

            {renderInput(
              'Mật khẩu',
              'password',
              'lock-closed-outline',
              'Nhập mật khẩu (tối thiểu 6 ký tự)',
            )}

            {renderInput(
              'Số điện thoại',
              'phone',
              'call-outline',
              'Nhập số điện thoại',
              {keyboardType: 'phone-pad'},
            )}

            {renderInput(
              'Họ',
              'firstName',
              'person-outline',
              'Nhập họ',
            )}

            {renderInput(
              'Tên',
              'lastName',
              'person-outline',
              'Nhập tên',
            )}

            {renderInput(
              'Ngày sinh',
              'dateOfBirth',
              'calendar-outline',
              'YYYY-MM-DD (ví dụ: 1992-05-15)',
            )}

            {renderInput(
              'Role ID',
              'roleId',
              'shield-outline',
              'Nhập Role ID (mặc định: 1)',
              {keyboardType: 'numeric'},
            )}

            {/* Error Message */}
            {errors.general && (
              <View style={tw`mb-4 bg-red-50 rounded-lg p-3 border border-red-200`}>
                <BodyText style={tw`text-red-600 text-center`}>
                  {errors.general}
                </BodyText>
              </View>
            )}

            {/* Register Button */}
            <TouchableOpacity
              onPress={handleRegister}
              disabled={loading}
              style={[
                tw`bg-red-600 rounded-lg py-4 items-center justify-center mt-4`,
                loading && tw`opacity-50`,
                styles.buttonShadow,
              ]}>
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <TitleText style={tw`text-white text-lg`} weight={700}>
                  Đăng Ký
                </TitleText>
              )}
            </TouchableOpacity>

            {/* Login Link */}
            <View style={tw`flex-row justify-center items-center mt-6`}>
              <BodyText style={tw`text-gray-600`}>
                Đã có tài khoản?{' '}
              </BodyText>
              <TouchableOpacity
                onPress={() => navigation.navigate('LoginScreen')}>
                <BodyText
                  style={tw`text-red-600`}
                  weight={600}>
                  Đăng nhập
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

export default Register;
