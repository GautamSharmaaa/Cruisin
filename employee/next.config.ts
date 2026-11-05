import type { NextConfig } from "next";
import {mediaDeliveryConfig} from '@cruisin/contracts/media-config';
const mediaDelivery=mediaDeliveryConfig(process.env.NEXT_PUBLIC_MEDIA_DELIVERY_ORIGIN);
const apiOrigin = new URL(
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8192/api/v1",
).origin;
const config: NextConfig = {
  images:{remotePatterns:[...mediaDelivery.patterns]},
  transpilePackages: ["@cruisin/ui", "@cruisin/operations-ui"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: `default-src 'self'; script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: ${apiOrigin} ${mediaDelivery.origin}; connect-src 'self' ${apiOrigin}; media-src 'self' blob: ${apiOrigin} ${mediaDelivery.origin}; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'`,
          },
        ],
      },
    ];
  },
};
export default config;
