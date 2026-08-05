// Governed by .rules v1.0
import { logisticsConfig, logisticsIsMock } from '../../config/logistics.js';
import type { LogisticsProvider } from './logistics-provider.js';
import { MockLogisticsProvider } from './mock-logistics-provider.js';
import { ShiprocketProvider } from './shiprocket-provider.js';

let provider: LogisticsProvider | undefined;

export const getLogisticsProvider = (): LogisticsProvider => {
  if (provider) return provider;
  provider = logisticsIsMock() ? new MockLogisticsProvider() : new ShiprocketProvider();
  return provider;
};

export const resetLogisticsProviderForTests = (): void => {
  if (process.env.NODE_ENV !== 'test') return;
  provider = undefined;
};

export const logisticsProviderName = (): string => logisticsConfig.provider;
