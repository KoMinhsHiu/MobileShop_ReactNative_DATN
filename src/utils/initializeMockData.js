import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockAsyncStorageData, mockOrdersData } from '../data/mockData';

export const initializeMockData = async () => {
  try {
    // Kiểm tra và khởi tạo dữ liệu basket
    const basketData = await AsyncStorage.getItem('basket');
    if (!basketData) {
      await AsyncStorage.setItem('basket', JSON.stringify({ basket: mockAsyncStorageData.basket }));
    }

    // Kiểm tra và khởi tạo dữ liệu liked với mock data
    const likedData = await AsyncStorage.getItem('liked');
    if (!likedData) {
      // Khởi tạo với một số sản phẩm đã được like
      const initialLikedData = [
        { id: 2 }, // Samsung Galaxy S24 Ultra
        { id: 4 }, // Sony WH-1000XM5
        { id: 6 }, // Samsung 55-inch QLED TV
        { id: 8 }  // Apple Watch Series 9
      ];
      await AsyncStorage.setItem('liked', JSON.stringify(initialLikedData));
    }

    // Kiểm tra và khởi tạo dữ liệu orders với mock data
    const ordersData = await AsyncStorage.getItem('orders');
    if (!ordersData) {
      await AsyncStorage.setItem('orders', JSON.stringify(mockOrdersData));
    }

    return true;
  } catch (error) {
    console.error('Error initializing mock data:', error);
    return false;
  }
};

