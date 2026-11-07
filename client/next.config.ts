// Governed by .rules v1.0
import type { NextConfig } from 'next';
import {mediaDeliveryConfig} from '@cruisin/contracts/media-config';
const mediaDelivery=mediaDeliveryConfig(process.env.NEXT_PUBLIC_MEDIA_DELIVERY_ORIGIN);

const publicApiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';
const apiProxyTarget = process.env.API_PROXY_TARGET?.replace(/\/$/, '');
const apiOrigin = (() => { try { return new URL(publicApiUrl).origin; } catch { return "'self'"; } })();
const developmentScriptSource = process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : '';
const securityHeaders = [
  { key: 'Content-Security-Policy', value: `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'; script-src 'self' 'unsafe-inline'${developmentScriptSource} https://accounts.google.com https://checkout.razorpay.com https://connect.facebook.net; style-src 'self' 'unsafe-inline' https://accounts.google.com; img-src 'self' data: blob: ${apiOrigin} ${mediaDelivery.origin} https://images.unsplash.com https://res.cloudinary.com https://placehold.co https://s3.ap-south-1.amazonaws.com https://*.googleusercontent.com https://www.facebook.com; font-src 'self' data:; connect-src 'self' ${apiOrigin} https://accounts.google.com https://api.razorpay.com https://lumberjack.razorpay.com https://www.facebook.com https://www.facebook.net https://mpc2-prod-21-is5qnl632q-uc.a.run.app https://5z-2b6b7616f94640c2840d1841e1ac24c3.ecs.us-east-1.on.aws; frame-src https://accounts.google.com https://api.razorpay.com https://checkout.razorpay.com; media-src 'self' blob: https:; worker-src 'self' blob:` },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://checkout.razorpay.com")' }
];

const nextConfig: NextConfig = {
  transpilePackages: ['@cruisin/ui'],
  async headers() { return [{ source: '/(.*)', headers: securityHeaders }, {source:'/cms-preview/:path*',headers:[{key:'Cache-Control',value:'private, no-store'},{key:'Referrer-Policy',value:'no-referrer'},{key:'X-Robots-Tag',value:'noindex, nofollow'}]}]; },
  async rewrites() {
    return apiProxyTarget ? [{ source: '/api/v1/:path*', destination: `${apiProxyTarget}/api/v1/:path*` }] : [];
  },
  images: {
    unoptimized: process.env.NODE_ENV !== 'production' || ['localhost', '127.0.0.1'].includes(new URL(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1').hostname),
    qualities: [60, 75, 85, 92],
    remotePatterns: [...mediaDelivery.patterns,...(() => { try { const u = new URL(process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8192/api/v1'); return [{ protocol: u.protocol.replace(':','') as 'http' | 'https', hostname: u.hostname, port: u.port, pathname: '/api/v1/media/**' }]; } catch { return []; } })(),
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: 's3.ap-south-1.amazonaws.com' }
    ]
  }
};

export default nextConfig;
