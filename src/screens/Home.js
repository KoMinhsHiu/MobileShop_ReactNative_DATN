import React, { useState, useEffect, useRef } from 'react';
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
  const searchDebounceRef = useRef(null);
  const abortControllerRef = useRef(null);

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

  /**
   * Search với Elasticsearch API khi có search query
   * Sử dụng AbortController để hủy request cũ khi có request mới
   */
  const searchWithElasticsearch = async (query) => {
    /**
     * Hủy request trước đó nếu có
     */
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    /**
     * Tạo AbortController mới
     */
    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      
      /**
       * Xác định API base URL
       */
      const API_BASE_URL = Platform.OS === 'android'
        ? 'http://10.0.2.2:3000'
        : 'http://localhost:3000';

      /**
       * Gọi API GET /api/v1/search?q={query}
       */
      const url = `${API_BASE_URL}/api/v1/search?q=${encodeURIComponent(query)}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: abortControllerRef.current.signal,
      });

      const result = await response.json();

      /**
       * Xử lý kết quả
       */
      if (result.status === 200 && result.data && result.data.phones) {
        /**
         * Transform phones từ API sang format cho ProductGridItem
         */
        const transformedProducts = result.data.phones.map((phone) => {
          const originalPrice = phone.originalPrice || 0;
          const discountPercent = phone.discountPercent || 0;
          const finalPrice = discountPercent > 0 
            ? originalPrice * (1 - discountPercent / 100)
            : originalPrice;

          return {
            id: phone.id,
            title: phone.name,
            brand: '',
            thumbnail: phone.imageUrl || 'https://via.placeholder.com/300',
            price: finalPrice,
            originalPrice: originalPrice,
            discountPercentage: discountPercent,
            rating: 0,
            description: '',
            variantData: null,
          };
        });

        setFilteredProducts(transformedProducts);
        setTotalItems(transformedProducts.length);
      } else if (result.statusCode === 503) {
        /**
         * Service unavailable - hiển thị empty
         */
        setFilteredProducts([]);
        setTotalItems(0);
      } else {
        /**
         * Lỗi khác hoặc không có kết quả
         */
        setFilteredProducts([]);
        setTotalItems(0);
      }
    } catch (error) {
      /**
       * Xử lý lỗi (có thể do abort hoặc network error)
       */
      if (error.name !== 'AbortError') {
        console.error('Error searching with Elasticsearch:', error);
        setFilteredProducts([]);
        setTotalItems(0);
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  /**
   * Filter products based on search and brand selection
   * Nếu có search query, sử dụng Elasticsearch API với debounce 300ms
   * Nếu không, filter local
   */
  useEffect(() => {
    /**
     * Clear debounce timeout trước đó
     */
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    /**
     * Nếu có search query, gọi API Elasticsearch sau 300ms (debounce)
     */
    if (searchQuery && searchQuery.length > 0) {
      searchDebounceRef.current = setTimeout(() => {
        searchWithElasticsearch(searchQuery);
        setShowAll(false);
      }, 300);
      return;
    }

    /**
     * Nếu không có search query, load lại products ban đầu hoặc filter local
     */
    if (products.length === 0 && !selectedBrand) {
      /**
       * Nếu không có products và không có brand filter, fetch lại
       */
      fetchPhoneVariants();
    } else {
      /**
       * Filter local by selected brand
       */
      let filtered = products;

      if (selectedBrand) {
        filtered = filtered.filter(product => product.brand === selectedBrand);
      }

      setFilteredProducts(filtered);
    }
    
    /**
     * Reset showAll when filters change
     */
    if (selectedBrand) {
      setShowAll(false);
    }

    /**
     * Cleanup debounce timeout
     */
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [searchQuery, selectedBrand, products]);

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
