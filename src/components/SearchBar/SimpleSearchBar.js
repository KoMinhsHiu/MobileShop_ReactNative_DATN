import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Pressable,
  Text,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Icon } from 'react-native-elements';
import { useSelector, useDispatch } from 'react-redux';
import { selectSearchText, setSearchText } from '../../store/slices/siteSlice';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../../constants/theme';
import ThemeText from '../ThemeText';
import { useNavigation } from '@react-navigation/native';

const SimpleSearchBar = () => {
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [localText, setLocalText] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const searchQuery = useSelector(selectSearchText);
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const textInputRef = useRef(null);
  const debounceTimeoutRef = useRef(null);
  const abortControllerRef = useRef(null);

  /**
   * Sync với Redux state khi component mount
   */
  useEffect(() => {
    setLocalText(searchQuery);
  }, []);

  /**
   * Gọi API Elasticsearch để tìm kiếm
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
      setSearchLoading(true);
      
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
      if (result.status === 200 && result.data) {
        /**
         * Transform phones từ API sang format cho suggestions
         */
        const transformedPhones = (result.data.phones || []).map((phone) => ({
          id: phone.id,
          title: phone.name,
          originalPrice: phone.originalPrice,
          discountPercent: phone.discountPercent || 0,
          imageUrl: phone.imageUrl,
          type: 'phone',
        }));

        setSuggestions(transformedPhones);
        setCategories(result.data.categories || []);
      } else if (result.statusCode === 503) {
        /**
         * Service unavailable - hiển thị empty results
         */
        setSuggestions([]);
        setCategories([]);
      } else if (result.statusCode === 400) {
        /**
         * Bad request - hiển thị empty results
         */
        setSuggestions([]);
        setCategories([]);
      } else {
        /**
         * Lỗi khác - hiển thị empty results
         */
        setSuggestions([]);
        setCategories([]);
      }
    } catch (error) {
      /**
       * Xử lý lỗi (có thể do abort hoặc network error)
       */
      if (error.name !== 'AbortError') {
        console.error('Error searching with Elasticsearch:', error);
        setSuggestions([]);
        setCategories([]);
      }
    } finally {
      setSearchLoading(false);
      abortControllerRef.current = null;
    }
  };

  /**
   * Debounced search - gọi API sau khi user ngừng gõ 300ms
   */
  useEffect(() => {
    /**
     * Clear timeout trước đó
     */
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    /**
     * Nếu có text và đang focused, gọi API sau 300ms
     */
    if (localText.length > 0 && isFocused) {
      debounceTimeoutRef.current = setTimeout(() => {
        searchWithElasticsearch(localText);
      }, 300);
    } else {
      /**
       * Nếu không có text hoặc không focused, clear suggestions
       */
      setSuggestions([]);
      setCategories([]);
    }

    /**
     * Cleanup
     */
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [localText, isFocused]);

  const handleTextChange = (text) => {
    setLocalText(text);
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    // Delay để cho phép suggestion click
    setTimeout(() => {
      setIsFocused(false);
      // Update Redux state khi blur
      dispatch(setSearchText(localText));
    }, 150);
  };

  /**
   * Handle suggestion press
   */
  const handleSuggestionPress = (item) => {
    if (item.type === 'phone') {
      /**
       * Navigate to product detail screen
       */
      setLocalText(item.title);
      dispatch(setSearchText(item.title));
      setIsFocused(false);
      /**
       * Navigate to product screen với phone id
       * Note: Cần tìm variantId từ phone id, tạm thời dùng phone id
       */
      navigation.navigate('ProductScreen', { id: item.id });
    } else {
      /**
       * Category hoặc text search
       */
      setLocalText(item.title || item);
      dispatch(setSearchText(item.title || item));
      setIsFocused(false);
    }
  };

  const clearSearch = () => {
    setLocalText('');
    dispatch(setSearchText(''));
    // Focus lại TextInput
    setTimeout(() => {
      textInputRef.current?.focus();
    }, 100);
  };

  const handleSubmitEditing = () => {
    dispatch(setSearchText(localText));
    setIsFocused(false);
  };

  /**
   * Format currency
   */
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '0 ₫';
    return `${amount.toLocaleString('vi-VN')} ₫`;
  };

  /**
   * Calculate final price with discount
   */
  const calculateFinalPrice = (originalPrice, discountPercent) => {
    if (!originalPrice) return 0;
    if (discountPercent > 0) {
      return originalPrice * (1 - discountPercent / 100);
    }
    return originalPrice;
  };

  /**
   * Render phone suggestion
   */
  const renderPhoneSuggestion = (phone) => (
    <Pressable
      key={`phone-${phone.id}`}
      style={{
        padding: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
        flexDirection: 'row',
        alignItems: 'center',
      }}
      onPress={() => handleSuggestionPress(phone)}
    >
      <Icon
        type="ionicon"
        name="phone-portrait"
        size={20}
        color={COLORS.primary}
        style={{ marginRight: SPACING.sm }}
      />
      <View style={{ flex: 1 }}>
        <ThemeText
          weight={500}
          style={{
            color: '#1f2937',
            fontSize: TYPOGRAPHY.sizes.sm,
          }}
        >
          {phone.title}
        </ThemeText>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
          {phone.discountPercent > 0 && (
            <ThemeText
              style={{
                color: '#6b7280',
                fontSize: TYPOGRAPHY.sizes.xs,
                textDecorationLine: 'line-through',
                marginRight: SPACING.xs,
              }}
            >
              {formatCurrency(phone.originalPrice)}
            </ThemeText>
          )}
          <ThemeText
            style={{
              color: COLORS.primary,
              fontSize: TYPOGRAPHY.sizes.xs,
              fontWeight: '600',
            }}
          >
            {formatCurrency(calculateFinalPrice(phone.originalPrice, phone.discountPercent))}
          </ThemeText>
          {phone.discountPercent > 0 && (
            <ThemeText
              style={{
                color: '#ef4444',
                fontSize: TYPOGRAPHY.sizes.xs,
                marginLeft: SPACING.xs,
              }}
            >
              -{phone.discountPercent}%
            </ThemeText>
          )}
        </View>
      </View>
    </Pressable>
  );

  /**
   * Render category suggestion
   */
  const renderCategorySuggestion = (category, index) => (
    <Pressable
      key={`category-${index}`}
      style={{
        padding: SPACING.md,
        borderBottomWidth: index < categories.length - 1 ? 1 : 0,
        borderBottomColor: COLORS.borderLight,
        flexDirection: 'row',
        alignItems: 'center',
      }}
      onPress={() => handleSuggestionPress({ title: category, type: 'category' })}
    >
      <Icon
        type="ionicon"
        name="pricetag"
        size={16}
        color="#6b7280"
        style={{ marginRight: SPACING.sm }}
      />
      <ThemeText
        weight={500}
        style={{
          color: '#1f2937',
          fontSize: TYPOGRAPHY.sizes.sm,
        }}
      >
        {category}
      </ThemeText>
    </Pressable>
  );

  return (
    <View style={{ position: 'relative', zIndex: 1000 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: 'white',
          borderRadius: BORDER_RADIUS.lg,
          paddingHorizontal: SPACING.md,
          paddingVertical: SPACING.sm,
          marginHorizontal: SPACING.md,
          marginVertical: SPACING.sm,
          borderWidth: 1,
          borderColor: isFocused ? COLORS.primary : COLORS.border,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
      >
        <Icon
          type="ionicon"
          name="search"
          size={20}
          color={isFocused ? COLORS.primary : "#6b7280"}
        />
        <TextInput
          ref={textInputRef}
          style={{
            flex: 1,
            marginLeft: SPACING.sm,
            fontSize: TYPOGRAPHY.sizes.md,
            color: '#1f2937',
          }}
          placeholder="Tìm kiếm sản phẩm..."
          placeholderTextColor="#6b7280"
          value={localText}
          onChangeText={handleTextChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={handleSubmitEditing}
          blurOnSubmit={false}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {localText.length > 0 && (
          <TouchableOpacity onPress={clearSearch}>
            <Icon
              type="ionicon"
              name="close-circle"
              size={20}
              color="#6b7280"
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Gợi ý sản phẩm và categories */}
      {isFocused && (suggestions.length > 0 || categories.length > 0 || searchLoading) && (
        <View
          style={{
            position: 'absolute',
            top: 60,
            left: SPACING.md,
            right: SPACING.md,
            backgroundColor: 'white',
            borderRadius: BORDER_RADIUS.lg,
            borderWidth: 1,
            borderColor: COLORS.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 8,
            maxHeight: 300,
            zIndex: 1001,
          }}
        >
          {searchLoading ? (
            <View style={{ padding: SPACING.lg, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={{ marginTop: SPACING.sm, color: '#6b7280', fontSize: TYPOGRAPHY.sizes.xs }}>
                Đang tìm kiếm...
              </Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              {/* Hiển thị phones */}
              {suggestions.length > 0 && (
                <>
                  {suggestions.map(renderPhoneSuggestion)}
                </>
              )}
              
              {/* Hiển thị categories */}
              {categories.length > 0 && (
                <>
                  {suggestions.length > 0 && (
                    <View
                      style={{
                        height: 1,
                        backgroundColor: COLORS.borderLight,
                        marginVertical: SPACING.xs,
                      }}
                    />
                  )}
                  {categories.map(renderCategorySuggestion)}
                </>
              )}
              
              {/* Không có kết quả */}
              {suggestions.length === 0 && categories.length === 0 && localText.length > 0 && (
                <View style={{ padding: SPACING.lg, alignItems: 'center' }}>
                  <Text style={{ color: '#6b7280', fontSize: TYPOGRAPHY.sizes.sm }}>
                    Không tìm thấy kết quả
                  </Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
};

export default SimpleSearchBar;
