// Governed by .rules v1.0
import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { API_CONFIG } from '@/constants/config';
import { getAccessToken, setAccessToken } from '@/lib/access-token';

interface ApiEnvelope<TData> {
  data: TData;
  message: string;
}

export const api = axios.create({ baseURL: API_CONFIG.baseUrl, withCredentials: true, timeout: API_CONFIG.timeout });
export const externalUploadApi = axios.create({ timeout: API_CONFIG.timeout });
let refreshPromise: Promise<string | null> | null = null;

api.interceptors.request.use((config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = 'Bearer ' + token;
  return config;
});

api.interceptors.response.use((response) => response, async (error: AxiosError<ApiEnvelope<unknown>> & { config?: InternalAxiosRequestConfig & { _retry?: boolean } }): Promise<unknown> => {
  const original = error.config;
  if (error.response?.status === 401 && original && !original._retry && !original.url?.includes('/auth/refresh')) {
    original._retry = true;
    const token = await refreshAdminAccessToken();
    if (token) {
      original.headers.Authorization = 'Bearer ' + token;
      return api(original);
    }
  }
  return Promise.reject(new Error(error.response?.data.message ?? 'Network error'));
});

export const refreshAdminAccessToken = async (): Promise<string | null> => {
  refreshPromise ??= api.post<ApiEnvelope<{ accessToken: string }>>('/auth/refresh', {})
    .then((response) => {
      const token = response.data.data.accessToken;
      setAccessToken(token);
      return token;
    })
    .catch(() => {
      setAccessToken(null);
      return null;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
};
