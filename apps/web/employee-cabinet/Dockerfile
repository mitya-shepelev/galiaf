FROM node:20-alpine AS builder

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-workspace.yaml turbo.json biome.json ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @galiaf/web-employee-cabinet build

FROM node:20-alpine AS runner

ENV NODE_ENV=production
ENV PORT=3003

WORKDIR /app

COPY --from=builder /app/apps/web/employee-cabinet/.next/standalone ./
COPY --from=builder /app/apps/web/employee-cabinet/.next/static ./apps/web/employee-cabinet/.next/static

EXPOSE 3003

CMD ["node", "apps/web/employee-cabinet/server.js"]
