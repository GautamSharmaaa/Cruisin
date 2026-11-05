# Qr Barcode System

Updated 2026-11-05. Local implementation only. No production writes, remote push or deployment. Hosted Railway staging remains stopped. Real providers and physical hardware require separate acceptance.

Status: IMPLEMENTED; SVG generation, identity preservation and manual scans locally tested.

Legacy variant labels identify SKU only. Physical labels use distinct immutable random unitId and opaque `cruisin:unit:` code. Admin receiving provisions legitimate units; label generation retrieves an existing unit. Reprint returns the same identity and adds an audit event. QR contains no customer information, token or secret.

`GET /units/:code/label` returns unit identity, SKU and SVG; scanner/manual lookup resolves unit or legacy variant labels server-side. Wrong SKU, already picked units, other-order allocations and unknown codes fail. Employee mutations require active assignment. Browser label preview includes CRUISIN, SKU, unit ID and QR; print uses the system dialog. Admin label configuration stores width/height/margin/DPI/orientation/copies; browser print generates the configured number of labels with the same unit identity. Calibration square is 10mm. Physical print quality/DPI and cameras are NOT VERIFIED.

A label is not an AWB. Shipping label verification requires the current shipment, matching AWB and backend-generated document verification ID. Reprinting shipping documents cannot create inventory.
