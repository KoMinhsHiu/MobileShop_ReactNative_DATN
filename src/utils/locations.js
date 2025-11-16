import {Platform} from 'react-native';

// Cache để lưu trữ dữ liệu đã fetch
let provincesCache = null;
let communesCache = {}; // Key: provinceCode, Value: communes array

/**
 * Lấy API base URL
 */
const getApiBaseUrl = () => {
  if (__DEV__) {
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:3000';
    } else {
      return 'http://localhost:3000';
    }
  } else {
    return 'https://your-production-api.com';
  }
};

/**
 * Lấy danh sách tỉnh/thành phố
 */
export const getProvinces = async () => {
  try {
    // Kiểm tra cache
    if (provincesCache) {
      return provincesCache;
    }

    const API_BASE_URL = getApiBaseUrl();
    const response = await fetch(`${API_BASE_URL}/api/v1/locations/provinces`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch provinces:', response.status);
      return [];
    }

    const result = await response.json();

    if (result.status === 200 && result.data && Array.isArray(result.data)) {
      // Cache dữ liệu
      provincesCache = result.data;
      return result.data;
    }

    return [];
  } catch (error) {
    console.error('Error fetching provinces:', error);
    return [];
  }
};

/**
 * Lấy danh sách phường/xã theo mã tỉnh/thành phố
 */
export const getCommunes = async (provinceCode) => {
  try {
    if (!provinceCode) {
      return [];
    }

    // Kiểm tra cache
    if (communesCache[provinceCode]) {
      return communesCache[provinceCode];
    }

    const API_BASE_URL = getApiBaseUrl();
    const response = await fetch(
      `${API_BASE_URL}/api/v1/locations/communes/${provinceCode}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      console.error('Failed to fetch communes:', response.status);
      return [];
    }

    const result = await response.json();

    if (result.status === 200 && result.data && Array.isArray(result.data)) {
      // Cache dữ liệu
      communesCache[provinceCode] = result.data;
      return result.data;
    }

    return [];
  } catch (error) {
    console.error('Error fetching communes:', error);
    return [];
  }
};

/**
 * Tìm tỉnh/thành phố theo ID
 */
export const findProvinceById = async (provinceId) => {
  try {
    const provinces = await getProvinces();
    return provinces.find((p) => p.id === provinceId) || null;
  } catch (error) {
    console.error('Error finding province by id:', error);
    return null;
  }
};

/**
 * Tìm phường/xã theo ID
 */
export const findCommuneById = async (communeId, provinceCode) => {
  try {
    if (!provinceCode) {
      return null;
    }

    const communes = await getCommunes(provinceCode);
    return communes.find((c) => c.id === communeId) || null;
  } catch (error) {
    console.error('Error finding commune by id:', error);
    return null;
  }
};

/**
 * Lấy tên tỉnh/thành phố và phường/xã từ order
 */
export const getLocationNames = async (order) => {
  try {
    let provinceName = null;
    let communeName = null;

    // Tìm province theo ID
    if (order.provinceId) {
      const province = await findProvinceById(order.provinceId);
      if (province) {
        provinceName = province.name;
        
        // Tìm commune theo ID và province code
        if (order.communeId && province.code) {
          const commune = await findCommuneById(order.communeId, province.code);
          if (commune) {
            communeName = commune.name;
          }
        }
      }
    }

    return {
      provinceName,
      communeName,
    };
  } catch (error) {
    console.error('Error getting location names:', error);
    return {
      provinceName: null,
      communeName: null,
    };
  }
};

/**
 * Xóa cache (dùng khi cần refresh dữ liệu)
 */
export const clearLocationCache = () => {
  provincesCache = null;
  communesCache = {};
};








