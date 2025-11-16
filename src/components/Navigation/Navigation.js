import {Pressable, StyleSheet, Text, View} from 'react-native';
import React from 'react';
import {Icon} from 'react-native-elements';
import tw from 'tailwind-react-native-classnames';
import ThemeText from '../ThemeText';
import {useSelector} from 'react-redux';
import {selectBasket, selectOrders} from '../../store/slices/siteSlice';

const Navigation = ({state, descriptors, navigation}) => {
  let basket = useSelector(selectBasket);
  let orders = useSelector(selectOrders);

  // Đảm bảo basket và orders là array
  const safeBasket = Array.isArray(basket) ? basket : [];
  const safeOrders = Array.isArray(orders) ? orders : [];

  // Error handling
  if (!state || !state.routes) {
    console.error('Navigation: Invalid state or routes');
    return (
      <View style={[tw`bg-white w-full h-20 shadow-2xl px-2 flex-row justify-center items-center`, styles.shadow]}>
        <Text style={tw`text-red-500`}>Navigation Error</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        tw`bg-white w-full h-20 shadow-2xl px-2 flex-row justify-around`,
        styles.shadow,
      ]}>
      {state.routes.map((route, index) => {
        const {options} = descriptors[route.key];

        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        // Map English labels to Vietnamese for display
        const getDisplayLabel = (label) => {
          const labelMap = {
            'Home': 'Trang chủ',
            'Basket': 'Giỏ hàng',
            'Orders': 'Đơn hàng',
            'Profile': 'Hồ sơ',
            'Đơn hàng': 'Đơn hàng',
          };
          return labelMap[label] || label;
        };

        const displayLabel = getDisplayLabel(label);

        return label === 'Home' || label === 'Trang chủ' ? (
          <Pressable
            android_ripple={{color: '#dddddd'}}
            key={label}
            onPress={onPress}>
            <View
              style={[
                tw`w-20 h-20 p-3 rounded-full bg-white`,
                isFocused && {transform: [{translateY: -30}]},
              ]}>
              <Icon
                type="ionicon"
                name="home"
                color={isFocused ? 'white' : '#999'}
                size={28}
                style={tw`w-full h-full rounded-full items-center justify-center ${
                  isFocused ? 'bg-red-600 ' : 'bg-white'
                }`}
              />
              <ThemeText weight={800} style={tw`text-center mt-2 text-red-500`}>
                {displayLabel}
              </ThemeText>
            </View>
          </Pressable>
        ) : (
          <Pressable
            android_ripple={{color: '#dddddd'}}
            onPress={onPress}
            key={label}>
            <View
              style={[
                tw`w-20 h-20 p-3 rounded-full bg-white`,
                isFocused && {transform: [{translateY: -30}]},
              ]}>
              {(label === 'Basket' || label === 'Giỏ hàng') && (
                <View style={tw`relative`}>
                  {safeBasket.length > 0 && (
                    <View
                      style={tw`absolute w-5 h-5 rounded-full bg-green-600 top-0 right-0 z-10 items-center justify-center`}>
                      <Text style={tw`text-white text-xs font-bold`}>
                        {safeBasket.length}
                      </Text>
                    </View>
                  )}
                  <Icon
                    type="ionicon"
                    name="basket"
                    size={35}
                    color={isFocused ? 'white' : '#999'}
                    style={tw`w-full h-full rounded-full items-center justify-center ${
                      isFocused ? 'bg-red-600 ' : 'bg-white'
                    }`}
                  />
                </View>
              )}
              {(label === 'Đơn hàng' || label === 'Orders') && (
                <View style={tw`relative`}>
                  {safeOrders.length > 0 && (
                    <View
                      style={tw`absolute w-5 h-5 rounded-full bg-green-600 top-0 right-0 z-10 items-center justify-center`}>
                      <Text style={tw`text-white text-xs font-bold`}>
                        {safeOrders.length}
                      </Text>
                    </View>
                  )}
                  <Icon
                    type="ionicon"
                    name="receipt-outline"
                    size={30}
                    color={isFocused ? 'white' : '#999'}
                    style={tw`w-full h-full rounded-full items-center justify-center ${
                      isFocused ? 'bg-red-600 ' : 'bg-white'
                    }`}
                  />
                </View>
              )}
              {(label === 'Profile' || label === 'Hồ sơ') && (
                <Icon
                  type="ionicon"
                  name="person"
                  size={30}
                  color={isFocused ? 'white' : '#999'}
                  style={tw`w-full h-full rounded-full items-center justify-center ${
                    isFocused ? 'bg-red-600 ' : 'bg-white'
                  }`}
                />
              )}
              <ThemeText weight={800} style={tw`text-center mt-2 text-red-500`}>
                {displayLabel}
              </ThemeText>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
};

export default Navigation;

const styles = StyleSheet.create({
  shadow: {
    shadowOffset: {width: 10, height: -20},
    shadowColor: 'black',
    shadowOpacity: 1,
    elevation: 20,
  },
});
