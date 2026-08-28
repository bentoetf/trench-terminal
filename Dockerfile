# https://github.com/vercel/next.js/blob/canary/examples/with-docker/Dockerfile
FROM node:20-slim AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install

FROM base AS builder
WORKDIR /app
# NEXT_PUBLIC_* vars are inlined at build time; Render passes env vars as
# docker build args, but they must be declared here to reach next build.
ARG NEXT_PUBLIC_PAPER_API
ARG NEXT_PUBLIC_ORDERLY_NETWORK
ARG NEXT_PUBLIC_ORDERLY_BROKER_NAME
ARG NEXT_PUBLIC_ORDERLY_BROKER_ID
ENV NEXT_PUBLIC_PAPER_API=$NEXT_PUBLIC_PAPER_API \
    NEXT_PUBLIC_ORDERLY_NETWORK=$NEXT_PUBLIC_ORDERLY_NETWORK \
    NEXT_PUBLIC_ORDERLY_BROKER_NAME=$NEXT_PUBLIC_ORDERLY_BROKER_NAME \
    NEXT_PUBLIC_ORDERLY_BROKER_ID=$NEXT_PUBLIC_ORDERLY_BROKER_ID
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

ENV PORT=3000
# set hostname to localhost
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]