// Governed by .rules v1.0
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { connectDb, disconnectDb } from '../config/db.js';
import { UserModel } from '../models/user.model.js';
import { logger } from '../utils/logger.js';

const bootstrapAdminSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase().trim()),
  name: z.string().trim().min(2).max(80).default('Cruisin Administrator'),
  password: z.string().min(16).max(128)
});

const bootstrapAdmin = async (): Promise<void> => {
  const credentials = bootstrapAdminSchema.parse({
    email: process.env.BOOTSTRAP_ADMIN_EMAIL,
    name: process.env.BOOTSTRAP_ADMIN_NAME || undefined,
    password: process.env.BOOTSTRAP_ADMIN_PASSWORD
  });
  if (['CruisinAdmin123', 'AnalyticsQA123!'].includes(credentials.password)) {
    throw new Error('Refusing a known development password');
  }

  await connectDb();
  try {
    const existing = await UserModel.findOne({ email: credentials.email }).select('role').lean();
    if (existing) {
      if (existing.role !== 'superadmin') throw new Error('An account with this email already exists without the superadmin role');
      logger.info('Bootstrap superadmin already exists; no changes applied');
      return;
    }
    await UserModel.create({
      name: credentials.name,
      email: credentials.email,
      passwordHash: await bcrypt.hash(credentials.password, 12),
      role: 'superadmin',
      status: 'active',
      isVerified: true,
      emailVerifiedAt: new Date(),
      isActive: true
    });
    logger.info('Bootstrap superadmin created');
  } finally {
    await disconnectDb();
  }
};

void bootstrapAdmin().catch((error: unknown) => {
  logger.error('Superadmin bootstrap failed', { error });
  process.exitCode = 1;
});
