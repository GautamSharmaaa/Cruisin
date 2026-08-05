// Governed by .rules v1.0
import type { Collection, Document, IndexDescriptionInfo } from 'mongodb';
import { describe, expect, it } from 'vitest';
import {
  assertShipmentIndexesReadyForDeployment,
  isDesiredShipmentIndex,
  isLegacyShipmentIndex,
  reconcileShipmentIndexes,
  shipmentIndexDefinitions
} from './shipment-index-migration.js';

const legacyIndexes = (): IndexDescriptionInfo[] => shipmentIndexDefinitions.map((definition) => ({
  name: definition.legacyName,
  key: definition.key,
  unique: true,
  sparse: true,
  v: 2
}));

const desiredIndexes = (): IndexDescriptionInfo[] => shipmentIndexDefinitions.map((definition) => ({
  name: definition.desiredName,
  key: definition.key,
  unique: true,
  partialFilterExpression: definition.partialFilterExpression,
  v: 2
}));

interface FakeOptions {
  duplicate?: boolean;
  failCreateName?: string;
  failDropName?: string;
}

class FakeCollection {
  indexes: IndexDescriptionInfo[];
  operations: string[] = [];
  private readonly options: FakeOptions;

  constructor(indexes: IndexDescriptionInfo[], options: FakeOptions = {}) {
    this.indexes = indexes;
    this.options = options;
  }

  listIndexes(): { toArray: () => Promise<IndexDescriptionInfo[]> } {
    return { toArray: async () => structuredClone(this.indexes) };
  }

  async countDocuments(): Promise<number> {
    return 0;
  }

  aggregate<T>(pipeline: Document[]): { toArray: () => Promise<T[]> } {
    const isDuplicateQuery = pipeline.some((stage) => '$group' in stage);
    return {
      toArray: async () => (
        isDuplicateQuery && this.options.duplicate ? [{ _id: 'duplicate', count: 2 } as T] : []
      )
    };
  }

  async createIndex(key: Record<string, 1>, options: Record<string, unknown>): Promise<string> {
    const name = String(options.name);
    this.operations.push(`create:${name}`);
    if (this.options.failCreateName === name) throw new Error('injected create failure');
    this.indexes.push({
      name,
      key,
      unique: options.unique === true,
      sparse: options.sparse === true ? true : undefined,
      partialFilterExpression: options.partialFilterExpression as Document | undefined,
      v: 2
    });
    return name;
  }

  async dropIndex(name: string): Promise<Document> {
    this.operations.push(`drop:${name}`);
    if (this.options.failDropName === name) throw new Error('injected drop failure');
    this.indexes = this.indexes.filter((index) => index.name !== name);
    return { ok: 1 };
  }
}

const asCollection = (fake: FakeCollection): Collection<Document> => fake as unknown as Collection<Document>;

describe('guarded shipment index migration', () => {
  it('recognizes only the exact legacy and desired definitions', () => {
    const definition = shipmentIndexDefinitions[0];
    expect(isLegacyShipmentIndex(legacyIndexes()[0], definition)).toBe(true);
    expect(isDesiredShipmentIndex(desiredIndexes()[0], definition)).toBe(true);
    expect(isDesiredShipmentIndex({ ...desiredIndexes()[0], unique: false }, definition)).toBe(false);
    expect(isDesiredShipmentIndex({ ...desiredIndexes()[0], sparse: true }, definition)).toBe(false);
  });

  it('reports all three legacy indexes in dry-run mode without changing them', async () => {
    const fake = new FakeCollection(legacyIndexes());
    const result = await reconcileShipmentIndexes(asCollection(fake), {
      mode: 'dry-run',
      expectedDocumentCount: 0
    });
    expect(result.steps.map((step) => step.action)).toEqual([
      'would-migrate',
      'would-migrate',
      'would-migrate'
    ]);
    expect(fake.operations).toEqual([]);
  });

  it('creates, verifies, then removes each legacy index one at a time', async () => {
    const fake = new FakeCollection(legacyIndexes());
    const result = await reconcileShipmentIndexes(asCollection(fake), {
      mode: 'execute',
      expectedDocumentCount: 0
    });
    expect(result.steps.every((step) => step.action === 'migrated')).toBe(true);
    expect(fake.operations).toEqual(shipmentIndexDefinitions.flatMap((definition) => [
      `create:${definition.desiredName}`,
      `drop:${definition.legacyName}`
    ]));
    await expect(assertShipmentIndexesReadyForDeployment(asCollection(fake))).resolves.toBeUndefined();
  });

  it('is idempotent once the corrected definitions are present', async () => {
    const fake = new FakeCollection(desiredIndexes());
    const result = await reconcileShipmentIndexes(asCollection(fake), {
      mode: 'execute',
      expectedDocumentCount: 0
    });
    expect(result.steps.every((step) => step.action === 'already-correct')).toBe(true);
    expect(fake.operations).toEqual([]);
  });

  it('blocks malformed indexes and duplicate data without mutation', async () => {
    const malformed = legacyIndexes();
    malformed[0] = { ...malformed[0], unique: false };
    const malformedFake = new FakeCollection(malformed);
    await expect(reconcileShipmentIndexes(asCollection(malformedFake), {
      mode: 'execute',
      expectedDocumentCount: 0
    })).rejects.toThrow('Unexpected definition');
    expect(malformedFake.operations).toEqual([]);

    const duplicateFake = new FakeCollection(legacyIndexes(), { duplicate: true });
    await expect(reconcileShipmentIndexes(asCollection(duplicateFake), {
      mode: 'execute',
      expectedDocumentCount: 0
    })).rejects.toThrow('not safe');
    expect(duplicateFake.operations).toEqual([]);
  });

  it('leaves the legacy index intact when creation fails', async () => {
    const first = shipmentIndexDefinitions[0];
    const fake = new FakeCollection(legacyIndexes(), { failCreateName: first.desiredName });
    await expect(reconcileShipmentIndexes(asCollection(fake), {
      mode: 'execute',
      expectedDocumentCount: 0
    })).rejects.toThrow('rolled back');
    expect(fake.indexes.some((index) => index.name === first.legacyName)).toBe(true);
    expect(fake.indexes.some((index) => index.name === first.desiredName)).toBe(false);
  });

  it('removes a newly created replacement if dropping the legacy index fails', async () => {
    const first = shipmentIndexDefinitions[0];
    const fake = new FakeCollection(legacyIndexes(), { failDropName: first.legacyName });
    await expect(reconcileShipmentIndexes(asCollection(fake), {
      mode: 'execute',
      expectedDocumentCount: 0
    })).rejects.toThrow('rolled back');
    expect(fake.indexes.some((index) => index.name === first.legacyName)).toBe(true);
    expect(fake.indexes.some((index) => index.name === first.desiredName)).toBe(false);
  });
});
