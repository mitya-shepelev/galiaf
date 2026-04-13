FROM node:20-alpine AS builder

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-workspace.yaml turbo.json biome.json ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @galiaf/sdk build
RUN pnpm --filter @galiaf/web-manager-cabinet build

FROM node:20-alpine AS runner

ENV NODE_ENV=production
ENV PORT=3002

WORKDIR /app

COPY --from=builder /app/apps/web/manager-cabinet/.next/standalone ./
COPY --from=builder /app/apps/web/manager-cabinet/.next/static ./apps/web/manager-cabinet/.next/static

EXPOSE 3002

CMD ["node", "apps/web/manager-cabinet/server.js"]
