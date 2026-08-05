// Governed by .rules v1.0
import { describe, expect, it } from 'vitest';
import { validateIndexTarget } from './index-target.js';

describe('validateIndexTarget', () => {
  it('accepts only the dedicated localhost database in isolated validation mode', () => {
    expect(validateIndexTarget({
      allowIsolatedValidation: true,
      appEnv: 'development',
      mongoUri: 'mongodb://127.0.0.1:27017/cruisin-logistics-indexes',
      nodeEnv: 'production'
    })).toEqual({
      database: 'cruisin-logistics-indexes',
      host: '127.0.0.1:27017',
      mode: 'isolated'
    });

    expect(() => validateIndexTarget({
      allowIsolatedValidation: true,
      appEnv: 'development',
      mongoUri: 'mongodb://127.0.0.1:27017/cruisin',
      nodeEnv: 'production'
    })).toThrow('database is exactly cruisin-logistics-indexes');
    expect(() => validateIndexTarget({
      allowIsolatedValidation: true,
      appEnv: 'development',
      mongoUri: 'mongodb+srv://user:password@example.mongodb.net/cruisin-logistics-indexes',
      nodeEnv: 'production'
    })).toThrow('uses localhost or 127.0.0.1');
  });

  it.each(['staging', 'production'] as const)('accepts a non-local explicit database in the %s environment', (appEnv) => {
    expect(validateIndexTarget({
      allowIsolatedValidation: false,
      appEnv,
      mongoUri: 'mongodb+srv://user:password@example.mongodb.net/cruisin?retryWrites=true',
      nodeEnv: 'production'
    })).toEqual({ database: 'cruisin', host: 'example.mongodb.net', mode: 'deployed' });
  });

  it('rejects deployed index creation from local or non-production runtimes', () => {
    expect(() => validateIndexTarget({
      allowIsolatedValidation: false,
      appEnv: 'production',
      mongoUri: 'mongodb://localhost:27017/cruisin',
      nodeEnv: 'production'
    })).toThrow('non-local MongoDB target');
    expect(() => validateIndexTarget({
      allowIsolatedValidation: false,
      appEnv: 'production',
      mongoUri: 'mongodb+srv://user:password@example.mongodb.net/cruisin',
      nodeEnv: 'test'
    })).toThrow('production Node runtime');
    expect(() => validateIndexTarget({
      allowIsolatedValidation: false,
      appEnv: 'development',
      mongoUri: 'mongodb+srv://user:password@example.mongodb.net/cruisin',
      nodeEnv: 'production'
    })).toThrow('deployed app environment');
  });

  it('rejects invalid, missing, and default test database targets', () => {
    for (const mongoUri of [
      'not-a-uri',
      'mongodb+srv://user:password@example.mongodb.net',
      'mongodb+srv://user:password@example.mongodb.net/test'
    ]) {
      expect(() => validateIndexTarget({
        allowIsolatedValidation: false,
        appEnv: 'production',
        mongoUri,
        nodeEnv: 'production'
      })).toThrow();
    }
  });
});
