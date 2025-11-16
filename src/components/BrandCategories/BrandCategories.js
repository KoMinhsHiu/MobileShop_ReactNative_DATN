import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../../constants/theme';
import ThemeText from '../ThemeText';

const BrandCategories = ({ onBrandSelect }) => {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      setLoading(true);
      // Use 10.0.2.2 for Android emulator, localhost for iOS simulator
      const API_BASE_URL = Platform.OS === 'android' 
        ? 'http://10.0.2.2:3000'
        : 'http://localhost:3000';
      
      const response = await fetch(`${API_BASE_URL}/api/v1/brands`);
      const result = await response.json();
      
      if (result.status === 200 && result.data) {
        // Transform API data to match component structure
        const transformedBrands = result.data.map((brand) => ({
          id: brand.id,
          name: brand.name,
          image: brand.image?.imageUrl || 'https://via.placeholder.com/100',
        }));
        
        setBrands(transformedBrands);
      }
    } catch (error) {
      console.error('Error fetching brands:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderBrandItem = ({ item: brand }) => (
    <TouchableOpacity
      style={styles.brandItem}
      onPress={() => onBrandSelect && onBrandSelect(brand.name)}
    >
      <View style={styles.brandImageContainer}>
        <Image
          source={{ uri: brand.image }}
          style={styles.brandImage}
          resizeMode="contain"
        />
      </View>
      <View style={styles.brandInfo}>
        <ThemeText
          weight={600}
          style={styles.brandName}
        >
          {brand.name}
        </ThemeText>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <ThemeText
            weight={700}
            style={styles.sectionTitle}
          >
            Thương hiệu nổi bật
          </ThemeText>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemeText
          weight={700}
          style={styles.sectionTitle}
        >
          Thương hiệu nổi bật
        </ThemeText>
        <TouchableOpacity>
          <ThemeText
            weight={500}
            style={styles.seeAllText}
          >
            Xem tất cả
          </ThemeText>
        </TouchableOpacity>
      </View>

      {brands.length > 0 ? (
        <FlatList
          data={brands}
          renderItem={renderBrandItem}
          keyExtractor={(item) => item.id.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <ThemeText style={styles.emptyText}>
            Không có thương hiệu nào
          </ThemeText>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    color: COLORS.text.primary,
  },
  seeAllText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.primary,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
  },
  brandItem: {
    alignItems: 'center',
    marginRight: SPACING.lg,
    backgroundColor: 'white',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    minWidth: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  brandImageContainer: {
    width: 60,
    height: 60,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  brandImage: {
    width: 50,
    height: 50,
    borderRadius: BORDER_RADIUS.md,
  },
  brandInfo: {
    alignItems: 'center',
  },
  brandName: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: '#000000', // Màu đen để dễ nhìn trên nền trắng của ô thương hiệu
    textAlign: 'center',
    marginBottom: 2,
  },
  loadingContainer: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.text.secondary,
  },
});

export default BrandCategories;
