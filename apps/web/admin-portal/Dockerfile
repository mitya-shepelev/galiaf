FROM node:20-alpine AS builder

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-workspace.yaml turbo.json biome.json ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @galiaf/web-admin-portal build

FROM node:20-alpine AS runner

ENV NODE_ENV=production
ENV PORT=3001

WORKDIR /app

COPY --from=builder /app/apps/web/admin-portal/.next/standalone ./
COPY --from=builder /app/apps/web/admin-portal/.next/static ./apps/web/admin-portal/.next/static

EXPOSE 3001

CMD ["node", "apps/web/admin-portal/server.js"]
