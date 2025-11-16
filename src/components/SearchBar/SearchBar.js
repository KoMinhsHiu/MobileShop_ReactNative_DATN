import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Text,
  Pressable,
} from 'react-native';
import { Icon } from 'react-native-elements';
import { useSelector, useDispatch } from 'react-redux';
import { selectSearchText, setSearchText } from '../../store/slices/siteSlice';
import { mockProducts } from '../../data/mockData';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../../constants/theme';
import ThemeText from '../ThemeText';

const SearchBar = () => {
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [localSearchText, setLocalSearchText] = useState('');
  const searchQuery = useSelector(selectSearchText);
  const dispatch = useDispatch();
  const textInputRef = useRef(null);
  const blurTimeoutRef = useRef(null);

  // Sync local state với Redux state (chỉ khi không focused)
  useEffect(() => {
    if (!isFocused) {
      setLocalSearchText(searchQuery);
    }
  }, [searchQuery, isFocused]);

  // Tạo gợi ý sản phẩm dựa trên search query
  useEffect(() => {
    if (localSearchText.length > 0 && isFocused) {
      const filteredSuggestions = mockProducts
        .filter(product =>
          product.title.toLowerCase().includes(localSearchText.toLowerCase()) ||
          product.brand.toLowerCase().includes(localSearchText.toLowerCase()) ||
          product.category.toLowerCase().includes(localSearchText.toLowerCase())
        )
        .slice(0, 5); // Chỉ hiển thị 5 gợi ý đầu tiên
      setSuggestions(filteredSuggestions);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [localSearchText, isFocused]);

  // Cleanup timeout khi component unmount
  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  const handleSearchChange = (text) => {
    setLocalSearchText(text);
    // Không dispatch Redux ngay lập tức để tránh re-render
  };

  // Debounced Redux update (chỉ khi không focused)
  useEffect(() => {
    if (!isFocused) {
      const timeoutId = setTimeout(() => {
        if (localSearchText !== searchQuery) {
          dispatch(setSearchText(localSearchText));
        }
      }, 100); // 100ms debounce

      return () => clearTimeout(timeoutId);
    }
  }, [localSearchText, searchQuery, dispatch, isFocused]);

  const handleSuggestionPress = (product) => {
    const productTitle = product.title;
    setLocalSearchText(productTitle);
    dispatch(setSearchText(productTitle));
    setSuggestions([]);
    setShowSuggestions(false);
    setIsFocused(false);
    // Focus lại TextInput sau khi chọn suggestion
    setTimeout(() => {
      textInputRef.current?.focus();
    }, 100);
  };

  const clearSearch = () => {
    setLocalSearchText('');
    dispatch(setSearchText(''));
    setSuggestions([]);
    setShowSuggestions(false);
    // Focus lại TextInput sau khi xóa
    setTimeout(() => {
      textInputRef.current?.focus();
    }, 100);
  };

  const handleFocus = () => {
    // Clear any pending blur timeout
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setIsFocused(true);
    if (localSearchText.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    // Clear any existing timeout
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    // Delay để cho phép suggestion click
    blurTimeoutRef.current = setTimeout(() => {
      setIsFocused(false);
      setShowSuggestions(false);
    }, 200);
  };

  const handleSubmitEditing = () => {
    // Update Redux state khi user submit
    dispatch(setSearchText(localSearchText));
    setIsFocused(false);
    setShowSuggestions(false);
  };

  const renderSuggestion = (item) => (
    <Pressable
      key={item.id}
      style={{
        padding: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
        flexDirection: 'row',
        alignItems: 'center',
      }}
      onPress={() => handleSuggestionPress(item)}
    >
      <Icon
        type="ionicon"
        name="search"
        size={16}
        color="#6b7280"
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
          {item.title}
        </ThemeText>
        <ThemeText
          style={{
            color: '#6b7280',
            fontSize: TYPOGRAPHY.sizes.xs,
            marginTop: 2,
          }}
        >
          {item.brand} • ${item.price}
        </ThemeText>
      </View>
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
            color: '#1f2937', // Dark text for white background
          }}
          placeholder="Tìm kiếm sản phẩm..."
          placeholderTextColor="#6b7280"
          value={localSearchText}
          onChangeText={handleSearchChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={handleSubmitEditing}
          blurOnSubmit={false}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          selectTextOnFocus={false}
          caretHidden={false}
          keyboardType="default"
        />
        {localSearchText.length > 0 && (
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

      {/* Gợi ý sản phẩm */}
      {showSuggestions && suggestions.length > 0 && (
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
          <ScrollView
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
            {suggestions.map(renderSuggestion)}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

export default SearchBar;
