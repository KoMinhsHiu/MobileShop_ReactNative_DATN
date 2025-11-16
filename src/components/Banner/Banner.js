import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Image,
  Dimensions,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Icon } from 'react-native-elements';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import ThemeText from '../ThemeText';

const { width: screenWidth } = Dimensions.get('window');

const Banner = () => {
  const [currentIndex, setCurrentIndex] = useState(0); // Bắt đầu từ index 0
  const flatListRef = useRef(null);
  const [isScrolling, setIsScrolling] = useState(false);

  // Dữ liệu banner/khuyến mãi gốc
  const originalBannerData = [
    {
      id: 1,
      title: "Giảm giá 50%",
      subtitle: "Tất cả sản phẩm Apple",
      description: "Cơ hội duy nhất trong năm!",
      image: "https://i.ibb.co/4Y9j6XK/iphone15pro.jpg",
      backgroundColor: "#FF6B6B",
    },
    {
      id: 2,
      title: "Flash Sale",
      subtitle: "Samsung Galaxy S24",
      description: "Chỉ còn 24 giờ!",
      image: "https://i.ibb.co/7Qj8Y5K/galaxys24.jpg",
      backgroundColor: "#4ECDC4",
    },
    {
      id: 3,
      title: "Mua 2 Tặng 1",
      subtitle: "Tai nghe Sony",
      description: "Ưu đãi đặc biệt",
      image: "https://i.ibb.co/9qR8Y5K/sonywh1000xm5.jpg",
      backgroundColor: "#45B7D1",
    },
  ];

  // Sử dụng dữ liệu banner gốc (không infinite scroll)
  const bannerData = originalBannerData;

  // Auto scroll banner (không infinite)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isScrolling) {
        setCurrentIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % bannerData.length; // Quay về 0 khi hết
          try {
            flatListRef.current?.scrollToIndex({
              index: nextIndex,
              animated: true,
            });
            return nextIndex;
          } catch (error) {
            console.log('ScrollToIndex error:', error);
            return prevIndex; // Giữ nguyên index hiện tại
          }
        });
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isScrolling, bannerData.length]);

  const handleScroll = (event) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / screenWidth);
    setCurrentIndex(index);
  };

  const handleScrollBeginDrag = () => {
    setIsScrolling(true);
  };

  const handleScrollEndDrag = (event) => {
    setIsScrolling(false);
    
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / screenWidth);
    
    // Chỉ cập nhật index nếu hợp lệ
    if (index >= 0 && index < bannerData.length) {
      setCurrentIndex(index);
    }
  };

  const handleMomentumScrollEnd = (event) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / screenWidth);
    
    // Chỉ cập nhật currentIndex nếu index hợp lệ
    if (index >= 0 && index < bannerData.length) {
      setCurrentIndex(index);
    }
  };

  const renderBannerItem = ({ item }) => (
    <View
      style={[
        styles.bannerItem,
        { backgroundColor: item.backgroundColor }
      ]}
    >
      <View style={styles.bannerContent}>
        <View style={styles.textContent}>
          <ThemeText
            weight={700}
            style={styles.bannerTitle}
          >
            {item.title}
          </ThemeText>
          <ThemeText
            weight={600}
            style={styles.bannerSubtitle}
          >
            {item.subtitle}
          </ThemeText>
          <ThemeText
            style={styles.bannerDescription}
          >
            {item.description}
          </ThemeText>
          <TouchableOpacity
            style={styles.bannerButton}
            onPress={() => {
              // Navigate to product details or category
              console.log('Banner clicked:', item.id);
            }}
          >
            <ThemeText
              weight={600}
              style={styles.bannerButtonText}
            >
              Xem ngay
            </ThemeText>
            <Icon
              type="ionicon"
              name="arrow-forward"
              size={16}
              color="#000000"
              style={{ marginLeft: SPACING.xs }}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: item.image }}
            style={styles.bannerImage}
            resizeMode="contain"
          />
        </View>
      </View>
    </View>
  );


  const renderDots = () => (
    <View style={styles.dotsContainer}>
      {bannerData.map((_, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.dot,
            {
              backgroundColor: currentIndex === index ? '#ffffff' : 'rgba(255,255,255,0.5)',
            }
          ]}
          onPress={() => {
            if (index >= 0 && index < bannerData.length) {
              flatListRef.current?.scrollToIndex({
                index: index,
                animated: true,
              });
              setCurrentIndex(index);
            }
          }}
        />
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={bannerData}
        renderItem={renderBannerItem}
        keyExtractor={(item, index) => `${item.id}-${index}`} // Unique key cho mỗi item
        horizontal
        pagingEnabled
        snapToInterval={screenWidth} // Đảm bảo snap đúng vị trí
        snapToAlignment="start" // Snap từ đầu mỗi item
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
        style={styles.scrollView}
        getItemLayout={(data, index) => ({
          length: screenWidth, // Full screen width cho paging
          offset: screenWidth * index,
          index,
        })}
        initialScrollIndex={0} // Bắt đầu từ banner đầu tiên
        removeClippedSubviews={false} // Tránh re-render các banner
        windowSize={5} // Giữ 5 banner trong memory
      />
      {renderDots()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.md,
  },
  scrollView: {
    height: 180,
  },
  bannerItem: {
    width: screenWidth - (SPACING.md * 2),
    height: 160,
    marginHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
  },
  bannerContent: {
    flex: 1,
    flexDirection: 'row',
    padding: SPACING.lg,
    alignItems: 'center',
  },
  textContent: {
    flex: 1,
    paddingRight: SPACING.md,
  },
  bannerTitle: {
    fontSize: 24,
    marginBottom: SPACING.xs,
    color: '#000000', // Màu đen để dễ nhìn
  },
  bannerSubtitle: {
    fontSize: 16,
    marginBottom: SPACING.sm,
    color: '#000000', // Màu đen để dễ nhìn
  },
  bannerDescription: {
    fontSize: 14,
    marginBottom: SPACING.md,
    color: '#000000', // Màu đen để dễ nhìn
  },
  bannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    alignSelf: 'flex-start',
  },
  bannerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000', // Màu đen để dễ nhìn trên nền trắng của nút
  },
  imageContainer: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerImage: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.lg,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
});

export default Banner;
