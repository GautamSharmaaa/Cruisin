# WhatsApp OTP Login Setup

Cruisin's WhatsApp login uses the existing Twilio WhatsApp sender and a Twilio
Content Template of type `whatsapp/authentication`. The API generates a six-digit
code, stores only its bcrypt hash, enforces a 60-second resend cooldown, expires
the request after five minutes, and limits verification attempts.

## 1. Create the authentication template

1. In Twilio Console, open **Messaging → Content Template Builder**.
2. Select **Create new** and choose **WhatsApp Authentication**.
3. Use the copy-code authentication format. The code is variable `{{1}}`.
4. Add the five-minute expiry/security advisory if Twilio offers those options.
5. Submit the template for WhatsApp approval.
6. Wait until its status is **Approved**. Do not enable storefront OTP while it is
   Pending, Rejected, Paused, or Disabled.
7. Copy the Twilio Content SID. It starts with `HX` and is safe to store as normal
   server configuration, but it must never be substituted for the Auth Token.

## 2. Configure the Railway API

On the `cruisin-api` service, keep the existing values and add:

```text
TWILIO_ACCOUNT_SID=<existing AC... account SID>
TWILIO_AUTH_TOKEN=<existing secret auth token>
TWILIO_WHATSAPP_FROM=+918826608612
TWILIO_WHATSAPP_CONTENT_SID=<approved HX... content SID>
```

The sender may also be entered with a `whatsapp:` prefix; the API normalizes it.
Redeploy the API and confirm `/health` is healthy before enabling the storefront.

## 3. Configure the Railway storefront

WhatsApp OTP is the default storefront login once this implementation is deployed.
You may explicitly add the following on the `cruisin-storefront` service:

```text
NEXT_PUBLIC_WHATSAPP_OTP_ENABLED=true
```

This is a build-time Next.js variable. To disable the login method without removing
Twilio configuration, set the value to `false` and redeploy the storefront.

## 4. Safe production verification

1. Open `/login` in a private browser window.
2. Confirm **Continue with WhatsApp** is the primary option.
3. Enter a consenting WhatsApp number in E.164 format (India: `+91` plus 10 digits).
4. Confirm one authentication-template message arrives from the Cruisin sender.
5. Enter a wrong code once and confirm login is rejected.
6. Enter a fresh valid code and confirm the account session is created.
7. Confirm resend is disabled for 60 seconds and an old code expires after five
   minutes.
8. In Twilio Messaging logs, verify delivery without copying phone numbers, codes,
   tokens, or message bodies into reports.

Never place `TWILIO_AUTH_TOKEN` in a `NEXT_PUBLIC_` variable, source control,
screenshots, browser logs, or support reports.
