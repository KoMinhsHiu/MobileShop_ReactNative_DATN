import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import React, {useEffect, useRef, useState} from 'react';
import Wrapper from '../components/Wrapper/Wrapper';
import {useDispatch, useSelector} from 'react-redux';
import {selectLiked, setLiked} from '../store/slices/siteSlice';
import tw from 'tailwind-react-native-classnames';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import {Icon} from 'react-native-elements';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockLikedData, mockAsyncStorageData, mockProducts } from '../data/mockData';

const Favorites = ({navigation}) => {
  const dispatch = useDispatch();
  const [likedItems, setLikedItems] = useState([]);
  const [loading, setloading] = useState(false);
  let likedList = useSelector(selectLiked);
  const [selectedItem, setselectedItem] = useState(null);
  const swipeableRef = useRef(null);


  const removeItemFromLiked = async () => {
    try {
      // storage güncelleme
      let getlikedfromstorage = await AsyncStorage.getItem('liked');
      if (getlikedfromstorage) {
        let obj = JSON.parse(getlikedfromstorage);
        let removedLiked = obj.filter(item => item.id !== selectedItem);
        removedLiked = JSON.stringify(removedLiked);
        await AsyncStorage.setItem('liked', removedLiked);
      }
      // store güncelleme
      const newLiked = likedList.filter(item => item.id !== selectedItem);
      dispatch(setLiked(newLiked));
      // Cập nhật likedItems state
      setLikedItems(prevItems => prevItems.filter(item => item.id !== selectedItem));
    } catch (error) {
      // Error removing liked item
    }
  };

  const renderLeftActions = (progress, dragX) => {
    const trans = dragX.interpolate({
      inputRange: [0, 50, 100, 101],
      outputRange: [0, 0, 0, 1],
    });
    return (
      <View>
        <Animated.View
          style={[
            {
              transform: [{translateX: trans}],
            },
            tw`flex-1 bg-white`,
          ]}>
          <Pressable
            android_ripple={{color: '#dddddd', borderless: false, radius: 70}}
            style={tw`bg-red-600 w-24 flex-1 items-center justify-center`}
            onPress={removeItemFromLiked}>
            <Icon type="ionicon" name="trash" size={25} color="white" />
          </Pressable>
        </Animated.View>
      </View>
    );
  };

  useEffect(() => {
    const initializeData = async () => {
      setloading(true);
      try {
        // Luôn load dữ liệu từ AsyncStorage khi component mount
        const likedFromStorage = await AsyncStorage.getItem('liked');
        if (likedFromStorage) {
          const parsedLiked = JSON.parse(likedFromStorage);
          if (parsedLiked && Array.isArray(parsedLiked)) {
            dispatch(setLiked(parsedLiked));
          }
        }
      } catch (error) {
        // Error handling
      } finally {
        setloading(false);
      }
    };
    
    initializeData();
  }, []); // Chỉ gọi một lần khi component mount

  // Theo dõi thay đổi của likedList từ Redux store
  useEffect(() => {
    if (likedList && Array.isArray(likedList)) {
      const newLikedItems = [];
      for (const item of likedList) {
        const product = mockProducts.find(p => p.id === item.id);
        if (product) {
          newLikedItems.push(product);
        }
      }
      setLikedItems(newLikedItems);
    } else {
      setLikedItems([]);
    }
  }, [likedList]);

  return (
    <Wrapper header={false}>
      {!loading ? (
        likedItems.length > 0 ? (
          likedItems.map((item, index) => (
            <Swipeable
              key={index}
              ref={swipeableRef}
              renderLeftActions={renderLeftActions}
              onSwipeableOpen={() => setselectedItem(item.id)}>
              <Pressable
                android_ripple={{color: '#dddddd'}}
                style={tw`flex-row p-4 bg-white border-b border-gray-100 justify-between items-center`}
                onPress={() =>
                  navigation.navigate('ProductScreen', {id: item.id})
                }>
                <View style={tw`flex-row items-center`}>
                  <Image
                    source={{
                      uri: item.thumbnail,
                    }}
                    resizeMode="stretch"
                    resizeMethod="resize"
                    style={tw`w-16 h-16 mr-4 rounded-full`}
                  />
                  <Text>{item.title}</Text>
                </View>
                <Text style={tw`font-bold`}>${item.price}.00</Text>
              </Pressable>
            </Swipeable>
          ))
        ) : (
          <View
            style={tw`flex-row p-4 bg-white border-b border-gray-100 justify-between items-center`}>
            <Text>There is no any item</Text>
          </View>
        )
      ) : (
        <View style={tw`flex-1 h-80 items-center justify-center`}>
          <ActivityIndicator size="large" color="#e7474a" />
        </View>
      )}
    </Wrapper>
  );
};

export default Favorites;

const styles = StyleSheet.create({});
