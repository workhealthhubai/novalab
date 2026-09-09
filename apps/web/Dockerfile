# syntax=docker/dockerfile:1.7
# Build context: repository root (see docker-compose.yml)
ARG NODE_VERSION=24
ARG PNPM_VERSION=12.3.4

FROM node:${NODE_VERSION}-alpine AS build
ARG PNPM_VERSION
ARG VITE_API_BASE_URL=/api
ARG VITE_OHIF_VIEWER_PATH=/viewer
ARG VITE_APP_NAME="OSGB Platform"
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL} VITE_OHIF_VIEWER_PATH=${VITE_OHIF_VIEWER_PATH} VITE_APP_NAME=${VITE_APP_NAME}
RUN npm install -g pnpm@${PNPM_VERSION}
WORKDIR /repo
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps/web/package.json apps/web/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/tsconfig/package.json packages/tsconfig/
COPY packages/eslint-config/package.json packages/eslint-config/
RUN pnpm install --frozen-lockfile --filter "@osgb/web..."
COPY packages ./packages
COPY apps/web ./apps/web
# The browser-side OCR uses the same MRZ model as the API (copied into public/ocr by the build).
COPY apps/api/tessdata ./apps/api/tessdata
RUN pnpm --filter @osgb/shared-types build && pnpm --filter @osgb/web build

FROM nginx:1.30-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
