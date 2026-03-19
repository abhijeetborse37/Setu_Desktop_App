import axios from 'axios';

// Determine API URL based on environment
// const getAPIUrl = (): string => {
//   // For development: check if we're accessing from localhost or a network IP
//   const hostname = window.location.hostname;

//   if (hostname === 'localhost' || hostname === '127.0.0.1') {
//     // Direct localhost access
//     return 'http://localhost:5039/api';
//   } else {
//     // Network access from mobile or other device - replace localhost with the actual hostname
//     return `http://${hostname}:5039/api`;
//   }
// };

const getAPIUrl = (): string => {
  const hostname = window.location.hostname;

  // Local development
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:5039/api";
  }

  // Production (Render backend)
  return "https://setubusiness-production.up.railway.app/api";
};

const API_URL = getAPIUrl();

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 120000, // 120s timeout to better handle Railway cold starts & sleep.
});

// Retry interceptor for handling cold-start failures
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    // Only retry on network errors or 5xx server errors (cold start issues)
    if (!config || config._retryCount >= 3) {
      return Promise.reject(error);
    }

    // On timeout (ECONNABORTED) or if there's no response, consider it a network error
    const isNetworkError = !error.response || error.code === 'ECONNABORTED';
    const isServerError = error.response && error.response.status >= 500;

    if (isNetworkError || isServerError) {
      config._retryCount = (config._retryCount || 0) + 1;
      console.log(`Retrying request (${config._retryCount}/3): ${config.url}`);

      // Wait 2 seconds before retrying
      await new Promise(resolve => setTimeout(resolve, 2000));
      return api(config);
    }

    return Promise.reject(error);
  }
);

api.interceptors.request.use((config) => {
  const userString = localStorage.getItem('setu_user');
  if (userString) {
    const { token } = JSON.parse(userString);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export const authService = {
  login: (credentials: any) => api.post('/auth/login', credentials),
  createUser: (data: any) => api.post('/auth/create-user', data),
  requestOtp: (data: any) => api.post('/auth/request-otp', data),
  updateProfile: (data: any) => api.post('/auth/update-profile', data),
  setUserTabs: (userId: string, allowedTabsPattern: string) =>
    api.put(`/auth/users/${userId}/tabs`, { allowedTabsPattern }),
};

export const dashboardService = {
  // NEW: Unified endpoint for all initial data needed after login
  getInitData: () => api.get('/dashboard/init'),
};

export const companyService = {
  getAll: () => api.get('/companies'),
  create: (data: any) => api.post('/companies', data),
  update: (id: string, data: any) => api.put(`/companies/${id}`, data),
  delete: (id: string) => api.delete(`/companies/${id}`),
};

export const customerService = {
  getAll: () => api.get('/customers'),
  create: (data: any) => api.post('/customers', data),
  update: (id: string, data: any) => api.put(`/customers/${id}`, data),
  delete: (id: string) => api.delete(`/customers/${id}`),
};

export const productService = {
  getByCompany: (companyId: string) => api.get(`/products/${companyId}`),
  create: (data: any) => api.post('/products', data),
  update: (id: string, data: any) => api.put(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
};

export const transactionService = {
  getByCompany: (companyId: string) => api.get(`/transactions/${companyId}`),
  create: (data: any) => api.post('/transactions', data),
  update: (id: string, data: any) => api.put(`/transactions/${id}`, data),
  delete: (id: string) => api.delete(`/transactions/${id}`),
};

export const subscriptionService = {
  getPlans: () => api.get('/subscription/plans'),
  getStatus: () => api.get('/subscription/status'),
  requestSubscription: (planId: string) => api.post('/subscription/request', { planId }),
};

export const adminService = {
  getStats: () => api.get('/admin/stats'),
  getUsers: () => api.get('/admin/users'),
  getPendingSubscriptions: () => api.get('/admin/subscriptions/pending'),
  approveSubscription: (id: string) => api.post(`/admin/subscriptions/${id}/approve`),
  rejectSubscription: (id: string) => api.post(`/admin/subscriptions/${id}/reject`),
  createSubscription: (data: any) => api.post('/admin/subscriptions/create', data),
  registerCompanyForUser: (data: any) => api.post('/admin/companies/register', data),
  getPlans: () => api.get('/admin/plans'),
  createPlan: (plan: any) => api.post('/admin/plans', plan),
  updatePlan: (id: string, plan: any) => api.put(`/admin/plans/${id}`, plan),
  deletePlan: (id: string) => api.delete(`/admin/plans/${id}`),
  toggleUserStatus: (userId: string) => api.post(`/admin/users/${userId}/toggle-status`),
  resetUserPassword: (userId: string, newPassword: string) => api.post(`/admin/users/${userId}/reset-password`, { newPassword }),
};

export default api;
