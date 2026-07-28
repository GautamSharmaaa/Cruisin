# Shiprocket Manual Browser QA

## Test boundary

- Date: 2026-07-28
- Browser: headed Codex in-app Chromium
- Storefront: `http://127.0.0.1:3000`
- Admin: `http://127.0.0.1:3001`
- API: `http://127.0.0.1:8000/api/v1`
- MongoDB: local `cruisin-logistics-e2e`
- Redis: local DB 15
- Provider: deterministic mock
- Outbound email/SMS/WhatsApp: disabled
- Accounts used: `logistics-customer@example.test` and `logistics-admin@example.test` only
- The seed contains customer and superadmin accounts. Viewer, manager, and admin accounts do not exist, so those role-specific manual checks are recorded as blocked rather than passed.

## Storefront observations

| Scenario | URL | Role | Steps | Expected | Actual | Result | Screenshot |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Catalogue renders | `/shop` | Anonymous | Open at 1440 px | Seeded product visible | Product card and filters rendered | Pass | `test-artifacts/shiprocket/storefront/shop-desktop-1440.png` |
| Product selection | `/product/logistics-e2e-tee` | Anonymous | Select size M | SKU/stock and add action update | SKU `CR-E2E-BLK-M`, stock and Add To Cart shown | Pass | — |
| Cart totals | Product bag | Anonymous | Add one item | Item and totals shown | Item shown; legacy pre-quote rate shown | Pass with limitation | — |
| Checkout auth gate | `/checkout` | Anonymous | Proceed from bag | Sign-in required | Sign-in dialog and redirect shown | Pass | — |
| Customer login | `/login?redirect=/checkout` | Customer | Submit fake fixture credentials | Return to checkout | Redirected to checkout with cart retained | Pass | — |
| Shipping section | `/checkout` | Customer | Open checkout | Shipping section follows address | Address, shipping, then payment shown | Pass | — |
| Invalid five-digit pincode | `/checkout` | Customer | Enter `20131`, submit | Clear field error and no quote | Submission blocked, but only generic “Refresh delivery options” message shown | Fail | — |
| Quote loading state | `/checkout` | Customer | Change pincode | Loading state visible | Request completed too quickly to observe manually | Blocked | — |
| Serviceable quote | `/checkout` | Customer | Enter `201318` | Availability shown | Availability and quote expiry shown | Pass | `checkout-valid-quote-desktop-1440.png` |
| Standard option | `/checkout` | Customer | Use `201318` | Standard courier/rate/ETA shown | Mock Surface, ₹92, approximately 5 days | Pass | Same |
| Express option | `/checkout` | Customer | Use `201318` | Express courier/rate/ETA shown | Mock Express, ₹148, approximately 2 days | Pass | Same |
| Total recalculation | `/checkout` | Customer | Receive quote | Total uses quote | Total changed from ₹2,100 to ₹1,292 | Pass | Same |
| Address refresh | `/checkout` | Customer | Change pincode | New quote fetched | New quote requests observed | Pass | — |
| Prepaid-only COD | `/checkout` | Customer | Enter `110001`, select COD | COD disabled/unavailable | COD stayed enabled; selection discarded quote and exposed fallback rates | Fail | `checkout-nonserviceable-fallback-bug.png` |
| Non-serviceable pincode | `/checkout` | Customer | Enter `999999` | Checkout blocked with safe unavailable copy | Provider rejected, but UI exposed legacy rates and “logistics disabled” fallback | Fail | `checkout-nonserviceable-fallback-bug.png` |
| Raw provider leakage | `/checkout` | Customer | Trigger unavailable route | No raw Shiprocket text | No “Shiprocket” text shown | Pass | Same |
| Stale error recovery | `/checkout` | Customer | Submit stale state, then obtain valid quote | Old error clears | “Refresh delivery options” remained after valid quote | Fail | `checkout-valid-quote-desktop-1440.png` |
| Desktop layout | `/checkout` | Customer | 1440 × 900 | No overflow | `scrollWidth === clientWidth` | Pass | `checkout-valid-quote-desktop-1440.png` |
| Laptop layout | `/checkout` | Customer | 1280 × 800 | No overflow | `1280 === 1280` | Pass | `checkout-valid-quote-laptop-1280.png` |
| Tablet layout | `/checkout` | Customer | 768 × 900 | No overflow | `768 === 768` | Pass | `checkout-valid-quote-tablet-768.png` |
| Mobile layout | `/checkout` | Customer | 390 × 844 | No overflow | `390 === 390`; controls stacked | Pass | `checkout-valid-quote-mobile-390.png` |
| Keyboard-labelled inputs | `/checkout` | Customer | Locate by labels and tab from pincode | Inputs accessible | All address inputs resolved by label and accepted keyboard input | Pass | — |
| Refresh/back safety | `/checkout` | Customer | Reload and back/forward | Invalid quote not reused | Not executed after defects were confirmed | Blocked | — |
| Order list | `/account/orders` | Customer | Open order history | Seeded states shown | Seven orders and payment/fulfilment states shown | Pass | — |
| Tracking identity | `/account/orders/...302/tracking` | Customer | Open tracking | Courier/AWB/ETA visible | Mock Surface, AWB and ETA visible | Pass | `tracking-ndr-delivered-desktop.png` |
| Tracking scans | Same | Customer | Inspect timeline | Ordered, deduplicated scans | Delivered, NDR and pickup shown newest-first once each | Pass | Same |
| Return/exchange customer actions | Order detail | Customer | Inspect completed fixtures | Current state clear | Completed fixtures visible; fresh request validation not manually exercised | Blocked | — |

## Admin observations

| Scenario | URL | Role | Actual | Result | Screenshot |
| --- | --- | --- | --- | --- | --- |
| Login | `/login` | Superadmin | Fixture login succeeded | Pass | — |
| Logistics navigation | `/` | Superadmin | Logistics, analytics, NDR, RTO, returns and exchanges links visible | Pass | — |
| Dashboard opens | `/logistics` | Superadmin | Control center rendered | Pass | `logistics-dashboard-desktop-1440.png` |
| KPI seeded values | `/logistics` | Superadmin | 10 shipments, 4 ready, 4 delivered, 1 RTO | Pass | Same |
| Search by order | `/logistics` | Superadmin | `CR-OUTAGE-ONCE` returned one row | Pass | — |
| Search by AWB | `/logistics` | Superadmin | `MOCKAWBDELIVERED004` returned the correct row | Pass | — |
| Status filter | `/logistics` | Superadmin | Draft filter returned the single draft | Pass | — |
| Payment filter | `/logistics` | Superadmin | No payment filter exists | Fail | — |
| Courier filter | `/logistics` | Superadmin | No courier filter exists | Fail | — |
| Pagination | `/logistics` | Superadmin | No pagination controls exist; API request is fixed at 50 | Fail | — |
| Empty state | `/logistics` | Superadmin | Combined filters showed “No shipments match these filters” | Pass | — |
| Loading state | `/logistics` | Superadmin | Request completed too quickly to observe | Blocked | — |
| API error recovery | `/logistics` | Superadmin | Refresh exists; outage UI not manually forced | Blocked | — |
| Package values | `/logistics` | Superadmin | Weight and dimensions shown per row | Pass | Same |
| Package confirmation | Order detail | Superadmin | Not exercised in browser | Blocked | — |
| Invalid package rejection | Order detail | Superadmin | Covered by API tests, not observed manually | Blocked | — |
| Courier comparison | Order detail | Superadmin | Not exposed on the dashboard row | Blocked | — |
| Recommended courier | Order detail | Superadmin | Not observed | Blocked | — |
| Lowest-cost mode | Order detail | Superadmin | Not observed | Blocked | — |
| Fastest mode | Order detail | Superadmin | Not observed | Blocked | — |
| Manual courier | Order detail | Superadmin | Not observed | Blocked | — |
| Provider order action | `/logistics` | Superadmin | Create action visible on draft | Pass (visibility only) | Same |
| Duplicate create | `/logistics` | Superadmin | Automated idempotency passed; not clicked manually | Blocked | — |
| AWB action | `/logistics` | Superadmin | Assign AWB visible for provider-created shipment | Pass (visibility only) | Same |
| Pickup action | `/logistics` | Superadmin | Pickup visible for AWB shipments | Pass (visibility only) | Same |
| Tracking refresh | `/logistics` | Superadmin | Track action visible | Pass (visibility only) | Same |
| Cancellation confirmation | Order detail | Superadmin | Not observed | Blocked | — |
| Retry failed action | `/logistics` | Superadmin | No failed fixture remained after automated retry | Blocked | — |
| Audit history | Order detail | Superadmin | Not rendered on the dashboard | Blocked | — |
| Label action | `/logistics` | Superadmin | Label action visible | Pass (visibility only) | Same |
| Invoice action | `/logistics` | Superadmin | Invoice action visible | Pass (visibility only) | Same |
| Manifest action | `/logistics` | Superadmin | Manifest action visible | Pass (visibility only) | Same |
| Document pending/success/failure | `/logistics` | Superadmin | All covered by headed Playwright, not repeated manually | Automated only | — |
| Duplicate document guard | `/logistics` | Superadmin | Covered by service state; not manually repeated | Blocked | — |
| Print label | `/logistics` | Superadmin | Print Label visible; Playwright verified secure browser print flow | Automated only | Same |
| NDR list | `/logistics/ndr` | Superadmin | No active case remained after automated workflow | Blocked | — |
| NDR actions | `/logistics/ndr` | Superadmin | Contact/reattempt/escalation/RTO not manually available post-run | Blocked | — |
| RTO list | `/logistics/rto` | Superadmin | Restored RTO case visible with courier/AWB | Pass | `rto-restored-state.png` |
| RTO exactly-once restore | `/logistics/rto` | Superadmin | Final restored state observed; transition itself automated | Automated only | Same |
| Returns queue | `/returns` | Superadmin | Closed return and refund status visible | Pass | — |
| Return actions | `/returns` | Superadmin | Completed fixture had no remaining action controls | Blocked | — |
| Exchanges queue | `/exchanges` | Superadmin | Closed exchange visible | Pass | — |
| Exchange actions | `/exchanges` | Superadmin | Completed fixture had no remaining action controls | Blocked | — |
| Analytics date filters | `/logistics/analytics` | Superadmin | 7/30/90-day controls visible | Pass | `logistics-analytics-desktop-1440.png` |
| Shipment/courier metrics | Same | Superadmin | Daily count/cost, courier scorecard and status mix shown | Pass | Same |
| Shipping collected/margin | Same | Superadmin | Not present | Fail | Same |
| COD/RTO/return/exchange costs | Same | Superadmin | Required separate metrics not present | Fail | Same |
| Analytics courier/payment filters | Same | Superadmin | Not present | Fail | Same |
| Missing cost semantics | `/logistics` | Superadmin | Missing cost displayed as ₹0 rather than unavailable | Fail | `logistics-dashboard-desktop-1440.png` |
| Failed notification view | `/logistics` | Superadmin | Endpoint loaded, but no failed fixture/UI section was visible | Blocked | — |

## Authorization observations

| Check | Evidence | Result |
| --- | --- | --- |
| Anonymous storefront checkout | Sign-in dialog prevented checkout | Pass |
| Anonymous admin logistics | Logout then direct `/logistics` redirected to `/login` | Pass |
| Customer order tracking ownership | Own fixture opened successfully | Pass |
| Other-customer order IDOR | Route suite passed; no second customer browser fixture exists | Automated only |
| Customer accessing admin logistics | Separate-origin admin remained unauthenticated; API route suite passed | Automated only |
| Viewer read access | API suite passed; no viewer browser fixture | Automated only |
| Viewer mutations | API suite passed; no viewer browser fixture | Automated only |
| Manager mutations | API suite passed; no manager browser fixture | Automated only |
| Admin-only financial/inventory operations | API suite passed; no admin-role browser fixture | Automated only |
| Document customer denial | Route/Playwright coverage only | Automated only |
| Shipment/return/exchange IDOR | Route/service coverage only | Automated only |
| Webhook key boundary | Focused route suite passed | Automated only |

## Failure and recovery observations

| Scenario | Evidence | Result |
| --- | --- | --- |
| Captured payment + provider outage | Playwright durable retry scenario passed without duplicate provider order | Automated pass |
| Provider 429/502/503/504 | Mocked client contract tests passed | Automated pass |
| Provider timeout | Mocked client contract test passed | Automated pass |
| Invalid credentials | Mocked authentication failure passed | Automated pass |
| Non-serviceable pincode | Backend blocked, browser fallback UX was misleading | Fail |
| Invalid package | Package contract tests passed | Automated pass |
| Duplicate order/AWB/pickup | Provider/idempotency tests passed | Automated pass |
| Document generation failure | Headed Playwright showed failure and no false success | Automated pass |
| Notification provider failure | Dispatch tests proved nonfatal sanitized failure | Automated pass |
| Worker retry/dead letter/lease | Automation tests passed; restart was not manually orchestrated | Automated only |
| MongoDB unavailable | Not manually forced | Blocked |
| Redis unavailable/restart | Not manually forced | Blocked |
| Application restart during job | Not manually forced | Blocked |

## Manual conclusion

The critical manual gate is **not green**. Storefront quote fallback/COD behavior, incomplete analytics/filtering, missing browser role fixtures, and unexecuted manual state transitions prevent a manual-pass claim.

