// Governed by .rules v1.0
import { connectDb, disconnectDb } from '../config/db.js';
import { MerchandisingService } from '../services/merchandising.service.js';
import { logger } from '../utils/logger.js';

const bootstrapStorefront = async (): Promise<void> => {
  await connectDb();
  try {
    await MerchandisingService.ensureDefaults();
    logger.info('Storefront baseline configuration is ready');
  } finally {
    await disconnectDb();
  }
};

void bootstrapStorefront().catch((error: unknown) => {
  logger.error('Storefront bootstrap failed', { error });
  process.exitCode = 1;
});
