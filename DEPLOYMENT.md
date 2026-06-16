<!-- Governed by .rules v1.0 -->

# Deployment Guide

1. Provision MongoDB and Redis.
2. Configure Cloudinary, Razorpay, Stripe, SendGrid, Google OAuth, and Twilio WhatsApp credentials.
3. Deploy server/ to Render using render.yaml.
4. Deploy client/ and admin/ to Vercel with NEXT_PUBLIC_API_URL pointed at the API /api/v1 base URL.
5. Set `APP_ENV=production`, production CORS values (`CLIENT_URL`, `ADMIN_URL`), and cookie settings. Use `COOKIE_SAME_SITE=none` when the API and frontend are on different sites; Secure cookies are enforced by `NODE_ENV=production`.
6. Add `NEXT_PUBLIC_GOOGLE_CLIENT_ID` to the storefront deployment and keep all provider secrets server-side.
7. Run smoke checks for email, Google, WhatsApp OTP, refresh/logout, signed uploads, checkout order creation, payment verification, and dashboard role access.
