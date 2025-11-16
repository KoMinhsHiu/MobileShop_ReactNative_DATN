// Dữ liệu giả cho ứng dụng shopping
export const mockProducts = [
  {
    id: 1,
    title: "iPhone 15 Pro Max",
    description: "iPhone 15 Pro Max với chip A17 Pro mạnh mẽ, camera 48MP và thiết kế titan cao cấp.",
    price: 1199,
    discountPercentage: 5.5,
    rating: 4.8,
    stock: 94,
    brand: "Apple",
    category: "smartphones",
    thumbnail: "https://i.ibb.co/4Y9j6XK/iphone15pro.jpg",
    images: [
      "https://i.ibb.co/4Y9j6XK/iphone15pro.jpg",
      "https://i.ibb.co/8X5Y9zL/iphone15pro2.jpg",
      "https://i.ibb.co/9qR8Y5K/iphone15pro3.jpg"
    ]
  },
  {
    id: 2,
    title: "Samsung Galaxy S24 Ultra",
    description: "Galaxy S24 Ultra với S Pen tích hợp, camera 200MP và hiệu năng AI tiên tiến.",
    price: 1299,
    discountPercentage: 8.2,
    rating: 4.7,
    stock: 87,
    brand: "Samsung",
    category: "smartphones",
    thumbnail: "https://i.ibb.co/7Qj8Y5K/galaxys24.jpg",
    images: [
      "https://i.ibb.co/7Qj8Y5K/galaxys24.jpg",
      "https://i.ibb.co/9qR8Y5K/galaxys242.jpg",
      "https://i.ibb.co/4Y9j6XK/galaxys243.jpg"
    ]
  },
  {
    id: 3,
    title: "MacBook Pro 16-inch M3",
    description: "MacBook Pro 16-inch với chip M3 Pro, màn hình Liquid Retina XDR và hiệu năng đồ họa vượt trội.",
    price: 2499,
    discountPercentage: 3.1,
    rating: 4.9,
    stock: 76,
    brand: "Apple",
    category: "laptops",
    thumbnail: "https://i.ibb.co/8X5Y9zL/macbookpro.jpg",
    images: [
      "https://i.ibb.co/8X5Y9zL/macbookpro.jpg",
      "https://i.ibb.co/9qR8Y5K/macbookpro2.jpg",
      "https://i.ibb.co/4Y9j6XK/macbookpro3.jpg"
    ]
  },
  {
    id: 4,
    title: "Sony WH-1000XM5",
    description: "Tai nghe chống ồn hàng đầu với âm thanh chất lượng cao và pin 30 giờ.",
    price: 399,
    discountPercentage: 12.5,
    rating: 4.6,
    stock: 156,
    brand: "Sony",
    category: "audio",
    thumbnail: "https://i.ibb.co/9qR8Y5K/sonywh1000xm5.jpg",
    images: [
      "https://i.ibb.co/9qR8Y5K/sonywh1000xm5.jpg",
      "https://i.ibb.co/4Y9j6XK/sonywh1000xm52.jpg",
      "https://i.ibb.co/7Qj8Y5K/sonywh1000xm53.jpg"
    ]
  },
  {
    id: 5,
    title: "Nike Air Max 270",
    description: "Giày thể thao Nike Air Max 270 với đế Air Max lớn nhất và thiết kế thời trang.",
    price: 150,
    discountPercentage: 15.0,
    rating: 4.4,
    stock: 203,
    brand: "Nike",
    category: "shoes",
    thumbnail: "https://i.ibb.co/4Y9j6XK/nikeairmax270.jpg",
    images: [
      "https://i.ibb.co/4Y9j6XK/nikeairmax270.jpg",
      "https://i.ibb.co/7Qj8Y5K/nikeairmax2702.jpg",
      "https://i.ibb.co/8X5Y9zL/nikeairmax2703.jpg"
    ]
  },
  {
    id: 6,
    title: "Samsung 55-inch QLED TV",
    description: "Smart TV Samsung 55-inch với công nghệ QLED, 4K UHD và Tizen OS.",
    price: 899,
    discountPercentage: 10.0,
    rating: 4.5,
    stock: 45,
    brand: "Samsung",
    category: "tv",
    thumbnail: "https://i.ibb.co/7Qj8Y5K/samsungtv.jpg",
    images: [
      "https://i.ibb.co/7Qj8Y5K/samsungtv.jpg",
      "https://i.ibb.co/9qR8Y5K/samsungtv2.jpg",
      "https://i.ibb.co/4Y9j6XK/samsungtv3.jpg"
    ]
  },
  {
    id: 7,
    title: "Adidas Ultraboost 22",
    description: "Giày chạy bộ Adidas Ultraboost 22 với công nghệ Boost và Primeknit+.",
    price: 180,
    discountPercentage: 8.3,
    rating: 4.3,
    stock: 178,
    brand: "Adidas",
    category: "shoes",
    thumbnail: "https://i.ibb.co/8X5Y9zL/adidasultraboost.jpg",
    images: [
      "https://i.ibb.co/8X5Y9zL/adidasultraboost.jpg",
      "https://i.ibb.co/4Y9j6XK/adidasultraboost2.jpg",
      "https://i.ibb.co/9qR8Y5K/adidasultraboost3.jpg"
    ]
  },
  {
    id: 8,
    title: "Apple Watch Series 9",
    description: "Apple Watch Series 9 với chip S9, màn hình Always-On và tính năng sức khỏe tiên tiến.",
    price: 399,
    discountPercentage: 5.0,
    rating: 4.7,
    stock: 123,
    brand: "Apple",
    category: "watches",
    thumbnail: "https://i.ibb.co/9qR8Y5K/applewatch9.jpg",
    images: [
      "https://i.ibb.co/9qR8Y5K/applewatch9.jpg",
      "https://i.ibb.co/7Qj8Y5K/applewatch92.jpg",
      "https://i.ibb.co/4Y9j6XK/applewatch93.jpg"
    ]
  }
];

// Dữ liệu giả cho giỏ hàng
export const mockBasketData = [
  {
    product: {
      ...mockProducts[0],
      amount: 2,
      price: mockProducts[0].price * 2
    }
  },
  {
    product: {
      ...mockProducts[2],
      amount: 1,
      price: mockProducts[2].price
    }
  },
  {
    product: {
      ...mockProducts[4],
      amount: 3,
      price: mockProducts[4].price * 3
    }
  }
];

// Dữ liệu giả cho danh sách yêu thích
export const mockLikedData = [
  mockProducts[1], // Samsung Galaxy S24 Ultra
  mockProducts[3], // Sony WH-1000XM5
  mockProducts[5], // Samsung 55-inch QLED TV
  mockProducts[7]  // Apple Watch Series 9
];

// Dữ liệu giả cho AsyncStorage
export const mockAsyncStorageData = {
  basket: [
    { id: 1, amount: 2 },
    { id: 3, amount: 1 },
    { id: 5, amount: 3 }
  ],
  liked: [
    { id: 2 },
    { id: 4 },
    { id: 6 },
    { id: 8 }
  ],
  orders: []
};

// Dữ liệu giả cho đơn hàng
export const mockOrdersData = [
  {
    id: 'ORD-001',
    orderId: 'ORD-001',
    date: '2024-01-15',
    total: 1698.00,
    status: 'đã giao',
    items: [
      { id: 1, title: 'iPhone 15 Pro Max', quantity: 1, price: 1199.00 },
      { id: 4, title: 'Sony WH-1000XM5', quantity: 1, price: 399.00 },
      { id: 5, title: 'Nike Air Max 270', quantity: 2, price: 100.00 }
    ]
  },
  {
    id: 'ORD-002',
    orderId: 'ORD-002',
    date: '2024-01-20',
    total: 2499.00,
    status: 'đang giao',
    items: [
      { id: 3, title: 'MacBook Pro 16-inch M3', quantity: 1, price: 2499.00 }
    ]
  },
  {
    id: 'ORD-003',
    orderId: 'ORD-003',
    date: '2024-01-22',
    total: 1299.00,
    status: 'chờ xác nhận',
    items: [
      { id: 2, title: 'Samsung Galaxy S24 Ultra', quantity: 1, price: 1299.00 }
    ]
  },
  {
    id: 'ORD-004',
    orderId: 'ORD-004',
    date: '2024-01-10',
    total: 899.00,
    status: 'đã hủy',
    items: [
      { id: 6, title: 'Samsung 55-inch QLED TV', quantity: 1, price: 899.00 }
    ]
  },
  {
    id: 'ORD-005',
    orderId: 'ORD-005',
    date: '2024-01-25',
    total: 747.00,
    status: 'đã giao',
    items: [
      { id: 7, title: 'Adidas Ultraboost 22', quantity: 2, price: 180.00 },
      { id: 8, title: 'Apple Watch Series 9', quantity: 1, price: 399.00 }
    ]
  }
];

