# Cruisin Rollback Plan

## Triggers

Rollback or disable the affected path immediately for incorrect payment balances,
duplicate orders/charges, double stock decrement, authorization bypass, sustained
readiness failure, migration/index failure, or material storefront/admin 5xx rates.

## Application rollback

1. Freeze deploys and record incident time, release identifiers, affected orders,
   provider event IDs, and current health/readiness status.
2. Disable online checkout at the operational/configuration layer if payment
   correctness is uncertain; do not delete orders or provider events.
3. Route traffic to the previously verified immutable API/client/admin artifacts.
4. Verify previous API compatibility with current DB documents before traffic shift.
5. Wait for `/ready` 200, then smoke auth, catalogue, cart, order reads, and Admin.
6. Reconcile every payment/webhook received during the window using the payment runbook.

## Database rollback

- Prefer forward repair for additive fields/indexes. Do not restore the entire DB
  merely to undo application code; that can erase legitimate orders/payments.
- Restore from backup only for confirmed destructive corruption, with incident lead
  approval and a written cutoff/replay plan.
- Preserve `PaymentWebhookEvent`, order payment attempts, refunds, timelines, and
  provider IDs for replay/audit.
- Before removing the unique checkout-key index, prove no duplicate keys exist and
  disable the new clients; normally leave additive fields/indexes in place.

## Verification after rollback

- `/health` and `/ready` behave correctly under dependency loss/recovery.
- Customer/admin sessions remain isolated.
- Existing paid orders retain paid/due balances and stock state.
- Pending orders remain retryable without creating duplicates.
- Webhook replays are ignored by event ID and cannot double-settle.
- Provider dashboard totals match DB aggregates for the incident window.

## Communication and exit

Record owner, timeline, customer impact, affected IDs, artifact versions, data
repair, provider reconciliation, and prevention work. Resume normal release only
after the original trigger has an automated regression and production smoke proof.

