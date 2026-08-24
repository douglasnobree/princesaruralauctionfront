# Dependências usadas na compilação
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Compilação do Next.js
FROM node:20-alpine AS builder

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_AUCTION_ENGINE_WS_URL
ARG NEXT_PUBLIC_MARKETPLACE_URL
ARG NEXT_PUBLIC_AUCTION_APP_URL

ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV NEXT_PUBLIC_AUCTION_ENGINE_WS_URL=${NEXT_PUBLIC_AUCTION_ENGINE_WS_URL}
ENV NEXT_PUBLIC_MARKETPLACE_URL=${NEXT_PUBLIC_MARKETPLACE_URL}
ENV NEXT_PUBLIC_AUCTION_APP_URL=${NEXT_PUBLIC_AUCTION_APP_URL}

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Imagem mínima de execução
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -S nodejs -g 1001 \
    && adduser -S nextjs -u 1001

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next

USER nextjs

EXPOSE 3000

CMD ["npm", "run", "start", "--", "-p", "3000", "-H", "0.0.0.0"]
