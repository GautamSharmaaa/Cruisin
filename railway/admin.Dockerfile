# Governed by .rules v1.0
# Keep the admin deployment independent from Railpack's runtime provisioning.
FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY admin/package.json ./admin/package.json
COPY client/package.json ./client/package.json
COPY server/package.json ./server/package.json
COPY employee/package.json ./employee/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY packages/ui/package.json ./packages/ui/package.json
COPY packages/operations-ui/package.json ./packages/operations-ui/package.json

# The Next.js build requires development dependencies even when the deployed
# service itself runs with NODE_ENV=production.
RUN npm ci --include=dev

COPY admin ./admin
COPY packages ./packages

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_STOREFRONT_URL
ARG NEXT_PUBLIC_EMPLOYEE_URL
ARG NEXT_PUBLIC_MEDIA_DELIVERY_ORIGIN

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_STOREFRONT_URL=$NEXT_PUBLIC_STOREFRONT_URL \
    NEXT_PUBLIC_EMPLOYEE_URL=$NEXT_PUBLIC_EMPLOYEE_URL \
    NEXT_PUBLIC_MEDIA_DELIVERY_ORIGIN=$NEXT_PUBLIC_MEDIA_DELIVERY_ORIGIN

RUN npm --workspace admin run build

ENV NODE_ENV=production

CMD ["npm", "--workspace", "admin", "run", "start"]
