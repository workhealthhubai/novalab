# OSGB Platform

Production-oriented boilerplate for a **multi-tenant OSGB (Ortak Sağlık ve Güvenlik Birimi / occupational health & safety) SaaS platform**.

It is intentionally _not_ a finished business application. It provides the skeleton every later feature builds on: tenant isolation, authentication, RBAC + permissions, audit logging, background jobs, object storage, PACS/DICOM integration, a viewer, an admin web shell, tests, CI and containerised infrastructure.

| Layer           | Technology                                                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend        | Vite · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui (Radix) · React Router · Lucide (Phase 1: design system + navigation shell) |
| Backend         | NestJS 12 (modular monolith) · Prisma 7 · class-validator · Swagger/OpenAPI · nestjs-pino                                             |
| Data            | PostgreSQL 17 (app + separate Orthanc index DB) · Redis 7 + BullMQ · MinIO (S3)                                                       |
| Medical imaging | Orthanc (PACS, DICOMweb) · OHIF Viewer                                                                                                |
| Edge            | Nginx (single public entry point)                                                                                                     |
| Tooling         | pnpm workspaces · Turborepo · ESLint 10 (flat) · Prettier · Jest · Supertest · Vitest · GitHub Actions · Docker Compose               |

---

## Table of contents

1. [Architecture](#1-architecture)
2. [Requirements](#2-requirements)
3. [Installation](#3-installation)
4. [Local development](#4-local-development)
5. [Docker startup](#5-docker-startup)
6. [Environment configuration](#6-environment-configuration)
7. [Database migrations](#7-database-migrations)
8. [Prisma commands](#8-prisma-commands)
9. [Orthanc setup](#9-orthanc-setup)
10. [OHIF setup](#10-ohif-setup)
11. [MinIO setup](#11-minio-setup)
12. [Authentication flow](#12-authentication-flow)
13. [Multi-tenancy approach](#13-multi-tenancy-approach)
14. [Permissions](#14-permissions)
15. [Testing](#15-testing)
16. [Production deployment considerations](#16-production-deployment-considerations)
17. [Repository layout](#17-repository-layout)
18. [Deliberate TODOs](#18-deliberate-todos)

---

## 1. Architecture

```
                         Users (browser)
                               |
                               v
                     +-------------------+
                     |       Nginx       |   :8080 (only published port)
                     +-------------------+
                       |      |      |   \
        /              |      | /api |    \ /viewer            /dicom-web (auth_request -> API)
                       v      |      |     v                         |
              +-----------+   |      |  +-------------+              |
              | React Web |   |      |  | OHIF Viewer |              |
              +-----------+   |      |  +-------------+              |
                              v      |                               v
                     +-------------------+                 +-------------------+
                     |    NestJS API     |---- REST ------>|      Orthanc      |
                     +-------------------+   (basic auth)  |   (PACS/DICOMweb) |
                       |     |     |                       +-------------------+
                       |     |     |                          |            |
                       v     v     v                          v            v
              +----------+ +-----------+ +-------+   +----------------+ +---------------+
              | Postgres | | Redis /   | | MinIO |   | Postgres       | | DICOM storage |
              |  (osgb)  | | BullMQ    | |       |   | (orthanc index)| | volume        |
              +----------+ +-----------+ +-------+   +----------------+ +---------------+
```

Key decisions:

- **Modular monolith.** One NestJS process, one deployable, but every domain is a self-contained module (`apps/api/src/modules/*`) with its own controller, service, repository and DTOs. Cross-cutting infrastructure (config, logging, Prisma, Redis, MinIO, Orthanc, queues, audit) is provided by global modules under `src/infrastructure` and `src/modules/audit`.
- **Tenant isolation lives in the repository layer.** Every business table has `tenantId`; every repository method takes the tenant id as its first argument and puts it in the `WHERE` clause. The tenant id always comes from the authenticated principal (`@CurrentTenant()`), never from the request body/query.
- **Medical data is a separate concern.** Examination and radiology endpoints are marked with `@MedicalData()`. A dedicated `MedicalDataGuard` runs after the permission guard, requires a medical permission, writes a `MEDICAL_DATA_ACCESS` audit entry and is the single place to add stricter policies later (physician-only, purpose-of-use, break-glass). List queries omit clinical free text; logs redact it.
- **DICOM never touches the application database.** Orthanc owns pixel data (own PostgreSQL database for its index + its own volume). The app stores only references (`orthancStudyId`, `orthancPatientId`, `studyInstanceUid`).
- **The browser never talks to Orthanc or MinIO with credentials.** DICOMweb is reachable only through Nginx, which injects the Orthanc credentials and gates access with an `auth_request` to the API (short-lived viewer cookie). Documents are served through short-lived presigned MinIO URLs generated by the API.
- **Background work through BullMQ** with four queues (`notifications`, `reports`, `documents`, `scheduled-jobs`). Workers run inside the API process for now and can be split into a worker deployment by importing only `QueueModule`.
- **Fail fast configuration.** `apps/api/src/config/env.schema.ts` (zod) validates every variable at boot; production refuses placeholder secrets and a missing `CORS_ORIGIN`.
- **Uniform API contract.** Success: `{ success: true, data, meta?, requestId }`. Error: `{ success: false, error: { code, message, details? }, requestId, timestamp, path }`. Every response carries `X-Request-Id`, which is also attached to every log line.

## 2. Requirements

- Node.js **≥ 24** (the Docker images use `node:24-alpine`)
- pnpm **12** (`npm i -g pnpm@12` — the exact version is pinned in `package.json#packageManager`)
- Docker Engine ≥ 24 with Docker Compose v2.24+ (the dev override uses the `!override` tag)
- ~4 GB RAM free for the full stack (Orthanc + OHIF + MinIO + Postgres + Redis)

## 3. Installation

```bash
git clone <repo> osgb-platform && cd osgb-platform
cp .env.example .env
pnpm install
pnpm build            # builds shared-types, API and web (also generates the Prisma client)
```

pnpm only runs the lifecycle scripts of the native packages listed in `pnpm-workspace.yaml#allowBuilds` (argon2, Prisma engines, esbuild, ...). `minimumReleaseAge: 1440` delays brand-new package versions by 24 h as supply-chain protection.

## 4. Local development

Run the infrastructure in Docker and the two apps on the host (fast reloads, debuggable):

```bash
# 1. Infrastructure: Postgres, Redis, MinIO, Orthanc, OHIF and Nginx (dev override publishes their ports)
pnpm docker:infra
#    equivalent to: docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d postgres redis minio orthanc ohif nginx

# 2. Database
pnpm db:migrate       # prisma migrate dev (creates/applies migrations, generates client)
pnpm db:seed          # permissions, demo tenant, system roles, admin user, sample company

# 3. Apps (Turborepo runs both in watch mode)
pnpm dev
```

| What                                        | URL                                                                                                              |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Web (Vite)                                  | http://localhost:5173 (proxies `/api` to the API)                                                                |
| API                                         | http://localhost:3000/api · Swagger: http://localhost:3000/api/docs · health: http://localhost:3000/health/ready |
| Everything through Nginx (as in production) | http://localhost:8080 — web, `/api`, `/viewer`, `/dicom-web`                                                     |
| Orthanc UI (dev only)                       | http://localhost:8042 (`ORTHANC_USERNAME` / `ORTHANC_PASSWORD`)                                                  |
| MinIO console (dev only)                    | http://localhost:9001 (`MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY`)                                                  |

Default seed login: `admin@demo.local` / `Admin123!` (tenant `demo`).

Other useful root commands: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm format`, `pnpm db:studio`.

## 5. Docker startup

Full stack, production-like (only Nginx is published):

```bash
cp .env.example .env          # then change every secret!
docker compose up -d --build
docker compose ps             # wait until everything is healthy
docker compose logs -f api
```

What happens:

1. `postgres` starts; the init script creates the `orthanc` database and role.
2. `api-migrate` (one-off container built from the API `build` stage) runs `prisma migrate deploy` and exits.
3. `api` starts only after migrations succeeded and Postgres/Redis/MinIO/Orthanc are healthy.
4. `nginx` publishes `http://localhost:${NGINX_HTTP_PORT:-8080}`.

Seed the database inside Docker (once):

```bash
docker compose run --rm api-migrate pnpm --filter @osgb/api prisma:seed
```

The seed reads `SEED_*` and `NODE_ENV` from `.env`. With `NODE_ENV=production` it refuses to create the demo admin unless `SEED_ADMIN_PASSWORD` is set to a non-default value.

Stop / reset:

```bash
docker compose down            # keep volumes
docker compose down -v         # destroy data (Postgres, Redis, MinIO, Orthanc)
```

Development override (`docker-compose.dev.yml`) publishes Postgres 5432, Redis 6379, MinIO 9000/9001, Orthanc 8042/4242, OHIF 3001, API 3000, and points Nginx at the Vite/Nest processes on the host.

## 6. Environment configuration

Everything is read from environment variables; `.env.example` documents each one. The API validates them at start-up (`apps/api/src/config/env.schema.ts`) and prints every problem at once.

| Variable                                                                                                                | Purpose                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `NODE_ENV`                                                                                                              | `development` · `test` · `production` (production enables strict checks)                   |
| `WEB_PORT`, `API_PORT`, `NGINX_HTTP_PORT`                                                                               | Ports for Vite, Nest and the published Nginx port                                          |
| `API_PREFIX`                                                                                                            | URL prefix of the API (`api` → `/api/...`); health endpoints are not prefixed              |
| `DATABASE_URL`                                                                                                          | Prisma connection string for the **application** database                                  |
| `POSTGRES_*`, `ORTHANC_DB_*`                                                                                            | Used by Docker Compose to create both databases/users                                      |
| `REDIS_URL`                                                                                                             | `redis://[:password@]host:port[/db]`; used by the app client and BullMQ                    |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`                                                                               | ≥ 32 chars, must differ in production (`./scripts/generate-secrets.sh`)                    |
| `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`                                                                       | Durations (`15m`, `7d`, `3600`)                                                            |
| `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_USE_SSL`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`, `MINIO_REGION` | Object storage; the bucket is created on start-up if missing                               |
| `ORTHANC_URL`, `ORTHANC_USERNAME`, `ORTHANC_PASSWORD`                                                                   | Server-side PACS access (never sent to the browser)                                        |
| `ORTHANC_BASIC_AUTH_B64`                                                                                                | `base64(user:password)` used by Nginx for `/dicom-web` (`./scripts/orthanc-basic-auth.sh`) |
| `OHIF_VIEWER_PATH`                                                                                                      | Public path of the viewer (`/viewer`)                                                      |
| `CORS_ORIGIN`                                                                                                           | Comma-separated allowed origins (required in production)                                   |
| `REQUEST_BODY_LIMIT`, `RATE_LIMIT_TTL`, `RATE_LIMIT_LIMIT`, `TRUST_PROXY`, `SWAGGER_ENABLED`, `LOG_LEVEL`               | Hardening / observability knobs                                                            |
| `SEED_*`                                                                                                                | Demo tenant + admin created by `pnpm db:seed`                                              |
| `VITE_*`                                                                                                                | The only variables embedded in the browser bundle                                          |

The API loads `.env` from its own directory **and** from the repository root, so a single root `.env` serves the monorepo. Inside Docker, Compose passes the variables explicitly (see `docker-compose.yml`) and overrides hostnames (`postgres`, `redis`, `minio`, `orthanc`).

## 7. Database migrations

Prisma Migrate is the only way the schema changes.

```bash
pnpm db:migrate                 # dev: create a migration from schema changes and apply it
pnpm db:migrate:deploy          # prod/CI: apply pending migrations, never creates new ones
pnpm --filter @osgb/api prisma:migrate:reset   # dev only: drop, re-apply everything, re-seed
```

Migrations live in `apps/api/prisma/migrations` and are committed. CI applies them to a fresh PostgreSQL and then runs `prisma migrate diff --exit-code` to guarantee that migrations and `schema.prisma` never drift apart. In Docker, the `api-migrate` service applies them before the API starts.

Conventions in `schema.prisma`:

- UUID primary keys (`@db.Uuid`), `createdAt` / `updatedAt` everywhere, `deletedAt` for soft-deletable entities.
- `tenantId` on every business table with composite indexes starting with `tenantId`.
- Prisma 7 driver-adapter setup: the connection URL lives in `prisma.config.ts`, the client is generated into `src/generated/prisma` (git-ignored) with the `prisma-client` generator and used through `@prisma/adapter-pg`.
- `passwordHash` is omitted from every `User` query at client level (`omit`); only the login path opts back in.

## 8. Prisma commands

| Command (run from repo root)                | Description                                               |
| ------------------------------------------- | --------------------------------------------------------- |
| `pnpm db:generate`                          | Regenerate the client after editing the schema            |
| `pnpm db:migrate`                           | `prisma migrate dev`                                      |
| `pnpm db:migrate:deploy`                    | `prisma migrate deploy`                                   |
| `pnpm db:seed`                              | `prisma db seed` → `apps/api/prisma/seed.ts` (idempotent) |
| `pnpm db:studio`                            | Prisma Studio                                             |
| `pnpm --filter @osgb/api exec prisma <cmd>` | Any other Prisma CLI command                              |

## 9. Orthanc setup

- Image: `orthancteam/orthanc` with the PostgreSQL and DICOMweb plugins enabled (`POSTGRESQL_PLUGIN_ENABLED`, `DICOM_WEB_PLUGIN_ENABLED`).
- Non-secret configuration: `infrastructure/orthanc/orthanc.json` (mounted read-only). Secrets and hostnames are passed as `ORTHANC__*` environment variables which the image merges into the JSON (`ORTHANC__POSTGRESQL__PASSWORD`, `ORTHANC__REGISTERED_USERS`, ...).
- Persistence: the **index** goes to the dedicated `orthanc` PostgreSQL database (created by `infrastructure/postgres/init/01-orthanc-database.sh`, own role, no access to the `osgb` database); **DICOM files** go to the `orthanc_data` volume (`EnableStorage: false`).
- Ports: 8042 (REST/DICOMweb) and 4242 (DICOM) are internal-only in `docker-compose.yml`; the dev override publishes them on localhost.
- Authentication is enabled; the API uses `ORTHANC_USERNAME`/`ORTHANC_PASSWORD` server-side (`apps/api/src/infrastructure/orthanc/orthanc.service.ts`: `getSystemStatus`, `getStudy`, `findStudyByStudyInstanceUid`, `getStudyInstances`, `getStudyPreviewUrl`, `getStudyPreviewImage`, `getViewerUrl`).
- Radiology workflow (`apps/api/src/modules/radiology`): create a request → images arrive in Orthanc (modality/worklist integration is a TODO) → `PATCH /api/radiology/:id/link-study` resolves the `StudyInstanceUID` in Orthanc and stores the references → `POST /api/radiology/:id/viewer-session` issues the viewer cookie and returns the OHIF URL → `GET /api/radiology/:id/preview` proxies a PNG preview.

Sending a test image in development (Orthanc REST is published on 8042 by the dev override):

```bash
curl -u orthanc:orthanc_dev_password -X POST http://localhost:8042/instances --data-binary @sample.dcm
```

## 10. OHIF setup

- Image `ohif/app`, configured by `infrastructure/ohif/app-config.js` (mounted over `/usr/share/nginx/html/app-config.js`).
- Served under **`/viewer`** by Nginx; `routerBasename` is `/viewer`, so a study opens at `/viewer/viewer?StudyInstanceUIDs=<uid>`.
- The data source points at the same-origin path `/dicom-web` with `requestCredentials: 'include'`, so the browser sends the `osgb_dicomweb` cookie. Nginx validates it via `auth_request` against `GET /api/auth/verify-dicomweb` and then forwards to Orthanc with the Orthanc credentials injected. Flow: **Browser → OHIF → Nginx → Orthanc DICOMweb**; Orthanc itself is never exposed.
- The official OHIF image is built for `PUBLIC_URL=/`, so its hashed bundles are requested from the site root. `infrastructure/nginx/templates/default.conf.template` proxies those asset paths (`/app.bundle.*.js`, `/assets/`, `/locales/`, `*.wasm`, ...) to the OHIF container and deliberately returns 404 for its service worker so it cannot cache the React app. The React build therefore emits its own assets under `/static/` (`vite.config.ts#build.assetsDir`). If you prefer a cleaner separation, rebuild OHIF with `--build-arg PUBLIC_URL=/viewer/` or serve it on its own hostname.

## 11. MinIO setup

- `StorageService` (`apps/api/src/infrastructure/storage/storage.service.ts`) wraps the MinIO SDK: `upload`, `download`, `delete`, `exists`, `getPresignedUrl`, `ensureBucket`, `healthCheck`. Buckets are configurable (`MINIO_BUCKET` default + per-call override); the default bucket is created at start-up.
- Object keys are always prefixed with the tenant id (`<tenantId>/documents/<uuid>-<name>`), which adds a second isolation layer inside the bucket and makes per-tenant lifecycle rules possible.
- The `documents` module stores metadata in PostgreSQL and hands out **short-lived presigned URLs** (2 min for medical documents, 15 min otherwise). Root credentials never leave the API. Uploads are validated (MIME allow-list, 25 MB) and post-processed by the `documents` queue.
- MinIO ports (9000 API / 9001 console) are internal-only in production. If browsers must download directly from MinIO through presigned URLs in production, expose it on its own hostname with TLS and set `MINIO_ENDPOINT`/`MINIO_USE_SSL` to that public address so signatures match.

## 12. Authentication flow

```
POST /api/auth/login    { email, password, tenantSlug? }  -> { accessToken, refreshToken, expiresIn, user }
POST /api/auth/refresh  { refreshToken }                  -> new token pair (rotation)
POST /api/auth/logout   { refreshToken }                  -> 204 (session revoked)
GET  /api/auth/me       Authorization: Bearer <access>    -> current principal (roles + permissions)
```

- Passwords are hashed with **Argon2id** (`hashPassword` / `verifyPassword` in `users.service.ts`). Login always performs one Argon2 verification even for unknown e-mails to avoid timing-based user enumeration; failures are audited (`LOGIN_FAILED`).
- **Access tokens** are short-lived JWTs (`JWT_ACCESS_EXPIRES_IN`, default 15 min) signed with `JWT_ACCESS_SECRET`; payload `{ sub, tid, email, type: 'access' }`. `JwtStrategy` reloads the principal from the database on every request, so role changes / deactivation / tenant suspension apply immediately (Redis caching is a marked TODO).
- **Refresh tokens** are JWTs signed with `JWT_REFRESH_SECRET` bound to a `RefreshSession` row. Only a **SHA-256 hash** of the token is stored. Every refresh **rotates** the session; presenting a rotated/revoked token is treated as theft: all sessions of the user are revoked and a `TOKEN_REUSE_DETECTED` audit entry is written.
- E-mail is unique _per tenant_. If the same e-mail exists in several tenants the API answers `TENANT_REQUIRED` and the client re-submits with `tenantSlug`.
- The **web client** (Phase 2) keeps the access token in memory and the refresh token in `localStorage` ("Beni hatırla") or `sessionStorage` (Zustand persist, `apps/web/src/stores/auth.store.ts`). `services/api-client.ts` attaches the access token and, on a `401`, performs exactly one single-flight refresh and retries; auth endpoints are excluded, so there is no refresh loop. `features/auth/session-provider.tsx` restores the session on page load (refresh → `/auth/me`). Navigation entries declare a `permission`; the sidebar hides what the user cannot open and `PermissionGate` renders a forbidden page for direct URL access. UI checks are a convenience; the API stays the authority.
- `POST /api/radiology/:id/viewer-session` issues a separate 1-hour **viewer cookie** (`osgb_dicomweb`, httpOnly, path `/dicom-web`) that Nginx verifies through `GET /api/auth/verify-dicomweb` before proxying DICOMweb.

## 13. Multi-tenancy approach

- One database, shared schema, **row-level scoping by `tenantId`** (the pragmatic model for an OSGB SaaS; a schema-per-tenant or database-per-tenant model can be introduced later behind the repository layer).
- The active tenant is resolved from the **authenticated session** (`AuthenticatedUser.tenantId`, injected with `@CurrentTenant()`). Request payloads never carry a tenant id; DTOs reject unknown fields (`forbidNonWhitelisted`).
- **Repositories are the isolation boundary.** Every method takes `tenantId` and includes it in the `WHERE` clause (including `updateMany`/soft delete, which never use a bare `id`). Cross-entity references (e.g. employee → company) are verified to belong to the same tenant before writes.
- Background jobs receive `tenantId` in their payload and filter with it (`generate-employee-report.job.ts`).
- Object storage keys and audit rows are tenant-prefixed / tenant-scoped.
- Roles are tenant-scoped; the permission catalogue is global. `TenantsService.create` provisions the default system roles for every new tenant (`role-templates.ts`), the same templates the seed uses.
- `system.manage` is the platform-operator permission (tenant management, queue/system endpoints).

## 14. Permissions

RBAC with permission-based authorization: users ← `UserRole` → roles ← `RolePermission` → permissions. The guard checks **permissions**, never role names, so roles stay a tenant-configurable grouping.

- Catalogue: `packages/shared-types/src/permissions.ts` (`users.read`, `employees.create`, `examinations.approve`, `radiology.read`, `documents.upload`, `reports.export`, `system.manage`, ...). Permissions flagged `medical: true` gate health data. The seed/`PermissionsService.syncCatalogue()` upserts the catalogue into the `permissions` table.
- Backend usage:

  ```ts
  @RequirePermissions('employees.read')                 // all listed permissions
  @RequireAnyPermission('examinations.read', 'radiology.read')
  @MedicalData({ entityType: 'Examination' })           // extra audit + medical policy hook
  handler(@CurrentUser() user: AuthenticatedUser, @CurrentTenant() tenantId: string) {}
  ```

  Global guard order: `ThrottlerGuard → JwtAuthGuard → PermissionsGuard → MedicalDataGuard`. `@Public()` skips authentication (login, refresh, health).

- Frontend usage: `usePermissions()` / `useCan('employees.create')`, the `<Can permission="…">` component and the `permission` field on navigation leaves (`app/router/navigation.ts`), all using the keys from `@osgb/shared-types`.
- Default roles (seeded per tenant): `tenant_admin` (all), `occupational_physician`, `safety_specialist`, `nurse`, `company_representative`.

## 15. Testing

| Layer    | Tool                               | Command                            | Included examples                                                                                                                |
| -------- | ---------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| API unit | Jest 30 + ts-jest                  | `pnpm --filter @osgb/api test`     | `auth.service.spec.ts` (login, hashing, rotation, reuse detection), `permissions.guard.spec.ts`, `duration.spec.ts`              |
| API e2e  | Jest + Supertest                   | `pnpm --filter @osgb/api test:e2e` | `test/health.e2e-spec.ts` — real HTTP against `/health/*` with faked infrastructure clients (runs without Docker)                |
| Web      | Vitest 5 + Testing Library + jsdom | `pnpm --filter @osgb/web test`     | `routes.test.tsx` (login guard, mock login → dashboard, every module route renders with one active nav item, detail routes, 404) |
| All      | Turborepo                          | `pnpm test` · `pnpm test:e2e`      |                                                                                                                                  |

Notes:

- NestJS 12 ships as ESM; Jest requires `node --experimental-vm-modules` for `require(esm)`, which the API test scripts already pass.
- `jest.config.js` maps `@/` and rewrites `./x.js` → `./x.ts` for the generated Prisma client.
- Full-stack readiness is verified by Docker health checks (`GET /health/ready` checks PostgreSQL, Redis, MinIO and Orthanc).

CI (`.github/workflows/ci.yml`): `pnpm install` → lint → typecheck → unit tests → API e2e → build → apply migrations to a fresh PostgreSQL and diff them against the schema; on `main` it additionally builds and pushes the API and web images to GHCR.

## 15a. Logging and audit

Everything the system does leaves a structured, correlated trace. One `X-Request-Id` (generated or honoured from Nginx) appears in every log line, error response and audit row of a request.

| Layer                  | Where                                                        | What is captured                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HTTP access log        | `infrastructure/logger/logger.module.ts` (pino-http)         | Every request: method, url, route, status, response time, ip, user agent, `requestId`, and after authentication `userId` + `tenantId`. Level is info/warn/error by status. `/health` probes are excluded unless `LOG_HEALTH_REQUESTS=true`.                                                                                                                                                                                                                                                                                         |
| Errors                 | `common/filters/http-exception.filter.ts`                    | 4xx as warn, 5xx as error with stack, never returned to clients.                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Audit trail (database) | `common/interceptors/audit.interceptor.ts` + `modules/audit` | **Every authenticated POST/PUT/PATCH/DELETE** is written to `audit_logs`: user, tenant, action (`POST /api/companies` or a custom name), entity type/id, sanitised request body (secrets redacted, size-capped) and `metadata` (`method`, `path`, `statusCode`, `durationMs`, `outcome: SUCCESS/FAILURE`, `errorCode`). Services that already write richer entries (old/new values) win; no duplicate generic row is added for the same request. `@SkipAudit()` / `@Audit({ entityType, action, idParam })` tune individual routes. |
| Security events        | `AuthService`, `MedicalDataGuard`                            | LOGIN, LOGIN_FAILED, LOGOUT, TOKEN_REUSE_DETECTED, MEDICAL_DATA_ACCESS (every read of examination/radiology data).                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Background jobs        | `infrastructure/queue/queue-events.logger.ts`                | added / active / completed / failed / stalled / progress for every queue and job id.                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| External services      | `OrthancService`, `StorageService`                           | Every PACS call (method, url, status, duration) and every object-storage operation (upload/download/delete/presign with bucket and key).                                                                                                                                                                                                                                                                                                                                                                                            |
| Database               | `PrismaService`                                              | Prisma warnings/errors always; with `LOG_SQL=true` every statement (query text only, never parameters).                                                                                                                                                                                                                                                                                                                                                                                                                             |

Redaction happens at the logger (`authorization`, `cookie`, passwords, tokens, clinical free text, national ids) and again in the audit sanitiser. Read the trail with `GET /api/audit?requestId=…&entityType=…&userId=…&action=…` (permission `audit.read`). Logs are JSON in production; ship them to a central store and keep `audit_logs` append-only.

## 15b. Patient registration (Hasta Kayıt) and identity

The first end-to-end module. `apps/api/src/modules/employees` (a patient is an employee record) plus `identity` and `locations`; `apps/web/src/features/patients` on the client.

- **Fields:** TC Kimlik No, Sicil No, Ad*, Soyad*, Doğum Tarihi*, Cinsiyet, Anne/Baba Adı, GSM*, Ev Tel, e-Posta, Pasaport No, adres (il / ilçe / mahalle + serbest satır), Uyarı/Açıklama.
- **Validation (client + server):** TC Kimlik No checksum (`isValidTurkishId` in `@osgb/shared-types`), GSM mask `5XX XXX XX XX` (10 digits, +90/0 stripped), landline pattern, e-mail format, enumerated gender, date picker with no future dates, name normalisation (trim, collapse spaces, Turkish characters preserved), address chain consistency (`LocationsService.assertConsistent`).
- **Uniqueness:** TC Kimlik No and Sicil No are unique per tenant among _active_ records (partial unique indexes, see migration `*_employee_partial_unique_indexes`), so a soft-deleted patient can be registered again.
- **ID card OCR (hybrid):** by default the scan runs in the browser: tesseract.js (WASM) with the bundled OCR-B/MRZ model, the card locator and the TD1 MRZ parser from `@osgb/shared-types` (`mrz.ts`, `card-locator.ts`, shared with the API). The photo never leaves the device. The runtime is self-hosted: `apps/web/scripts/copy-ocr-assets.mjs` (run by `dev`/`build`) copies the tesseract worker, the WASM cores (the browser downloads only the variant matching its CPU, ~4 MB once, then cached), `mrz.traineddata` and the zxing reader into `apps/web/public/ocr/` (git-ignored). `POST /api/identity/scan` is the fallback: it is used when the browser cannot run the scanner, its runtime fails to load, or the browser result is not fully valid (camera auto-scan asks the API from the third frame on); the better-scoring result wins and the panel shows which engine produced it. `VITE_ID_SCAN_MODE=hybrid|client|server` selects the strategy. Both engines prepare the photo the same way (EXIF orientation, card location, lower MRZ band + full image, contrast normalisation; the API additionally tries CLAHE and the generic `eng` model), OCR the MRZ with a character whitelist and keep the best-scoring parse. The Code 128 barcode on the card back is decoded too (native `BarcodeDetector` when available, otherwise zxing-wasm; on the API zxing tries the whole frame, the located card and an upscaled top band) and cross-checked against the MRZ document number. `POST /api/identity/barcode` decodes only the barcode of an uploaded close-up (API only). The web form offers live camera capture with an auto-scan mode (a frame every 1.5 s until the MRZ check digits pass) or a photo file; the result fills TC no, names, birth date, gender and "Sicil No / Belge No". Server-side language data outside the bundle is downloaded on first use into `OCR_CACHE_PATH`. `IdCardScanProvider` is the seam for a hardware reader.
- **Official verification (API only):** `POST /api/identity/verify` and `POST /api/employees/:id/verify-identity` check TC no + name + birth year through `CitizenVerificationProvider`. `IDENTITY_VERIFICATION_PROVIDER=nvi` uses the NVİ KPS public SOAP service; `none` records `DISABLED`. `POST /api/employees/:id/mark-identity-verified` records a manual document check (status `MANUAL`, audited). The web UI does not expose these actions or the verification status yet. Editing an identity field resets the status to `UNVERIFIED`. `nationalId` is required when creating a patient; the column stays nullable for legacy rows.
- **Patient photo:** `PUT /api/employees/:id/photo` (multipart `photo`, jpeg/png/webp ≤ 10 MB) normalises the portrait with sharp (EXIF orientation, ≤ 800 px, JPEG, metadata stripped) and stores it in MinIO under `<tenantId>/employees/<id>/photo-<uuid>.jpg`; `GET /api/employees/:id/photo` streams it through the API (no public/presigned URL, `Cache-Control: private, no-store`), `DELETE` removes it. Only `photoUpdatedAt` is exposed to clients (used as the cache key). The registration form captures it with the front camera (3:4 guide, review before use) or a file; the photo is uploaded after the record is saved, so a photo failure never loses the record. Audit entries record only that a photo was set/removed and its dimensions.
- **Company is optional on employees** (`companyId` nullable since migration `employee_company_optional`): the registration form only asks for identity, contact, address and notes; Firma (searchable) and Durum are set on the edit screen.
- **Form controls:** birth date uses a shadcn-style `DatePicker` (typed `gg.aa.yyyy` with masking, or a react-day-picker calendar with month/year dropdowns and the Turkish locale); province/district/neighborhood use a searchable `Combobox` (Popover + cmdk) with Turkish/accent-insensitive matching (`src/lib/search.ts`). The edge Nginx sends `Permissions-Policy: camera=(self)` so the camera works for ID scan and photo capture.
- **Locations:** 81 provinces + 973 districts ship in `apps/api/prisma/data/provinces-districts.json` and are seeded by `pnpm db:seed`; neighborhoods (~32k) are imported from api.turkiyeapi.dev with `LOCATIONS_FETCH_NEIGHBORHOODS=true pnpm --filter @osgb/api prisma:seed:locations`.

## 16. Production deployment considerations

- **Secrets.** Generate real values (`./scripts/generate-secrets.sh`, `./scripts/orthanc-basic-auth.sh`). The API refuses to start in production with placeholder JWT secrets, identical access/refresh secrets or an empty `CORS_ORIGIN`. Prefer Docker/Kubernetes secrets over a `.env` file on disk.
- **HTTPS termination.** Terminate TLS at the edge Nginx (add a `listen 443 ssl` server block with `ssl_certificate` in `infrastructure/nginx/templates`, e.g. with certbot/ACME) or at a cloud load balancer in front of it. Always forward `X-Forwarded-Proto`; the API runs with `TRUST_PROXY=true` and marks cookies `Secure` in production. Enable HSTS only once HTTPS is stable (Helmet does this for the API automatically in production).
- **Exposure.** Only Nginx is published. Orthanc (8042/4242), MinIO, Redis and PostgreSQL stay on the internal network. Do not enable the dev override in production. If DICOM modalities must send images, expose 4242 on a private network/VPN only.
- **Rate limiting** is in-memory per API instance (`@nestjs/throttler`); use a Redis storage adapter when running several replicas and consider Nginx `limit_req` for the login endpoint.
- **Scaling.** The API is stateless; BullMQ workers can be moved to a separate worker deployment (import `QueueModule` only). Use managed PostgreSQL/Redis/S3 where available; MinIO can be replaced by any S3-compatible service without code changes.
- **Backups.** Postgres (both databases), the Orthanc DICOM volume and the MinIO bucket contain regulated health data; back them up encrypted and test restores. Audit logs are append-only — keep them.
- **Logging & PII.** Logs are JSON (pino) with request ids; authorization headers, cookies, passwords, tokens, clinical free text and national ids are redacted at the logger. Ship them to a central store with retention that matches your data-protection obligations (KVKK/GDPR).
- **Observability.** `/health/live` and `/health/ready` are ready for orchestrator probes; add metrics/tracing (OpenTelemetry) as needed.
- **Database.** Run `prisma migrate deploy` as a release step (the `api-migrate` service does this in Compose). Consider PostgreSQL row-level security as an additional safety net for tenant isolation.
- **Images.** Multi-stage Dockerfiles produce non-root runtime images; pin base image digests in regulated environments.

## 17. Repository layout

```
osgb-platform/
├── apps/
│   ├── api/                      NestJS API
│   │   ├── prisma/               schema.prisma, migrations/, seed.ts
│   │   ├── src/
│   │   │   ├── common/           decorators, guards, filters, interceptors, middleware, dto, utils
│   │   │   ├── config/           env.schema.ts (zod), configuration.ts (typed config)
│   │   │   ├── infrastructure/   prisma, redis, storage (MinIO), orthanc, logger, queue (BullMQ)
│   │   │   ├── modules/          auth, users, tenants, roles, permissions, companies, branches,
│   │   │   │                     employees, workplaces, examinations, radiology, appointments,
│   │   │   │                     trainings, certificates, documents, notifications, audit, health, system
│   │   │   ├── app.module.ts · main.ts · swagger.ts
│   │   │   └── generated/        Prisma client (git-ignored)
│   │   ├── test/                 e2e specs (supertest)
│   │   ├── Dockerfile · jest.config.js · nest-cli.json · prisma.config.ts
│   └── web/                      Vite + React client (Tailwind 4 + shadcn design system, auth, navigation shell)
│       ├── src/
│       │   ├── app/router/       routes.tsx, navigation.ts (sidebar groups + PATHS), index.tsx
│       │   ├── components/ui/    shadcn/Radix primitives restyled to the Figma tokens
│       │   ├── design-system/    AppButton, StatusBadge, FilterChip, NavItem, AppSidebar, AppTopbar, PageHeader, states, toast, confirm dialog
│       │   ├── features/auth/    login form (RHF + Zod), session restore
│       │   ├── services/ stores/ hooks/  API client (refresh flow), auth store (Zustand), permission hooks
│       │   ├── layouts/ · pages/ · styles/ (tokens.css, globals.css) · lib/ · types/ · test/
│       └── Dockerfile · nginx.conf · vite.config.ts · components.json
├── packages/
│   ├── shared-types/             permissions catalogue, enums, API envelopes, auth types (dual CJS/ESM build)
│   ├── eslint-config/            flat configs: base, nest, react
│   └── tsconfig/                 base, nestjs, react, library
├── infrastructure/
│   ├── nginx/                    nginx.conf + templates/default.conf.template (envsubst)
│   ├── orthanc/orthanc.json
│   ├── ohif/app-config.js
│   └── postgres/init/            creates the Orthanc database/role
├── scripts/                      generate-secrets.sh, orthanc-basic-auth.sh
├── .github/workflows/ci.yml
├── docker-compose.yml · docker-compose.dev.yml
├── .env.example · turbo.json · pnpm-workspace.yaml
```

## 18. Deliberate TODOs

Business logic intentionally left out so the skeleton stays small (search the code for `TODO(business-logic)`):

- Trainings and certificates: data model, attendance, issuance, expiry reminders (endpoints return `501 NOT_IMPLEMENTED`).
- Real report rendering (PDF) in `GenerateEmployeeReportJob`; e-mail/SMS providers in the notifications processor; virus scanning/OCR in the documents processor; the daily examination-due sweep.
- Appointment overlap detection and validation of every referenced entity; physician-role enforcement / e-signature on examination approval.
- Web: list/detail screens, forms, tables and dashboard widgets for each module (authentication, permission-aware navigation and the API client are done).
- Principal caching in Redis for `JwtStrategy`; Redis-backed rate-limit storage; document retention/purge job for soft-deleted files.
- Stricter medical-data policies inside `MedicalDataGuard` (purpose of use, break-glass, physician-only views); optional PostgreSQL row-level security.
- DICOM modality worklist / automatic study linking from Orthanc events (webhook or polling).
- Optional: build OHIF with `PUBLIC_URL=/viewer/` to drop the root-asset proxy rules.
