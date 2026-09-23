import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  authenticateTelegram: (initData: string) =>
    api.post('/auth/telegram', { initData }),
};

export const userApi = {
  getProfile: () => api.get('/users/me'),
  getUserById: (id: string) => api.get(`/users/${id}`),
};

export const walletApi = {
  getWallet: () => api.get('/wallet'),
  getTransactions: () => api.get('/wallet/transactions'),
  deposit: (amount: string, description?: string) =>
    api.post('/wallet/deposit', { amount, description }),
  withdraw: (amount: string, description?: string) =>
    api.post('/wallet/withdraw', { amount, description }),
};

export const taskApi = {
  getTasks: (params?: {
    category?: string;
    minPrice?: string;
    maxPrice?: string;
  }) => api.get('/tasks', { params }),
  getMyTasks: () => api.get('/tasks/my'),
  getTask: (id: string) => api.get(`/tasks/${id}`),
  createTask: (data: any) => api.post('/tasks', data),
  publishTask: (id: string) => api.post(`/tasks/${id}/publish`),
  assignTask: (id: string) => api.post(`/tasks/${id}/assign`),
  startTask: (id: string) => api.post(`/tasks/${id}/start`),
  submitTask: (id: string) => api.post(`/tasks/${id}/submit`),
  completeTask: (id: string) => api.post(`/tasks/${id}/complete`),
  cancelTask: (id: string) => api.post(`/tasks/${id}/cancel`),
};

export const disputeApi = {
  createDispute: (taskId: string, reason: string, evidence?: string[]) =>
    api.post('/disputes', { taskId, reason, evidence }),
  addEvidence: (id: string, evidence: string[]) =>
    api.post(`/disputes/${id}/evidence`, { evidence }),
  getDispute: (id: string) => api.get(`/disputes/${id}`),
  createReview: (
    taskId: string,
    reviewedId: string,
    rating: number,
    comment?: string,
  ) =>
    api.post('/disputes/reviews', { taskId, reviewedId, rating, comment }),
  getTaskReviews: (taskId: string) =>
    api.get(`/disputes/reviews/task/${taskId}`),
  getUserReviews: (userId: string) =>
    api.get(`/disputes/reviews/user/${userId}`),
};

export default api;
