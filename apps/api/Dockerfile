# syntax=docker/dockerfile:1.7
# Build context: repository root (see docker-compose.yml)

ARG NODE_VERSION=24
ARG PNPM_VERSION=12.3.4

# ----- base: node + pnpm ------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS base
ARG PNPM_VERSION
RUN npm install -g pnpm@${PNPM_VERSION} && apk add --no-cache libc6-compat
WORKDIR /repo

# ----- deps: install the full workspace subset needed by the API --------------
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps/api/package.json apps/api/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/tsconfig/package.json packages/tsconfig/
COPY packages/eslint-config/package.json packages/eslint-config/
RUN pnpm install --frozen-lockfile --filter "@osgb/api..."

# ----- build: compile shared-types + API (also used for migrations) -----------
FROM deps AS build
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm --filter @osgb/shared-types build \
 && pnpm --filter @osgb/api prisma:generate \
 && pnpm --filter @osgb/api build
# Default command for the one-off migration container
CMD ["pnpm", "--filter", "@osgb/api", "prisma:migrate:deploy"]

# ----- prod-deps: production dependencies only --------------------------------
FROM base AS prod-deps
ENV NODE_ENV=production
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps/api/package.json apps/api/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/tsconfig/package.json packages/tsconfig/
COPY packages/eslint-config/package.json packages/eslint-config/
RUN pnpm install --frozen-lockfile --prod --filter "@osgb/api..."

# ----- runtime ----------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS runtime
ENV NODE_ENV=production
RUN apk add --no-cache libc6-compat && addgroup -S osgb && adduser -S osgb -G osgb
WORKDIR /repo
COPY --from=prod-deps --chown=osgb:osgb /repo/node_modules ./node_modules
COPY --from=prod-deps --chown=osgb:osgb /repo/apps/api/node_modules ./apps/api/node_modules
COPY --from=build --chown=osgb:osgb /repo/packages/shared-types/package.json ./packages/shared-types/package.json
COPY --from=build --chown=osgb:osgb /repo/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=build --chown=osgb:osgb /repo/apps/api/package.json ./apps/api/package.json
COPY --from=build --chown=osgb:osgb /repo/apps/api/dist ./apps/api/dist
COPY --from=build --chown=osgb:osgb /repo/apps/api/src/generated ./apps/api/src/generated
COPY --from=build --chown=osgb:osgb /repo/apps/api/tessdata ./apps/api/tessdata
COPY --from=build --chown=osgb:osgb /repo/package.json ./package.json
USER osgb
WORKDIR /repo/apps/api
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD wget -qO- http://127.0.0.1:${API_PORT:-3000}/health/live || exit 1
CMD ["node", "dist/main.js"]
