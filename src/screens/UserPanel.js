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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { useNavigation } from '@react-navigation/native';
import Wrapper from '../components/Wrapper/Wrapper';
import CustomStatusBar from '../components/CustomStatusBar';
import { Icon } from 'react-native-elements';
import tw from 'tailwind-react-native-classnames';
import { clearAuthData, getAuthToken } from '../utils/auth';
import { getApiUrl, API_ENDPOINTS } from '../config/api';
import ChatMessageText from '../components/ChatMessageText/ChatMessageText';

const UserPanel = () => {
  const navigation = useNavigation();
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isChatModalVisible, setIsChatModalVisible] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: 'Xin chào! Tôi là trợ lý AI. Tôi có thể giúp gì cho bạn?',
      sender: 'ai',
      timestamp: new Date(),
    },
  ]);
  const [messageInput, setMessageInput] = useState('');
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
    Alert.alert('Thành công', 'Cập nhật hồ sơ thành công!');
  };

  const changeAvatar = () => {
    Alert.alert(
      'Đổi ảnh đại diện',
      'Chọn một tùy chọn',
      [
        { text: 'Máy ảnh', onPress: () => console.log('Camera') },
        { text: 'Thư viện', onPress: () => console.log('Gallery') },
        { text: 'Hủy', style: 'cancel' },
      ]
    );
  };

  const openChatModal = () => {
    setIsChatModalVisible(true);
  };

  const closeChatModal = () => {
    setIsChatModalVisible(false);
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
          📋 Thông tin cá nhân
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
            <Text style={tw`text-gray-700 text-sm font-medium`}>Đổi ảnh đại diện</Text>
          </Pressable>
        </View>

        {/* User Information */}
        <View>
          <View style={tw`flex-row items-center mb-4`}>
            <Icon name="person" type="ionicon" size={20} color="#666" style={tw`mr-3`} />
            <View style={tw`flex-1`}>
              <Text style={tw`text-gray-500 text-sm`}>Họ và tên</Text>
              <Text style={tw`text-gray-800 font-medium`}>{userInfo.fullName}</Text>
            </View>
          </View>

          <View style={tw`flex-row items-center mb-4`}>
            <Icon name="mail" type="ionicon" size={20} color="#666" style={tw`mr-3`} />
            <View style={tw`flex-1`}>
              <Text style={tw`text-gray-500 text-sm`}>Email</Text>
              <Text style={tw`text-gray-800 font-medium`}>{userInfo.email}</Text>
            </View>
          </View>

          <View style={tw`flex-row items-center mb-4`}>
            <Icon name="call" type="ionicon" size={20} color="#666" style={tw`mr-3`} />
            <View style={tw`flex-1`}>
              <Text style={tw`text-gray-500 text-sm`}>Số điện thoại</Text>
              <Text style={tw`text-gray-800 font-medium`}>{userInfo.phone}</Text>
            </View>
          </View>

          {userInfo.dateOfBirth && (
            <View style={tw`flex-row items-center mb-4`}>
              <Icon name="calendar" type="ionicon" size={20} color="#666" style={tw`mr-3`} />
              <View style={tw`flex-1`}>
                <Text style={tw`text-gray-500 text-sm`}>Ngày sinh</Text>
                <Text style={tw`text-gray-800 font-medium`}>{userInfo.dateOfBirth}</Text>
              </View>
            </View>
          )}

          {userInfo.gender && (
            <View style={tw`flex-row items-center mb-4`}>
              <Icon name="people" type="ionicon" size={20} color="#666" style={tw`mr-3`} />
              <View style={tw`flex-1`}>
                <Text style={tw`text-gray-500 text-sm`}>Giới tính</Text>
                <Text style={tw`text-gray-800 font-medium`}>{userInfo.gender}</Text>
              </View>
            </View>
          )}

          {userInfo.pointBalance !== undefined && (
            <View style={tw`flex-row items-center`}>
              <Icon name="star" type="ionicon" size={20} color="#666" style={tw`mr-3`} />
              <View style={tw`flex-1`}>
                <Text style={tw`text-gray-500 text-sm`}>Số điểm</Text>
                <Text style={tw`text-gray-800 font-medium`}>{userInfo.pointBalance}</Text>
              </View>
            </View>
          )}

          {userInfo.username && (
            <View style={tw`flex-row items-center`}>
              <Icon name="person-circle" type="ionicon" size={20} color="#666" style={tw`mr-3`} />
              <View style={tw`flex-1`}>
                <Text style={tw`text-gray-500 text-sm`}>Tên đăng nhập</Text>
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
            ✏️ Chỉnh sửa thông tin
          </Text>
        </Pressable>
      </View>
    </View>
  );

  const OrdersPaymentSection = () => (
    <View style={tw`bg-white rounded-lg mb-4 shadow-sm`}>
      <View style={tw`p-4 border-b border-gray-100`}>
        <Text style={tw`text-lg font-bold text-gray-800`}>
          📦 Đơn hàng & Thanh toán
        </Text>
      </View>
      
      <View style={tw`p-4`}>
        <View>
          <Pressable style={tw`flex-row items-center p-3 bg-gray-50 rounded-lg mb-3`}>
            <Icon name="receipt" type="ionicon" size={24} color="#666" style={tw`mr-3`} />
            <Text style={tw`text-gray-800 font-medium flex-1`}>Lịch sử đơn hàng</Text>
            <Icon name="chevron-forward" type="ionicon" size={20} color="#999" />
          </Pressable>

          <Pressable style={tw`flex-row items-center p-3 bg-gray-50 rounded-lg mb-3`}>
            <Icon name="card" type="ionicon" size={24} color="#666" style={tw`mr-3`} />
            <Text style={tw`text-gray-800 font-medium flex-1`}>Phương thức thanh toán</Text>
            <Icon name="chevron-forward" type="ionicon" size={20} color="#999" />
          </Pressable>

          <Pressable style={tw`flex-row items-center p-3 bg-gray-50 rounded-lg`}>
            <Icon name="wallet" type="ionicon" size={24} color="#666" style={tw`mr-3`} />
            <Text style={tw`text-gray-800 font-medium flex-1`}>Ví & Mã giảm giá</Text>
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
          ⚙️ Cài đặt & Hỗ trợ
        </Text>
      </View>
      
      <View style={tw`p-4`}>
        <View>
          <Pressable style={tw`flex-row items-center p-3 bg-gray-50 rounded-lg mb-3`}>
            <Icon name="notifications" type="ionicon" size={24} color="#666" style={tw`mr-3`} />
            <Text style={tw`text-gray-800 font-medium flex-1`}>Thông báo</Text>
            <Icon name="chevron-forward" type="ionicon" size={20} color="#999" />
          </Pressable>

          <Pressable style={tw`flex-row items-center p-3 bg-gray-50 rounded-lg mb-3`}>
            <Icon name="shield-checkmark" type="ionicon" size={24} color="#666" style={tw`mr-3`} />
            <Text style={tw`text-gray-800 font-medium flex-1`}>Quyền riêng tư & Bảo mật</Text>
            <Icon name="chevron-forward" type="ionicon" size={20} color="#999" />
          </Pressable>

          <Pressable 
            style={tw`flex-row items-center p-3 bg-gray-50 rounded-lg`}
            onPress={openChatModal}
          >
            <Icon name="chatbubble-ellipses" type="ionicon" size={24} color="#666" style={tw`mr-3`} />
            <Text style={tw`text-gray-800 font-medium flex-1`}>📩 Hỗ trợ / Chat với AI</Text>
            <Icon name="chevron-forward" type="ionicon" size={20} color="#999" />
          </Pressable>

          <Pressable style={tw`flex-row items-center p-3 bg-gray-50 rounded-lg`}>
            <Icon name="information-circle" type="ionicon" size={24} color="#666" style={tw`mr-3`} />
            <Text style={tw`text-gray-800 font-medium flex-1`}>Giới thiệu ứng dụng</Text>
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
              {logoutLoading ? 'Đang đăng xuất...' : 'Đăng xuất'}
            </Text>
            {!logoutLoading && (
              <Icon name="chevron-forward" type="ionicon" size={20} color="#dc2626" />
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );

  // Refs cho ChatModal
  const chatScrollViewRef = useRef(null);
  const chatTextInputRef = useRef(null);

  // Auto scroll khi có tin nhắn mới
  useEffect(() => {
    if (isChatModalVisible && chatScrollViewRef.current) {
      setTimeout(() => {
        chatScrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isChatModalVisible]);

  // Focus TextInput khi modal mở
  useEffect(() => {
    if (isChatModalVisible) {
      setTimeout(() => {
        chatTextInputRef.current?.focus();
      }, 300);
    }
  }, [isChatModalVisible]);

  const handleSendMessage = useCallback(async () => {
    if (messageInput.trim() === '') return;

    const query = messageInput.trim();
    console.log('[Chat] Bắt đầu gửi tin nhắn:', query);
    setMessageInput('');

    // Thêm tin nhắn của user
    const userMessage = {
      id: Date.now(),
      text: query,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    // Focus lại TextInput sau khi gửi
    setTimeout(() => {
      chatTextInputRef.current?.focus();
    }, 100);

    // Tạo tin nhắn AI placeholder để stream vào
    const aiMessageId = Date.now() + 1;
    const aiMessage = {
      id: aiMessageId,
      text: '',
      sender: 'ai',
      timestamp: new Date(),
      isStreaming: true,
    };
    setMessages(prev => [...prev, aiMessage]);

    try {
      const token = await getAuthToken();
      const apiUrl = getApiUrl(API_ENDPOINTS.AI_CHAT);
      
      console.log('[Chat] API URL:', apiUrl);
      console.log('[Chat] Token có sẵn:', token ? 'Có' : 'Không');
      console.log('[Chat] Request body:', JSON.stringify({ query }));
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ query }),
      });

      console.log('[Chat] Response status:', response.status);
      console.log('[Chat] Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries())));
      console.log('[Chat] Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Chat] HTTP Error Response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      // React Native không hỗ trợ response.body.getReader(), sử dụng XMLHttpRequest thay thế
      console.log('[Chat] Sử dụng XMLHttpRequest để đọc SSE stream');
      
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        let buffer = '';
        let accumulatedContent = '';
        let eventCount = 0;

        xhr.open('POST', apiUrl, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }

        xhr.onprogress = () => {
          // Đọc dữ liệu mới từ responseText
          const newData = xhr.responseText.substring(buffer.length);
          buffer = xhr.responseText;
          
          if (newData) {
            console.log('[Chat] Nhận được chunk mới, độ dài:', newData.length);
            const lines = newData.split('\n');
            
            for (const line of lines) {
              if (!line.trim()) continue;
              
              console.log('[Chat] Xử lý dòng:', line.substring(0, 200));
              
              if (line.startsWith('data: ')) {
                try {
                  const jsonStr = line.substring(6).trim();
                  if (!jsonStr) {
                    console.log('[Chat] Dòng data rỗng, bỏ qua');
                    continue;
                  }
                  
                  console.log('[Chat] JSON string:', jsonStr);
                  const data = JSON.parse(jsonStr);
                  eventCount++;
                  console.log('[Chat] Event #' + eventCount + ':', JSON.stringify(data));
                  
                  if (data.status === 'start') {
                    console.log('[Chat] Stream bắt đầu');
                    accumulatedContent = '';
                    continue;
                  } else if (data.status === 'complete') {
                    console.log('[Chat] Stream hoàn thành');
                    setMessages(prev => prev.map(msg => 
                      msg.id === aiMessageId 
                        ? { ...msg, text: accumulatedContent, isStreaming: false }
                        : msg
                    ));
                    resolve();
                    return;
                  } else if (data.status === 'error') {
                    console.error('[Chat] Lỗi từ server:', data.error);
                    reject(new Error(data.error || 'Có lỗi xảy ra'));
                    return;
                  } else if (data.role === 'Assistant' && data.content !== undefined) {
                    console.log('[Chat] Nhận tin nhắn Assistant, isPartial:', data.isPartial, 'content length:', data.content.length);
                    if (data.isPartial === false) {
                      // Message hoàn chỉnh cuối cùng - set toàn bộ nội dung
                      accumulatedContent = data.content;
                      console.log('[Chat] Cập nhật nội dung đầy đủ:', accumulatedContent.substring(0, 100));
                      setMessages(prev => prev.map(msg => 
                        msg.id === aiMessageId 
                          ? { ...msg, text: accumulatedContent, isStreaming: false }
                          : msg
                      ));
                    } else if (data.isPartial === true) {
                      // Chunk trung gian (2-5 ký tự) - xử lý theo API mới
                      // API mới: mỗi chunk partial có thể là:
                      // 1. Chunk mới cần append (nếu content không chứa accumulatedContent)
                      // 2. Toàn bộ nội dung hiện tại (nếu content chứa accumulatedContent)
                      const oldContent = accumulatedContent;
                      if (data.content.length >= accumulatedContent.length && 
                          data.content.startsWith(accumulatedContent)) {
                        // Chunk chứa toàn bộ nội dung hiện tại + phần mới
                        accumulatedContent = data.content;
                        console.log('[Chat] Cập nhật toàn bộ nội dung (từ', oldContent.length, '->', accumulatedContent.length, 'ký tự)');
                      } else {
                        // Chunk mới cần append
                        accumulatedContent += data.content;
                        console.log('[Chat] Cộng dồn phần mới (từ', oldContent.length, '->', accumulatedContent.length, 'ký tự)');
                      }
                      
                      setMessages(prev => prev.map(msg => 
                        msg.id === aiMessageId 
                          ? { ...msg, text: accumulatedContent, isStreaming: true }
                          : msg
                      ));
                    }
                  } else if (data.role === 'Human') {
                    // Human message từ server (có thể bỏ qua vì đã thêm trước khi gọi API)
                    console.log('[Chat] Nhận tin nhắn Human:', data.content);
                  } else {
                    console.log('[Chat] Event không xử lý:', JSON.stringify(data));
                  }
                } catch (e) {
                  console.error('[Chat] Lỗi parse JSON:', e.message);
                  console.error('[Chat] Dòng gây lỗi:', line);
                  console.error('[Chat] Stack trace:', e.stack);
                }
              } else {
                console.log('[Chat] Dòng không bắt đầu bằng "data: ":', line.substring(0, 100));
              }
            }
          }
        };

        xhr.onload = () => {
          console.log('[Chat] XHR onload, status:', xhr.status);
          if (xhr.status >= 200 && xhr.status < 300) {
            console.log('[Chat] Stream kết thúc. Tổng số events:', eventCount);
            console.log('[Chat] Nội dung cuối cùng:', accumulatedContent);
            if (accumulatedContent) {
              setMessages(prev => prev.map(msg => 
                msg.id === aiMessageId 
                  ? { ...msg, text: accumulatedContent, isStreaming: false }
                  : msg
              ));
            }
            resolve();
          } else {
            reject(new Error(`HTTP error! status: ${xhr.status}`));
          }
        };

        xhr.onerror = () => {
          console.error('[Chat] XHR onerror');
          reject(new Error('Network error'));
        };

        xhr.ontimeout = () => {
          console.error('[Chat] XHR ontimeout');
          reject(new Error('Request timeout'));
        };

        xhr.timeout = 60000; // 60 seconds timeout
        xhr.send(JSON.stringify({ query }));
      });
    } catch (error) {
      console.error('[Chat] Lỗi khi gửi tin nhắn:');
      console.error('[Chat] Error name:', error.name);
      console.error('[Chat] Error message:', error.message);
      console.error('[Chat] Error stack:', error.stack);
      
      // Xóa tin nhắn AI đang stream và thêm tin nhắn lỗi
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== aiMessageId);
        return [...filtered, {
          id: Date.now() + 2,
          text: `Xin lỗi, đã có lỗi xảy ra: ${error.message}. Vui lòng thử lại sau.`,
          sender: 'ai',
          timestamp: new Date(),
          isStreaming: false,
        }];
      });
      
      Alert.alert('Lỗi', `Không thể gửi tin nhắn: ${error.message}\n\nVui lòng kiểm tra console log để biết thêm chi tiết.`);
    }
  }, [messageInput]);

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
            <Text style={tw`text-blue-600 font-medium`}>Hủy</Text>
          </Pressable>
          <Text style={tw`text-lg font-bold`}>Chỉnh sửa hồ sơ</Text>
          <Pressable onPress={saveChanges}>
            <Text style={tw`text-blue-600 font-bold`}>Lưu</Text>
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
              <Text style={tw`text-white font-medium`}>Đổi ảnh đại diện</Text>
            </Pressable>
          </View>

          {/* Form Fields */}
          <View>
            <View style={tw`mb-4`}>
              <Text style={tw`text-gray-700 font-medium mb-2`}>Họ và tên</Text>
              <TextInput
                style={tw`border border-gray-300 rounded-lg p-3 text-gray-800`}
                value={editForm.fullName}
                onChangeText={(text) => setEditForm({ ...editForm, fullName: text })}
                placeholder="Nhập họ và tên"
              />
            </View>

            <View style={tw`mb-4`}>
              <Text style={tw`text-gray-700 font-medium mb-2`}>Email</Text>
              <TextInput
                style={tw`border border-gray-300 rounded-lg p-3 text-gray-800`}
                value={editForm.email}
                onChangeText={(text) => setEditForm({ ...editForm, email: text })}
                placeholder="Nhập email"
                keyboardType="email-address"
              />
            </View>

            <View style={tw`mb-4`}>
              <Text style={tw`text-gray-700 font-medium mb-2`}>Số điện thoại</Text>
              <TextInput
                style={tw`border border-gray-300 rounded-lg p-3 text-gray-800`}
                value={editForm.phone}
                onChangeText={(text) => setEditForm({ ...editForm, phone: text })}
                placeholder="Nhập số điện thoại"
                keyboardType="phone-pad"
              />
            </View>

            <View style={tw`mb-4`}>
              <Text style={tw`text-gray-700 font-medium mb-2`}>Ngày sinh (Tùy chọn)</Text>
              <TextInput
                style={tw`border border-gray-300 rounded-lg p-3 text-gray-800`}
                value={editForm.dateOfBirth}
                onChangeText={(text) => setEditForm({ ...editForm, dateOfBirth: text })}
                placeholder="DD/MM/YYYY"
              />
            </View>

            <View>
              <Text style={tw`text-gray-700 font-medium mb-2`}>Giới tính (Tùy chọn)</Text>
              <View style={tw`flex-row`}>
                <Pressable
                  style={tw`flex-row items-center flex-1 p-3 border rounded-lg mr-4 ${
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
                  <Text style={tw`ml-2 text-gray-800`}>Nam</Text>
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
                  <Text style={tw`ml-2 text-gray-800`}>Nữ</Text>
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
              Lưu thay đổi
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
                <Text style={tw`text-2xl font-bold text-gray-800`}>Hồ sơ</Text>
                <Text style={tw`text-gray-600 mt-1`}>Quản lý cài đặt tài khoản</Text>
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
        
        {/* Chat Modal - Luôn render để tránh unmount/mount */}
        <Modal
          visible={isChatModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={closeChatModal}
          transparent={false}
        >
            <KeyboardAvoidingView 
              style={tw`flex-1`}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
              <View style={tw`flex-1 bg-white`}>
                {/* Header */}
                <View style={tw`flex-row items-center justify-between p-4 border-b border-gray-200 bg-blue-600`}>
                  <View style={tw`flex-row items-center flex-1`}>
                    <Icon name="chatbubble-ellipses" type="ionicon" size={24} color="white" style={tw`mr-2`} />
                    <Text style={tw`text-white text-lg font-bold`}>Chat với AI</Text>
                  </View>
                  <Pressable onPress={closeChatModal}>
                    <Icon name="close" type="ionicon" size={28} color="white" />
                  </Pressable>
                </View>

                {/* Messages List */}
                <ScrollView 
                  ref={chatScrollViewRef}
                  style={tw`flex-1 p-4`}
                  contentContainerStyle={tw`pb-4`}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="none"
                  removeClippedSubviews={false}
                  showsVerticalScrollIndicator={true}
                >
                  {messages.map((message) => (
                    <View
                      key={message.id}
                      style={tw`mb-4 ${
                        message.sender === 'user' ? 'items-end' : 'items-start'
                      }`}
                    >
                      <View
                        style={[
                          tw`rounded-2xl p-3 ${
                            message.sender === 'user'
                              ? 'bg-blue-600 rounded-br-sm'
                              : 'bg-gray-200 rounded-bl-sm'
                          }`,
                          {maxWidth: '75%'},
                        ]}
                      >
                        <View style={tw`flex-row items-end`}>
                          <ChatMessageText
                            text={message.text || (message.isStreaming ? '...' : '')}
                            isUser={message.sender === 'user'}
                            isStreaming={message.isStreaming}
                          />
                          {message.isStreaming && (
                            <View style={tw`ml-1 mb-1`}>
                              <ActivityIndicator size="small" color={message.sender === 'user' ? '#93c5fd' : '#6b7280'} />
                            </View>
                          )}
                        </View>
                        {!message.isStreaming && (
                          <Text
                            style={tw`text-xs mt-1 ${
                              message.sender === 'user' ? 'text-blue-200' : 'text-gray-500'
                            }`}
                          >
                            {new Date(message.timestamp).toLocaleTimeString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </ScrollView>

                {/* Input Area */}
                <View style={tw`border-t border-gray-200 p-4 bg-gray-50`} collapsable={false}>
                  <View style={tw`flex-row items-center`} collapsable={false}>
                    <TextInput
                      ref={chatTextInputRef}
                      style={tw`flex-1 bg-white border border-gray-300 rounded-full px-4 py-3 text-gray-800 mr-2`}
                      value={messageInput}
                      onChangeText={setMessageInput}
                      placeholder="Nhập tin nhắn..."
                      placeholderTextColor="#999"
                      multiline
                      maxLength={500}
                      blurOnSubmit={false}
                      returnKeyType="send"
                      onSubmitEditing={handleSendMessage}
                      textContentType="none"
                      autoCorrect={true}
                      autoCapitalize="sentences"
                      underlineColorAndroid="transparent"
                      importantForAutofill="no"
                      autoComplete="off"
                      keyboardType="default"
                    />
                    <Pressable
                      style={tw`bg-blue-600 w-12 h-12 rounded-full items-center justify-center ${
                        messageInput.trim() === '' ? 'opacity-50' : ''
                      }`}
                      onPress={handleSendMessage}
                      disabled={messageInput.trim() === ''}
                    >
                      <Icon name="send" type="ionicon" size={20} color="white" />
                    </Pressable>
                  </View>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>
      </Wrapper>
    </>
  );
};

export default UserPanel;

const styles = StyleSheet.create({});
