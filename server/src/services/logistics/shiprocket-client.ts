// Governed by .rules v1.0
import crypto from 'node:crypto';
import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';
import { z } from 'zod';
import { assertLiveDocumentAllowed, assertLiveMutationAllowed, assertLiveReadAllowed, logisticsConfig } from '../../config/logistics.js';
import { LogisticsProviderError } from '../../types/logistics.types.js';
import { logger } from '../../utils/logger.js';

type OperationKind = 'read' | 'document' | 'mutation';

interface CachedToken {
  token: string;
  expiresAt: number;
}

interface RequestOptions<TSchema extends z.ZodTypeAny> {
  method: 'GET' | 'POST';
  path: string;
  operation: OperationKind;
  schema: TSchema;
  body?: Record<string, unknown>;
  params?: Record<string, string | number | boolean | undefined>;
  authenticated?: boolean;
}

const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);
const MAX_ATTEMPTS = 3;
const TOKEN_LIFETIME_MS = 10 * 24 * 60 * 60 * 1_000;

const retryDelay = (attempt: number): number => {
  const base = Math.min(250 * (2 ** (attempt - 1)), 2_000);
  return base + Math.floor(Math.random() * Math.max(1, Math.floor(base * 0.25)));
};

const wait = async (milliseconds: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, milliseconds));

const providerMessage = (data: unknown): string => {
  if (!data || typeof data !== 'object') return '';
  const record = data as Record<string, unknown>;
  if (typeof record.message === 'string') return record.message;
  if (typeof record.error === 'string') return record.error;
  if (record.errors && typeof record.errors === 'object') return 'Provider validation rejected the request';
  return '';
};

const normalizeError = (error: unknown, correlationId: string): LogisticsProviderError => {
  if (error instanceof LogisticsProviderError) return error;
  if (!axios.isAxiosError(error)) return new LogisticsProviderError('unknown', 'Logistics provider request failed', false, 502, correlationId);
  const status = error.response?.status;
  const message = providerMessage(error.response?.data).toLowerCase();
  if (error.code === 'ECONNABORTED' || error.code === 'ERR_CANCELED') {
    return new LogisticsProviderError('timeout', 'Logistics provider timed out', true, 504, correlationId);
  }
  if (!error.response) return new LogisticsProviderError('temporary_provider', 'Logistics provider is temporarily unavailable', true, 503, correlationId);
  if (status === 401) return new LogisticsProviderError('authentication', 'Logistics provider authentication failed', false, 502, correlationId);
  if (status === 429) return new LogisticsProviderError('rate_limited', 'Logistics provider rate limit reached', true, 503, correlationId);
  if (status && RETRYABLE_STATUS.has(status)) return new LogisticsProviderError('temporary_provider', 'Logistics provider is temporarily unavailable', true, 503, correlationId);
  if (message.includes('duplicate') || message.includes('already exist')) return new LogisticsProviderError('duplicate', 'Logistics order already exists', false, 409, correlationId);
  if (message.includes('pincode') || message.includes('serviceable')) return new LogisticsProviderError('not_serviceable', 'Delivery is unavailable for this pincode', false, 400, correlationId);
  if (status === 400 || status === 422) return new LogisticsProviderError('invalid_payload', 'Logistics provider rejected the shipment details', false, 400, correlationId);
  return new LogisticsProviderError('permanent_provider', 'Logistics provider rejected the operation', false, 502, correlationId);
};

export class ShiprocketClient {
  private token?: CachedToken;
  private authenticationPromise?: Promise<string>;
  private readonly client = axios.create({
    baseURL: logisticsConfig.baseUrl,
    maxRedirects: 0,
    validateStatus: (status) => status >= 200 && status < 300
  });

  public async authenticate(force = false): Promise<void> {
    await this.getToken(force);
  }

  public async get<TSchema extends z.ZodTypeAny>(
    path: string,
    schema: TSchema,
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<z.output<TSchema>> {
    return this.request({ method: 'GET', path, operation: 'read', schema, params });
  }

  public async post<TSchema extends z.ZodTypeAny>(
    path: string,
    body: Record<string, unknown>,
    schema: TSchema,
    operation: OperationKind = 'mutation'
  ): Promise<z.output<TSchema>> {
    return this.request({ method: 'POST', path, operation, schema, body });
  }

  private async getToken(force = false): Promise<string> {
    assertLiveReadAllowed();
    const now = Date.now();
    if (!force && this.token && this.token.expiresAt > now) return this.token.token;
    if (!force && this.authenticationPromise) return this.authenticationPromise;
    const authenticate = async (): Promise<string> => {
      if (!logisticsConfig.apiEmail || !logisticsConfig.apiPassword) {
        throw new LogisticsProviderError('configuration', 'Logistics provider credentials are not configured', false, 503);
      }
      const response = await this.request({
        method: 'POST',
        path: '/auth/login',
        operation: 'read',
        authenticated: false,
        body: { email: logisticsConfig.apiEmail, password: logisticsConfig.apiPassword },
        schema: z.object({ token: z.string().min(20) }).passthrough()
      });
      const refreshBufferMs = logisticsConfig.tokenRefreshBufferSeconds * 1_000;
      this.token = { token: response.token, expiresAt: Date.now() + TOKEN_LIFETIME_MS - refreshBufferMs };
      return response.token;
    };
    this.authenticationPromise = authenticate().finally(() => {
      this.authenticationPromise = undefined;
    });
    return this.authenticationPromise;
  }

  private async request<TSchema extends z.ZodTypeAny>(options: RequestOptions<TSchema>, refreshed = false): Promise<z.output<TSchema>> {
    if (!options.path.startsWith('/') || options.path.startsWith('//')) {
      throw new LogisticsProviderError('configuration', 'Invalid logistics provider path', false, 500);
    }
    if (options.operation === 'read') assertLiveReadAllowed();
    else if (options.operation === 'document') assertLiveDocumentAllowed();
    else assertLiveMutationAllowed();
    const correlationId = crypto.randomUUID();
    let lastError: LogisticsProviderError | undefined;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), logisticsConfig.requestTimeoutMs);
      try {
        const token = options.authenticated === false ? undefined : await this.getToken();
        const config: AxiosRequestConfig = {
          method: options.method,
          url: options.path,
          data: options.body,
          params: options.params,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'X-Cruisin-Correlation-Id': correlationId,
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        };
        const response = await this.client.request<unknown>(config);
        const parsed = options.schema.safeParse(response.data);
        if (!parsed.success) throw new LogisticsProviderError('permanent_provider', 'Logistics provider returned an invalid response', false, 502, correlationId);
        return parsed.data;
      } catch (error: unknown) {
        const axiosError = axios.isAxiosError(error) ? error as AxiosError : undefined;
        if (axiosError?.response?.status === 401 && options.authenticated !== false && !refreshed) {
          clearTimeout(timeout);
          this.token = undefined;
          await this.getToken(true);
          return this.request(options, true);
        }
        lastError = normalizeError(error, correlationId);
        logger.warn('Logistics provider request failed', {
          correlationId,
          operation: options.operation,
          path: options.path,
          statusCode: axiosError?.response?.status,
          errorCode: lastError.code,
          attempt
        });
        if (!lastError.retryable || attempt === MAX_ATTEMPTS) throw lastError;
        await wait(retryDelay(attempt));
      } finally {
        clearTimeout(timeout);
      }
    }
    throw lastError ?? new LogisticsProviderError('unknown', 'Logistics provider request failed', false, 502, correlationId);
  }
}
