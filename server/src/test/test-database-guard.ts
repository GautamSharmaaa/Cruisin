const REQUIRED_TEST_MONGO_URI = 'mongodb://127.0.0.1:27017/cruisin-sync-order-analytics-tests';
const REQUIRED_TEST_DATABASE = 'cruisin-sync-order-analytics-tests';

const asserted = Symbol.for('cruisin.testDatabaseGuard.asserted');
const guardState = globalThis as typeof globalThis & { [asserted]?: boolean };

const assertSafeTestDatabase = (): void => {
  const configuredUri = process.env.MONGODB_URI ?? REQUIRED_TEST_MONGO_URI;
  let parsed: URL;
  try {
    parsed = new URL(configuredUri);
  } catch {
    throw new Error('Test database guard rejected an invalid MONGODB_URI');
  }
  const database = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
  const localHost = parsed.protocol === 'mongodb:' && ['127.0.0.1', 'localhost'].includes(parsed.hostname);
  const productionLike = /(^|[-_])(prod|production)([-_]|$)/i.test(database) || database === 'cruisin';
  if (!localHost || parsed.protocol === 'mongodb+srv:' || database !== REQUIRED_TEST_DATABASE || productionLike) {
    throw new Error('Test database guard refused a non-isolated MongoDB target');
  }
  process.env.NODE_ENV = 'test';
  process.env.MONGODB_URI = REQUIRED_TEST_MONGO_URI;
  process.env.SHIPROCKET_MODE = 'mock';
  process.env.SHIPROCKET_ALLOW_LIVE_READS = 'false';
  process.env.SHIPROCKET_ALLOW_LIVE_DOCUMENTS = 'false';
  process.env.SHIPROCKET_ALLOW_LIVE_MUTATIONS = 'false';
  if (!guardState[asserted]) {
    console.info('Test Mongo host: localhost');
    console.info(`Test DB: ${REQUIRED_TEST_DATABASE}`);
    console.info('Production DB targeted: false');
    guardState[asserted] = true;
  }
};

assertSafeTestDatabase();

export { assertSafeTestDatabase, REQUIRED_TEST_DATABASE, REQUIRED_TEST_MONGO_URI };
