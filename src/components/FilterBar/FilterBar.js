import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Text,
  Alert,
} from 'react-native';
import { Icon } from 'react-native-elements';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../../constants/theme';
import ThemeText from '../ThemeText';

const FilterBar = ({ onFilterChange, selectedFilters = { price: 'all', category: 'all', promotion: 'all' } }) => {
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showPromotionModal, setShowPromotionModal] = useState(false);

  // Debug: Log props (có thể xóa sau khi test xong)
  // console.log('FilterBar component rendered!');
  // console.log('FilterBar props:', { onFilterChange, selectedFilters });

  // Các tùy chọn bộ lọc
  const priceRanges = [
    { id: 'all', label: 'Tất cả', min: 0, max: Infinity },
    { id: 'under-50', label: 'Dưới $50', min: 0, max: 50 },
    { id: '50-100', label: '$50 - $100', min: 50, max: 100 },
    { id: '100-200', label: '$100 - $200', min: 100, max: 200 },
    { id: '200-500', label: '$200 - $500', min: 200, max: 500 },
    { id: 'over-500', label: 'Trên $500', min: 500, max: Infinity },
  ];

  const productCategories = [
    { id: 'all', label: 'Tất cả' },
    { id: 'Electronics', label: 'Điện tử' },
    { id: 'Clothing', label: 'Thời trang' },
    { id: 'Sports', label: 'Thể thao' },
    { id: 'Home', label: 'Gia dụng' },
    { id: 'Books', label: 'Sách' },
  ];

  const promotionTypes = [
    { id: 'all', label: 'Tất cả' },
    { id: 'discount', label: 'Có giảm giá' },
    { id: 'new', label: 'Sản phẩm mới' },
    { id: 'bestseller', label: 'Bán chạy' },
    { id: 'free-shipping', label: 'Miễn phí ship' },
  ];

  const handleFilterSelect = (filterType, filterValue) => {
    if (onFilterChange) {
      onFilterChange(filterType, filterValue);
    }
  };

  const getFilterLabel = (filterType) => {
    switch (filterType) {
      case 'price':
        const priceFilter = priceRanges.find(p => p.id === selectedFilters.price);
        return priceFilter ? priceFilter.label : 'Giá';
      case 'category':
        const categoryFilter = productCategories.find(c => c.id === selectedFilters.category);
        return categoryFilter ? categoryFilter.label : 'Danh mục';
      case 'promotion':
        const promotionFilter = promotionTypes.find(p => p.id === selectedFilters.promotion);
        return promotionFilter ? promotionFilter.label : 'Khuyến mãi';
      default:
        return '';
    }
  };

  const renderFilterModal = (title, options, filterType, isVisible, onClose) => {
    if (!isVisible) return null;
    
    return (
      <TouchableOpacity
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          justifyContent: 'flex-end',
        }}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          style={{
            backgroundColor: 'white',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: '70%',
            minHeight: 200,
          }}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 20,
            borderBottomWidth: 1,
            borderBottomColor: '#e5e7eb',
          }}>
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: '#000000',
            }}>
              {title}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{
                fontSize: 24,
                color: '#000000',
              }}>
                ×
              </Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={{ maxHeight: 400 }}>
            {options.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 20,
                  borderBottomWidth: 1,
                  borderBottomColor: '#f3f4f6',
                  backgroundColor: selectedFilters[filterType] === option.id ? '#fef3c7' : 'white',
                }}
                onPress={() => {
                  handleFilterSelect(filterType, option.id);
                  onClose();
                }}
              >
                <Text style={{
                  fontSize: 16,
                  color: '#000000',
                  fontWeight: selectedFilters[filterType] === option.id ? '600' : 'normal',
                }}>
                  {option.label}
                </Text>
                {selectedFilters[filterType] === option.id && (
                  <Text style={{ fontSize: 20, color: '#000000' }}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >

        {/* Bộ lọc giá */}
        <TouchableOpacity
          style={[
            styles.filterButton,
            selectedFilters.price !== 'all' && styles.activeFilter
          ]}
          onPress={() => setShowPriceModal(true)}
        >
          <Icon
            type="ionicon"
            name="pricetag"
            size={16}
            color={selectedFilters.price !== 'all' ? '#000000' : '#666666'}
          />
          <ThemeText
            style={[
              styles.filterButtonText,
              selectedFilters.price !== 'all' && styles.activeFilterText
            ]}
          >
            {getFilterLabel('price')}
          </ThemeText>
        </TouchableOpacity>

        {/* Bộ lọc danh mục */}
        <TouchableOpacity
          style={[
            styles.filterButton,
            selectedFilters.category !== 'all' && styles.activeFilter
          ]}
          onPress={() => setShowCategoryModal(true)}
        >
          <Icon
            type="ionicon"
            name="grid"
            size={16}
            color={selectedFilters.category !== 'all' ? '#000000' : '#666666'}
          />
          <ThemeText
            style={[
              styles.filterButtonText,
              selectedFilters.category !== 'all' && styles.activeFilterText
            ]}
          >
            {getFilterLabel('category')}
          </ThemeText>
        </TouchableOpacity>

        {/* Bộ lọc khuyến mãi */}
        <TouchableOpacity
          style={[
            styles.filterButton,
            selectedFilters.promotion !== 'all' && styles.activeFilter
          ]}
          onPress={() => setShowPromotionModal(true)}
        >
          <Icon
            type="ionicon"
            name="gift"
            size={16}
            color={selectedFilters.promotion !== 'all' ? '#000000' : '#666666'}
          />
          <ThemeText
            style={[
              styles.filterButtonText,
              selectedFilters.promotion !== 'all' && styles.activeFilterText
            ]}
          >
            {getFilterLabel('promotion')}
          </ThemeText>
        </TouchableOpacity>

        {/* Nút xóa bộ lọc */}
        {(selectedFilters.price !== 'all' || 
          selectedFilters.category !== 'all' || 
          selectedFilters.promotion !== 'all') && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => handleFilterSelect('clear', null)}
          >
            <Icon
              type="ionicon"
              name="close-circle"
              size={16}
              color="#dc2626"
            />
            <ThemeText style={styles.clearButtonText}>
              Xóa bộ lọc
            </ThemeText>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Modals */}
      {renderFilterModal(
        'Lọc theo giá',
        priceRanges,
        'price',
        showPriceModal,
        () => setShowPriceModal(false)
      )}

      {renderFilterModal(
        'Lọc theo danh mục',
        productCategories,
        'category',
        showCategoryModal,
        () => setShowCategoryModal(false)
      )}

      {renderFilterModal(
        'Lọc theo khuyến mãi',
        promotionTypes,
        'promotion',
        showPromotionModal,
        () => setShowPromotionModal(false)
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    minHeight: 80, // Đảm bảo có chiều cao tối thiểu
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeFilter: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
  },
  filterButtonText: {
    marginLeft: SPACING.xs,
    fontSize: TYPOGRAPHY.sizes.sm,
    color: '#666666',
  },
  activeFilterText: {
    color: '#000000',
    fontWeight: '600',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  clearButtonText: {
    marginLeft: SPACING.xs,
    fontSize: TYPOGRAPHY.sizes.sm,
    color: '#dc2626',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    color: '#000000',
  },
  modalOptions: {
    maxHeight: 400,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  selectedOption: {
    backgroundColor: '#fef3c7',
  },
  optionText: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: '#000000',
  },
  selectedOptionText: {
    fontWeight: '600',
    color: '#000000',
  },
});

export default FilterBar;