import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Pressable,
  Modal,
  Animated,
  PanResponder,
  Dimensions,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Icon } from 'react-native-elements';
import { useRoute } from '@react-navigation/native';
import tw from 'tailwind-react-native-classnames';
import ThemeText from '../ThemeText';
import { getAuthToken } from '../../utils/auth';
import { getApiUrl, API_ENDPOINTS } from '../../config/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BUBBLE_SIZE = 60;
const CHAT_MODAL_HEIGHT = SCREEN_HEIGHT * 0.7;

const FloatingChatBubble = () => {
  const route = useRoute();
  // Ẩn FloatingChatBubble khi ở Profile screen vì Profile đã có chat modal riêng
  const isProfileScreen = route.name === 'Profile';
  
  // Debug: Log route info
  console.log('[FloatingChat] Component mounted/updated');
  console.log('[FloatingChat] Route name:', route.name);
  console.log('[FloatingChat] Route key:', route.key);
  console.log('[FloatingChat] Route params:', route.params);
  console.log('[FloatingChat] Is Profile screen:', isProfileScreen);
  
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: 'Xin chào! Chúng tôi có thể giúp gì cho bạn?',
      sender: 'ai',
      timestamp: new Date(),
      isStreaming: false,
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const scrollViewRef = useRef(null);
  
  // Position state for the bubble
  const pan = useRef(new Animated.ValueXY({ x: SCREEN_WIDTH - BUBBLE_SIZE - 20, y: SCREEN_HEIGHT * 0.7 })).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current; // Always start with opacity 1
  
  // Force opacity to 1 on mount to ensure visibility
  useEffect(() => {
    console.log('[FloatingChat] Component mounted, forcing opacity to 1');
    opacityAnim.setValue(1);
    console.log('[FloatingChat] Initial opacity set to:', opacityAnim._value);
    
    // Also ensure position is valid
    const currentX = pan.x._value;
    const currentY = pan.y._value;
    console.log('[FloatingChat] Initial position:', { x: currentX, y: currentY });
    console.log('[FloatingChat] Screen dimensions:', { width: SCREEN_WIDTH, height: SCREEN_HEIGHT });
    
    // If position is invalid or out of bounds, reset to default
    if (isNaN(currentX) || isNaN(currentY) || 
        currentX < 0 || currentY < 0 || 
        currentX > SCREEN_WIDTH || currentY > SCREEN_HEIGHT) {
      console.log('[FloatingChat] Invalid position detected, resetting to default');
      const defaultX = SCREEN_WIDTH - BUBBLE_SIZE - 20;
      const defaultY = SCREEN_HEIGHT * 0.7;
      pan.setValue({ x: defaultX, y: defaultY });
      console.log('[FloatingChat] Position reset to:', { x: defaultX, y: defaultY });
    }
  }, []);
  
  // Track if we're dragging
  const isDragging = useRef(false);
  const panStartTime = useRef(0);
  const panStartPosition = useRef({ x: 0, y: 0 });

  // Ensure bubble is always visible when chat is closed
  useEffect(() => {
    console.log('[FloatingChat] useEffect triggered, isChatOpen:', isChatOpen);
    if (!isChatOpen) {
      // When chat is closed, ensure bubble is fully visible
      console.log('[FloatingChat] Setting opacity to 1');
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        console.log('[FloatingChat] Opacity animation completed, opacity should be 1');
      });
      
      // Check position but don't animate here - let handleCloseChat handle it
      // This avoids animation conflicts
      const currentX = pan.x._value;
      const currentY = pan.y._value;
      const minY = Platform.OS === 'ios' ? 60 : 20;
      const maxY = SCREEN_HEIGHT - BUBBLE_SIZE - 100;
      
      console.log('[FloatingChat] Checking position after close:', { 
        currentX, 
        currentY, 
        minY, 
        maxY, 
        screenHeight: SCREEN_HEIGHT 
      });
      
      // Only fix position if it's way out of bounds and handleCloseChat didn't fix it
      // Use setTimeout to avoid conflict with handleCloseChat
      if (currentY > maxY || currentY < minY) {
        const newY = Math.max(minY, Math.min(maxY, currentY));
        console.log('[FloatingChat] Y position out of bounds, will fix after delay');
        // Delay to avoid conflict with handleCloseChat
        setTimeout(() => {
          // Check again if position is still out of bounds
          const checkY = pan.y._value;
          if (checkY > maxY || checkY < minY) {
            console.log('[FloatingChat] Position still out of bounds, setting directly to:', newY);
            // Use requestAnimationFrame to avoid conflicts
            requestAnimationFrame(() => {
              // Stop animation and set directly
              pan.stopAnimation();
              pan.setValue({ x: currentX, y: newY });
              console.log('[FloatingChat] Position fixed after close');
            });
          }
        }, 300); // Wait for handleCloseChat to complete
      }
      
      console.log('[FloatingChat] Chat closed, ensuring bubble is visible');
    } else {
      console.log('[FloatingChat] Chat is open, bubble should show close icon');
    }
  }, [isChatOpen, opacityAnim]);
  
  // Debug: Log bubble state on every render
  useEffect(() => {
    console.log('[FloatingChat] Render state:', {
      isProfileScreen,
      isChatOpen,
      opacityValue: opacityAnim._value,
      scaleValue: scaleAnim._value,
      positionX: pan.x._value,
      positionY: pan.y._value,
    });
  });

  const handleBubblePress = () => {
    console.log('[FloatingChat] Bubble pressed, current isChatOpen:', isChatOpen);
    // Toggle chat open/close
    const newState = !isChatOpen;
    setIsChatOpen(newState);
    console.log('[FloatingChat] Setting isChatOpen to:', newState);
    
    // Ensure bubble is visible when toggling
    if (!newState) {
      // When closing, ensure bubble is fully visible
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
    
    // Pulse animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Create pan responder for dragging
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt, gestureState) => {
        isDragging.current = false;
        panStartTime.current = Date.now();
        // Store the current bubble position, not the touch position
        panStartPosition.current = { 
          x: pan.x._value, 
          y: pan.y._value 
        };
        // Don't use setOffset since we're using absolute positions
      },
      onPanResponderMove: (evt, gestureState) => {
        // If moved more than 10 pixels, consider it dragging
        if (Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10) {
          if (!isDragging.current) {
            isDragging.current = true;
            // Scale down slightly when dragging starts
            Animated.spring(scaleAnim, {
              toValue: 0.9,
              useNativeDriver: true,
            }).start();
          }
        }
        
        if (isDragging.current) {
          // Calculate new position from start position + delta
          const newX = panStartPosition.current.x + gestureState.dx;
          const newY = panStartPosition.current.y + gestureState.dy;
          
          // Clamp to screen bounds
          const minX = 20;
          const maxX = SCREEN_WIDTH - BUBBLE_SIZE - 20;
          const minY = Platform.OS === 'ios' ? 60 : 20;
          const maxY = SCREEN_HEIGHT - BUBBLE_SIZE - 100;
          
          const clampedX = Math.max(minX, Math.min(maxX, newX));
          const clampedY = Math.max(minY, Math.min(maxY, newY));
          
          pan.setValue({
            x: clampedX,
            y: clampedY,
          });
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        // Don't use flattenOffset since we're not using offset
        // pan.flattenOffset();
        
        // Check if it was a tap or drag
        const movedDistance = Math.sqrt(
          Math.pow(gestureState.dx, 2) + Math.pow(gestureState.dy, 2)
        );
        const timeElapsed = Date.now() - panStartTime.current;
        
        // If moved less than 10 pixels and took less than 300ms, treat as tap
        if (!isDragging.current || (movedDistance < 10 && timeElapsed < 300)) {
          // It was a tap, trigger bubble press
          handleBubblePress();
          // Reset scale
          Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
          }).start();
          isDragging.current = false;
          return;
        }

        // It was a drag, snap to edge
        // Scale back to normal
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
        }).start();

        // Snap to nearest edge
        const currentX = pan.x._value;
        const currentY = pan.y._value;

        let finalX = currentX;
        let finalY = currentY;

        // Snap to left or right edge
        if (currentX < SCREEN_WIDTH / 2) {
          finalX = 20;
        } else {
          finalX = SCREEN_WIDTH - BUBBLE_SIZE - 20;
        }

        // Keep within screen bounds vertically
        const minY = Platform.OS === 'ios' ? 60 : 20;
        const maxY = SCREEN_HEIGHT - BUBBLE_SIZE - 100; // Leave space for bottom tab
        finalY = Math.max(minY, Math.min(maxY, currentY));

        // Stop any existing animation first to avoid conflicts
        pan.stopAnimation(() => {
          // Use requestAnimationFrame to ensure we're not in the middle of another animation
          requestAnimationFrame(() => {
            Animated.spring(pan, {
              toValue: { x: finalX, y: finalY },
              useNativeDriver: false,
              tension: 50,
              friction: 7,
            }).start(() => {
              console.log('[FloatingChat] Snap animation completed');
            });
          });
        });
        
        isDragging.current = false;
      },
    })
  ).current;

  const handleCloseChat = () => {
    console.log('[FloatingChat] Closing chat modal');
    setIsChatOpen(false);
    
    // Check current position and fix if out of bounds
    const currentX = pan.x._value;
    const currentY = pan.y._value;
    console.log('[FloatingChat] Current position before close:', { x: currentX, y: currentY });
    console.log('[FloatingChat] Screen dimensions:', { width: SCREEN_WIDTH, height: SCREEN_HEIGHT });
    
    // Fix position if out of bounds
    let newX = currentX;
    let newY = currentY;
    
    // Keep X within bounds
    const minX = 20;
    const maxX = SCREEN_WIDTH - BUBBLE_SIZE - 20;
    if (newX < minX) newX = minX;
    if (newX > maxX) newX = maxX;
    
    // Keep Y within bounds (leave space for bottom tab)
    const minY = Platform.OS === 'ios' ? 60 : 20;
    const maxY = SCREEN_HEIGHT - BUBBLE_SIZE - 100; // Leave space for bottom tab
    if (newY < minY) {
      newY = minY;
      console.log('[FloatingChat] Y too high, resetting to minY:', minY);
    }
    if (newY > maxY) {
      newY = maxY;
      console.log('[FloatingChat] Y too low (out of screen), resetting to maxY:', maxY);
    }
    
    // If position changed, set it directly (no animation to avoid conflicts)
    if (newX !== currentX || newY !== currentY) {
      console.log('[FloatingChat] Position out of bounds, setting directly to:', { x: newX, y: newY });
      // Use requestAnimationFrame to ensure we're not in the middle of an animation
      requestAnimationFrame(() => {
        // Stop any existing animation first
        pan.stopAnimation();
        // Set position directly
        pan.setValue({ x: newX, y: newY });
        console.log('[FloatingChat] Position set directly to:', { x: newX, y: newY });
      });
    }
    
    // Ensure bubble is visible after closing
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      console.log('[FloatingChat] Opacity animation completed after close');
    });
    console.log('[FloatingChat] Chat closed, bubble should be visible at position:', { x: newX, y: newY });
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSendMessage = useCallback(async () => {
    if (inputText.trim() === '' || isLoading) return;

    const query = inputText.trim();
    console.log('[FloatingChat] Bắt đầu gửi tin nhắn:', query);
    setInputText('');
    setIsLoading(true);

    // Add user message
    const userMessage = {
      id: Date.now(),
      text: query,
      sender: 'user',
      timestamp: new Date(),
      isStreaming: false,
    };
    setMessages((prev) => {
      const newMessages = [...prev, userMessage];
      setTimeout(() => scrollToBottom(), 100);
      return newMessages;
    });

    // Create AI message placeholder for streaming
    const aiMessageId = Date.now() + 1;
    const aiMessage = {
      id: aiMessageId,
      text: '',
      sender: 'ai',
      timestamp: new Date(),
      isStreaming: true,
    };
    setMessages((prev) => {
      const newMessages = [...prev, aiMessage];
      setTimeout(() => scrollToBottom(), 100);
      return newMessages;
    });

    try {
      const token = await getAuthToken();
      const apiUrl = getApiUrl(API_ENDPOINTS.AI_CHAT);
      
      console.log('[FloatingChat] API URL:', apiUrl);
      console.log('[FloatingChat] Token có sẵn:', token ? 'Có' : 'Không');
      console.log('[FloatingChat] Request body:', JSON.stringify({ query }));
      
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
          const newData = xhr.responseText.substring(buffer.length);
          buffer = xhr.responseText;
          
          if (newData) {
            console.log('[FloatingChat] Nhận được chunk mới, độ dài:', newData.length);
            const lines = newData.split('\n');
            
            for (const line of lines) {
              if (!line.trim()) continue;
              
              if (line.startsWith('data: ')) {
                try {
                  const jsonStr = line.substring(6).trim();
                  if (!jsonStr) continue;
                  
                  const data = JSON.parse(jsonStr);
                  eventCount++;
                  console.log('[FloatingChat] Event #' + eventCount + ':', JSON.stringify(data));
                  
                  if (data.status === 'start') {
                    console.log('[FloatingChat] Stream bắt đầu');
                    accumulatedContent = '';
                    continue;
                  } else if (data.status === 'complete') {
                    console.log('[FloatingChat] Stream hoàn thành');
                    setMessages((prev) => {
                      const updated = prev.map(msg => 
                        msg.id === aiMessageId 
                          ? { ...msg, text: accumulatedContent, isStreaming: false }
                          : msg
                      );
                      setTimeout(() => scrollToBottom(), 100);
                      return updated;
                    });
                    setIsLoading(false);
                    resolve();
                    return;
                  } else if (data.status === 'error') {
                    console.error('[FloatingChat] Lỗi từ server:', data.error);
                    setIsLoading(false);
                    reject(new Error(data.error || 'Có lỗi xảy ra'));
                    return;
                  } else if (data.role === 'Assistant' && data.content !== undefined) {
                    console.log('[FloatingChat] Nhận tin nhắn Assistant, isPartial:', data.isPartial, 'content length:', data.content.length);
                    if (data.isPartial === false) {
                      accumulatedContent = data.content;
                      setMessages((prev) => {
                        const updated = prev.map(msg => 
                          msg.id === aiMessageId 
                            ? { ...msg, text: accumulatedContent, isStreaming: false }
                            : msg
                        );
                        setTimeout(() => scrollToBottom(), 100);
                        return updated;
                      });
                    } else if (data.isPartial === true) {
                      const oldContent = accumulatedContent;
                      if (data.content.length >= accumulatedContent.length && 
                          data.content.startsWith(accumulatedContent)) {
                        accumulatedContent = data.content;
                      } else if (data.content.length < accumulatedContent.length) {
                        accumulatedContent += data.content;
                      } else {
                        accumulatedContent = data.content;
                      }
                      
                      setMessages((prev) => {
                        const updated = prev.map(msg => 
                          msg.id === aiMessageId 
                            ? { ...msg, text: accumulatedContent, isStreaming: true }
                            : msg
                        );
                        setTimeout(() => scrollToBottom(), 50);
                        return updated;
                      });
                    }
                  }
                } catch (e) {
                  console.error('[FloatingChat] Lỗi parse JSON:', e.message);
                  console.error('[FloatingChat] Dòng gây lỗi:', line);
                }
              }
            }
          }
        };

        xhr.onload = () => {
          console.log('[FloatingChat] XHR onload, status:', xhr.status);
          setIsLoading(false);
          if (xhr.status >= 200 && xhr.status < 300) {
            console.log('[FloatingChat] Stream kết thúc. Tổng số events:', eventCount);
            if (accumulatedContent) {
              setMessages((prev) => {
                const updated = prev.map(msg => 
                  msg.id === aiMessageId 
                    ? { ...msg, text: accumulatedContent, isStreaming: false }
                    : msg
                );
                setTimeout(() => scrollToBottom(), 100);
                return updated;
              });
            }
            resolve();
          } else {
            reject(new Error(`HTTP error! status: ${xhr.status}`));
          }
        };

        xhr.onerror = () => {
          console.error('[FloatingChat] XHR onerror');
          setIsLoading(false);
          reject(new Error('Network error'));
        };

        xhr.ontimeout = () => {
          console.error('[FloatingChat] XHR ontimeout');
          setIsLoading(false);
          reject(new Error('Request timeout'));
        };

        xhr.timeout = 60000; // 60 seconds timeout
        xhr.send(JSON.stringify({ query }));
      });
    } catch (error) {
      console.error('[FloatingChat] Lỗi khi gửi tin nhắn:');
      console.error('[FloatingChat] Error name:', error.name);
      console.error('[FloatingChat] Error message:', error.message);
      
      setIsLoading(false);
      
      // Remove streaming message and add error message
      setMessages((prev) => {
        const filtered = prev.filter(msg => msg.id !== aiMessageId);
        return [...filtered, {
          id: Date.now() + 2,
          text: `Xin lỗi, đã có lỗi xảy ra: ${error.message}. Vui lòng thử lại sau.`,
          sender: 'ai',
          timestamp: new Date(),
          isStreaming: false,
        }];
      });
      
      Alert.alert('Lỗi', `Không thể gửi tin nhắn: ${error.message}`);
    }
  }, [inputText, isLoading]);

  const renderMessage = (message) => {
    const isUser = message.sender === 'user';
    const isStreaming = message.isStreaming && message.text === '';
    
    return (
      <View
        key={message.id}
        style={[
          tw`mb-4`,
          {
            alignItems: isUser ? 'flex-end' : 'flex-start',
          },
        ]}>
        <View
          style={[
            tw`rounded-2xl px-4 py-3`,
            {
              maxWidth: '75%',
            },
            isUser
              ? tw`bg-blue-500`
              : tw`bg-gray-200`,
          ]}>
          {isStreaming ? (
            <View style={tw`flex-row items-center`}>
              <ActivityIndicator size="small" color="#6B7280" />
              <ThemeText style={tw`text-gray-500 ml-2 text-sm`}>
                Đang soạn thảo...
              </ThemeText>
            </View>
          ) : (
            <>
              <ThemeText
                style={tw`${isUser ? 'text-white' : 'text-gray-800'}`}>
                {message.text || '...'}
              </ThemeText>
              <ThemeText
                style={[
                  tw`text-xs mt-1`,
                  isUser ? tw`text-blue-100` : tw`text-gray-500`,
                ]}>
                {message.timestamp.toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </ThemeText>
            </>
          )}
        </View>
      </View>
    );
  };

  // Không render FloatingChatBubble khi ở Profile screen
  // Note: Check multiple possible route names
  const profileRouteNames = ['Profile', 'UserPanel', 'User'];
  const isAnyProfileScreen = profileRouteNames.includes(route.name);
  
  if (isAnyProfileScreen) {
    console.log('[FloatingChat] Not rendering - Profile screen detected, route name:', route.name);
    return null;
  }

  console.log('[FloatingChat] Rendering bubble component');
  console.log('[FloatingChat] Route name:', route.name);
  console.log('[FloatingChat] Bubble position:', { x: pan.x._value, y: pan.y._value });
  console.log('[FloatingChat] Bubble opacity:', opacityAnim._value);
  console.log('[FloatingChat] Bubble scale:', scaleAnim._value);
  console.log('[FloatingChat] isChatOpen:', isChatOpen);

  return (
    <>
      {/* Floating Chat Bubble - Always visible */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: BUBBLE_SIZE,
            height: BUBBLE_SIZE,
            zIndex: isChatOpen ? 10000 : 9999, // Higher z-index when modal is open
            transform: [
              { translateX: pan.x },
              { translateY: pan.y },
              { scale: scaleAnim },
            ],
            opacity: opacityAnim,
            // Ensure bubble is always on top
            elevation: 10, // Android
          },
        ]}
        pointerEvents="box-none"
        {...panResponder.panHandlers}
        onLayout={(event) => {
          const { x, y, width, height } = event.nativeEvent.layout;
          console.log('[FloatingChat] Bubble Animated.View onLayout:', { x, y, width, height });
        }}>
        <View
          style={[
            tw`w-full h-full rounded-full items-center justify-center shadow-2xl`,
            styles.bubbleShadow,
            {
              // Explicit background color to ensure visibility
              backgroundColor: '#3B82F6', // blue-500
            },
          ]}
          pointerEvents="auto"
          onLayout={(event) => {
            const { x, y, width, height } = event.nativeEvent.layout;
            console.log('[FloatingChat] Bubble Inner View onLayout:', { x, y, width, height });
          }}>
          {!isChatOpen ? (
            <Icon type="ionicon" name="chatbubbles" size={30} color="white" />
          ) : (
            <Icon type="ionicon" name="close" size={30} color="white" />
          )}
        </View>
      </Animated.View>

      {/* Chat Modal */}
      <Modal
        visible={isChatOpen}
        transparent
        animationType="slide"
        onRequestClose={handleCloseChat}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}>
          <View style={styles.modalOverlay}>
            <View style={styles.chatContainer}>
              {/* Chat Header */}
              <View style={tw`bg-blue-500 px-4 py-4 rounded-t-3xl flex-row items-center justify-between`}>
                <View style={tw`flex-row items-center`}>
                  <View style={tw`w-10 h-10 rounded-full bg-white items-center justify-center mr-3`}>
                    <Icon type="ionicon" name="person" size={20} color="#3B82F6" />
                  </View>
                  <View>
                    <ThemeText weight={700} style={tw`text-white text-base`}>
                      Hỗ trợ khách hàng
                    </ThemeText>
                    <ThemeText style={tw`text-blue-100 text-xs`}>
                      Phản hồi trong vài phút
                    </ThemeText>
                  </View>
                </View>
                <TouchableOpacity onPress={handleCloseChat}>
                  <Icon type="ionicon" name="close" size={28} color="white" />
                </TouchableOpacity>
              </View>

              {/* Messages Area */}
              <ScrollView
                ref={scrollViewRef}
                style={tw`flex-1 px-4 pt-4`}
                contentContainerStyle={tw`pb-4`}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => scrollToBottom()}>
                {messages.map((message) => renderMessage(message))}
                <View ref={messagesEndRef} />
              </ScrollView>

              {/* Input Area */}
              <View style={tw`bg-gray-100 px-4 py-3 flex-row items-center border-t border-gray-200`}>
                <TextInput
                  style={tw`flex-1 bg-white rounded-full px-4 py-3 mr-3 border border-gray-300`}
                  placeholder="Nhập tin nhắn..."
                  value={inputText}
                  onChangeText={setInputText}
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  onPress={handleSendMessage}
                  style={tw`w-12 h-12 rounded-full bg-blue-500 items-center justify-center`}
                  disabled={inputText.trim() === '' || isLoading}>
                  {isLoading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Icon
                      type="ionicon"
                      name="send"
                      size={20}
                      color={inputText.trim() === '' ? '#9CA3AF' : 'white'}
                    />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  bubbleShadow: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  modalContainer: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  chatContainer: {
    width: SCREEN_WIDTH,
    height: CHAT_MODAL_HEIGHT,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
});

export default FloatingChatBubble;
