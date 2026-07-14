// Governed by .rules v1.0
import type { NextConfig } from 'next';

const apiOrigin = (() => { try { return new URL(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1').origin; } catch { return 'http://localhost:8000'; } })();
const developmentScriptSource = process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : '';
const securityHeaders = [
  { key: 'Content-Security-Policy', value: `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'; script-src 'self' 'unsafe-inline'${developmentScriptSource} https://accounts.google.com https://checkout.razorpay.com; style-src 'self' 'unsafe-inline' https://accounts.google.com; img-src 'self' data: blob: https://images.unsplash.com https://res.cloudinary.com https://placehold.co https://s3.ap-south-1.amazonaws.com https://*.googleusercontent.com; font-src 'self' data:; connect-src 'self' ${apiOrigin} https://accounts.google.com https://api.razorpay.com https://lumberjack.razorpay.com; frame-src https://accounts.google.com https://api.razorpay.com https://checkout.razorpay.com; media-src 'self' blob: https:; worker-src 'self' blob:` },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://checkout.razorpay.com")' }
];

const nextConfig: NextConfig = {
  async headers() { return [{ source: '/(.*)', headers: securityHeaders }]; },
  images: {
    unoptimized: process.env.NODE_ENV !== 'production',
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: 's3.ap-south-1.amazonaws.com' }
    ]
  }
};

export default nextConfig;
