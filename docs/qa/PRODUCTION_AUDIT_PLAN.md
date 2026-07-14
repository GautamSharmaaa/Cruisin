# Cruisin Production Audit Plan

Status: Complete — release recommendation issued  
Started: 2026-07-11 (Asia/Kolkata)  
Safety boundary: local/test services and QA-labelled data only

## Objective

Establish an evidence-based release recommendation for the Cruisin storefront,
admin dashboard, API, MongoDB data model, and payment/order workflows. Confirmed
defects will be fixed with focused changes and retested. Analytics visuals will
only be enhanced after their calculations are independently validated.

## Safety gates

- Confirm the active MongoDB host and database name are local/test before writes.
- Confirm Razorpay uses Test Mode before opening or completing a payment flow.
- Never print, hardcode, or commit credentials or passwords.
- Preserve unrelated working-tree changes and delete only QA-labelled records.
- Keep webhook endpoints externally callable while enforcing signatures and
  idempotency.
- Do not interpret code presence, mocked data, or a modal opening as a passing
  end-to-end result.

## Phases and exit criteria

| Phase | Scope | Exit criterion |
|---|---|---|
| 0 | Repository/environment/architecture discovery | Applications, scripts, routes, middleware, models, integrations, tests, and configuration documented |
| 1 | Safe local QA environment | Local/test DB and payment mode verified; all services healthy; QA data identified or safely seeded |
| 2 | Static architecture and code audit | Evidence-backed risks classified and entered in the bug register |
| 3-13 | Storefront, interaction, auth, cart, checkout, payments, refunds, webhooks, and admin manual QA | Required routes and controls tested in the browser with API/DB corroboration or exact blockers |
| 14-15 | Analytics correctness and enhancement | Deterministic values reconcile across DB/API/UI; responsive and accessible visualization verified |
| 16-20 | Security, accessibility, performance, SEO, and failure states | Confirmed issues fixed or explicitly accepted/blocked with evidence |
| 21-22 | Automated and browser compatibility coverage | Tests, lint, typecheck, builds, dependency audit, and available browser projects executed |
| 23 | Production configuration | Readiness, deployment, rollback, and payment reconciliation documents completed |
| 24 | Regression | Original reproductions and critical journeys pass after clean restart |
| 25 | Final report | GO, CONDITIONAL GO, or NO-GO decision supported by evidence |

## Required evidence

- Commit/branch and service/process details.
- Route and interaction inventories with manual and automated status.
- Browser screenshots/state, console messages, and failed network requests.
- Sanitized API response status/body evidence and MongoDB record checks.
- Commands and unabridged pass/fail counts for automated checks.
- Before/after measurements for performance-affecting changes.
- Bug reproductions, root causes, changed files, and retests.

## Current discovery facts

- Monorepo workspaces: `client`, `admin`, and `server`.
- Storefront: Next.js App Router, configured for port 3000.
- Admin: Next.js App Router, configured for port 3001.
- Backend: Express 5/TypeScript/Mongoose, configured by `PORT` and expected on 8000.
- MongoDB 7 is defined by `docker-compose.yml` and currently listens locally on 27017.
- Vitest and Playwright coverage already exist and must be inspected before adding dependencies.
- Admin already depends on Recharts; no second chart library should be added without evidence.

## Completion decision

All phases were executed and every matrix row is classified P, NA, or B. All
confirmed application defects are fixed and regressed. The decision is NO-GO
until the external Razorpay Test success and provider-refund evidence gates in
`FINAL_PRODUCTION_QA_REPORT.md` close.
