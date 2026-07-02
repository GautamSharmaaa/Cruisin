// Governed by .rules v1.0
import type { NextConfig } from 'next';
const nextConfig: NextConfig = { images: { unoptimized: process.env.NODE_ENV !== 'production', remotePatterns: [{ protocol: 'https', hostname: 'images.unsplash.com' }, { protocol: 'https', hostname: 'res.cloudinary.com' }] } };
export default nextConfig;
