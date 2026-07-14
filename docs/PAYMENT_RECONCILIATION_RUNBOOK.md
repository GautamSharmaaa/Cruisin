# Cruisin Payment Reconciliation Runbook

Never mark an order paid solely from a customer screenshot or an unsigned payload.
Use provider truth plus Cruisin's signed callback/webhook records.

## Triage fields

Collect the Cruisin order ID/number, user, total, payment mode/status,
`amountPaid`, `amountDue`, provider order/payment IDs, payment attempts, refund
IDs, stock-reserved flag, timeline, webhook event ID/type, and provider dashboard
status. Do not copy card, secret, contact, or full address data into tickets.

## Expected invariants

- Pending online/partial: paid 0, due total, no reserved stock.
- Captured online: paid total, due 0, status paid, order confirmed, stock once.
- Captured partial: paid captured advance, due total minus advance, status partially paid.
- COD placed: paid 0, due total, status cod_pending, stock reserved once.
- Collection complete: paid total, due 0, status paid.
- Refund total never exceeds captured `amountPaid`.
- Partially refunded: `amountPaid` remains captured gross, `refundAmount` is the
  processed partial total, `amountDue` remains 0, status `partially_refunded`.
- Fully refunded: `amountPaid` remains captured gross, `refundAmount` equals it,
  `amountDue` remains 0, status `refunded`.

## Captured at provider, pending locally

1. Confirm provider order/payment amount, currency, captured status, and signature source.
2. Locate the local order by provider order ID. Do not create a replacement order.
3. Check `paymentSettlementStartedAt`. A lease newer than five minutes may still be
   active; an older lease is recoverable by a signed callback/webhook replay.
4. Replay the exact signed provider webhook through the public endpoint or use the
   provider dashboard retry. Do not handcraft a success payload.
5. Confirm one captured attempt, reconciled balances, stock once, cart cleanup, and timeline.
6. If stock cannot be reserved, the order must remain `authorized` with paid funds
   recorded and an inventory-review timeline; resolve/refund manually.

## Local paid, provider not captured

Treat as critical. Disable online checkout, preserve all records, verify whether a
synthetic/incorrect action occurred, restore balances/status only through an
approved repair, and ensure stock/cart/customer communications are corrected.

## Duplicate callbacks/webhooks

- Same webhook event ID must return `processed:false` and make no state change.
- A simultaneous verify/webhook settlement may yield one success and one 409
  in-progress response; balances and stock must change once.
- Paid, partially-refunded, and refunded states are already settled. A late
  verify/captured replay may reconcile the matching attempt but must never erase
  refund status/totals or change stock/timeline.
- A repeated checkout with the same attempt key must return the same local/provider order.

## Refunds

1. Confirm captured amount and sum refunds in `created` or `processed` state.
2. Reject zero, negative, non-finite, or greater-than-remaining amounts.
3. Require a UUID idempotency key. Send it as Razorpay
   `X-Refund-Idempotency`; reuse is allowed only with the identical amount/reason.
4. Preflight the provider payment's captured and already-refunded paise. Include
   `amount` for a partial refund; use the provider's full-refund request shape
   when the requested amount equals the remaining provider balance.
5. Create the provider refund, persist provider refund ID/status/reason/requester,
   then use signed refund webhooks for processed/failed state.
6. Recalculate `refundAmount` from processed refunds and set partially/full refunded.
7. Verify Admin, analytics net revenue, and customer-visible payment state.

If Razorpay Test returns a generic `BAD_REQUEST_ERROR` for a second refund on an
already partially refunded payment, preserve the record and use a fresh captured
QA order for an independent full-refund test. Do not force provider state.

## Webhook delivery classification

- Dashboard delivery: real event sent/retried by Razorpay to a public HTTPS URL;
  retain Dashboard delivery ID/status as deployment evidence.
- Signed local replay: raw provider entity replayed through the endpoint with a
  valid configured HMAC. This proves raw-body verification/idempotency locally,
  but must never be labelled actual Dashboard delivery.

## Closeout

Record sanitized before/after values, provider/event IDs, stock delta, replay
result, customer impact, and reviewer. Escalate any balance or stock discrepancy;
never delete webhook/order audit records to make aggregates look correct.
