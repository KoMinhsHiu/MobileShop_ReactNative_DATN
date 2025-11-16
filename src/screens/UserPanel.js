import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Image,
  Alert,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import React, { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import Wrapper from '../components/Wrapper/Wrapper';
import CustomStatusBar from '../components/CustomStatusBar';
import { Icon } from 'react-native-elements';
import tw from 'tailwind-react-native-classnames';
import { clearAuthData, getAuthToken } from '../utils/auth';
import { getApiUrl, API_ENDPOINTS } from '../config/api';

const UserPanel = () => {
  const navigation = useNavigation();
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState({
    avatar: 'https://i.ibb.co/5sJj2WX/default-avatar.png',
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    pointBalance: 0,
    username: '',
  });

  const [editForm, setEditForm] = useState({
    fullName: userInfo.fullName,
    email: userInfo.email,
    phone: userInfo.phone,
    dateOfBirth: userInfo.dateOfBirth,
    gender: userInfo.gender,
  });

  // Format date from ISO string to DD/MM/YYYY
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (error) {
      return '';
    }
  };

  // Format gender from API (male/female) to display format
  const formatGender = (gender) => {
    if (!gender) return '';
    return gender.charAt(0).toUpperCase() + gender.slice(1);
  };

  // Fetch customer information from API
  const fetchCustomerInfo = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      if (!token) {
        console.log('No token available');
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
        
        // Map API response to userInfo state
        setUserInfo({
          avatar: 'https://i.ibb.co/5sJj2WX/default-avatar.png',
          fullName: `${customerData.firstName || ''} ${customerData.lastName || ''}`.trim() || 'N/A',
          email: userData.email || '',
          phone: userData.phone || '',
          dateOfBirth: formatDate(customerData.dateOfBirth),
          gender: formatGender(customerData.gender),
          pointBalance: customerData.pointBalance || 0,
          username: userData.username || '',
        });
      } else if (result.status === 404) {
        Alert.alert('Thông báo', 'Không tìm thấy thông tin khách hàng');
      } else if (result.status === 503) {
        Alert.alert('Lỗi', 'Dịch vụ tạm thời không khả dụng. Vui lòng thử lại sau.');
      } else {
        Alert.alert('Lỗi', result.message || 'Không thể tải thông tin cá nhân');
      }
    } catch (error) {
      console.error('Error fetching customer info:', error);
      Alert.alert('Lỗi', 'Đã xảy ra lỗi khi tải thông tin cá nhân');
    } finally {
      setLoading(false);
    }
  };

  // Fetch customer info when component mounts
  useEffect(() => {
    fetchCustomerInfo();
  }, []);

  const openEditModal = () => {
    setEditForm({ ...userInfo });
    setIsEditModalVisible(true);
  };

  const closeEditModal = () => {
    setIsEditModalVisible(false);
  };

  const saveChanges = () => {
    setUserInfo({ ...editForm });
    setIsEditModalVisible(false);
    Alert.alert('Success', 'Profile updated successfully!');
  };

  const changeAvatar = () => {
    Alert.alert(
      'Change Avatar',
      'Choose an option',
      [
        { text: 'Camera', onPress: () => console.log('Camera') },
        { text: 'Gallery', onPress: () => console.log('Gallery') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất?',
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: async () => {
            setLogoutLoading(true);
            try {
              const token = await getAuthToken();
              const apiUrl = getApiUrl(API_ENDPOINTS.LOGOUT);
              
              console.log('Calling Logout API:', apiUrl);
              
              // Gọi API logout
              const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`, // Gửi token trong header
                },
              });

              // Parse response
              let data;
              try {
                data = await response.json();
              } catch (e) {
                // Nếu không parse được JSON, vẫn tiếp tục logout local
                console.log('Logout response không phải JSON, tiếp tục logout local');
              }

              // Xóa thông tin đăng nhập local (dù API có thành công hay không)
              await clearAuthData();

              // Chuyển đến màn hình đăng nhập
              navigation.reset({
                index: 0,
                routes: [{ name: 'LoginScreen' }],
              });
            } catch (error) {
              console.error('Logout error:', error);
              
              // Ngay cả khi có lỗi, vẫn xóa data local và logout
              await clearAuthData();
              
              navigation.reset({
                index: 0,
                routes: [{ name: 'LoginScreen' }],
              });
            } finally {
              setLogoutLoading(false);
            }
          },
        },
      ]
    );
  };

  const PersonalInfoSection = () => (
    <View style={tw`bg-white rounded-lg mb-4 shadow-sm`}>
      <View style={tw`p-4 border-b border-gray-100`}>
        <Text style={tw`text-lg font-bold text-gray-800`}>
          📋 Personal Information
        </Text>
      </View>
      
      <View style={tw`p-4`}>
        {/* Avatar Section */}
        <View style={tw`items-center mb-6`}>
          <View style={tw`relative`}>
            <Image
              source={{ uri: userInfo.avatar }}
              style={tw`w-24 h-24 rounded-full border-4 border-gray-200`}
            />
            <Pressable
              style={tw`absolute bottom-0 right-0 bg-blue-600 w-8 h-8 rounded-full items-center justify-center`}
              onPress={changeAvatar}
            >
              <Icon name="camera" type="ionicon" size={16} color="white" />
            </Pressable>
          </View>
          <Pressable
            style={tw`mt-2 bg-gray-100 px-4 py-2 rounded-lg`}
            onPress={changeAvatar}
          >
            <Text style={tw`text-gray-700 text-sm font-medium`}>Change Avatar</Text>
          </Pressable>
        </View>

        {/* User Information */}
        <View style={tw`space-y-4`}>
          <View style={tw`flex-row items-center`}>
            <Icon name="person" type="ionicon" size={20} color="#666" style={tw`mr-3`} />
            <View style={tw`flex-1`}>
              <Text style={tw`text-gray-500 text-sm`}>Full Name</Text>
              <Text style={tw`text-gray-800 font-medium`}>{userInfo.fullName}</Text>
            </View>
          </View>

          <View style={tw`flex-row items-center`}>
            <Icon name="mail" type="ionicon" size={20} color="#666" style={tw`mr-3`} />
            <View style={tw`flex-1`}>
              <Text style={tw`text-gray-500 text-sm`}>Email</Text>
              <Text style={tw`text-gray-800 font-medium`}>{userInfo.email}</Text>
            </View>
          </View>

          <View style={tw`flex-row items-center`}>
            <Icon name="call" type="ionicon" size={20} color="#666" style={tw`mr-3`} />
            <View style={tw`flex-1`}>
              <Text style={tw`text-gray-500 text-sm`}>Phone Number</Text>
              <Text style={tw`text-gray-800 font-medium`}>{userInfo.phone}</Text>
            </View>
          </View>

          {userInfo.dateOfBirth && (
            <View style={tw`flex-row items-center`}>
              <Icon name="calendar" type="ionicon" size={20} color="#666" style={tw`mr-3`} />
              <View style={tw`flex-1`}>
                <Text style={tw`text-gray-500 text-sm`}>Date of Birth</Text>
                <Text style={tw`text-gray-800 font-medium`}>{userInfo.dateOfBirth}</Text>
              </View>
            </View>
          )}

          {userInfo.gender && (
            <View style={tw`flex-row items-center`}>
              <Icon name="people" type="ionicon" size={20} color="#666" style={tw`mr-3`} />
              <View style={tw`flex-1`}>
                <Text style={tw`text-gray-500 text-sm`}>Gender</Text>
                <Text style={tw`text-gray-800 font-medium`}>{userInfo.gender}</Text>
              </View>
            </View>
          )}

          {userInfo.pointBalance !== undefined && (
            <View style={tw`flex-row items-center`}>
              <Icon name="star" type="ionicon" size={20} color="#666" style={tw`mr-3`} />
              <View style={tw`flex-1`}>
                <Text style={tw`text-gray-500 text-sm`}>Point Balance</Text>
                <Text style={tw`text-gray-800 font-medium`}>{userInfo.pointBalance}</Text>
              </View>
            </View>
          )}

          {userInfo.username && (
            <View style={tw`flex-row items-center`}>
              <Icon name="person-circle" type="ionicon" size={20} color="#666" style={tw`mr-3`} />
              <View style={tw`flex-1`}>
                <Text style={tw`text-gray-500 text-sm`}>Username</Text>
                <Text style={tw`text-gray-800 font-medium`}>{userInfo.username}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Edit Button */}
        <Pressable
          style={tw`bg-blue-600 mt-6 p-4 rounded-lg`}
          onPress={openEditModal}
        >
          <Text style={tw`text-white text-center font-bold`}>
            ✏️ Edit Information
          </Text>
        </Pressable>
      </View>
    </View>
  );

  const OrdersPaymentSection = () => (
    <View style={tw`bg-white rounded-lg mb-4 shadow-sm`}>
      <View style={tw`p-4 border-b border-gray-100`}>
        <Text style={tw`text-lg font-bold text-gray-800`}>
          📦 Orders & Payment
        </Text>
      </View>
      
      <View style={tw`p-4`}>
        <View style={tw`space-y-3`}>
          <Pressable style={tw`flex-row items-center p-3 bg-gray-50 rounded-lg`}>
            <Icon name="receipt" type="ionicon" size={24} color="#666" style={tw`mr-3`} />
            <Text style={tw`text-gray-800 font-medium flex-1`}>Order History</Text>
            <Icon name="chevron-forward" type="ionicon" size={20} color="#999" />
          </Pressable>

          <Pressable style={tw`flex-row items-center p-3 bg-gray-50 rounded-lg`}>
            <Icon name="card" type="ionicon" size={24} color="#666" style={tw`mr-3`} />
            <Text style={tw`text-gray-800 font-medium flex-1`}>Payment Methods</Text>
            <Icon name="chevron-forward" type="ionicon" size={20} color="#999" />
          </Pressable>

          <Pressable style={tw`flex-row items-center p-3 bg-gray-50 rounded-lg`}>
            <Icon name="wallet" type="ionicon" size={24} color="#666" style={tw`mr-3`} />
            <Text style={tw`text-gray-800 font-medium flex-1`}>Wallet & Vouchers</Text>
            <Icon name="chevron-forward" type="ionicon" size={20} color="#999" />
          </Pressable>
        </View>
      </View>
    </View>
  );

  const SettingsSupportSection = () => (
    <View style={tw`bg-white rounded-lg mb-4 shadow-sm`}>
      <View style={tw`p-4 border-b border-gray-100`}>
        <Text style={tw`text-lg font-bold text-gray-800`}>
          ⚙️ Settings & Support
        </Text>
      </View>
      
      <View style={tw`p-4`}>
        <View style={tw`space-y-3`}>
          <Pressable style={tw`flex-row items-center p-3 bg-gray-50 rounded-lg`}>
            <Icon name="notifications" type="ionicon" size={24} color="#666" style={tw`mr-3`} />
            <Text style={tw`text-gray-800 font-medium flex-1`}>Notifications</Text>
            <Icon name="chevron-forward" type="ionicon" size={20} color="#999" />
          </Pressable>

          <Pressable style={tw`flex-row items-center p-3 bg-gray-50 rounded-lg`}>
            <Icon name="shield-checkmark" type="ionicon" size={24} color="#666" style={tw`mr-3`} />
            <Text style={tw`text-gray-800 font-medium flex-1`}>Privacy & Security</Text>
            <Icon name="chevron-forward" type="ionicon" size={20} color="#999" />
          </Pressable>

          <Pressable style={tw`flex-row items-center p-3 bg-gray-50 rounded-lg`}>
            <Icon name="help-circle" type="ionicon" size={24} color="#666" style={tw`mr-3`} />
            <Text style={tw`text-gray-800 font-medium flex-1`}>Help & Support</Text>
            <Icon name="chevron-forward" type="ionicon" size={20} color="#999" />
          </Pressable>

          <Pressable style={tw`flex-row items-center p-3 bg-gray-50 rounded-lg`}>
            <Icon name="information-circle" type="ionicon" size={24} color="#666" style={tw`mr-3`} />
            <Text style={tw`text-gray-800 font-medium flex-1`}>About App</Text>
            <Icon name="chevron-forward" type="ionicon" size={20} color="#999" />
          </Pressable>

          <Pressable 
            style={tw`flex-row items-center p-3 bg-red-50 rounded-lg mt-4 ${logoutLoading ? 'opacity-50' : ''}`}
            onPress={handleLogout}
            disabled={logoutLoading}
          >
            {logoutLoading ? (
              <ActivityIndicator size="small" color="#dc2626" style={tw`mr-3`} />
            ) : (
              <Icon name="log-out" type="ionicon" size={24} color="#dc2626" style={tw`mr-3`} />
            )}
            <Text style={tw`text-red-600 font-medium flex-1`}>
              {logoutLoading ? 'Đang đăng xuất...' : 'Logout'}
            </Text>
            {!logoutLoading && (
              <Icon name="chevron-forward" type="ionicon" size={20} color="#dc2626" />
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );

  const EditModal = () => (
    <Modal
      visible={isEditModalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={tw`flex-1 bg-white`}>
        {/* Header */}
        <View style={tw`flex-row items-center justify-between p-4 border-b border-gray-200`}>
          <Pressable onPress={closeEditModal}>
            <Text style={tw`text-blue-600 font-medium`}>Cancel</Text>
          </Pressable>
          <Text style={tw`text-lg font-bold`}>Edit Profile</Text>
          <Pressable onPress={saveChanges}>
            <Text style={tw`text-blue-600 font-bold`}>Save</Text>
          </Pressable>
        </View>

        <ScrollView style={tw`flex-1 p-4`}>
          {/* Avatar Section */}
          <View style={tw`items-center mb-6`}>
            <Pressable onPress={changeAvatar}>
              <Image
                source={{ uri: userInfo.avatar }}
                style={tw`w-32 h-32 rounded-full border-4 border-gray-200 mb-4`}
              />
            </Pressable>
            <Pressable
              style={tw`bg-blue-600 px-6 py-3 rounded-lg`}
              onPress={changeAvatar}
            >
              <Text style={tw`text-white font-medium`}>Change Avatar</Text>
            </Pressable>
          </View>

          {/* Form Fields */}
          <View style={tw`space-y-4`}>
            <View>
              <Text style={tw`text-gray-700 font-medium mb-2`}>Full Name</Text>
              <TextInput
                style={tw`border border-gray-300 rounded-lg p-3 text-gray-800`}
                value={editForm.fullName}
                onChangeText={(text) => setEditForm({ ...editForm, fullName: text })}
                placeholder="Enter your full name"
              />
            </View>

            <View>
              <Text style={tw`text-gray-700 font-medium mb-2`}>Email</Text>
              <TextInput
                style={tw`border border-gray-300 rounded-lg p-3 text-gray-800`}
                value={editForm.email}
                onChangeText={(text) => setEditForm({ ...editForm, email: text })}
                placeholder="Enter your email"
                keyboardType="email-address"
              />
            </View>

            <View>
              <Text style={tw`text-gray-700 font-medium mb-2`}>Phone Number</Text>
              <TextInput
                style={tw`border border-gray-300 rounded-lg p-3 text-gray-800`}
                value={editForm.phone}
                onChangeText={(text) => setEditForm({ ...editForm, phone: text })}
                placeholder="Enter your phone number"
                keyboardType="phone-pad"
              />
            </View>

            <View>
              <Text style={tw`text-gray-700 font-medium mb-2`}>Date of Birth (Optional)</Text>
              <TextInput
                style={tw`border border-gray-300 rounded-lg p-3 text-gray-800`}
                value={editForm.dateOfBirth}
                onChangeText={(text) => setEditForm({ ...editForm, dateOfBirth: text })}
                placeholder="DD/MM/YYYY"
              />
            </View>

            <View>
              <Text style={tw`text-gray-700 font-medium mb-2`}>Gender (Optional)</Text>
              <View style={tw`flex-row space-x-4`}>
                <Pressable
                  style={tw`flex-row items-center flex-1 p-3 border rounded-lg ${
                    editForm.gender === 'Male' ? 'border-blue-600 bg-blue-50' : 'border-gray-300'
                  }`}
                  onPress={() => setEditForm({ ...editForm, gender: 'Male' })}
                >
                  <Icon
                    name={editForm.gender === 'Male' ? 'radio-button-on' : 'radio-button-off'}
                    type="ionicon"
                    size={20}
                    color={editForm.gender === 'Male' ? '#2563eb' : '#999'}
                  />
                  <Text style={tw`ml-2 text-gray-800`}>Male</Text>
                </Pressable>

                <Pressable
                  style={tw`flex-row items-center flex-1 p-3 border rounded-lg ${
                    editForm.gender === 'Female' ? 'border-blue-600 bg-blue-50' : 'border-gray-300'
                  }`}
                  onPress={() => setEditForm({ ...editForm, gender: 'Female' })}
                >
                  <Icon
                    name={editForm.gender === 'Female' ? 'radio-button-on' : 'radio-button-off'}
                    type="ionicon"
                    size={20}
                    color={editForm.gender === 'Female' ? '#2563eb' : '#999'}
                  />
                  <Text style={tw`ml-2 text-gray-800`}>Female</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Save Button */}
          <Pressable
            style={tw`bg-blue-600 mt-8 p-4 rounded-lg`}
            onPress={saveChanges}
          >
            <Text style={tw`text-white text-center font-bold text-lg`}>
              Save Changes
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );

  return (
    <>
      <CustomStatusBar backgroundColor="red" barStyle="white-content" />
      <Wrapper header={false}>
        {loading ? (
          <View style={tw`flex-1 justify-center items-center bg-gray-100`}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={tw`text-gray-600 mt-4`}>Đang tải thông tin...</Text>
          </View>
        ) : (
          <ScrollView style={tw`flex-1 bg-gray-100`}>
            <View style={tw`p-4`}>
              {/* Header */}
              <View style={tw`mb-6`}>
                <Text style={tw`text-2xl font-bold text-gray-800`}>Profile</Text>
                <Text style={tw`text-gray-600 mt-1`}>Manage your account settings</Text>
              </View>

              {/* Sections */}
              <PersonalInfoSection />
              <OrdersPaymentSection />
              <SettingsSupportSection />
            </View>
          </ScrollView>
        )}

        {/* Edit Modal */}
        <EditModal />
      </Wrapper>
    </>
  );
};

export default UserPanel;

const styles = StyleSheet.create({});
