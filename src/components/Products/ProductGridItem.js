import { Image, Pressable, TouchableOpacity, View } from 'react-native';
import React from 'react';
import tw from 'tailwind-react-native-classnames';
import ThemeText from '../ThemeText';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../../constants/theme';

// Format price in VND
const formatPrice = (price) => {
  if (!price) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(price);
};

const ProductGridItem = ({ data, onProductPress, ...props }) => {
  
  return (
    <Pressable
      android_ripple={{ color: COLORS.borderLight }}
      style={[
        tw`bg-white shadow-xl`,
        {
          borderRadius: BORDER_RADIUS.lg,
          marginBottom: SPACING.md,
          marginHorizontal: SPACING.xs,
          flex: 1,
          maxWidth: '48%',
        }
      ]}
      onPress={() => onProductPress && onProductPress(data)}
      {...props}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: data.thumbnail }}
          style={styles.productImage}
          resizeMode="contain"
        />
        {data.discountPercentage > 0 && (
          <View style={styles.discountBadge}>
            <ThemeText
              weight={600}
              style={styles.discountText}
            >
              -{data.discountPercentage}%
            </ThemeText>
          </View>
        )}
      </View>

      <View style={styles.productInfo}>
        {/* Top Section - Product Info */}
        <View style={styles.topSection}>
          <ThemeText
            weight={600}
            style={styles.productTitle}
            numberOfLines={2}
          >
            {data.title}
          </ThemeText>
          
          <ThemeText
            style={styles.brandText}
          >
            {data.brand}
          </ThemeText>

          {data.rating > 0 && (
            <View style={styles.ratingContainer}>
              <ThemeText
                style={styles.ratingText}
              >
                ⭐ {data.rating}
              </ThemeText>
            </View>
          )}
        </View>

        {/* Bottom Section - Price and Buy Button */}
        <View style={styles.bottomSection}>
          <View style={styles.priceContainer}>
            <ThemeText
              weight={700}
              style={styles.priceText}
            >
              {formatPrice(data.price)}
            </ThemeText>
            {data.discountPercentage > 0 && data.originalPrice && (
              <ThemeText
                style={styles.originalPrice}
              >
                {formatPrice(data.originalPrice)}
              </ThemeText>
            )}
          </View>

          <TouchableOpacity
            style={styles.buyButton}
            onPress={() => {
              // Handle buy action
              console.log('Buy product:', data.id);
            }}
          >
            <ThemeText
              weight={600}
              style={styles.buyButtonText}
            >
              Mua ngay
            </ThemeText>
          </TouchableOpacity>
        </View>
      </View>
    </Pressable>
  );
};

const styles = {
  imageContainer: {
    position: 'relative',
    height: 120,
    padding: SPACING.sm,
  },
  productImage: {
    width: '100%',
    height: '100%',
    borderRadius: BORDER_RADIUS.md,
  },
  discountBadge: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
  },
  discountText: {
    color: 'white',
    fontSize: TYPOGRAPHY.sizes.xs,
  },
  productInfo: {
    padding: SPACING.md,
    flex: 1,
    justifyContent: 'space-between',
  },
  topSection: {
    flex: 1,
  },
  bottomSection: {
    marginTop: SPACING.sm,
  },
  productTitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: '#1f2937', // Dark text for white background
    marginBottom: SPACING.xs,
    lineHeight: 16,
    minHeight: 32, // Fixed height for 2 lines
  },
  brandText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: '#6b7280', // Gray text for white background
    marginBottom: SPACING.xs,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: '#6b7280', // Gray text for white background
    marginLeft: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  priceText: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.primary,
  },
  originalPrice: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: '#9ca3af', // Light gray for white background
    textDecorationLine: 'line-through',
    marginLeft: SPACING.xs,
  },
  buyButton: {
    backgroundColor: COLORS.cta.secondary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  buyButtonText: {
    color: COLORS.cta.text,
    fontSize: TYPOGRAPHY.sizes.sm,
  },
};

export default ProductGridItem;
