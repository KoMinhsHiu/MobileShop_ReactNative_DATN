import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from 'react-native';
import { Icon } from 'react-native-elements';
import { useSelector, useDispatch } from 'react-redux';
import { selectSearchText, setSearchText } from '../../store/slices/siteSlice';
import { mockProducts } from '../../data/mockData';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../../constants/theme';
import ThemeText from '../ThemeText';

const SimpleSearchBar = () => {
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [localText, setLocalText] = useState('');
  const searchQuery = useSelector(selectSearchText);
  const dispatch = useDispatch();
  const textInputRef = useRef(null);

  // Sync với Redux state khi component mount
  useEffect(() => {
    setLocalText(searchQuery);
  }, []);

  // Tạo suggestions
  useEffect(() => {
    if (localText.length > 0 && isFocused) {
      const filteredSuggestions = mockProducts
        .filter(product =>
          product.title.toLowerCase().includes(localText.toLowerCase()) ||
          product.brand.toLowerCase().includes(localText.toLowerCase()) ||
          product.category.toLowerCase().includes(localText.toLowerCase())
        )
        .slice(0, 5);
      setSuggestions(filteredSuggestions);
    } else {
      setSuggestions([]);
    }
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

  const handleSuggestionPress = (product) => {
    setLocalText(product.title);
    dispatch(setSearchText(product.title));
    setIsFocused(false);
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

      {/* Gợi ý sản phẩm */}
      {isFocused && suggestions.length > 0 && (
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

export default SimpleSearchBar;
