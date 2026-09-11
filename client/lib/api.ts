// Governed by .rules v1.0
import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { API_CONFIG } from '@/constants/config';
import { getAccessToken, hasSessionHint, setAccessToken } from '@/lib/access-token';
import type { ApiEnvelope } from '@/types/api.types';

export const api = axios.create({ baseURL: API_CONFIG.baseUrl, withCredentials: true, timeout: API_CONFIG.timeout });
let refreshPromise: Promise<string | null> | null = null;

export class ApiRequestError extends Error {
  public constructor(message: string, public readonly status?: number, public readonly data?: unknown, public readonly requestId?: string) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

interface RequestTiming { startedAt: number; label: string; requestId: string; }
type TimedConfig = InternalAxiosRequestConfig & { _timing?: RequestTiming; _retry?: boolean };

const performanceLabel = (url = ''): string | undefined => {
  if (url.includes('/cart/coupon')) return 'coupon';
  if (url.includes('/cart')) return 'cart';
  if (url.includes('/orders/cod') || url.includes('/payments/razorpay/create-order') || url.includes('/orders/partial/create')) return 'checkout';
  return undefined;
};

const finishBrowserTiming = (config: TimedConfig | undefined): void => {
  if (!config?._timing || typeof performance === 'undefined') return;
  try {
    const duration = performance.now() - config._timing.startedAt;
    performance.measure(`cruisin:${config._timing.label}:${config._timing.requestId}`, { start: config._timing.startedAt, duration });
  } catch {
    // Performance instrumentation must never affect a commerce request.
  }
};

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
  const label = performanceLabel(config.url);
  if (label && typeof performance !== 'undefined') {
    const requestId = `${label}-${typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID().slice(0, 8) : Date.now().toString(36)}`;
    config.headers['x-correlation-id'] = requestId;
    (config as TimedConfig)._timing = { startedAt: performance.now(), label, requestId };
  }
  return config;
});

api.interceptors.response.use((response) => {
  finishBrowserTiming(response.config as TimedConfig);
  return response;
}, async (error: AxiosError<ApiEnvelope<unknown>> & { config?: TimedConfig }): Promise<unknown> => {
  const original = error.config;
  finishBrowserTiming(original);
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
  const requestId = typeof error.response?.headers['x-request-id'] === 'string' ? error.response.headers['x-request-id'] : undefined;
  return Promise.reject(new ApiRequestError(message, error.response?.status, error.response?.data.data, requestId));
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
