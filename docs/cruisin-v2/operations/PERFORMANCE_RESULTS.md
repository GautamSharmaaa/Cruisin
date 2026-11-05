# Performance results

VERIFIED LOCALLY, 2026-11-05. Synthetic local measurements only.

The latest physical integration sample provisioned 500 individual units with receipt history and ledger events in 239ms and looked up a matching unit in 8ms. Earlier samples varied with compilation/concurrent checks. This is one development-machine observation, not a hosted capacity or latency guarantee. No p95/throughput/production sizing is claimed.

Lists page results; receiving is capped at 500 units per transaction. Variant/state/createdAt indexes support allocation. QR decoding uses the actual generated SVG rasterized locally. Reconciliation is an administrative operation; a large real catalog needs a separately measured load test and potentially streaming reconciliation. No performance claim is made for unanchored substring search.

See [verification evidence](VERIFICATION_EVIDENCE.md) for final test/coverage commands and counts.
