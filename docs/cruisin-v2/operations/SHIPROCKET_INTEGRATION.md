# Shiprocket Integration

Updated 2026-11-05. Local implementation only. No production writes, remote push or deployment. Hosted Railway staging remains stopped. Real providers and physical hardware require separate acceptance.

Local behavior uses existing `MockLogisticsProvider` through `getLogisticsProvider`, while existing ShiprocketProvider retains fail-closed live-operation guards. Fulfillment reuses draft/package confirmation/create order/AWB/document/pickup/manifest/tracking services rather than inventing AWBs. Label generation now persists a verificationId after its temporary operation claim is cleared, so fulfillment verifies the actual current document. Provider retries/status ordering remain in existing logistics suites. Physical unit SHIPPED is set only from reconciled carrier-confirmed shipment events. Live Shiprocket is NOT VERIFIED and no real shipment was created.

Detailed implementation record: [development/STAGING_DEPLOYMENT.md](../development/STAGING_DEPLOYMENT.md).
