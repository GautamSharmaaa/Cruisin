// Governed by .rules v1.0
import axios, { type InternalAxiosRequestConfig } from 'axios';
import { API_CONFIG } from '@/constants/config';
export const api = axios.create({ baseURL: API_CONFIG.baseUrl, withCredentials: true, timeout: API_CONFIG.timeout });
api.interceptors.request.use((config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => { const token = typeof window !== 'undefined' ? window.localStorage.getItem(API_CONFIG.accessTokenKey) : null; if (token) config.headers.Authorization = 'Bearer ' + token; return config; });
