// Governed by .rules v1.0
import type { NextConfig } from 'next';
import {mediaDeliveryConfig} from '@cruisin/contracts/media-config';
const mediaDelivery=mediaDeliveryConfig(process.env.NEXT_PUBLIC_MEDIA_DELIVERY_ORIGIN);
const apiOrigin = (() => { try { return new URL(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1').origin; } catch { return 'http://localhost:8000'; } })();
const developmentScriptSource = process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : '';
const cmsStorefrontOrigin=new URL(process.env.NEXT_PUBLIC_STOREFRONT_URL??'http://127.0.0.1:3192').origin;
const securityHeaders = [
  { key: 'Content-Security-Policy', value: `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline'${developmentScriptSource} https://accounts.google.com; style-src 'self' 'unsafe-inline' https://accounts.google.com; img-src 'self' data: blob: ${apiOrigin} ${mediaDelivery.origin} https://images.unsplash.com https://res.cloudinary.com https://placehold.co https://s3.ap-south-1.amazonaws.com https://*.googleusercontent.com; font-src 'self' data:; connect-src 'self' ${apiOrigin} https://accounts.google.com https://api.cloudinary.com; frame-src https://accounts.google.com ${cmsStorefrontOrigin}; media-src 'self' blob: https:; worker-src 'self' blob:` },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' }
];
const nextConfig: NextConfig = {
  transpilePackages: ['@cruisin/ui', '@cruisin/operations-ui'], async headers() { return [{ source: '/(.*)', headers: securityHeaders },...['/inventory','/units','/fulfillment','/tasks'].map(source=>({source,headers:[{key:'Permissions-Policy',value:'camera=(self), microphone=(), geolocation=(), payment=()'}]}))]; }, images: { unoptimized: process.env.NODE_ENV !== 'production' || ['localhost', '127.0.0.1'].includes(new URL(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1').hostname), remotePatterns: [...mediaDelivery.patterns,...(() => { try { const u = new URL(process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8192/api/v1'); return [{ protocol: u.protocol.replace(':','') as 'http' | 'https', hostname: u.hostname, port: u.port, pathname: '/api/v1/media/**' }]; } catch { return []; } })(), { protocol: 'https', hostname: 'images.unsplash.com' }, { protocol: 'https', hostname: 'res.cloudinary.com' }, { protocol: 'https', hostname: 'placehold.co' }, { protocol: 'https', hostname: 's3.ap-south-1.amazonaws.com' }] } };
export default nextConfig;
