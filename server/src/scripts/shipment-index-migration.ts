// Governed by .rules v1.0
import type { Collection, Document, IndexDescriptionInfo } from 'mongodb';

export interface ShipmentIndexDefinition {
  label: string;
  legacyName: string;
  desiredName: string;
  key: Record<string, 1>;
  valueField: 'awb' | 'providerOrderId' | 'providerShipmentId';
  partialFilterExpression: Record<string, unknown>;
}

export const shipmentIndexDefinitions: ShipmentIndexDefinition[] = [
  {
    label: 'shipment AWB',
    legacyName: 'awb_1',
    desiredName: 'cruisin_awb_unique_string',
    key: { awb: 1 },
    valueField: 'awb',
    partialFilterExpression: { awb: { $type: 'string' } }
  },
  {
    label: 'shipment provider order ID',
    legacyName: 'provider_1_providerOrderId_1',
    desiredName: 'cruisin_provider_order_unique_string',
    key: { provider: 1, providerOrderId: 1 },
    valueField: 'providerOrderId',
    partialFilterExpression: { providerOrderId: { $type: 'string' } }
  },
  {
    label: 'shipment provider shipment ID',
    legacyName: 'provider_1_providerShipmentId_1',
    desiredName: 'cruisin_provider_shipment_unique_string',
    key: { provider: 1, providerShipmentId: 1 },
    valueField: 'providerShipmentId',
    partialFilterExpression: { providerShipmentId: { $type: 'string' } }
  }
];

export interface ShipmentDataAudit {
  totalDocuments: number;
  field: string;
  missing: number;
  nullValues: number;
  emptyStrings: number;
  whitespaceStrings: number;
  unexpectedTypes: number;
  invalidProviderTypes: number;
  duplicateGroups: number;
}

export interface ShipmentIndexStepResult {
  label: string;
  legacyName: string;
  desiredName: string;
  before: 'legacy' | 'both' | 'correct';
  action: 'would-migrate' | 'migrated' | 'already-correct';
  audit: ShipmentDataAudit;
}

export interface ShipmentIndexMigrationResult {
  mode: 'dry-run' | 'execute';
  expectedDocumentCount: number;
  steps: ShipmentIndexStepResult[];
}

const orderedEqual = (actual: Record<string, unknown>, expected: Record<string, 1>): boolean => {
  const actualEntries = Object.entries(actual);
  const expectedEntries = Object.entries(expected);
  return actualEntries.length === expectedEntries.length
    && expectedEntries.every(([key, direction], index) => (
      actualEntries[index]?.[0] === key && actualEntries[index]?.[1] === direction
    ));
};

const jsonEqual = (actual: unknown, expected: unknown): boolean => (
  JSON.stringify(actual) === JSON.stringify(expected)
);

export const isLegacyShipmentIndex = (
  index: IndexDescriptionInfo,
  definition: ShipmentIndexDefinition
): boolean => (
  index.name === definition.legacyName
  && orderedEqual(index.key as Record<string, unknown>, definition.key)
  && index.unique === true
  && index.sparse === true
  && index.partialFilterExpression === undefined
  && index.collation === undefined
);

export const isDesiredShipmentIndex = (
  index: IndexDescriptionInfo,
  definition: ShipmentIndexDefinition
): boolean => (
  index.name === definition.desiredName
  && orderedEqual(index.key as Record<string, unknown>, definition.key)
  && index.unique === true
  && index.sparse !== true
  && jsonEqual(index.partialFilterExpression, definition.partialFilterExpression)
  && index.collation === undefined
);

const matchingKeyIndexes = (
  indexes: IndexDescriptionInfo[],
  definition: ShipmentIndexDefinition
): IndexDescriptionInfo[] => indexes.filter((index) => (
  orderedEqual(index.key as Record<string, unknown>, definition.key)
));

const inspectDefinition = (
  indexes: IndexDescriptionInfo[],
  definition: ShipmentIndexDefinition
): { legacy: boolean; desired: boolean; state: 'legacy' | 'both' | 'correct' } => {
  const legacyByName = indexes.find((index) => index.name === definition.legacyName);
  const desiredByName = indexes.find((index) => index.name === definition.desiredName);
  if (legacyByName && !isLegacyShipmentIndex(legacyByName, definition)) {
    throw new Error(`Unexpected definition for legacy index ${definition.legacyName}`);
  }
  if (desiredByName && !isDesiredShipmentIndex(desiredByName, definition)) {
    throw new Error(`Unexpected definition for desired index ${definition.desiredName}`);
  }
  const allowedNames = new Set([definition.legacyName, definition.desiredName]);
  const unexpected = matchingKeyIndexes(indexes, definition).find((index) => !allowedNames.has(String(index.name)));
  if (unexpected) {
    throw new Error(`Unexpected index ${String(unexpected.name)} shares the key for ${definition.label}`);
  }
  const legacy = Boolean(legacyByName);
  const desired = Boolean(desiredByName);
  if (!legacy && !desired) throw new Error(`Neither guarded index exists for ${definition.label}`);
  return {
    legacy,
    desired,
    state: legacy && desired ? 'both' : legacy ? 'legacy' : 'correct'
  };
};

const countByExpression = async (collection: Collection<Document>, expression: Document): Promise<number> => {
  const [result] = await collection.aggregate<{ count: number }>([
    { $match: { $expr: expression } },
    { $count: 'count' }
  ]).toArray();
  return result?.count ?? 0;
};

export const auditShipmentData = async (
  collection: Collection<Document>,
  definition: ShipmentIndexDefinition
): Promise<ShipmentDataAudit> => {
  const fieldPath = `$${definition.valueField}`;
  const fieldType = { $type: fieldPath };
  const groupId = definition.valueField === 'awb'
    ? { awb: fieldPath }
    : { provider: '$provider', value: fieldPath };
  const [
    totalDocuments,
    missing,
    nullValues,
    emptyStrings,
    whitespaceStrings,
    unexpectedTypes,
    invalidProviderTypes,
    duplicates
  ] = await Promise.all([
    collection.countDocuments({}),
    countByExpression(collection, { $eq: [fieldType, 'missing'] }),
    countByExpression(collection, { $eq: [fieldType, 'null'] }),
    collection.countDocuments({ [definition.valueField]: '' }),
    collection.countDocuments({ [definition.valueField]: { $type: 'string', $regex: /^\s+$/ } }),
    countByExpression(collection, {
      $and: [
        { $ne: [fieldType, 'missing'] },
        { $ne: [fieldType, 'null'] },
        { $ne: [fieldType, 'string'] }
      ]
    }),
    definition.valueField === 'awb'
      ? Promise.resolve(0)
      : countByExpression(collection, { $ne: [{ $type: '$provider' }, 'string'] }),
    collection.aggregate<{ _id: unknown; count: number }>([
      {
        $match: definition.valueField === 'awb'
          ? { awb: { $type: 'string' } }
          : { provider: { $type: 'string' }, [definition.valueField]: { $type: 'string' } }
      },
      { $group: { _id: groupId, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $limit: 1 }
    ]).toArray()
  ]);

  return {
    totalDocuments,
    field: definition.valueField,
    missing,
    nullValues,
    emptyStrings,
    whitespaceStrings,
    unexpectedTypes,
    invalidProviderTypes,
    duplicateGroups: duplicates.length
  };
};

const assertAuditSafe = (audit: ShipmentDataAudit, expectedDocumentCount: number): void => {
  if (audit.totalDocuments !== expectedDocumentCount) {
    throw new Error(`Shipment document count changed: expected ${expectedDocumentCount}, found ${audit.totalDocuments}`);
  }
  if (audit.emptyStrings > 0 || audit.whitespaceStrings > 0 || audit.unexpectedTypes > 0
    || audit.invalidProviderTypes > 0 || audit.duplicateGroups > 0) {
    throw new Error(`Shipment data is not safe for ${audit.field}: ${JSON.stringify(audit)}`);
  }
};

const listIndexes = async (collection: Collection<Document>): Promise<IndexDescriptionInfo[]> => (
  collection.listIndexes().toArray()
);

const assertFinalDefinition = async (
  collection: Collection<Document>,
  definition: ShipmentIndexDefinition
): Promise<void> => {
  const state = inspectDefinition(await listIndexes(collection), definition);
  if (state.state !== 'correct') {
    throw new Error(`Shipment index ${definition.label} is not in its final guarded state`);
  }
};

const rollbackDefinition = async (
  collection: Collection<Document>,
  definition: ShipmentIndexDefinition,
  initialState: 'legacy' | 'both' | 'correct',
  createdDesiredThisRun: boolean
): Promise<void> => {
  const indexes = await listIndexes(collection);
  const legacy = indexes.find((index) => index.name === definition.legacyName);
  if (!legacy && initialState !== 'correct') {
    await collection.createIndex(definition.key, {
      name: definition.legacyName,
      unique: true,
      sparse: true
    });
  }
  if (createdDesiredThisRun) {
    const refreshed = await listIndexes(collection);
    if (refreshed.some((index) => index.name === definition.desiredName)) {
      await collection.dropIndex(definition.desiredName);
    }
  }
  const restored = inspectDefinition(await listIndexes(collection), definition);
  if (restored.state !== initialState) {
    throw new Error(`Rollback did not restore ${definition.label} to ${initialState}`);
  }
};

export const assertShipmentIndexesReadyForDeployment = async (
  collection: Collection<Document>
): Promise<void> => {
  const indexes = await listIndexes(collection);
  for (const definition of shipmentIndexDefinitions) {
    const state = inspectDefinition(indexes, definition);
    if (state.state !== 'correct') {
      throw new Error(`Shipment index migration is incomplete for ${definition.label}: ${state.state}`);
    }
  }
};

export const reconcileShipmentIndexes = async (
  collection: Collection<Document>,
  options: { mode: 'dry-run' | 'execute'; expectedDocumentCount: number }
): Promise<ShipmentIndexMigrationResult> => {
  const steps: ShipmentIndexStepResult[] = [];
  for (const definition of shipmentIndexDefinitions) {
    const audit = await auditShipmentData(collection, definition);
    assertAuditSafe(audit, options.expectedDocumentCount);
    const initial = inspectDefinition(await listIndexes(collection), definition);
    if (initial.state === 'correct') {
      steps.push({
        label: definition.label,
        legacyName: definition.legacyName,
        desiredName: definition.desiredName,
        before: initial.state,
        action: 'already-correct',
        audit
      });
      continue;
    }
    if (options.mode === 'dry-run') {
      steps.push({
        label: definition.label,
        legacyName: definition.legacyName,
        desiredName: definition.desiredName,
        before: initial.state,
        action: 'would-migrate',
        audit
      });
      continue;
    }

    let createdDesiredThisRun = false;
    try {
      if (!initial.desired) {
        await collection.createIndex(definition.key, {
          name: definition.desiredName,
          unique: true,
          partialFilterExpression: definition.partialFilterExpression
        });
        createdDesiredThisRun = true;
      }
      const coexistence = inspectDefinition(await listIndexes(collection), definition);
      if (!coexistence.legacy || !coexistence.desired) {
        throw new Error(`Failed to establish guarded index coexistence for ${definition.label}`);
      }
      const immediatelyBeforeDrop = await auditShipmentData(collection, definition);
      assertAuditSafe(immediatelyBeforeDrop, options.expectedDocumentCount);
      await collection.dropIndex(definition.legacyName);
      await assertFinalDefinition(collection, definition);
      const after = await auditShipmentData(collection, definition);
      assertAuditSafe(after, options.expectedDocumentCount);
      steps.push({
        label: definition.label,
        legacyName: definition.legacyName,
        desiredName: definition.desiredName,
        before: initial.state,
        action: 'migrated',
        audit: after
      });
    } catch (error) {
      try {
        await rollbackDefinition(collection, definition, initial.state, createdDesiredThisRun);
      } catch (rollbackError) {
        throw new AggregateError([error, rollbackError], `Migration and rollback both failed for ${definition.label}`);
      }
      throw new Error(`Migration failed and was rolled back for ${definition.label}`, { cause: error });
    }
  }
  return { mode: options.mode, expectedDocumentCount: options.expectedDocumentCount, steps };
};
