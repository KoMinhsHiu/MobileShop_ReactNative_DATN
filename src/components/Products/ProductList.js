import {View} from 'react-native';
import React, {useEffect, useState} from 'react';
import tw from 'tailwind-react-native-classnames';
import {useDispatch, useSelector} from 'react-redux';
import {
  addtoLiked,
  selectActiveCategory,
  selectLiked,
  selectSearchText,
  setLiked,
} from '../../store/slices/siteSlice';
import CategoryTab from '../CategoryTab/CategoryTab';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {store} from '../../store/store';
import { mockProducts } from '../../data/mockData';
import { SPACING } from '../../constants/theme';

const ProductList = () => {
  const dispatch = useDispatch();
  const [products, setproducts] = useState([]);
  const activeCategory = useSelector(selectActiveCategory);
  const likedList = useSelector(selectLiked);
  const searchQuery = useSelector(selectSearchText);

  const fetchProductList = async () => {
    // Sử dụng mock data thay vì fetch từ API
    let filteredProducts = mockProducts;
    
    // Lọc theo category (nếu có)
    if (activeCategory !== 0) {
      // activeCategory là index của category, cần map với categories thực tế
      const categories = ['smartphones', 'laptops', 'audio', 'shoes', 'tv', 'watches'];
      if (categories[activeCategory - 1]) {
        filteredProducts = mockProducts.filter(product => 
          product.category === categories[activeCategory - 1]
        );
      }
    }
    
    // Lọc theo search query (nếu có)
    if (searchQuery !== '') {
      filteredProducts = filteredProducts.filter(product =>
        product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setproducts(filteredProducts);
  };

  useEffect(() => {
    // Load products ngay lập tức
    setproducts(mockProducts);
    
    // Load liked data
    getLikedFromStorage();
  }, []);

  useEffect(() => {
    // Filter products khi category hoặc search thay đổi
    fetchProductList();
  }, [activeCategory, searchQuery]);

  const getLikedFromStorage = async () => {
    try {
      let likedFromStorage = await AsyncStorage.getItem('liked');
      if (!likedFromStorage) {
        // Nếu không có dữ liệu, sử dụng mock data
        const mockLikedData = [
          { id: 2 }, // Samsung Galaxy S24 Ultra
          { id: 4 }, // Sony WH-1000XM5
          { id: 6 }, // Samsung 55-inch QLED TV
          { id: 8 }  // Apple Watch Series 9
        ];
        await AsyncStorage.setItem('liked', JSON.stringify(mockLikedData));
        dispatch(setLiked(mockLikedData));
      } else {
        const parsedLiked = JSON.parse(likedFromStorage);
        if (parsedLiked && Array.isArray(parsedLiked)) {
          dispatch(setLiked(parsedLiked));
        } else {
          dispatch(setLiked([]));
        }
      }
    } catch (error) {
      // Fallback to mock data
      const mockLikedData = [
        { id: 2 },
        { id: 4 },
        { id: 6 },
        { id: 8 }
      ];
      dispatch(setLiked(mockLikedData));
    }
  };

  const toggleLikedItem = async id => {
    try {
      let likedFromStorage = await AsyncStorage.getItem('liked');
      let currentLiked = [];
      
      if (likedFromStorage) {
        currentLiked = JSON.parse(likedFromStorage);
      }
      
      // Kiểm tra xem sản phẩm đã được like chưa
      const isLiked = currentLiked.some(item => item.id === id);
      
      if (isLiked) {
        // Bỏ like - xóa khỏi danh sách
        const newLikedItems = currentLiked.filter(item => item.id !== id);
        store.dispatch(setLiked(newLikedItems));
        await AsyncStorage.setItem('liked', JSON.stringify(newLikedItems));
      } else {
        // Thêm like - thêm vào danh sách
        const newLikedItem = { id: id };
        const newLikedItems = [...currentLiked, newLikedItem];
        store.dispatch(setLiked(newLikedItems));
        await AsyncStorage.setItem('liked', JSON.stringify(newLikedItems));
      }
    } catch (error) {
      // Error handling
    }
  };

  return (
    <View style={{ padding: SPACING.lg, paddingTop: SPACING.sm }}>
      <CategoryTab products={products} toggleLikedItem={toggleLikedItem} />
    </View>
  );
};

export default ProductList;
