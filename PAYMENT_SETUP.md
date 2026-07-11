# Razorpay payments

Cruisin creates every payable amount on the API. Set `PAYMENT_MODE=test`, Razorpay test credentials, and the matching `NEXT_PUBLIC_RAZORPAY_KEY_ID` in the storefront. Never expose `RAZORPAY_KEY_SECRET`.

Required API variables: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `PAYMENT_MODE`, `COD_ENABLED`, `PARTIAL_PAYMENT_ENABLED`, `MAX_COD_ORDER_VALUE`, `MIN_PARTIAL_PAYMENT_ORDER_VALUE`, `CLIENT_URL`, and `ADMIN_URL`. Configure either `PARTIAL_PAYMENT_PERCENTAGE` or `PARTIAL_PAYMENT_FIXED_AMOUNT` when partial payment is enabled. `COD_FEE` is optional and defaults to zero.

Set the Razorpay webhook URL to `https://your-api.example/api/v1/payments/webhooks/razorpay` and subscribe to `payment.authorized`, `payment.captured`, `payment.failed`, `order.paid`, `refund.processed`, and `refund.failed`. The route requires the raw request body and verifies the webhook signature using `RAZORPAY_WEBHOOK_SECRET`.

In test mode, use Razorpay's published test UPI/card values in its checkout. COD never enters Razorpay. Partial orders charge only the backend-calculated advance; the dashboard can mark the remaining balance collected. Refund only captured Razorpay amounts from the order detail screen; COD is collected/refunded outside Razorpay.

For local webhook forwarding, use Razorpay's webhook testing or a secure tunnel and update `CLIENT_URL`/CORS origins as appropriate. Test a browser-close, failed payment, duplicate webhook, and refund before enabling live mode.
