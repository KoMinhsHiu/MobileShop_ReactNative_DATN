import React from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { Icon } from 'react-native-elements';
import { useSelector } from 'react-redux';
import { selectLiked } from '../../store/slices/siteSlice';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../../constants/theme';
import ThemeText from '../ThemeText';

const ProductGrid = ({ products, toggleLikedItem, onProductPress }) => {
  const likedList = useSelector(selectLiked);

  const renderProductItem = ({ item }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => onProductPress && onProductPress(item)}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: item.thumbnail }}
          style={styles.productImage}
          resizeMode="contain"
        />
        <TouchableOpacity
          style={styles.likeButton}
          onPress={() => toggleLikedItem && toggleLikedItem(item.id)}
        >
          <Icon
            type="ionicon"
            name="heart"
            color={likedList.some((likedItem) => likedItem.id === item.id) ? COLORS.primary : COLORS.text.light}
            size={18}
          />
        </TouchableOpacity>
        {item.discountPercentage > 0 && (
          <View style={styles.discountBadge}>
            <ThemeText
              weight={600}
              style={styles.discountText}
            >
              -{item.discountPercentage}%
            </ThemeText>
          </View>
        )}
      </View>

      <View style={styles.productInfo}>
        <ThemeText
          weight={600}
          style={styles.productTitle}
          numberOfLines={2}
        >
          {item.title}
        </ThemeText>
        
        <ThemeText
          style={styles.brandText}
        >
          {item.brand}
        </ThemeText>

        <View style={styles.ratingContainer}>
          <Icon
            type="ionicon"
            name="star"
            color="#FFD700"
            size={12}
          />
          <ThemeText
            style={styles.ratingText}
          >
            {item.rating}
          </ThemeText>
        </View>

        <View style={styles.priceContainer}>
          <ThemeText
            weight={700}
            style={styles.priceText}
          >
            ${item.price}
          </ThemeText>
          {item.discountPercentage > 0 && (
            <ThemeText
              style={styles.originalPrice}
            >
              ${Math.round(item.price / (1 - item.discountPercentage / 100))}
            </ThemeText>
          )}
        </View>

        <TouchableOpacity
          style={styles.buyButton}
          onPress={() => {
            // Handle buy action
            console.log('Buy product:', item.id);
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
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={products}
        renderItem={renderProductItem}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  row: {
    justifyContent: 'space-between',
  },
  productCard: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
    height: 140,
    padding: SPACING.sm,
  },
  productImage: {
    width: '100%',
    height: '100%',
    borderRadius: BORDER_RADIUS.md,
  },
  likeButton: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.full,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
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
    color: COLORS.background,
    fontSize: TYPOGRAPHY.sizes.xs,
  },
  productInfo: {
    padding: SPACING.md,
  },
  productTitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
    lineHeight: 18,
  },
  brandText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  ratingText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.text.secondary,
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
    color: COLORS.text.light,
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
});

export default ProductGrid;
