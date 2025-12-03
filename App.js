    import React from 'react';
    import {Provider, useDispatch} from 'react-redux';
    import {SafeAreaProvider} from 'react-native-safe-area-context';
    import 'react-native-gesture-handler';
    import {NavigationContainer} from '@react-navigation/native';
    import {createStackNavigator} from '@react-navigation/stack';
    import {store} from './src/store/store';
    import Welcome from './src/screens/Welcome';
    import Login from './src/screens/Login';
    import Register from './src/screens/Register';
    import Home from './src/screens/Home';
    import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
    import Basket from './src/screens/Basket';
import Navigation from './src/components/Navigation/Navigation';
import Orders from './src/screens/Orders';
import UserPanel from './src/screens/UserPanel';
    import {TouchableOpacity, Image, StatusBar, View, Linking, Alert, Platform} from 'react-native';
    import {Icon} from 'react-native-elements';
    import tw from 'tailwind-react-native-classnames';
    import Product from './src/screens/Product';
import OrderDetail from './src/screens/OrderDetail';
import Checkout from './src/screens/Checkout';
import VNPayPayment from './src/screens/VNPayPayment';
    import AsyncStorage from '@react-native-async-storage/async-storage';
    import {setBasket} from './src/store/slices/siteSlice';
    import {initializeMockData} from './src/utils/initializeMockData';
    import ErrorBoundary from './src/components/ErrorBoundary';
import FloatingChatBubble from './src/components/FloatingChatBubble/FloatingChatBubble';
import {handleVNPayCallback} from './src/utils/vnpayCallback';

    export default function App() {
    const Stack = createStackNavigator();
    const navigationRef = React.useRef(null);

    const Tab = createBottomTabNavigator();

    // Hàm xử lý VNPay deep link
    const handleVNPayDeepLink = React.useCallback((url) => {
        console.log('[App] ========== HANDLING VNPAY DEEP LINK ==========');
        console.log('[App] URL:', url);

        // Xử lý VNPay callback
        const callbackResult = handleVNPayCallback(url);
        
        if (!callbackResult) {
            console.log('[App] Not a VNPay callback, ignoring');
            return;
        }

        console.log('[App] VNPay callback result:', JSON.stringify(callbackResult, null, 2));

        // Hiển thị thông báo kết quả thanh toán
        const alertTitle = callbackResult.success ? 'Thanh toán thành công' : 'Thanh toán thất bại';
        const alertMessage = callbackResult.message;

        Alert.alert(
            alertTitle,
            alertMessage,
            [
                {
                    text: 'Xem đơn hàng',
                    onPress: () => {
                        if (callbackResult.orderId && navigationRef.current) {
                            console.log('[App] Navigating to OrderDetailScreen with orderId:', callbackResult.orderId);
                            navigationRef.current.navigate('OrderDetailScreen', {
                                orderId: callbackResult.orderId,
                            });
                        } else if (navigationRef.current) {
                            // Nếu không có orderId, chuyển đến danh sách đơn hàng
                            console.log('[App] No orderId, navigating to Orders list');
                            navigationRef.current.navigate('HomeScreen', {
                                screen: 'Orders',
                            });
                        }
                    },
                    style: callbackResult.success ? 'default' : 'cancel',
                },
                {
                    text: 'Đóng',
                    style: 'cancel',
                },
            ],
            { cancelable: false }
        );
    }, []);

    // Khởi tạo dữ liệu mock khi app khởi động
    React.useEffect(() => {
        const initData = async () => {
            try {
                await initializeMockData();
            } catch (error) {
                // Error handling - không crash app nếu có lỗi
            }
        };
        initData();
    }, []);

    // Xử lý deep linking cho VNPay callback
    React.useEffect(() => {
        // Xử lý URL khi app được mở từ deep link
        const handleInitialURL = async () => {
            try {
                const initialUrl = await Linking.getInitialURL();
                if (initialUrl) {
                    console.log('[App] Initial URL:', initialUrl);
                    handleVNPayDeepLink(initialUrl);
                }
            } catch (error) {
                console.error('[App] Error getting initial URL:', error);
            }
        };

        // Xử lý URL khi app đang chạy và nhận được deep link
        const handleURL = (event) => {
            console.log('[App] Received URL:', event.url);
            handleVNPayDeepLink(event.url);
        };

        // Listen cho deep linking events
        const subscription = Linking.addEventListener('url', handleURL);

        // Check initial URL khi app khởi động
        handleInitialURL();

        // Cleanup
        return () => {
            subscription.remove();
        };
    }, [handleVNPayDeepLink]);

    function HomeStack() {
        const dispatch = useDispatch();
        const clearBasket = async () => {
        await AsyncStorage.removeItem('basket');
        dispatch(setBasket([]));
        };

        return (
        <View style={tw`flex-1`}>
            <Tab.Navigator
                initialRouteName="Home"
                tabBar={props => <Navigation {...props} />}>
                <Tab.Screen
                name="Home"
                component={Home}
                options={{
                    headerShown: false,
                    tabBarLabel: 'Trang chủ',
                }}
                />
                <Tab.Screen
                name="Basket"
                component={Basket}
                options={({route, navigation}) => {
                    return {
                    title: 'Giỏ hàng',
                    tabBarLabel: 'Giỏ hàng',
                    headerStyle: {
                        shadowColor: 'transparent',
                    },
                    headerTitleStyle: {
                        fontWeight: 'bold',
                    },
                    headerLeft: () => (
                        <Image
                            source={require('./assets/logo.jpg')}
                            style={{ 
                                width: 32, 
                                height: 32, 
                                resizeMode: 'cover',
                                borderRadius: 16,
                                marginLeft: 16,
                            }}
                        />
                    ),
                    headerRight: () => (
                        <TouchableOpacity style={tw`p-4`} onPress={clearBasket}>
                        <Icon type="ionicon" name="trash" size={25} color="red" />
                        </TouchableOpacity>
                    ),
                    };
                }}
                />
                <Tab.Screen
                name="Orders"
                component={Orders}
                options={({route, navigation}) => {
                    return {
                    title: 'Đơn hàng',
                    tabBarLabel: 'Đơn hàng',
                    headerStyle: {
                        shadowColor: 'transparent',
                    },
                    headerTitleStyle: {
                        fontWeight: 'bold',
                    },
                    headerLeft: () => (
                        <Image
                            source={require('./assets/logo.jpg')}
                            style={{ 
                                width: 32, 
                                height: 32, 
                                resizeMode: 'cover',
                                borderRadius: 16,
                                marginLeft: 16,
                            }}
                        />
                    ),
                    };
                }}
                />
                <Tab.Screen
                name="Profile"
                component={UserPanel}
                options={({route, navigation}) => {
                    return {
                    title: 'Hồ sơ',
                    tabBarLabel: 'Hồ sơ',
                    headerStyle: {
                        shadowColor: 'transparent',
                    },
                    headerTitleStyle: {
                        fontWeight: 'bold',
                    },
                    headerLeft: () => (
                        <Image
                            source={require('./assets/logo.jpg')}
                            style={{ 
                                width: 32, 
                                height: 32, 
                                resizeMode: 'cover',
                                borderRadius: 16,
                                marginLeft: 16,
                            }}
                        />
                    ),
                    };
                }}
                />
            </Tab.Navigator>
            <FloatingChatBubble />
        </View>
        );
    }

    return (
        <ErrorBoundary>
            <Provider store={store}>
                <NavigationContainer
                    ref={navigationRef}
                    onReady={() => {
                        console.log('[App] Navigation container ready');
                    }}>
                    <SafeAreaProvider>
                        <Stack.Navigator
                            initialRouteName="LoginScreen">
                            <Stack.Screen
                            name="WelcomeScreen"
                            component={Welcome}
                            options={{
                                headerShown: false,
                            }}
                            />
                            <Stack.Screen
                            name="LoginScreen"
                            component={Login}
                            options={{
                                headerShown: false,
                            }}
                            />
                            <Stack.Screen
                            name="RegisterScreen"
                            component={Register}
                            options={{
                                headerShown: false,
                            }}
                            />
                            <Stack.Screen
                            name="HomeScreen"
                            component={HomeStack}
                            options={{
                                headerShown: false,
                            }}
                            />
                            <Stack.Screen
                            name="ProductScreen"
                            component={Product}
                            options={{
                                headerShown: false,
                            }}
                            />
                            <Stack.Screen
                            name="OrderDetailScreen"
                            component={OrderDetail}
                            options={{
                                headerShown: false,
                            }}
                            />
                            <Stack.Screen
                            name="CheckoutScreen"
                            component={Checkout}
                            options={{
                                headerShown: false,
                            }}
                            />
                            <Stack.Screen
                            name="VNPayPaymentScreen"
                            component={VNPayPayment}
                            options={{
                                headerShown: false,
                            }}
                            />
                        </Stack.Navigator>
                    </SafeAreaProvider>
                </NavigationContainer>
            </Provider>
        </ErrorBoundary>
    );
    }
