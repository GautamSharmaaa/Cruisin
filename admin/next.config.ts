// Governed by .rules v1.0
import type { NextConfig } from 'next';
const nextConfig: NextConfig = { images: { remotePatterns: [{ protocol: 'https', hostname: 'images.unsplash.com' }, { protocol: 'https', hostname: 'res.cloudinary.com' }] } };
export default nextConfig;
