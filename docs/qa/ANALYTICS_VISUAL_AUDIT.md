# Admin Analytics Visual Audit

Status: **complete/pass**. Database aggregates, API payloads, rendered values and
downloaded CSV were reconciled before the visual result was accepted.

## 30-day reconciliation

Range: 14 June–13 July 2026, Asia/Kolkata.

| Metric | Database | API | UI | Result |
|---|---:|---:|---:|---|
| Orders | 22 | 22 | 22 | Exact |
| Paid orders | 3 | 3 | 3 | Exact |
| Gross merchandise subtotal | ₹106,599 | ₹106,599 | ₹106,599 | Exact |
| Net collected order revenue | ₹121,762 | ₹121,762 | ₹121,762 | Exact |
| Refunds | ₹6,725 | ₹6,725 | ₹6,725 | Exact |
| Units sold | 7 | 7 | 7 | Exact |
| Customers | 4 | 4 | 4 | Exact |
| New customers | 3 | 3 | 3 | Exact |
| Returning customers | 3 | 3 | 3 | Exact |
| COD outstanding | ₹74,117 | ₹74,117 | ₹74,117 | Exact |

Net may exceed gross because net is eligible collected **order total**, including
tax and shipping and after refunds, while gross is merchandise subtotal. The UI
exposes these definitions instead of relabeling unlike quantities.

## Responsive visual evidence

| Viewport | Screenshot | Calculations | Overflow/a11y | Result |
|---|---|---|---|---|
| 1440×960 | `admin-analytics-desktop-final.png` | Exact | No horizontal overflow; readable chart/table labels | Pass |
| 768×1024 | `admin-analytics-tablet-after.png` | Exact | Dense content reflows; controls remain operable | Pass |
| 390×844 | `admin-analytics-mobile-after.png` | Exact | Cards stack, tables scroll locally, no clipped page controls | Pass |

The final dashboard includes ten defined KPIs, range selection, refresh/export,
revenue comparison, order/payment composition, product performance, inventory,
customer composition, refunds/discounts and recent orders. Charts have textual
summaries so meaning does not depend on color or geometry alone.

## Export, state and quality gates

- The focused browser test downloaded `analytics-summary.csv`, parsed it, and
  matched the Today API's net revenue, orders and refunds exactly.
- Loading, error and empty-safe rendering paths were inspected; dynamic labels
  and help text remain readable on mobile.
- Five accessibility-gate tests passed with no serious WCAG A/AA issue.
- Reduced-motion behavior and keyboard operation are covered by global UI tests.
- The final page passed Chromium, mobile Chromium, Firefox and WebKit projects.
