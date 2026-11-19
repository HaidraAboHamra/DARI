# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate
WORKDIR /repo

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/tsconfig/package.json packages/tsconfig/
COPY packages/contracts/package.json packages/contracts/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter @dari/web...
COPY packages packages
COPY apps/web apps/web
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @dari/contracts build && pnpm --filter @dari/web build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
