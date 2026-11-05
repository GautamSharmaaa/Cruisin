# TDD evidence

The new authoritative TDD brief arrived after existing authentication/tasks/media work. Those earlier modules have regression evidence, not a retroactive strict-TDD claim.

| Requirement added under the newer brief | Genuine RED evidence | GREEN / integration evidence |
|---|---|---|
| Physical unit receiving/QC/stock gating | `/tmp/cruisin-units-red.log`: missing physical unit service | physical-units.integration.test.ts |
| Package and mock shipping orchestration | `/tmp/cruisin-fulfillment-red.log`: missing fulfillment service | persisted unit→order→parcel→AWB→handover→carrier test |
| Independent SOP publication | `/tmp/cruisin-sop-publication-red.log`: direct publication incorrectly succeeds | sop-publication.integration.test.ts |
| Configured QC tolerances | `/tmp/cruisin-tolerance-red.log`: measurement schema/acceptance absent | missing/out-of-range values fail; accepted value persists |
| Unit ledger stage history | `/tmp/cruisin-unit-ledger-red.log`: missing ready/handover ledger events | unit-linked zero-delta lifecycle events verified |
| Tracked exchange links | `/tmp/cruisin-exchange-red.log`: missing link service | existing reservation linked without duplicate decrement |
| Independent damaged disposition | `/tmp/cruisin-disposition-red.log`: missing request behavior | stock unchanged until independent approved disposition |
| Operational summary | `/tmp/cruisin-summary-red.log`: missing persisted summary service | real authorized counts from Mongo |
| Operational timezone day | `/tmp/cruisin-day-red.log`: missing function | Kolkata and 23-hour DST boundaries |

Refactoring kept business logic in shared domain services and used real isolated replica-set transactions. Browser RED found non-submitting controls, nested scanner forms, incorrect completion read access and fixture/selector assumptions. These were corrected and the built desktop/mobile sequences rerun. External behavior remains mocked only at the documented logistics/OTP boundaries.

Final totals and measured coverage are in [verification evidence](VERIFICATION_EVIDENCE.md). A passing render-only test was never substituted for persistence/authorization/concurrency proof.
