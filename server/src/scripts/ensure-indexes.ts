// Governed by .rules v1.0
import { connectDb, disconnectDb } from '../config/db.js';
import { CategoryModel } from '../models/category.model.js';
import { applicationModels } from '../models/model-registry.js';
import { logger } from '../utils/logger.js';

interface MongoErrorLike {
  code?: number;
}

const removeLegacyIndexes = async (): Promise<void> => {
  try {
    const indexes = await CategoryModel.collection.indexes();
    const legacySlugIndex = indexes.find((index) => index.name === 'slug_1' && index.unique);
    if (legacySlugIndex) {
      await CategoryModel.collection.dropIndex('slug_1');
      logger.info('Removed legacy category slug index');
    }
  } catch (error) {
    if ((error as MongoErrorLike).code !== 26) throw error;
  }
};

const ensureIndexes = async (): Promise<void> => {
  await connectDb();
  try {
    await removeLegacyIndexes();
    for (const model of applicationModels) {
      await model.createIndexes();
      logger.info('MongoDB indexes ensured', { model: model.modelName });
    }
  } finally {
    await disconnectDb();
  }
};

void ensureIndexes().catch((error: unknown) => {
  logger.error('MongoDB index deployment failed', { error });
  process.exitCode = 1;
});
