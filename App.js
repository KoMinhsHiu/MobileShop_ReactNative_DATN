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
    import {TouchableOpacity, Image, StatusBar} from 'react-native';
    import {Icon} from 'react-native-elements';
    import tw from 'tailwind-react-native-classnames';
    import Product from './src/screens/Product';
import OrderDetail from './src/screens/OrderDetail';
import Checkout from './src/screens/Checkout';
    import AsyncStorage from '@react-native-async-storage/async-storage';
    import {setBasket} from './src/store/slices/siteSlice';
    import {initializeMockData} from './src/utils/initializeMockData';
    import ErrorBoundary from './src/components/ErrorBoundary';

    export default function App() {
    const Stack = createStackNavigator();

    const Tab = createBottomTabNavigator();

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

    function HomeStack() {
        const dispatch = useDispatch();
        const clearBasket = async () => {
        await AsyncStorage.removeItem('basket');
        dispatch(setBasket([]));
        };

        return (
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
        );
    }

    return (
        <ErrorBoundary>
            <Provider store={store}>
                <NavigationContainer>
                    <SafeAreaProvider>
                        <Stack.Navigator>
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
                        </Stack.Navigator>
                    </SafeAreaProvider>
                </NavigationContainer>
            </Provider>
        </ErrorBoundary>
    );
    }
