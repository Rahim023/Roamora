import axios from 'axios';

const TOKEN_KEY = 'roamora_access_token';
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

export const authToken = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

api.interceptors.request.use((config) => {
  const token = authToken.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function errorMessage(error, fallback = 'Something went wrong. Please try again.') {
  return error?.response?.data?.message || error?.response?.data?.error || error?.message || fallback;
}

export const endpoints = {
  health: () => api.get('/health'),
  siteContent: () => api.get('/site-content'),
  register: (body) => api.post('/auth/register', body),
  login: (body) => api.post('/auth/login', body),
  requestPasswordReset: (body) => api.post('/auth/password-reset/request', body),
  verifyPasswordReset: (body) => api.post('/auth/password-reset/verify', body),
  completePasswordReset: (body) => api.post('/auth/password-reset/complete', body),
  google: (body) => api.post('/auth/google', body),
  me: () => api.get('/auth/me'),
  packages: (params) => api.get('/packages', { params }),
  package: (id, config) => api.get(`/packages/${id}`, config),
  departures: (id) => api.get(`/packages/${id}/departures`),
  reviews: (id) => api.get(`/packages/${id}/reviews`),
  pendingReviews: () => api.get('/reviews/pending'),
  activities: (params) => api.get('/activities', { params }),
  wishlist: () => api.get('/wishlist'),
  addWishlist: (id) => api.post(`/wishlist/${id}`),
  removeWishlist: (id) => api.delete(`/wishlist/${id}`),
  orders: () => api.get('/orders/mine'),
  order: (id) => api.get(`/orders/${id}`),
  createOrder: (body) => api.post('/orders', body),
  cancelOrder: (id) => api.post(`/orders/${id}/cancel`),
  hideOrder: (id) => api.patch(`/orders/${id}/hide`),
  createReview: (body) => api.post('/reviews', body),
  updateReview: (id, body) => api.patch(`/reviews/${id}`, body),
  deleteReview: (id) => api.delete(`/reviews/${id}`),
  itineraries: () => api.get('/itineraries'),
  createItinerary: (body) => api.post('/itineraries', body),
  updateItinerary: (id, body) => api.patch(`/itineraries/${id}`, body),
  deleteItinerary: (id) => api.delete(`/itineraries/${id}`),
  planItinerary: (body) => api.post('/itineraries/plan', body),
  chat: (body, config) => api.post('/travo', body, config),
  analytics: (params) => api.get('/admin/analytics', { params }),
  adminPackages: () => api.get('/admin/packages'),
  adminDepartures: () => api.get('/admin/departures'),
  adminOrders: () => api.get('/admin/orders'),
  adminUsers: () => api.get('/admin/users'),
  adminReviews: () => api.get('/admin/reviews'),
  completeOrder: (id) => api.patch(`/admin/orders/${id}/complete`),
  retryConfirmationEmail: (id) => api.post(`/admin/orders/${id}/email/retry`),
  retryReviewEmail: (id) => api.post(`/admin/orders/${id}/review-email/retry`),
  promoteUser: (id) => api.patch(`/admin/users/${id}/promote`),
  updateAdminUser: (id, body) => api.patch(`/admin/users/${id}`, body),
  uploadPackageImage: (file) => {
    const body = new FormData();
    body.append('image', file);
    return api.post('/admin/uploads/package-image', body, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  createPackage: (body) => api.post('/admin/packages', body),
  updatePackage: (id, body) => api.patch(`/admin/packages/${id}`, body),
  deletePackage: (id) => api.delete(`/admin/packages/${id}`),
  createDeparture: (body) => api.post('/admin/departures', body),
  updateDeparture: (id, body) => api.patch(`/admin/departures/${id}`, body),
};
