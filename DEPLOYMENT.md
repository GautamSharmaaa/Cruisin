<!-- Governed by .rules v1.0 -->

# Deployment Guide

1. Provision MongoDB and Redis.
2. Configure Cloudinary, Razorpay, Stripe, and SendGrid credentials.
3. Deploy server/ to Render using render.yaml.
4. Deploy client/ and admin/ to Vercel with NEXT_PUBLIC_API_URL pointed at the API /api/v1 base URL.
5. Set production CORS values: CLIENT_URL and ADMIN_URL.
6. Run smoke checks for auth, signed uploads, checkout order creation, payment verification, and dashboard role access.
