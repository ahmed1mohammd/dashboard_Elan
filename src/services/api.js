import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Authorization Bearer token from localStorage
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('m20_admin_token') || localStorage.getItem('elan_admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for automatic logout on 401 Unauthorized
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token expired or invalid
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('m20_admin_token');
        localStorage.removeItem('m20_admin_user');
        localStorage.removeItem('elan_admin_token');
        localStorage.removeItem('elan_admin_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const loginAdmin = async (credentials) => {
  const payload = typeof credentials === 'string' ? { identifier: credentials } : credentials;
  const res = await API.post('/auth/login', payload);
  return res.data;
};

export const getMe = async () => {
  const res = await API.get('/users/me');
  return res.data;
};

// ==================== PRODUCTS ====================
export const getProducts = async (params = {}) => {
  const res = await API.get('/products', { params });
  return res.data?.data?.products || res.data?.data || [];
};

export const getProductById = async (id) => {
  const res = await API.get(`/products/${id}`);
  return res.data?.data || null;
};

export const getLowStockProducts = async () => {
  const res = await API.get('/products/admin/low-stock');
  return res.data?.data || [];
};

export const createProduct = async (productData) => {
  const res = await API.post('/products', productData);
  return res.data?.data || res.data;
};

export const updateProduct = async (id, productData) => {
  const res = await API.patch(`/products/${id}`, productData);
  return res.data?.data || res.data;
};

export const deleteProduct = async (id) => {
  const res = await API.delete(`/products/${id}`);
  return res.data;
};

// ==================== ORDERS ====================
export const getOrders = async (params = {}) => {
  const res = await API.get('/orders', { params });
  return res.data?.data?.orders || res.data?.data || [];
};

export const getOrderById = async (id) => {
  const res = await API.get(`/orders/${id}`);
  return res.data?.data || null;
};

export const updateOrderStatus = async (id, statusOrPayload) => {
  const payload = typeof statusOrPayload === 'string' 
    ? { orderStatus: statusOrPayload } 
    : statusOrPayload;
  const res = await API.patch(`/orders/${id}/status`, payload);
  return res.data?.data || res.data;
};

export const confirmReturnRestock = async (id, data = {}) => {
  const res = await API.post(`/orders/${id}/confirm-return-restock`, data);
  return res.data?.data || res.data;
};

export const processReturnRefund = async (id, data = {}) => {
  const res = await API.post(`/orders/${id}/process-return-refund`, data);
  return res.data?.data || res.data;
};

export const createAdminOrder = async (orderData) => {
  const res = await API.post('/orders/admin/create', orderData);
  return res.data?.data || res.data;
};

export const verifyOrderPayment = async (id, data = {}) => {
  const res = await API.put(`/orders/${id}/verify-payment`, data);
  return res.data?.data || res.data;
};

// ==================== COUPONS ====================
export const getCoupons = async () => {
  const res = await API.get('/coupons');
  return res.data?.data?.coupons || res.data?.data || [];
};

export const createCoupon = async (couponData) => {
  const res = await API.post('/coupons', couponData);
  return res.data?.data || res.data;
};

export const updateCoupon = async (id, couponData) => {
  const res = await API.put(`/coupons/${id}`, couponData);
  return res.data?.data || res.data;
};

export const toggleCouponActive = async (id) => {
  const res = await API.patch(`/coupons/${id}/toggle`);
  return res.data?.data || res.data;
};

export const deleteCoupon = async (id) => {
  const res = await API.delete(`/coupons/${id}`);
  return res.data;
};

// ==================== USERS ====================
export const getUsers = async (params = {}) => {
  const res = await API.get('/users', { params });
  return res.data?.data?.users || res.data?.data || [];
};

export const createUser = async (userData) => {
  const res = await API.post('/users', userData);
  return res.data?.data || res.data;
};

export const updateUser = async (id, userData) => {
  const res = await API.patch(`/users/${id}`, userData);
  return res.data?.data || res.data;
};

export const deleteUser = async (id) => {
  const res = await API.delete(`/users/${id}`);
  return res.data?.data || res.data;
};

// ==================== HOMEPAGE / CMS ====================
export const getHomepageCMS = async () => {
  const res = await API.get('/home');
  return res.data?.data || null;
};

// ==================== CLOUDINARY UPLOAD ====================
export const uploadImageToCloudinary = async (file, folder = 'm20/products') => {
  const formData = new FormData();
  formData.append('image', file);
  if (folder) {
    formData.append('folder', folder);
  }
  const res = await API.post('/cloudinary/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data?.data || res.data;
};

export const uploadMultipleImagesToCloudinary = async (files, folder = 'm20/products') => {
  const formData = new FormData();
  Array.from(files).forEach((file) => {
    formData.append('images', file);
  });
  if (folder) {
    formData.append('folder', folder);
  }
  const res = await API.post('/cloudinary/upload-multiple', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data?.data || res.data;
};

export const deleteImageFromCloudinary = async (publicId) => {
  if (!publicId) return null;
  const res = await API.delete('/cloudinary/delete', { data: { publicId } });
  return res.data?.data || res.data;
};

// ==================== RAW MATERIALS / INVENTORY ====================
export const getRawMaterials = async (params = {}) => {
  const res = await API.get('/inventory/raw-materials', { params });
  return res.data?.data?.materials || res.data?.data || [];
};

export const getRawMaterialById = async (id) => {
  const res = await API.get(`/inventory/raw-materials/${id}`);
  return res.data?.data || null;
};

export const createRawMaterial = async (data) => {
  const res = await API.post('/inventory/raw-materials', data);
  return res.data?.data || res.data;
};

export const updateRawMaterial = async (id, data) => {
  const res = await API.patch(`/inventory/raw-materials/${id}`, data);
  return res.data?.data || res.data;
};

export const deleteRawMaterial = async (id) => {
  const res = await API.delete(`/inventory/raw-materials/${id}`);
  return res.data;
};

export const adjustRawMaterialStock = async (id, data) => {
  const res = await API.post(`/inventory/raw-materials/${id}/adjust`, data);
  return res.data?.data || res.data;
};

export const getLowStockAlerts = async () => {
  const res = await API.get('/inventory/low-stock');
  return res.data?.data || [];
};

export const getStockMovements = async (params = {}) => {
  const res = await API.get('/inventory/movements', { params });
  return res.data?.data?.movements || res.data?.data || [];
};

// ==================== FORMULAS ====================
export const getFormulas = async (params = {}) => {
  const res = await API.get('/formulas', { params });
  return res.data?.data?.formulas || res.data?.data || [];
};

export const getFormulaById = async (id) => {
  const res = await API.get(`/formulas/${id}`);
  return res.data?.data || null;
};

export const createFormula = async (data) => {
  const res = await API.post('/formulas', data);
  return res.data?.data || res.data;
};

export const updateFormula = async (id, data) => {
  const res = await API.patch(`/formulas/${id}`, data);
  return res.data?.data || res.data;
};

export const createFormulaVersion = async (id, data) => {
  const res = await API.post(`/formulas/${id}/new-version`, data);
  return res.data?.data || res.data;
};

export const deleteFormula = async (id) => {
  const res = await API.delete(`/formulas/${id}`);
  return res.data;
};

export const previewBatchCalculation = async (data) => {
  const res = await API.post('/formulas/preview', data);
  return res.data?.data || null;
};

// ==================== BATCHES ====================
export const getBatches = async (params = {}) => {
  const res = await API.get('/batches', { params });
  return res.data?.data?.batches || res.data?.data || [];
};

export const getBatchById = async (id) => {
  const res = await API.get(`/batches/${id}`);
  return res.data?.data || null;
};

export const createBatch = async (data) => {
  const res = await API.post('/batches', data);
  return res.data?.data || res.data;
};

export const confirmBatch = async (id) => {
  const res = await API.post(`/batches/${id}/confirm`);
  return res.data?.data || res.data;
};

export const bottlingBatch = async (id, data) => {
  const res = await API.post(`/batches/${id}/bottling`, data);
  return res.data?.data || res.data;
};

export const getFinishedLiquidInventory = async () => {
  const res = await API.get('/inventory/finished-liquid');
  return res.data?.data || [];
};

export const cancelBatch = async (id, reason) => {
  const res = await API.post(`/batches/${id}/cancel`, { reason });
  return res.data?.data || res.data;
};

// ==================== PURCHASES ====================
export const getPurchases = async (params = {}) => {
  const res = await API.get('/purchases', { params });
  return res.data?.data?.purchases || res.data?.data || [];
};

export const createPurchase = async (data) => {
  const res = await API.post('/purchases', data);
  return res.data?.data || res.data;
};

export const updatePurchase = async (id, data) => {
  const res = await API.put(`/purchases/${id}`, data);
  return res.data?.data || res.data;
};

export const deletePurchase = async (id) => {
  const res = await API.delete(`/purchases/${id}`);
  return res.data;
};

// ==================== EXPENSES ====================
export const getExpenses = async (params = {}) => {
  const res = await API.get('/expenses', { params });
  return res.data?.data?.expenses || res.data?.data || [];
};

export const getExpensesSummary = async (params = {}) => {
  const res = await API.get('/expenses/summary', { params });
  return res.data?.data || {};
};

export const createExpense = async (data) => {
  const res = await API.post('/expenses', data);
  return res.data?.data || res.data;
};

export const deleteExpense = async (id) => {
  const res = await API.delete(`/expenses/${id}`);
  return res.data;
};

// ==================== FINANCE & TREASURY ====================
export const getFinanceOverview = async (params = {}) => {
  const res = await API.get('/finance/overview', { params });
  return res.data?.data || {};
};

export const getCostSettings = async () => {
  const res = await API.get('/finance/costs');
  return res.data?.data || {};
};

export const updateCostSettings = async (data) => {
  const res = await API.put('/finance/costs', data);
  return res.data?.data || res.data;
};

export const getProfitAndLoss = async (params = {}) => {
  const res = await API.get('/finance/pl', { params });
  return res.data?.data || {};
};

export const getInventoryValuation = async () => {
  const res = await API.get('/finance/inventory-valuation');
  return res.data?.data || {};
};

export const getCashAccounts = async () => {
  const res = await API.get('/finance/cash-accounts');
  return res.data?.data || [];
};

export const createCashAccount = async (data) => {
  const res = await API.post('/finance/cash-accounts', data);
  return res.data?.data || res.data;
};

export const adjustCashAccount = async (id, data) => {
  const res = await API.post(`/finance/cash-accounts/${id}/adjust`, data);
  return res.data?.data || res.data;
};

export const getSalesByFragranceReport = async (params = {}) => {
  const res = await API.get('/finance/reports/sales-by-fragrance', { params });
  return res.data?.data || [];
};

export const getBatchHistoryReport = async (params = {}) => {
  const res = await API.get('/finance/reports/batch-history', { params });
  return res.data?.data || [];
};

// ==================== SETTINGS & CMS ====================
export const getAdminSettings = async () => {
  const res = await API.get('/settings');
  return res.data?.data || null;
};

export const updateSettings = async (settingsData) => {
  const res = await API.put('/settings', settingsData);
  return res.data?.data || res.data;
};

// ==================== OFFERS ====================
export const getOffers = async (params = {}) => {
  const res = await API.get('/offers', { params });
  return res.data?.data || [];
};

export const getOfferById = async (id) => {
  const res = await API.get(`/offers/${id}`);
  return res.data?.data || null;
};

export const createOffer = async (data) => {
  const res = await API.post('/offers', data);
  return res.data?.data || res.data;
};

export const updateOffer = async (id, data) => {
  const res = await API.patch(`/offers/${id}`, data);
  return res.data?.data || res.data;
};

export const toggleOfferActive = async (id) => {
  const res = await API.patch(`/offers/${id}/toggle-active`);
  return res.data?.data || res.data;
};

export const deleteOffer = async (id) => {
  const res = await API.delete(`/offers/${id}`);
  return res.data?.data || res.data;
};

export const getMarketingAnalytics = async (params = {}) => {
  const res = await API.get('/orders/marketing-analytics', { params });
  return res.data?.data || res.data;
};

export default API;


