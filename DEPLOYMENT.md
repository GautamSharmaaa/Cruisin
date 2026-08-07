<!-- Governed by .rules v1.0 -->

# Railway Production Deployment

This repository is an npm-workspace monorepo. Deploy it as one Railway project with four services:

| Service | Source root | Railway config path | Public domain | Health check |
| --- | --- | --- | --- | --- |
| `cruisin-api` | `/` | `/railway/api.json` | Required | `/ready` |
| `cruisin-storefront` | `/` | `/railway/storefront.json` | Required | `/health` |
| `cruisin-admin` | `/` | `/railway/admin.json` | Required | `/health` |
| `Redis` | Railway Redis template | Managed by Railway | Private only | Managed by Railway |

MongoDB Atlas remains external. No worker service is required.

## 1. Before connecting GitHub

1. Rotate any credential that has ever appeared in chat, screenshots, terminal output, or Git history.
2. In Atlas, create an application database user with `readWrite` access only to the `cruisin` database.
3. Build the URI with an explicit database name:

   ```text
   mongodb+srv://<db-user>:<url-encoded-password>@<cluster-host>/cruisin?retryWrites=true&w=majority&appName=<app-name>
   ```

   A URI ending in `mongodb.net/?...` is rejected because MongoDB would otherwise select its default `test` database.

4. URL-encode the username and password. In a local Node shell, `encodeURIComponent(value)` produces the encoded credential.
5. Prefer Atlas network access restricted to Railway static outbound IPs. If the Railway plan has no static egress, use a tightly controlled temporary Atlas rule and strong least-privilege credentials; do not expose an administrative Atlas user.

## 2. Create the Railway services

1. Create one empty Railway project.
2. Add a Redis service from Railway’s database templates.
3. Add the same GitHub repository three times, naming the services `cruisin-api`, `cruisin-storefront`, and `cruisin-admin`.
4. Keep the root directory `/` for all three application services. The root lockfile is shared by all npm workspaces.
5. In each service’s settings, set the custom config file path shown in the table above.
6. Generate a public Railway domain for each application service.
7. Do not set `PORT`. Railway injects it, and all three start commands now bind to `0.0.0.0` on that assigned port.

The API config builds TypeScript, creates missing MongoDB indexes in a pre-deploy command, waits for `/ready`, and only then routes traffic to the new deployment. The index command does not seed products or users. It also removes the obsolete unique `categories.slug` index required by the hierarchical category model.

## 3. Backend variables

Set these on `cruisin-api`. Never put them in `NEXT_PUBLIC_*` variables.

| Variable | Initial Railway value | Requirement |
| --- | --- | --- |
| `NODE_ENV` | `production` | Required |
| `APP_ENV` | `staging` during Razorpay test mode | Use `production` only with live payments |
| `TRUST_PROXY` | `1` | Required behind Railway |
| `CLIENT_URL` | Storefront HTTPS origin | Exact origin, no path |
| `ADMIN_URL` | Admin HTTPS origin | Exact origin, no path |
| `MONGODB_URI` | Atlas URI containing `/cruisin` | Required, secret |
| `REDIS_URL` | Reference the Redis service’s `REDIS_URL` | Required, secret |
| `JWT_ACCESS_SECRET` | Unique random value, at least 32 characters | Required, secret |
| `JWT_REFRESH_SECRET` | Different random value, at least 32 characters | Required, secret |
| `JWT_ACCESS_EXPIRES` | `15m` | Required |
| `JWT_REFRESH_EXPIRES` | `7d` | Required |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | Required |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Required |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Required, secret |
| `RAZORPAY_KEY_ID` | Matching `rzp_test_...` key initially | Required |
| `RAZORPAY_KEY_SECRET` | Matching Razorpay test secret | Required, secret |
| `RAZORPAY_WEBHOOK_SECRET` | A dedicated webhook secret | Required, secret |
| `PAYMENT_MODE` | `test` initially | Switch to `live` with live keys |
| `SENDGRID_API_KEY` | SendGrid API key | Required, secret |
| `EMAIL_FROM` | Verified sender address | Required |
| `GOOGLE_CLIENT_ID` | Google OAuth web client ID | Required by current identity configuration |
| `TWILIO_ACCOUNT_SID` | Twilio account SID | Required by current identity configuration |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | Required, secret |
| `TWILIO_WHATSAPP_FROM` | Approved WhatsApp sender | Required |
| `TWILIO_WHATSAPP_CONTENT_SID` | Approved `whatsapp/authentication` Content SID (`HX...`) | Required before enabling WhatsApp OTP |

Optional backend variables:

- `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`: provide both or neither.
- `COD_ENABLED`, `COD_FEE`, and `MAX_COD_ORDER_VALUE`.
- `PARTIAL_PAYMENT_ENABLED`, `PARTIAL_PAYMENT_PERCENTAGE`, `PARTIAL_PAYMENT_FIXED_AMOUNT`, and `MIN_PARTIAL_PAYMENT_ORDER_VALUE`.
- `COOKIE_SAME_SITE`, `COOKIE_DOMAIN`, and `SENTRY_DSN`.
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` may replace `REDIS_URL`, but a Railway Redis service is the recommended topology.

Use Railway’s variable-reference picker to connect the Redis URL instead of copying the credential between services.

## 4. Storefront variables

Set these before building `cruisin-storefront`; Next.js embeds public variables at build time.

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | `https://<api-domain>/api/v1` |
| `NEXT_PUBLIC_SITE_URL` | Storefront HTTPS origin |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | The same public `rzp_test_...` key used by the API |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | The same Google web client ID used by the API |
| `NEXT_PUBLIC_WHATSAPP_OTP_ENABLED` | `true` only after the API authentication template is approved and configured |

Only the Razorpay key ID is public. Never add the Razorpay key secret or webhook secret to the storefront.

## 5. Admin variables

Set these before building `cruisin-admin`:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | `https://<api-domain>/api/v1` |
| `NEXT_PUBLIC_STOREFRONT_URL` | Storefront HTTPS origin |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `NEXT_PUBLIC_CLOUDINARY_API_KEY` | Cloudinary public API key |

Uploads use a server-generated Cloudinary signature. The Cloudinary API secret stays only on the API service.

## 6. Cookies, CORS, OAuth, and webhooks

- `CLIENT_URL` and `ADMIN_URL` are the only allowed browser origins. Include `https://` and omit trailing paths.
- With custom subdomains such as `shop.example.com`, `admin.example.com`, and `api.example.com`, keep `COOKIE_SAME_SITE=lax`. `COOKIE_DOMAIN` can normally remain unset because the refresh cookie only needs to return to the API.
- Use `COOKIE_SAME_SITE=none` only when the API and frontend are on different sites. Secure cookies are automatic because `NODE_ENV=production`.
- Add the deployed storefront origin to the Google OAuth web-client authorized JavaScript origins.
- Configure the Razorpay webhook URL as:

  ```text
  https://<api-domain>/api/v1/payments/webhooks/razorpay
  ```

- Subscribe to the payment, order, and refund events used by the account. Copy the webhook secret into `RAZORPAY_WEBHOOK_SECRET`, then redeploy the API.

## 7. First production bootstrap

The API no longer seeds or mutates storefront defaults during read requests. Run these commands exactly once with the API service’s Railway variables:

```bash
npm --workspace server run bootstrap:storefront
```

To create the first superadmin, temporarily add `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_NAME`, and a unique `BOOTSTRAP_ADMIN_PASSWORD` of at least 16 characters, then run:

```bash
npm --workspace server run bootstrap:admin
```

Run the commands from a Railway service shell or an attached Railway CLI session so they receive the API service variables. Remove all three bootstrap variables immediately afterward. The admin command is idempotent for an existing superadmin and refuses known development passwords.

Never run `seed`, `analytics:test:seed`, `analytics:test:cleanup`, or `migrate:identity` against the production Atlas database unless a separately reviewed migration explicitly requires it.

## 8. Deployment order

1. Redis.
2. API variables and API deployment.
3. Confirm `GET https://<api-domain>/health` returns liveness and `GET https://<api-domain>/ready` returns HTTP 200.
4. Run the one-time storefront and superadmin bootstrap commands.
5. Storefront variables and deployment.
6. Admin variables and deployment.
7. Update API `CLIENT_URL` and `ADMIN_URL` if Railway assigned different final domains, then redeploy the API.
8. Configure Google OAuth and Razorpay webhook URLs.
9. Complete the test-mode verification checklist.

## 9. Razorpay test-mode verification

Keep `NODE_ENV=production`, `APP_ENV=staging`, and `PAYMENT_MODE=test`.

1. Confirm both API and storefront key IDs have the `rzp_test_` prefix and belong to the same Razorpay account.
2. Sign in as a customer, add an in-stock variant, and place one online order.
3. Complete a Razorpay test payment.
4. Confirm the browser only displays “Order Confirmed” after server verification. A network or verification delay must display “Payment Verification Pending” and poll the authenticated order record.
5. Confirm the order shows `paid` in My Orders and the admin dashboard.
6. Confirm the Razorpay webhook delivery receives HTTP 200 and a duplicate delivery does not duplicate the event.
7. Test a failed payment and confirm it never appears as paid.
8. Test COD separately if enabled.
9. Test partial payment and refunds only after their related variables and Razorpay account capabilities are configured.

## 10. Switch to live payments

1. Complete all test-mode checks.
2. Replace the API Razorpay key ID, key secret, and webhook secret with live credentials.
3. Replace `NEXT_PUBLIC_RAZORPAY_KEY_ID` on the storefront with the matching live public key.
4. Set API `PAYMENT_MODE=live` and `APP_ENV=production`.
5. Redeploy both API and storefront.
6. Create a low-value real order, confirm capture and webhook reconciliation, then refund it from the admin dashboard.

The API intentionally refuses `APP_ENV=production` with test payment mode and refuses mismatched Razorpay key prefixes.

## 11. CI and rollback

GitHub Actions uses only `mongodb://localhost:27017/cruisin-test` and local Redis. It runs type checks, unit tests, production builds, index creation, an isolated seed, and Playwright. Never replace the CI Mongo URI with Atlas.

Railway retains previous deployments for rollback. If an application deployment fails its health check, inspect API logs for a named configuration error, Atlas network denial, Redis connectivity, or index conflict. Logs are console-only and redact common credential fields and URI passwords.
