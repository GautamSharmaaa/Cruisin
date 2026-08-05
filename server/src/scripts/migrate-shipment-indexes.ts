// Governed by .rules v1.0
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { connectDb, disconnectDb } from '../config/db.js';
import { env } from '../config/env.js';
import { ShipmentModel } from '../models/shipment.model.js';
import { reconcileShipmentIndexes } from './shipment-index-migration.js';
import { validateIndexTarget } from './index-target.js';

const argumentValue = (name: string): string | undefined => {
  const prefix = `${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
};

const requireArgument = (name: string): string => {
  const value = argumentValue(name);
  if (!value) throw new Error(`Missing required argument ${name}=...`);
  return value;
};

const validateArguments = (): void => {
  const exactFlags = new Set([
    '--dry-run',
    '--execute',
    '--confirm-production-index-migration',
    '--confirm-production-writes-frozen'
  ]);
  const valuePrefixes = [
    '--expected-shipment-count=',
    '--backup-archive=',
    '--backup-sha256=',
    '--restore-verification='
  ];
  const unknown = process.argv.slice(2).find((value) => (
    !exactFlags.has(value) && !valuePrefixes.some((prefix) => value.startsWith(prefix))
  ));
  if (unknown) throw new Error(`Unknown argument ${unknown}`);
};

const sha256File = async (path: string): Promise<string> => {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
};

const verifyRecoveryEvidence = async (expectedShipmentCount: number): Promise<void> => {
  const archivePath = requireArgument('--backup-archive');
  const checksumPath = requireArgument('--backup-sha256');
  const restoreVerificationPath = requireArgument('--restore-verification');
  const expectedChecksum = (await readFile(checksumPath, 'utf8')).trim().split(/\s+/)[0];
  const actualChecksum = await sha256File(archivePath);
  if (!expectedChecksum || expectedChecksum !== actualChecksum) {
    throw new Error('Backup archive SHA-256 does not match its checksum evidence');
  }
  const verification = JSON.parse(await readFile(restoreVerificationPath, 'utf8')) as Record<string, unknown>;
  for (const field of [
    'collectionNamesMatch',
    'allCountsMatch',
    'allOptionsMatch',
    'allIndexesMatch',
    'allNonEmptyCollectionsReadable'
  ]) {
    if (verification[field] !== true) throw new Error(`Restore verification is incomplete: ${field}`);
  }
  if (verification.productionDatabase !== 'cruisin') {
    throw new Error('Restore verification does not identify the cruisin production database');
  }
  if (verification.productionDocumentTotal !== verification.restoredDocumentTotal) {
    throw new Error('Restore verification document totals do not match');
  }
  const importantCollections = verification.importantCollections as Record<string, unknown> | undefined;
  const shipments = importantCollections?.shipments as Record<string, unknown> | undefined;
  if (shipments?.production !== expectedShipmentCount
    || shipments.restored !== expectedShipmentCount
    || shipments.matches !== true) {
    throw new Error('Restore verification shipment counts do not match the expected production count');
  }
};

const run = async (): Promise<void> => {
  validateArguments();
  const execute = process.argv.includes('--execute');
  const dryRun = process.argv.includes('--dry-run');
  if (execute === dryRun) throw new Error('Specify exactly one of --dry-run or --execute');
  const expectedDocumentCountText = requireArgument('--expected-shipment-count');
  const expectedDocumentCount = Number(expectedDocumentCountText);
  if (!Number.isSafeInteger(expectedDocumentCount) || expectedDocumentCount < 0) {
    throw new Error('--expected-shipment-count must be a non-negative integer');
  }
  const target = validateIndexTarget({
    allowIsolatedValidation: false,
    appEnv: env.APP_ENV,
    mongoUri: env.MONGODB_URI,
    nodeEnv: env.NODE_ENV
  });
  if (target.database !== 'cruisin' || env.APP_ENV !== 'production') {
    throw new Error('This guarded migration is restricted to the cruisin production database');
  }
  if (execute) {
    if (!process.argv.includes('--confirm-production-index-migration')) {
      throw new Error('Execution requires --confirm-production-index-migration');
    }
    if (!process.argv.includes('--confirm-production-writes-frozen')) {
      throw new Error('Execution requires --confirm-production-writes-frozen');
    }
    await verifyRecoveryEvidence(expectedDocumentCount);
  }

  await connectDb();
  try {
    if (mongoose.connection.name !== 'cruisin') {
      throw new Error('Connected database name changed after target validation');
    }
    const result = await reconcileShipmentIndexes(ShipmentModel.collection, {
      mode: execute ? 'execute' : 'dry-run',
      expectedDocumentCount
    });
    process.stdout.write(`${JSON.stringify({
      result: execute ? 'SHIPMENT_INDEX_MIGRATION_COMPLETED' : 'SHIPMENT_INDEX_MIGRATION_DRY_RUN',
      database: target.database,
      ...result
    }, null, 2)}\n`);
  } finally {
    await disconnectDb();
  }
};

void run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown migration error';
  process.stderr.write(`${JSON.stringify({ result: 'SHIPMENT_INDEX_MIGRATION_BLOCKED', error: message })}\n`);
  process.exitCode = 1;
});
