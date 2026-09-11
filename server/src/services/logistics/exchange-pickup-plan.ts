// Governed by .rules v1.0
import crypto from 'node:crypto';

export interface ExchangePickupCandidate {
  id: string;
  status: string;
  hasReverseShipment: boolean;
}

export type ExchangePickupPlan =
  | { ready: false; reason: 'awaiting_approval' | 'nothing_to_pick_up'; awaitingApproval: number }
  | { ready: true; requestIds: string[]; batchToken: string; awaitingApproval: 0 };

export const planExchangePickup = (candidates: ExchangePickupCandidate[]): ExchangePickupPlan => {
  const awaitingApproval = candidates.filter((candidate) => candidate.status === 'requested').length;
  if (awaitingApproval > 0) return { ready: false, reason: 'awaiting_approval', awaitingApproval };

  const requestIds = candidates
    .filter((candidate) => candidate.status === 'inventory_reserved' && !candidate.hasReverseShipment)
    .map((candidate) => candidate.id)
    .sort();
  if (!requestIds.length) return { ready: false, reason: 'nothing_to_pick_up', awaitingApproval: 0 };

  return {
    ready: true,
    requestIds,
    batchToken: crypto.createHash('sha256').update(requestIds.join(':')).digest('hex').slice(0, 20),
    awaitingApproval: 0
  };
};
