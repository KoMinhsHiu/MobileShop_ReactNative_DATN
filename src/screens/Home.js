import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Alert,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Icon } from 'react-native-elements';
import CustomStatusBar from '../components/CustomStatusBar';
import SimpleSearchBar from '../components/SearchBar/SimpleSearchBar';
import Banner from '../components/Banner/Banner';
import BrandCategories from '../components/BrandCategories/BrandCategories';
// import FilterBar from '../components/FilterBar/FilterBar';
import ProductGridItem from '../components/Products/ProductGridItem';
import Wrapper from '../components/Wrapper/Wrapper';
import { useSelector } from 'react-redux';
import { selectSearchText } from '../store/slices/siteSlice';
import { COLORS, SPACING } from '../constants/theme';

const Home = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [showAll, setShowAll] = useState(false);
  // Tạm thời comment out filter state
  // const [selectedFilters, setSelectedFilters] = useState({
  //   price: 'all',
  //   category: 'all',
  //   promotion: 'all',
  // });
  const searchQuery = useSelector(selectSearchText);
  const navigation = useNavigation();

  // Fetch phone variants from API
  useEffect(() => {
    fetchPhoneVariants();
    setShowAll(false); // Reset show all state when fetching fresh data
  }, []);

  const fetchPhoneVariants = async (limit = null) => {
    try {
      setLoading(true);
      // Use 10.0.2.2 for Android emulator, localhost for iOS simulator
      const API_BASE_URL = Platform.OS === 'android' 
        ? 'http://10.0.2.2:3000'
        : 'http://localhost:3000';
      
      // Build URL with limit parameter if provided
      let url = `${API_BASE_URL}/api/v1/phones/variants/filter`;
      if (limit) {
        url += `?limit=${limit}`;
      }
      
      const response = await fetch(url);
      const result = await response.json();
      
      if (result.status === 200 && result.data && result.data.data) {
        // Save total items count
        if (result.data.total !== undefined) {
          setTotalItems(result.data.total);
        }
        
        // Transform API data to match ProductGridItem structure
        const transformedProducts = result.data.data.map((variant) => {
          // Get original price
          const originalPrice = variant.price?.price || 0;
          const discountPercent = variant.discount?.discountPercent || 0;
          
          // Calculate final price with discount applied
          const finalPrice = discountPercent > 0 
            ? originalPrice * (1 - discountPercent / 100)
            : originalPrice;
          
          // Get first image URL
          const thumbnail = variant.images && variant.images.length > 0 
            ? variant.images[0].image.imageUrl 
            : 'https://via.placeholder.com/300';
          
          return {
            id: variant.id,
            title: `${variant.phone.name} ${variant.variantName}`,
            brand: variant.phone.brand?.name || '',
            thumbnail: thumbnail,
            price: finalPrice,
            originalPrice: originalPrice, // Store original for display
            discountPercentage: discountPercent,
            rating: variant.averageRating || 0,
            description: variant.description || '',
            variantData: variant, // Keep original data for navigation
          };
        });
        
        setProducts(transformedProducts);
        setFilteredProducts(transformedProducts);
      } else {
        Alert.alert('Lỗi', 'Không thể tải danh sách sản phẩm');
      }
    } catch (error) {
      console.error('Error fetching phone variants:', error);
      Alert.alert('Lỗi', 'Không thể kết nối đến server');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadAll = async () => {
    // Fetch all items with a high limit (or fetch all pages)
    await fetchPhoneVariants(totalItems || 1000);
    setShowAll(true);
  };

  // Filter products based on search and brand selection
  useEffect(() => {
    let filtered = products;

    // Filter by search query
    if (searchQuery.length > 0) {
      filtered = filtered.filter(product =>
        product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by selected brand
    if (selectedBrand) {
      filtered = filtered.filter(product => product.brand === selectedBrand);
    }

    // Tạm thời comment out filter logic
    // // Filter by price range
    // if (selectedFilters.price !== 'all') {
    //   const priceRanges = {
    //     'under-50': { min: 0, max: 50 },
    //     '50-100': { min: 50, max: 100 },
    //     '100-200': { min: 100, max: 200 },
    //     '200-500': { min: 200, max: 500 },
    //     'over-500': { min: 500, max: Infinity },
    //   };
    //   
    //   if (priceRanges[selectedFilters.price]) {
    //     const { min, max } = priceRanges[selectedFilters.price];
    //     filtered = filtered.filter(product => product.price >= min && product.price <= max);
    //   }
    // }

    // // Filter by category
    // if (selectedFilters.category !== 'all') {
    //   filtered = filtered.filter(product => product.category === selectedFilters.category);
    // }

    // // Filter by promotion
    // if (selectedFilters.promotion !== 'all') {
    //   switch (selectedFilters.promotion) {
    //     case 'discount':
    //       filtered = filtered.filter(product => product.discountPercentage > 0);
    //       break;
    //     case 'new':
    //       filtered = filtered.filter(product => product.isNew === true);
    //       break;
    //     case 'bestseller':
    //       filtered = filtered.filter(product => product.rating >= 4.5);
    //       break;
    //     case 'free-shipping':
    //       filtered = filtered.filter(product => product.freeShipping === true);
    //       break;
    //   }
    // }

    setFilteredProducts(filtered);
    // Reset showAll when filters change to show the button again if needed
    if (searchQuery || selectedBrand) {
      setShowAll(false);
    }
  }, [searchQuery, selectedBrand, products]); // Tạm thời bỏ selectedFilters

  const handleBrandSelect = async (brandName) => {
    // Nếu đang chọn cùng nhãn hàng, thì bỏ chọn và load lại tất cả
    if (selectedBrand === brandName) {
      setSelectedBrand(null);
      await fetchPhoneVariants();
      return;
    }
    
    // Chọn nhãn hàng mới và fetch variants của nhãn hàng đó
    setSelectedBrand(brandName);
    await fetchVariantsByBrand(brandName);
  };

  const fetchVariantsByBrand = async (brandName) => {
    try {
      setLoading(true);
      // Use 10.0.2.2 for Android emulator, localhost for iOS simulator
      const API_BASE_URL = Platform.OS === 'android' 
        ? 'http://10.0.2.2:3000'
        : 'http://localhost:3000';
      
      // Build URL with brand parameter
      const url = `${API_BASE_URL}/api/v1/phones/variants/filter?brand=${encodeURIComponent(brandName)}`;
      
      const response = await fetch(url);
      const result = await response.json();
      
      if (result.status === 200 && result.data && result.data.data) {
        // Save total items count
        if (result.data.total !== undefined) {
          setTotalItems(result.data.total);
        }
        
        // Transform API data to match ProductGridItem structure
        const transformedProducts = result.data.data.map((variant) => {
          // Get original price
          const originalPrice = variant.price?.price || 0;
          const discountPercent = variant.discount?.discountPercent || 0;
          
          // Calculate final price with discount applied
          const finalPrice = discountPercent > 0 
            ? originalPrice * (1 - discountPercent / 100)
            : originalPrice;
          
          // Get first image URL
          const thumbnail = variant.images && variant.images.length > 0 
            ? variant.images[0].image.imageUrl 
            : 'https://via.placeholder.com/300';
          
          return {
            id: variant.id,
            title: `${variant.phone.name} ${variant.variantName}`,
            brand: variant.phone.brand?.name || '',
            thumbnail: thumbnail,
            price: finalPrice,
            originalPrice: originalPrice, // Store original for display
            discountPercentage: discountPercent,
            rating: variant.averageRating || 0,
            description: variant.description || '',
            variantData: variant, // Keep original data for navigation
          };
        });
        
        setProducts(transformedProducts);
        setFilteredProducts(transformedProducts);
      } else {
        Alert.alert('Lỗi', `Không thể tải danh sách sản phẩm của nhãn hàng ${brandName}`);
      }
    } catch (error) {
      console.error('Error fetching variants by brand:', error);
      Alert.alert('Lỗi', 'Không thể kết nối đến server');
    } finally {
      setLoading(false);
    }
  };

  // Tạm thời comment out filter handler
  // const handleFilterChange = (filterType, filterValue) => {
  //   if (filterType === 'clear') {
  //     setSelectedFilters({
  //       price: 'all',
  //       category: 'all',
  //       promotion: 'all',
  //     });
  //   } else {
  //     setSelectedFilters(prev => ({
  //       ...prev,
  //       [filterType]: filterValue,
  //     }));
  //   }
  // };

  const handleProductPress = (product) => {
    // Navigate to product detail screen
    navigation.navigate('ProductScreen', { id: product.id });
  };

  // Tạo data cho FlatList header
  const renderHeader = () => (
    <View>
          {/* Search Bar */}
          <SimpleSearchBar />

      {/* Banner/Promotion */}
      <Banner />

      {/* Brand Categories */}
      <BrandCategories onBrandSelect={handleBrandSelect} />

      {/* Filter Bar - Tạm thời comment out */}
      {/* <FilterBar 
        onFilterChange={handleFilterChange}
        selectedFilters={selectedFilters}
      /> */}

      {/* Selected Brand Filter */}
      {selectedBrand && (
        <View style={styles.filterContainer}>
          <View style={styles.filterChip}>
            <View style={styles.filterChipContent}>
              <View style={styles.filterChipText}>
                <Text style={styles.filterChipLabel}>Hãng: </Text>
                <Text style={styles.filterChipValue}>{selectedBrand}</Text>
              </View>
              <TouchableOpacity
                onPress={async () => {
                  setSelectedBrand(null);
                  await fetchPhoneVariants();
                }}
                style={styles.filterChipClose}
              >
                <Icon
                  type="ionicon"
                  name="close"
                  size={16}
                  color={COLORS.text.secondary}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Product Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {selectedBrand ? `Sản phẩm ${selectedBrand}` : 'Sản phẩm nổi bật'}
        </Text>
        <Text style={styles.productCount}>
          {filteredProducts.length} sản phẩm
        </Text>
      </View>

      {/* Show All Button - Only show if there are more items than currently loaded */}
      {!showAll && totalItems > 0 && products.length < totalItems && (
        <View style={styles.showAllContainer}>
          <TouchableOpacity
            style={styles.showAllButton}
            onPress={handleLoadAll}
          >
            <Text style={styles.showAllButtonText}>
              Hiển thị tất cả ({totalItems} sản phẩm)
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderProductItem = ({ item }) => (
    <ProductGridItem
      data={item}
      onProductPress={handleProductPress}
    />
  );

  // Render loading indicator in JSX instead of early return to avoid hooks order issues
  return (
    <>
      <CustomStatusBar backgroundColor={COLORS.primary} barStyle="white-content" />
      <Wrapper header={false} notscrollable={true}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Đang tải sản phẩm...</Text>
          </View>
        ) : (
          <FlatList
            style={styles.container}
            data={filteredProducts}
            renderItem={renderProductItem}
            keyExtractor={(item) => item.id.toString()}
            numColumns={2}
            ListHeaderComponent={renderHeader}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            columnWrapperStyle={styles.row}
          />
        )}
      </Wrapper>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
  },
  scrollContent: {
    paddingBottom: SPACING.xl,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
  },
  filterContainer: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  filterChip: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  filterChipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  filterChipText: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChipLabel: {
    color: 'white',
    fontSize: 14,
  },
  filterChipValue: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  filterChipClose: {
    marginLeft: SPACING.sm,
    padding: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  productCount: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  showAllContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  showAllButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    minWidth: 200,
    alignItems: 'center',
  },
  showAllButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default Home;
