// Governed by .rules v1.0

const ISOLATED_INDEX_DATABASE = 'cruisin-logistics-indexes';
const LOCAL_MONGODB_HOSTS = new Set(['localhost', '127.0.0.1']);

interface IndexTargetInput {
  allowIsolatedValidation: boolean;
  appEnv: 'development' | 'staging' | 'production';
  mongoUri: string;
  nodeEnv: 'development' | 'test' | 'production';
}

export interface ValidatedIndexTarget {
  database: string;
  host: string;
  mode: 'isolated' | 'deployed';
}

export const validateIndexTarget = ({
  allowIsolatedValidation,
  appEnv,
  mongoUri,
  nodeEnv
}: IndexTargetInput): ValidatedIndexTarget => {
  let parsed: URL;
  try {
    parsed = new URL(mongoUri);
  } catch {
    throw new Error('Refusing index deployment because MONGODB_URI is invalid');
  }

  const database = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
  const isLocal = LOCAL_MONGODB_HOSTS.has(parsed.hostname);
  const host = parsed.port ? `${parsed.hostname}:${parsed.port}` : parsed.hostname;

  if (allowIsolatedValidation) {
    if (parsed.protocol !== 'mongodb:' || !isLocal) {
      throw new Error('Refusing isolated index validation unless MONGODB_URI uses localhost or 127.0.0.1');
    }
    if (database !== ISOLATED_INDEX_DATABASE) {
      throw new Error(`Refusing isolated index validation unless the database is exactly ${ISOLATED_INDEX_DATABASE}`);
    }
    return { database, host, mode: 'isolated' };
  }

  if (nodeEnv !== 'production' || appEnv === 'development') {
    throw new Error('Refusing deployed index creation outside a production Node runtime and a deployed app environment');
  }
  if (!['mongodb:', 'mongodb+srv:'].includes(parsed.protocol) || isLocal) {
    throw new Error('Refusing deployed index creation unless MONGODB_URI uses a non-local MongoDB target');
  }
  if (!database || database === 'test') {
    throw new Error('Refusing deployed index creation without an explicit non-test database');
  }

  return { database, host, mode: 'deployed' };
};
