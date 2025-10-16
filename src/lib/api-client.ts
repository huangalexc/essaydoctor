import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import { getSession } from 'next-auth/react';

/**
 * API Response wrapper
 */
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
}

/**
 * Create axios instance with default config
 */
const createAxiosInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
    timeout: 120000, // 120 seconds (2 minutes) - AI requests can take longer
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor - add auth token
  instance.interceptors.request.use(
    async (config) => {
      const session = await getSession();
      if (session?.user) {
        config.headers.Authorization = `Bearer ${session.user.id}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor - handle errors
  instance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      const status = error.response?.status || 500;
      const message = (error.response?.data as any)?.error || error.message;

      console.error(`API Error [${status}]:`, message);

      // Handle specific error cases
      if (status === 401) {
        // Unauthorized - redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login';
        }
      }

      return Promise.reject({
        status,
        message,
        data: error.response?.data,
      });
    }
  );

  return instance;
};

const apiClient = createAxiosInstance();

/**
 * Base API class
 */
class BaseAPI {
  protected async request<T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await apiClient.request<T>(config);
      return {
        data: response.data,
        status: response.status,
      };
    } catch (error: any) {
      return {
        error: error.message || 'An error occurred',
        status: error.status || 500,
      };
    }
  }

  protected async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  protected async post<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  protected async put<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  protected async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }
}

/**
 * Auth API
 */
export class AuthAPI extends BaseAPI {
  async register(email: string, password: string) {
    return this.post('/auth/register', { email, password });
  }

  async verifyEmail(token: string) {
    return this.post('/auth/verify-email', { token });
  }

  async forgotPassword(email: string) {
    return this.post('/auth/forgot-password', { email });
  }

  async resetPassword(token: string, password: string) {
    return this.post('/auth/reset-password', { token, password });
  }
}

/**
 * Draft API
 */
export class DraftAPI extends BaseAPI {
  async create(data: { promptText?: string; content: string; name?: string }) {
    return this.post('/drafts', data);
  }

  async list() {
    return super.get('/drafts');
  }

  async getById(id: string) {
    return super.get(`/drafts/${id}`);
  }

  async update(id: string, data: { content?: string; name?: string; tag?: string }) {
    return this.put(`/drafts/${id}`, data);
  }

  async deleteById(id: string) {
    return super.delete(`/drafts/${id}`);
  }

  async getVersions(id: string) {
    return super.get(`/drafts/${id}/versions`);
  }

  // Backwards compatibility aliases
  async createDraft(data: { promptText?: string; content: string; name?: string }) {
    return this.create(data);
  }

  async getDrafts() {
    return this.list();
  }

  async getDraft(id: string) {
    return this.getById(id);
  }

  async updateDraft(id: string, data: { content?: string; name?: string; tag?: string }) {
    return this.update(id, data);
  }

  async deleteDraft(id: string) {
    return this.deleteById(id);
  }

  async getDraftVersions(id: string) {
    return this.getVersions(id);
  }
}

/**
 * AI Essay API
 */
export class EssayAPI extends BaseAPI {
  async edit(data: { essay: string; prompt: string }) {
    return this.post('/essays/edit', data);
  }

  async customize(data: { essay: string; schoolName: string; majorName: string }) {
    return this.post('/essays/customize', data);
  }

  async rewrite(data: { essay: string; prompt: string; focusAreas?: string[]; wordLimit?: number }) {
    return this.post('/essays/rewrite', data);
  }

  // Backwards compatibility aliases
  async editEssay(data: { essay: string; prompt: string }) {
    return this.edit(data);
  }

  async customizeEssay(data: { essay: string; schoolName: string; majorName: string }) {
    return this.customize(data);
  }

  async rewriteEssay(data: { essay: string; prompt: string; focusAreas?: string[]; wordLimit?: number }) {
    return this.rewrite(data);
  }
}

/**
 * School Data API
 */
export class SchoolAPI extends BaseAPI {
  async checkStatus(schoolName: string, majorName: string) {
    return this.get(`/schools/status?schoolName=${encodeURIComponent(schoolName)}&majorName=${encodeURIComponent(majorName)}`);
  }

  async getData(schoolName: string, majorName: string) {
    return this.get(`/schools/data?schoolName=${encodeURIComponent(schoolName)}&majorName=${encodeURIComponent(majorName)}`);
  }

  async fetchData(schoolName: string, majorName: string, forceRefresh: boolean = false) {
    return this.post('/schools/fetch', { schoolName, majorName, forceRefresh });
  }

  async deleteData(schoolName: string, majorName: string) {
    return this.delete(`/schools/data?schoolName=${encodeURIComponent(schoolName)}&majorName=${encodeURIComponent(majorName)}`);
  }
}

/**
 * User API
 */
export class UserAPI extends BaseAPI {
  async getProfile() {
    return this.get('/user/profile');
  }

  async updateProfile(data: any) {
    return this.put('/user/profile', data);
  }

  async getSubscription() {
    return this.get('/user/subscription');
  }

  async getUsage() {
    return this.get('/user/usage');
  }

  async getUsageStats() {
    return this.get('/user/usage-stats');
  }
}

/**
 * Subscription API
 */
export class SubscriptionAPI extends BaseAPI {
  async createCheckoutSession(tier: 'PLUS' | 'PRO') {
    return this.post('/subscriptions/checkout', { tier });
  }

  async cancelSubscription() {
    return this.post('/subscriptions/cancel');
  }

  async upgradeSubscription(tier: 'PLUS' | 'PRO') {
    return this.post('/subscriptions/upgrade', { tier });
  }

  async getPortalUrl() {
    return this.get('/subscriptions/portal');
  }
}

/**
 * Unified API client
 */
export const api = {
  auth: new AuthAPI(),
  drafts: new DraftAPI(),
  essays: new EssayAPI(),
  schools: new SchoolAPI(),
  user: new UserAPI(),
  subscriptions: new SubscriptionAPI(),
};

export default api;
