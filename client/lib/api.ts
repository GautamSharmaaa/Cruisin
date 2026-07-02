// Governed by .rules v1.0
import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { API_CONFIG } from '@/constants/config';
import { getAccessToken, hasSessionHint, setAccessToken } from '@/lib/access-token';
import type { ApiEnvelope } from '@/types/api.types';

export const api = axios.create({ baseURL: API_CONFIG.baseUrl, withCredentials: true, timeout: API_CONFIG.timeout });
let refreshPromise: Promise<string | null> | null = null;

const deviceFingerprint = (): string | null => {
  if (typeof window === 'undefined') return null;
  let fingerprint = window.localStorage.getItem('cruisin_device_fingerprint');
  if (!fingerprint && typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    fingerprint = crypto.randomUUID();
    window.localStorage.setItem('cruisin_device_fingerprint', fingerprint);
  }
  return fingerprint;
};

api.interceptors.request.use((config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = 'Bearer ' + token;
  const fingerprint = deviceFingerprint();
  if (fingerprint) config.headers['x-device-fingerprint'] = fingerprint;
  return config;
});

api.interceptors.response.use((response) => response, async (error: AxiosError<ApiEnvelope<unknown>> & { config?: InternalAxiosRequestConfig & { _retry?: boolean } }): Promise<unknown> => {
  const original = error.config;
  if (error.response?.status === 401 && original && !original._retry && !original.url?.includes('/auth/refresh') && (getAccessToken() || hasSessionHint())) {
    original._retry = true;
    refreshPromise ??= api.post<ApiEnvelope<{ accessToken: string }>>('/auth/refresh', {}, { headers: { 'x-auth-bootstrap': '1' } }).then((response) => {
      const accessToken = response.data.data.accessToken;
      setAccessToken(accessToken);
      return accessToken;
    }).catch(() => {
      setAccessToken(null);
      return null;
    }).finally(() => {
      refreshPromise = null;
    });
    const accessToken = await refreshPromise;
    if (accessToken) {
      original.headers.Authorization = 'Bearer ' + accessToken;
      return api(original);
    }
  }
  const message = error.response?.data.message ?? 'Network error';
  return Promise.reject(new Error(message));
});

export const refreshAccessToken = async (): Promise<string | null> => {
  if (!hasSessionHint()) return null;
  if (!refreshPromise) {
    refreshPromise = api.post<ApiEnvelope<{ accessToken: string }>>('/auth/refresh', {}, { headers: { 'x-auth-bootstrap': '1' } })
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
  }
  return refreshPromise;
};
