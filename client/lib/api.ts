// Governed by .rules v1.0
import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { API_CONFIG } from '@/constants/config';
import type { ApiEnvelope } from '@/types/api.types';

export const api = axios.create({ baseURL: API_CONFIG.baseUrl, withCredentials: true, timeout: API_CONFIG.timeout });

api.interceptors.request.use((config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
  const token = typeof window !== 'undefined' ? window.localStorage.getItem(API_CONFIG.accessTokenKey) : null;
  if (token) config.headers.Authorization = 'Bearer ' + token;
  return config;
});

api.interceptors.response.use((response) => response, async (error: AxiosError<ApiEnvelope<unknown>>): Promise<never> => {
  const message = error.response?.data.message ?? 'Network error';
  return Promise.reject(new Error(message));
});
