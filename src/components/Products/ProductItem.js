import { Image, Pressable, TouchableOpacity, View } from 'react-native';
import React from 'react';
import tw from 'tailwind-react-native-classnames';
import ThemeText from '../ThemeText';
import { Icon } from 'react-native-elements';
import { useSelector } from 'react-redux';
import { selectLiked } from '../../store/slices/siteSlice';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';

const ProductItem = ({ data, toggleLikedItem, onProductPress, ...props }) => {
  const likedList = useSelector(selectLiked)
  return (
    <Pressable
      android_ripple={{ color: COLORS.borderLight }}
      style={[
        tw`flex-1 flex-row bg-white shadow-xl`,
        {
          padding: SPACING.lg,
          borderRadius: BORDER_RADIUS.xl,
          marginBottom: SPACING.lg,
        }
      ]}
      onPress={() => onProductPress && onProductPress(data)}
      {...props}>
      <View style={tw`relative`}>
        <Image
          source={{
            uri: data.thumbnail,
          }}
          resizeMode="contain"
          resizeMethod="resize"
          style={[
            tw`rounded-3xl`,
            {
              width: 140,
              height: 160,
              marginRight: SPACING.md,
            }
          ]}
        />
        <TouchableOpacity
          style={[
            tw`bg-white rounded-full absolute justify-center shadow-2xl`,
            {
              width: 28,
              height: 28,
              top: SPACING.sm,
              right: SPACING.md + 4,
            }
          ]}
          onPress={async () => await toggleLikedItem(data.id)}
        >
          <Icon 
            type="ionicon" 
            name="heart" 
            color={likedList.some((item) => item.id === data.id) ? COLORS.primary : COLORS.text.light} 
            size={14} 
          />
        </TouchableOpacity>
      </View>
      <View style={[tw`justify-center flex-1`, { paddingLeft: SPACING.sm }]}>
        <ThemeText 
          weight={600} 
          style={[
            tw`text-lg`,
            { 
              color: COLORS.text.primary,
              marginBottom: SPACING.xs,
            }
          ]}
        >
          {data.title.substring(0, 15)}...
        </ThemeText>
        <ThemeText 
          style={[
            tw`text-xs`,
            { color: COLORS.text.secondary }
          ]}
        >
          By <ThemeText weight={600}>{data.brand}</ThemeText>
        </ThemeText>
        <ThemeText 
          style={[
            tw`text-xs leading-5`,
            { 
              color: COLORS.text.secondary,
              marginTop: SPACING.sm,
            }
          ]}
        >
          {data.description.substring(0, 60)}...
        </ThemeText>
        <View style={[
          tw`flex-row justify-between items-center`,
          { marginTop: SPACING.md }
        ]}>
          <ThemeText 
            weight={700} 
            style={[
              tw`text-lg`,
              { color: COLORS.primary }
            ]}
          >
            ${data.price}
          </ThemeText>
          <TouchableOpacity
            style={{
              backgroundColor: COLORS.cta.secondary,
              paddingVertical: SPACING.sm,
              paddingHorizontal: SPACING.md,
              borderRadius: BORDER_RADIUS.lg,
            }}
          >
            <ThemeText 
              weight={600} 
              style={[
                tw`text-sm`,
                { color: COLORS.cta.text }
              ]}
            >
              Mua ngay
            </ThemeText>
          </TouchableOpacity>
        </View>
      </View>
    </Pressable>
  );
};

export default ProductItem;
