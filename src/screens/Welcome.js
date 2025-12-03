import {
  View,
  StatusBar,
  ActivityIndicator,
  Image,
} from 'react-native';
import React, {useEffect} from 'react';
import tw from 'tailwind-react-native-classnames';
import {TitleText} from '../components/ThemeText';
import {useNavigation} from '@react-navigation/native';

const Welcome = () => {
  const navigation = useNavigation();

  useEffect(() => {
    // Đợi 2.5 giây để hiển thị màn hình welcome, sau đó chuyển đến màn hình đăng nhập
    const timer = setTimeout(() => {
      navigation.replace('LoginScreen');
    }, 2500);
    
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={tw`flex-1 bg-red-500`}>
      <StatusBar hidden />
      <View style={tw`flex-1 justify-center items-center relative`}>
        <View style={[tw`w-44 h-44 rounded-full shadow-lg bg-white`]} />
        <View style={tw`flex-1 absolute items-center justify-center`}>
          <Image
            source={require('../../assets/logo.jpg')}
            style={{ 
              width: 160, 
              height: 160, 
              resizeMode: 'cover',
              borderRadius: 80,
              elevation: 601,
            }}
          />
          <View style={tw`absolute top-48 left-0 w-full`}>
            <ActivityIndicator size="large" color="white" />
          </View>
        </View>
      </View>
    </View>
  );
};

export default Welcome;
