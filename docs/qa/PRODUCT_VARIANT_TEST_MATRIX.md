# Product Variant Test Matrix

Status: **complete/pass**. The isolated visual fixture was
`QA-VARIANT-LUXURY-TEE` (`6a53e083d43d768a3344f8cd`). It was archived after
testing; its retained COD order is the immutable end-to-end evidence.

## Exact fixture

| Color | HEX | S | M | L | XL | Price exception |
|---|---|---:|---:|---:|---:|---|
| Black | `#050505` | 5 | 8 | 5 | 4 | — |
| White | `#FFFFFF` | 6 | 6 | **0** | 1 | — |
| Burgundy | `#800020` | 4 | 3 | 2 | 5 | XL ₹2,099; others ₹1,999 |
| Navy | `#000080` | **0** | **0** | **0** | — | sold-out color |

This produced 15 distinct enabled variants with unique SKU, color, size, stock
and effective price. The visual fixture intentionally shared a controlled image;
separate per-variant media paths were also exercised by catalogue/API tests.

## Requirement matrix

| Requirement | Admin | API/DB | Storefront | Cart/order | A11y/responsive | Result/evidence |
|---|---|---|---|---|---|---|
| Stored color label and HEX | Pass | Pass | Pass | Pass | Pass | Actual `#050505`, `#FFFFFF`, `#800020`, `#000080` swatches |
| Color-specific media model | Pass | Pass | Pass | Pass | Pass | Variant media round-trips; gallery follows selected color |
| Color-size SKU/stock combinations | Pass | Pass | Pass | Pass | Pass | 15 unique combinations persisted and rendered |
| Sold-out and disabled behavior | Pass | Pass | Pass | Pass | Pass | White/L and all Navy sizes unavailable; disabled exclusion covered by API/unit paths |
| Color changes gallery/sizes/SKU/stock/price | Pass | Pass | Pass | Pass | Pass | Burgundy/XL displayed its ₹2,099 exception and exact SKU |
| Exact variant persists end to end | Pass | Pass | Pass | Pass | Pass | White/M and Burgundy/XL retained in COD order and both order views |
| Color filter | Pass | Pass | Pass | NA | Pass | White + in-stock desktop/mobile evidence |
| Size filter | Pass | Pass | Pass | NA | Pass | Dynamic natural-size facets and mobile drawer |
| Combined color-size filter | Pass | Pass | Pass | NA | Pass | Same-element matching prevents cross-variant false positives |
| Duplicate combination/SKU rejection | Pass | Pass | NA | NA | Pass | Inline Admin validation and server tests reject collisions |
| Legacy-product compatibility | Pass | Pass | Pass | Pass | Pass | Existing products render; legacy catalogue infers missing HEX with warnings |

## Retained order proof

- Order `CR-MRI5V7MW-ECJ6W` (`6a53e4e2d43d768a3344fee2`).
- Line 1: White / M, SKU `QAVARIANTLUX-WHITE-M`.
- Line 2: Burgundy / XL, SKU `QAVARIANTLUX-BURGUNDY-XL`.
- Total ₹5,736; `cod_pending` / `placed`.
- The customer and Admin order screens show the same variants, SKUs and totals.
- The QA product was archived only after the order and database state were
  captured; no real product or order history was deleted.
