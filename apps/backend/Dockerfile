# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/

RUN npm ci -w @expense-tracker/backend

FROM node:22-alpine AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json /app/package-lock.json ./
COPY --from=deps /app/apps/backend/package.json ./apps/backend/package.json
COPY apps/backend ./apps/backend

WORKDIR /app/apps/backend
RUN npx prisma generate && npx tsc -p tsconfig.json && cp -r src/generated dist/generated

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

RUN addgroup -S app && adduser -S app -G app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json /app/package-lock.json ./
COPY apps/backend/package.json ./apps/backend/package.json
COPY apps/backend/prisma ./apps/backend/prisma
COPY apps/backend/prisma.config.ts ./apps/backend/prisma.config.ts
COPY --from=build /app/apps/backend/dist ./apps/backend/dist
COPY apps/backend/docker-entrypoint.sh ./apps/backend/docker-entrypoint.sh

RUN chmod +x ./apps/backend/docker-entrypoint.sh \
  && chown -R app:app /app

USER app
WORKDIR /app/apps/backend
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4000/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["./docker-entrypoint.sh"]
