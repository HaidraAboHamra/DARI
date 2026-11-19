# syntax=docker/dockerfile:1.7
# Builds the API image. The same image runs the HTTP server and the worker
# (different command), so both always ship the same code.
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate
WORKDIR /repo

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/tsconfig/package.json packages/tsconfig/
COPY packages/contracts/package.json packages/contracts/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter @dari/api...
COPY packages packages
COPY apps/api apps/api
RUN pnpm --filter @dari/contracts build && pnpm --filter @dari/api build \
 && pnpm deploy --filter @dari/api --prod --legacy /out

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out .
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/drizzle ./drizzle
USER node
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=3s CMD wget -qO- http://127.0.0.1:4000/health/live || exit 1
CMD ["node", "dist/main.js"]
