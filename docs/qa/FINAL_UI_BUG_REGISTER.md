# Cruisin Final UI Bug Register

Status: **all application defects found in this pass are fixed and retested**.
No open critical or high-severity product defect remains. Historical audit items
remain in `BUG_REGISTER.md`; this table records the final production pass.

| ID | Severity | Surface | Finding / root cause | Resolution | Manual | Automated |
|---|---|---|---|---|---|---|
| FUX-001 | High | Admin products | Product editor could not model color × size variants with distinct SKU, stock, price, HEX and media | Added variant matrix, add/remove controls, validation and persistence | Pass | Pass |
| FUX-002 | High | PDP/cart/order | Selection was size-centric and could lose the precise color-size identity | Color-scoped size/gallery/SKU/stock/price selection now persists end to end | Pass | Pass |
| FUX-003 | High | Storefront filters | Independent variant predicates could match color and size on different variants | Query now requires the same variant element and exposes dynamic facets | Pass | Pass |
| FUX-004 | High | Catalogue | Import/export omitted variant HEX/media/enabled state and was not lossless | Expanded schema/parser/exporter/validator and round-trip tests | Pass | Pass |
| FUX-005 | High | Analytics | Sparse presentation lacked reconciled business definitions and operational breakdowns | Rebuilt responsive dashboard with ten KPIs, charts, tables, summaries and CSV | Pass | Pass |
| FUX-006 | High | Checkout/order | Customer and Admin summaries did not consistently surface exact selected variants | Added color, size and SKU to checkout, success, customer and Admin views | Pass | Pass |
| FUX-007 | Medium | Mobile overlays | Confirmation/prompt modal could render under the filter drawer | Established drawer/modal z-index layers (110/120) | Pass | Pass |
| FUX-008 | Medium | Search/CMS | Blank search strings were sent as `q=` and rejected with 400 | Trim and omit an empty query; literal/case-insensitive search retained | Pass | Pass |
| FUX-009 | High | CMS/storefront | Static homepage output could remain stale after a CMS publish | Homepage is dynamic and the publish result appears without rebuilding | Pass | Pass |
| FUX-010 | High | Registration | A provider mail failure could leave a partially created local account | Added compensating cleanup and safe development no-op behavior | Pass | Pass |
| FUX-011 | Medium | Addresses | Existing address data did not complete a reliable edit/update journey | Added populated edit state, validation and update persistence | Pass | Pass |
| FUX-012 | Medium | Catalogue history | Validation failure could leave an import indefinitely marked pending | Failed validation records now complete as failed with `completedAt` | Pass | Pass |
| FUX-013 | Medium | Accessibility | Nested Link/Button patterns produced invalid interactive nesting | Replaced with semantic single interactive elements | Pass | Pass |
| FUX-014 | Medium | Admin orders | Status/payment wording and search did not make exact variants operationally clear | Corrected labels and variant/SKU search/detail rendering | Pass | Pass |
| FUX-015 | Medium | Product API | NoSQL-shaped query values could be ignored and return 200 | Added strict scalar query validation; malformed shapes return 400 | Pass | Pass |
| FUX-016 | High | Legacy catalogue | Requiring new `Color HEX` rejected every row in the real legacy catalogue | Missing/blank HEX is deterministically inferred with warning; invalid explicit HEX still blocks | Pass | Pass |
| FUX-017 | Medium | Cart coupons | Apply/remove lacked robust loading and reversible feedback | Added guarded loading, invalid state, success and removal flow | Pass | Pass |
| FUX-018 | Low | Wishlist | Icon-only controls lacked consistent accessible labels | Added specific labels and verified keyboard/axe behavior | Pass | Pass |
| FUX-019 | Medium | Product state/media | Unavailable combinations and broken remote media could produce confusing or broken UI | Added combination availability states and `SafeImage` fallback | Pass | Pass |

The sole remaining blocker, `EXT-WEB-001`, is not a UI defect: it is the required
post-deployment Razorpay Dashboard delivery to the final public HTTPS webhook.
