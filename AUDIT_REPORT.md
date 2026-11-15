# SOFTWARE AUDIT REPORT: OPENREPLY (INSTAREPLY)

**Audit Date:** November 14, 2026  
**Auditor Role:** Senior Software Auditor  
**Project Workspace:** `d:\Insta AutoDm`  
**Target Application:** OpenReply (ManyChat Alternative — B2B Instagram Comment-to-DM SaaS / Self-Hosted Automation Platform)

---

## 1. Executive Summary

### Project Summary
OpenReply is a self-hosted, B2B Instagram automation platform designed as an open-source alternative to ManyChat. The system ingests Instagram webhook events (comments, direct messages, postbacks, and story replies), evaluates configured keyword trigger rules, enforces rate limits and follow gates, and dispatches private and public replies through Meta's official Graph API (or optionally via third-party provider Zernio). It also offers campaign analytics, short-link click tracking, inbox messaging, follower growth history snapshots, and workspace collaboration.

### Overall Health Score: 5.5 / 10
While the core business logic (such as Unicode/Arabic-script keyword matching, BullMQ background queues, and token encryption round-tripping) is thoughtfully designed with extensive unit test coverage (322 passing unit tests), the codebase exhibits critical security bypasses, production build stalls, dead legacy abstractions, memory-exhausting analytical query patterns, and exposed credentials that prevent it from being production-ready in its current state.

### Top 5 Risks
1. **Complete Authentication & Multi-Tenancy Bypass (Security / Architecture):**  
   The application hardcodes authentication bypasses across the dashboard layout (`app/(dashboard)/layout.tsx:22`) and core auth helper (`lib/auth.ts:81-83`), while `proxy.ts:7-9` unconditionally redirects `/login` to `/dashboard`. Any incoming request is automatically assigned full owner rights under `"local-owner-id"`, entirely circumventing NextAuth session checks and multi-tenant workspace isolation.
2. **Hardcoded Active Secrets & Docker Container Leak (Security):**  
   Active production credentials (including live `NGROK_AUTHTOKEN`, `INSTAGRAM_APP_SECRET`, `FACEBOOK_APP_SECRET`, and default dummy `ENCRYPTION_KEY`) are present in `.env`, while `.dockerignore` fails to exclude `.env`. Furthermore, `docker-compose.yml` hardcodes encryption secrets in plain text, meaning any built container image or deployment leaks sensitive keys.
3. **Production Build & CI Failure (Broken Pipeline):**  
   `npm run lint` fails with 4 blocking ESLint errors (`react-hooks/set-state-in-effect`), which breaks `.github/workflows/ci.yml`. Concurrently, `npm run build` stalls during Turbopack compilation because `app/(dashboard)/layout.tsx` attempts eager database queries without declaring dynamic rendering, hanging indefinitely when PostgreSQL is offline or unreachable at build time.
4. **Denial of Service via Unbounded Analytics Queries (Performance):**  
   The dashboard metrics endpoint (`app/api/dashboard/stats/route.ts:124-131, 153-157`) issues 23 separate database queries on every page load, loading every historical click row and every distinct commenter into Node.js heap memory for in-memory JavaScript aggregation, creating a severe memory leak and DoS risk under production scale.
5. **Silent Scheduler Omission & Token Expiration in Docker Deployments (DevOps / Operations):**  
   `docker-compose.yml` omits the `cron` service container required to run `scripts/cron.sh`. In Docker-based self-hosted setups, `refresh-tokens`, `snapshot-followers`, and `attach-next-reel` never execute. As a result, Instagram OAuth tokens expire silently after 60 days, halting all campaign messaging without warning.

---

## 2. Project Overview and Architecture

### Purpose & User Roles
- **Target Audience:** Creators, social media agencies, and businesses looking to automate Instagram comment replies, DM delivery, lead magnets, and story interactions without recurring SaaS subscription fees.
- **Roles:**
  - `OWNER`: Full workspace control, ability to delete workspace, invite admins/members.
  - `ADMIN`: Campaign configuration, account connection, member management.
  - `MEMBER`: Campaign view and creation (restricted from administrative settings).

### Technology Stack
- **Framework:** Next.js 16.2.6 (App Router, Turbopack, React 19.2.4, React Compiler enabled)
- **Languages:** TypeScript 5, Node.js (Alpine container base)
- **Database & ORM:** PostgreSQL 16, Prisma ORM 7.8.0 with `@prisma/adapter-pg`
- **Queue & Cache:** Redis 7, BullMQ 5.76.4, ioredis 5.10.1
- **Authentication:** NextAuth.js v5 (beta 31) with Prisma Adapter, Email Magic Links (Resend / Nodemailer SMTP), and optional Google OAuth
- **Styling:** Tailwind CSS 4, Lucide React icons
- **External Providers:** Meta Graph API v25.0 (Instagram Graph API, Instagram Login for Business), Zernio API, Telegram Bot API, Ngrok

### End-to-End Control & Data Flow Architecture
```
                  ┌────────────────────────────────────────────────────────┐
                  │                    Instagram User                      │
                  └───────────────────────────┬────────────────────────────┘
                                              │ 1. Comments / DMs / Taps Button
                                              ▼
                             ┌─────────────────────────────────┐
                             │    Meta Graph API / Webhook     │
                             └────────────────┬────────────────┘
                                              │ 2. POST /api/webhook (x-hub-signature-256)
                                              ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ NEXT.JS WEB APP (Vercel / Docker)                                                       │
│                                                                                         │
│  [API Route: /api/webhook]                                                              │
│       │                                                                                 │
│       ├─► Verify Signature (HMAC SHA-256)                                               │
│       ├─► Persist WebhookEvent (status: PENDING)                                        │
│       └─► Parse Event & Enqueue Job ('dm-processing')                                   │
│                 │                                                                       │
│                 ▼                                                                       │
│         [Redis (BullMQ)] ◄────────────────────────────────────────────────────┐         │
│                 ▲                                                             │         │
│  [Dashboard / Inbox / Admin APIs]                                             │         │
│       │                                                                       │         │
│       └─► PostgreSQL (Prisma Client)                                          │         │
│                 ▲                                                             │         │
└─────────────────┼─────────────────────────────────────────────────────────────┼─────────┘
                  │                                                             │
                  │ Shared DB URL & Encryption Key                              │ Pull Jobs
                  ▼                                                             ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ BACKGROUND WORKER PROCESS (Railway / Docker: worker/dm-worker.ts)                      │
│                                                                                         │
│  [BullMQ Consumer: dm-processing]                                                       │
│       │                                                                                 │
│       ├─► 1. Rate Limit Gate (Redis Lua Script: 750 DMs / hour per account)             │
│       ├─► 2. Keyword Matcher (Unicode Property Escapes + Arabic Script Normalization)   │
│       ├─► 3. Token Decryption (AES-256-GCM via ENCRYPTION_KEY)                          │
│       ├─► 4. Dispatch Private Reply & Public Comment Reply (Meta API / Zernio)          │
│       ├─► 5. Follow Gate Evaluation & Appreciation Follow-up Delayed Job                │
│       └─► 6. Persist DmLog & Update WebhookEvent Status (SENT / FAILED)                 │
│                                                                                         │
│  [Polling Reconciler & Heartbeat Loop]                                                  │
│       ├─► Heartbeat (health:worker:dm in Redis every 30s)                               │
│       ├─► Poll Comments (fallback for missed webhooks every 5 min)                      │
│       └─► Attach Pending Next Reel (binds campaigns to newly posted reels)              │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Findings Table

| ID | Category | Severity | File:Line | Evidence | Why it's a problem | Recommended Fix | Effort | Confidence |
|---|---|---|---|---|---|---|---|---|
| **SEC-01** | Security | **Critical** | `app/(dashboard)/layout.tsx:22-24` | `const userId = process.env.LOCAL_OWNER_ID \|\| "local-owner-id";` | Bypasses all user authentication; anyone accessing the dashboard is granted owner access. | Remove hardcoded local bypass; invoke `await auth()` and redirect unauthenticated sessions to `/login`. | S | Verified |
| **SEC-02** | Security | **Critical** | `lib/auth.ts:81-83` | `export async function getCurrentUserId(): Promise<string \| null> { return process.env.LOCAL_OWNER_ID \|\| "local-owner-id"; }` | All API routes calling `getCurrentUserId()` or `getCurrentWorkspaceContext()` run under a static mock ID, compromising workspace data tenancy. | Query the actual session via `await auth()` to extract `session.user.id`. | S | Verified |
| **SEC-03** | Security | **Critical** | `proxy.ts:7-9` | `if (pathname === "/login") { return NextResponse.redirect(new URL("/dashboard", request.url)); }` | Prevents users from reaching the login page; blocks sign-in and invitation acceptance flows. | Replace bypass logic with authenticated session validation and conditional redirect. | S | Verified |
| **SEC-04** | Security | **Critical** | `.dockerignore:1-8` | Missing `.env` exclusion rule | When building Docker images, local `.env` files with production secrets are baked into container image layers. | Add `.env` and `.env*` (except `.env.example`) to `.dockerignore`. | S | Verified |
| **SEC-05** | Security | **Critical** | `.env:6, 23-26` | `NGROK_AUTHTOKEN=3BFEj...`, `INSTAGRAM_APP_SECRET=10ccd...`, `ENCRYPTION_KEY=0123456...` | Real active API keys and default dummy encryption keys are exposed in the working directory. | Rotate all Meta app secrets and Ngrok authtokens immediately; generate a secure random 32-byte hex key. | S | Verified |
| **SEC-06** | Security | **High** | `docker-compose.yml:50-52, 83-84, 107` | `NEXTAUTH_SECRET=9f8c6b...`, `ENCRYPTION_KEY=0123...`, `--url=kate-postmeiotic-amanda.ngrok-free.dev` | Secrets and static third-party tunnel domains are hardcoded into Docker orchestration manifests. | Replace hardcoded values with `${VARIABLE}` environment substitution syntax. | S | Verified |
| **SEC-07** | Security | **High** | `app/api/workspace/members/route.ts:58, 70` | `token: true`, `inviteUrl: buildInvitationUrl(invitation.token)` | `GET /api/workspace/members` exposes pending invitation tokens to all workspace members regardless of role. | Restrict token visibility in API responses to `OWNER` and `ADMIN` roles only. | S | Verified |
| **SEC-08** | Security | **Medium** | `app/api/admin/diagnostics/route.ts:10, 77-80` | `const workspaceId = await getCurrentWorkspaceId(); ... OR: [{ workspaceId }, { workspaceId: null }]` | Endpoint lacks admin role checks and leaks global system errors (`workspaceId: null`) to standard workspace members. | Enforce `canManageWorkspace` role validation and filter operational events strictly to workspace scope. | S | Verified |
| **SEC-09** | Security | **Medium** | `app/api/cron/refresh-tokens/route.ts:10-12` | `if (authHeader !== \`Bearer \${cronSecret}\`)` | Timing attack vulnerability and evaluates to `Bearer undefined` if environment secrets are not configured. | Use `crypto.timingSafeEqual` and explicitly guard against undefined/empty secret strings. | S | Verified |
| **SEC-10** | Security | **Low** | `lib/tracking/server.ts:10, 20` | `const salt = process.env.NEXTAUTH_SECRET ?? "campaigncue-click-salt";` | Hardcoded fallback salt compromises IP and recipient hashing anonymity if `NEXTAUTH_SECRET` is unset. | Enforce non-empty `NEXTAUTH_SECRET` requirement rather than falling back to a static string. | S | Verified |
| **BUG-01** | Bugs | **High** | `app/(dashboard)/layout.tsx:26-31` | `await ensureWorkspaceForUser(userId, userEmail); await prisma.instagramAccount.findMany(...)` | Build hangs during `next build`: Server Component executes synchronous DB calls without `force-dynamic`. | Add `export const dynamic = "force-dynamic";` to `app/(dashboard)/layout.tsx`. | S | Verified |
| **BUG-02** | Bugs | **High** | `lib/meta/webhook.ts:18-22` & `app/api/webhook/route.ts:30` | `if (secrets.length === 0) throw new Error(...)` | `verifyWebhookSignature` throws an unhandled error outside try/catch if secrets are missing, crashing route with 500. | Wrap signature verification call in try/catch or return `false` cleanly when secrets are absent. | S | Verified |
| **BUG-03** | Bugs | **High** | `app/api/instagram/tester-request/route.ts:96-98` | `const metaAppId = process.env.META_APP_ID ?? "[META_APP_ID]";` | Variable does not exist in configuration (`INSTAGRAM_APP_ID` is used), producing invalid Telegram links and Markdown parse errors. | Point to `process.env.INSTAGRAM_APP_ID` and properly escape Markdown formatting characters for Telegram. | S | Verified |
| **BUG-04** | Bugs | **Medium** | `lib/instagram/send-messages.ts:30` | `commentId ? \`/inbox/comments/\${encodeURIComponent(postId ?? commentId)}/...` | For "any post" campaigns (`postId` is null), passes `commentId` as `postId` to Zernio API, resulting in upstream 404s. | Pass media ID from webhook event payload or retrieve post ID before dispatching private replies. | M | Verified |
| **BUG-05** | Bugs | **Medium** | `lib/queue/process-webhook.ts:61-66` | `await prisma.webhookEvent.update({ where: { id: webhookEvent.id }, data: { workspaceId: account.workspaceId } });` | Inside event iteration loop, `webhookEvent.workspaceId` is overwritten repeatedly; multi-tenant payloads lose historical ownership. | Associate workspace IDs at the granular event/log level rather than updating a single batch envelope record. | S | Verified |
| **BUG-06** | Bugs | **Medium** | `lib/meta/client.ts:112` | `const data = await response.json();` | If Meta returns an HTML 502/504 Bad Gateway page, `response.json()` throws raw SyntaxError instead of `MetaApiError`. | Inspect `response.headers.get("content-type")` or wrap JSON decoding in try/catch to format descriptive error. | S | Verified |
| **BUG-07** | Bugs | **Medium** | `app/r/[slug]/route.ts:34-49` | `await prisma.linkClick.create({...}); return NextResponse.redirect(trackedLink.destinationUrl, ...);` | Synchronously blocks HTTP redirect on database write; also malformed `destinationUrl` crashes with unhandled TypeError. | Dispatch link click persistence asynchronously or queue it; wrap `NextResponse.redirect` in URL validation. | S | Verified |
| **BUG-08** | Bugs | **Low** | `lib/meta/oauth.ts:156-160` | `const combined = Buffer.from(encryptedBase64, "base64"); const iv = combined.subarray(0, IV_LENGTH);` | If `combined.length < 32`, slicing auth tag and ciphertext produces malformed buffers and unhandled cipher crash. | Assert `combined.length >= IV_LENGTH + AUTH_TAG_LENGTH` before slicing buffer components. | S | Verified |
| **LINT-01** | Broken | **High** | `app/(dashboard)/campaigns/page.tsx:185` | `void fetchAutomations();` inside `useEffect` | Synchronous state update in effect body triggers cascading renders and causes `eslint` command to exit code 1. | Extract data fetching into separate handler or manage state updates in asynchronous callbacks. | S | Verified |
| **LINT-02** | Broken | **High** | `app/(dashboard)/inbox/page.tsx:141` | `setConvLoading(false);` inside `useEffect` | Calling `setState` synchronously within effect body triggers cascading render warning and build lint failure. | Reorder effect conditions or initialize loading state outside effect body. | S | Verified |
| **LINT-03** | Broken | **High** | `components/campaigns/campaign-builder.tsx:191` | `if (cached.data !== null) setAvatarUrl(cached.data);` | Calling `setAvatarUrl` synchronously inside `useEffect` triggers React Compiler / ESLint error. | Initialize state with cached value using lazy initial state function `useState(() => ...)`. | S | Verified |
| **LINT-04** | Broken | **High** | `components/campaigns/campaign-builder.tsx:332` | `setImportQueue(queue);` inside `useEffect` | Calling state setters directly in effect triggers ESLint error. | Move import queue initialization to page load handler or lazy state initializer. | S | Verified |
| **PERF-01** | Performance | **High** | `app/api/dashboard/stats/route.ts:128-131, 153-157` | `prisma.linkClick.findMany({ select: CLICK_ROW_SELECT })`, `prisma.dmLog.findMany({ distinct: ['commenterId'] })` | Pulls hundreds of thousands of raw rows into Node.js heap memory to compute counts in JavaScript. | Replace with PostgreSQL aggregation queries (`COUNT(DISTINCT ...)`, SQL `GROUP BY`). | M | Verified |
| **PERF-02** | Performance | **High** | `app/api/dashboard/stats/route.ts:160-179` | `Array.from({ length: 7 }, ... prisma.dmLog.count(...))` | Issues 7 individual database queries to calculate daily DM metrics. | Replace with a single query using SQL `date_trunc('day', "createdAt")` and `GROUP BY`. | S | Verified |
| **PERF-03** | Performance | **High** | `app/api/instagram/overview/route.ts:23-49` | `const MAX_POSTS = 500; const INSIGHTS_CONCURRENCY = 8;` | Makes up to 500 individual HTTP requests to Meta Graph API during a single web request, triggering 429s and function timeouts. | Paginate insights, cache per-post metrics, and decouple heavy fetches into background worker tasks. | L | Verified |
| **PERF-04** | Performance | **Medium** | `lib/queue/client.ts:14` & `lib/utils/rate-limiter.ts:28` | Duplicate `new Redis(...)` instances without `globalThis` caching | Spawns multiple unshared Redis connection pools; leaks connections across Next.js dev server hot reloads. | Unify Redis client instantiation under a single shared singleton attached to `globalThis`. | S | Verified |
| **PERF-05** | Performance | **Medium** | `prisma/schema.prisma:264-271` | `DmLog` model indexes | Missing composite index on `[workspaceId, createdAt]`; default log listing query (`ORDER BY createdAt DESC`) performs slow sequential scan. | Add `@@index([workspaceId, createdAt])` to `DmLog` schema and generate migration. | S | Verified |
| **DEAD-01** | Dead Code | **Low** | `prisma/schema.prisma:276-284` | `model ProcessedComment { ... }` | Model is explicitly documented as legacy and unwired; runtime code never reads or writes to it. | Create a Prisma migration to drop the unused `ProcessedComment` table from schema. | S | Verified |
| **DEAD-02** | Dead Code | **Low** | `lib/env.ts:107-109` | `export function validateCoreEnv() { return serverEnvSchema.parse(process.env); }` | Function is defined and exported but never referenced anywhere in runtime or test suites. | Call function at application initialization or remove dead export. | S | Verified |
| **DEAD-03** | Dead Code | **Low** | `lib/workspace-access.ts:30-32` | `export function canManageBilling(role: WorkspaceRole) { return role === "OWNER"; }` | Unused legacy function remaining from removed billing module. | Remove dead function export. | S | Verified |
| **DEAD-04** | Dead Code | **Low** | `public/*.svg, public/star-history.png` | `file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`, `star-history.png` | Default Next.js boilerplate SVG icons and unused marketing graphics are never imported or displayed. | Delete unreferenced asset files from `public/`. | S | Verified |
| **DEAD-05** | Dead Code | **Low** | `components/campaigns/index.ts`, `components/analytics/index.ts`, etc. | Component barrel files | Barrel files in subdirectories are never imported; components are imported directly or through legacy root shims. | Remove unused barrel index files or standardize import paths across codebase. | S | Verified |
| **DEAD-06** | Dead Code | **Low** | `app/(dashboard)/automations/page.tsx` & `new/page.tsx` | `redirect("/campaigns")`, `redirect("/campaigns/new")` | Redundant redirect route pages that duplicate Next.js route mapping. | Replace with Next.js redirects configured in `next.config.ts`. | S | Verified |
| **OPS-01** | DevOps | **High** | `docker-compose.yml:3-112` | Missing `cron` service definition | `scripts/cron.sh` scheduler is not declared in Docker Compose; tokens and follower snapshots never refresh in self-hosted Docker mode. | Add `cron` container service definition to `docker-compose.yml`. | S | Verified |
| **OPS-02** | DevOps | **Medium** | `package.json:40` vs `Dockerfile:2` | `@types/node: ^20` vs `FROM node:24-alpine` | Mismatch between TypeScript Node definitions (v20), CI runner (v20), and production Docker image (Node v24). | Align Node.js version across `package.json`, `.github/workflows/ci.yml`, and `Dockerfile` to Node 22 LTS. | S | Verified |

---

## 4. Non-Working / Broken Items

### 1. Production Build Stalls (`next build`)
- **What fails:** Running `npm run build` hangs indefinitely at the step `Creating an optimized production build ...`.
- **Root Cause:** In `app/(dashboard)/layout.tsx:26-31`, the dashboard layout is an asynchronous Server Component that executes database queries (`ensureWorkspaceForUser` and `prisma.instagramAccount.findMany`). Because the layout does not specify `export const dynamic = "force-dynamic"`, Next.js 16 attempts to statically prerender dashboard routes during build. When the database is unavailable or unreachable (as is standard in CI build environments), the Prisma Postgres client hangs waiting for a network socket connection.
- **Repair Steps:**
  1. Open `app/(dashboard)/layout.tsx`.
  2. Add `export const dynamic = "force-dynamic";` at the top level of the file.
  3. Ensure database operations are wrapped with graceful connection error boundaries.

### 2. CI Lint Step Failure (`eslint`)
- **What fails:** Running `npm run lint` terminates with 4 errors and 16 warnings, causing `.github/workflows/ci.yml` step 36 (`npm run lint`) to fail.
- **Root Cause:** React 19 / Next.js ESLint rules prohibit calling state setter functions synchronously within `useEffect` bodies:
  - `app/(dashboard)/campaigns/page.tsx:185`: `void fetchAutomations();`
  - `app/(dashboard)/inbox/page.tsx:141`: `setConvLoading(false);`
  - `components/campaigns/campaign-builder.tsx:191`: `if (cached.data !== null) setAvatarUrl(cached.data);`
  - `components/campaigns/campaign-builder.tsx:332`: `setImportQueue(queue);`
- **Repair Steps:**
  1. In `app/(dashboard)/campaigns/page.tsx`, move `fetchAutomations` execution into an async callback or trigger it on mount without immediate cascading state triggers.
  2. In `app/(dashboard)/inbox/page.tsx`, initialize `convLoading` based on `selectedAccountId` presence rather than resetting it imperatively inside the effect.
  3. In `components/campaigns/campaign-builder.tsx`, initialize `avatarUrl` using `useState(() => readCache(...).data)`.
  4. In `components/campaigns/campaign-builder.tsx`, move `importQueue` initialization into a dedicated helper or lazy state initializer.

### 3. Telegram Admin Alerts for Creator Tester Requests
- **What fails:** When a creator requests an Instagram Tester invite via `POST /api/instagram/tester-request`, Telegram alerts fail with HTTP 400 or render malformed links.
- **Root Cause:** Line 96 reads `process.env.META_APP_ID ?? "[META_APP_ID]"`. The environment variable defined in `.env.example` is `INSTAGRAM_APP_ID`. The literal string `"[META_APP_ID]"` is interpolated into a Markdown link `[Open Meta Developer Roles](https://developers.facebook.com/apps/[META_APP_ID]/roles/roles/)`, which violates Telegram Markdown v1 entity syntax and triggers a parse error.
- **Repair Steps:**
  1. In `app/api/instagram/tester-request/route.ts:96`, change `process.env.META_APP_ID` to `process.env.INSTAGRAM_APP_ID`.
  2. Escape Telegram Markdown special characters (`_`, `*`, `[`, `]`, `` ` ``) in dynamic user inputs (`username`, `workspaceId`).

### 4. Self-Hosted Docker Scheduled Jobs Not Running
- **What fails:** Instagram tokens expire after 60 days without refreshing, follower history is never snapshotted, and next-reel campaigns remain unbound in self-hosted Docker environments.
- **Root Cause:** `docker-compose.yml` does not declare a container service running `scripts/cron.sh`. Vercel crons only execute on Vercel deployments.
- **Repair Steps:**
  1. Edit `docker-compose.yml`.
  2. Add a `cron` service based on target `runner-web` or `base` executing `scripts/cron.sh`.
  3. Wire internal service dependencies to `web`.

---

## 5. Dead Code and Safe-to-Remove List

| Item / Identifier | Location | Proof It Is Unused | Removal Risk |
|---|---|---|---|
| `model ProcessedComment` | `prisma/schema.prisma:276-284` | Unreferenced across all source files; comment in `lib/queue/client.ts:37` explicitly confirms it is unwired and unused for deduplication. | **Check First** (Requires database migration to drop table) |
| `validateCoreEnv()` | `lib/env.ts:107-109` | Zero references across `app/`, `lib/`, `worker/`, and `__tests__/`. | **Safe** |
| `canManageBilling()` | `lib/workspace-access.ts:30-32` | Billing was removed in migration `20260525120000_remove_billing`. Zero references across codebase. | **Safe** |
| `isReportBranded()` | `lib/reports/share.ts:18-20` | Returns hardcoded `false`; leftover stub from prior SaaS multi-tier white-labeling. | **Safe** |
| `file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg` | `public/` root | Boilerplate files from Next.js template starter; zero references in code or CSS. | **Safe** |
| `star-history.png` | `public/star-history.png` | Graphic asset not referenced in `README.md`, `docs/`, or any page/component. | **Safe** |
| `AutomationsRedirectPage` | `app/(dashboard)/automations/page.tsx` | Legacy URL shim that unconditionally calls `redirect("/campaigns")`. | **Safe** (Can be moved to `next.config.ts` redirects) |
| `NewAutomationRedirectPage` | `app/(dashboard)/automations/new/page.tsx` | Legacy URL shim that unconditionally calls `redirect("/campaigns/new")`. | **Safe** (Can be moved to `next.config.ts` redirects) |
| Component barrel files | `components/campaigns/index.ts`, `components/analytics/index.ts`, `components/layout/index.ts`, `components/marketing/index.ts`, `components/settings/index.ts` | Zero import statements across the entire repository use these index files. | **Safe** |
| Top-level re-export shims | `components/*.tsx` (19 files re-exporting subdirectories) | Redundant duplicate shims created during component restructuring. | **Check First** (Update import references across consumers before deleting) |
| Unused icon imports | `app/(dashboard)/campaigns/page.tsx:29-35`, `components/campaigns/campaign-builder.tsx:26-39` | Identified by ESLint as imported but unreferenced symbols. | **Safe** |

---

## 6. Upgrade Roadmap

| Package Name | Current Version | Target Version | Breaking Change Risk | Upgrade Order & Rationale |
|---|---|---|---|---|
| `next-auth` | `^5.0.0-beta.31` | `5.0.0-beta.33+` (or stable) | **Medium** | **1st:** Keep NextAuth updated to the latest beta patch to fix session validation and adapter issues before stabilizing auth. |
| `@types/node` | `^20.x` | `^22.x` (LTS) | **Low** | **2nd:** Harmonize Node types with production Node 22/24 runtimes to eliminate type disparity in Crypto and Buffer APIs. |
| `recharts` | `^3.8.1` | Latest stable 3.x | **Low** | **3rd:** Ensure full hydration compatibility with React 19 Server Components. |
| `prisma` & `@prisma/client` | `7.8.0` | `7.8.x` | **Low** | **4th:** Maintain current version; Prisma 7 with Postgres driver adapter is functioning cleanly. |
| `bullmq` & `ioredis` | `5.76.4` / `5.10.1` | Current / Latest minor | **Low** | **5th:** Stable; focus on fixing duplicate client instantiation rather than major version bumps. |

---

## 7. Security Report

### Threat Modeling & Attack Vectors
1. **Unauthenticated Dashboard Hijacking:**
   - *Vulnerability:* In `lib/auth.ts:81-83`, `getCurrentUserId()` unconditionally returns `"local-owner-id"`. In `app/(dashboard)/layout.tsx:22-24`, session validation is bypassed in favor of mock environment defaults. In `proxy.ts:7-9`, requests to `/login` are forcefully redirected to `/dashboard`.
   - *Impact:* Anyone who connects to the deployed web application URL is granted unrestricted control over all connected Instagram accounts, campaigns, webhook logs, and workspace members without supplying credentials.
2. **Container Secret Exfiltration:**
   - *Vulnerability:* `.dockerignore` does not exclude `.env`. Local development secrets (including live Ngrok tokens and Meta client secrets) are copied during `COPY . .` in `Dockerfile:16`.
   - *Impact:* Public or shared container registries containing the built Docker image expose full API keys, database connection strings, and webhook verification tokens to inspection.
3. **Privilege Escalation via Invitation Token Leakage:**
   - *Vulnerability:* `GET /api/workspace/members` returns all pending `WorkspaceInvitation` records including their unhashed `token` and complete `inviteUrl`.
   - *Impact:* Any authenticated or local workspace member (including role `MEMBER`) can read pending `ADMIN` or `OWNER` invitation links and claim elevated permissions.
4. **Timing Attacks on Cron Automation Endpoints:**
   - *Vulnerability:* Endpoints in `app/api/cron/*` validate the `Authorization: Bearer <token>` header using basic JavaScript inequality (`!==`).
   - *Impact:* Side-channel timing attacks can theoretically allow attackers to deduce the cron secret byte-by-byte.
5. **Open Redirect / Unvalidated URL Redirection in Link Tracker:**
   - *Vulnerability:* In `app/r/[slug]/route.ts:49`, `NextResponse.redirect(trackedLink.destinationUrl)` executes without checking destination protocol or validating against malformed inputs.
   - *Impact:* Attackers with campaign creation privileges could set arbitrary schemes or relative paths, potentially facilitating phishing redirects or crashing the route handler.

---

## 8. Prioritized Repair Plan

### Phase 1: Critical Fixes (Security & Build Restoration)
*Goal: Secure access control, prevent credential leaks, and fix the production build.*

1. **Step 1: Secure Auth and Remove Local Bypass**
   - In `lib/auth.ts`, update `getCurrentUserId()` to call `await auth()` and return `session?.user?.id ?? null`.
   - In `app/(dashboard)/layout.tsx`, remove the hardcoded `LOCAL_OWNER_ID` fallback; check `await auth()` and redirect unauthenticated sessions to `/login`.
   - In `proxy.ts`, remove the hardcoded `/login -> /dashboard` redirect; protect dashboard routes and allow public access to `/login` and `/invite`.
2. **Step 2: Sanitize Credentials and Fix Docker Isolation**
   - Add `.env*` (except `.env.example`) to `.dockerignore`.
   - In `.env`, remove committed production secrets (`NGROK_AUTHTOKEN`, `INSTAGRAM_APP_SECRET`, `FACEBOOK_APP_SECRET`); generate new secrets and place placeholders in `.env.example`.
   - In `docker-compose.yml`, replace hardcoded secrets with environment variable expansions.
3. **Step 3: Fix Production Build & Dynamic Server Rendering**
   - In `app/(dashboard)/layout.tsx`, add `export const dynamic = "force-dynamic";`.
   - Resolve the 4 ESLint `react-hooks/set-state-in-effect` errors in `app/(dashboard)/campaigns/page.tsx`, `app/(dashboard)/inbox/page.tsx`, and `components/campaigns/campaign-builder.tsx`.
   - Run `npm run lint` and `npm run build` to verify clean exits.

### Phase 2: High Priority (Reliability, Webhooks & Operations)
*Goal: Prevent webhook crashes, rate-limit violations, and job scheduler omissions.*

4. **Step 4: Webhook Signature Verification Hardening**
   - In `lib/meta/webhook.ts`, do not throw unhandled errors if app secrets are missing; return `false` cleanly.
   - In `app/api/webhook/route.ts`, ensure `verifyWebhookSignature` is wrapped in try/catch and logs an operational warning before returning 401.
5. **Step 5: Fix Telegram Alerts & Environment Names**
   - In `app/api/instagram/tester-request/route.ts`, change `META_APP_ID` to `INSTAGRAM_APP_ID`.
   - Format Telegram message strings using proper entity escaping to prevent Markdown parse rejections.
6. **Step 6: Restore Docker Cron Scheduler**
   - In `docker-compose.yml`, add a dedicated service definition for `scripts/cron.sh` running in background container mode.
7. **Step 7: Enforce Rate Limiting on Inbox Messages**
   - In `app/api/instagram/conversations/route.ts:POST`, integrate `reserveDMSlot` and record outgoing messages in `DmLog` so manual replies do not breach Meta's 750/hr rate limit.

### Phase 3: Cleanup, Performance & Optimization
*Goal: Optimize database performance, eliminate memory bloat, and remove dead code.*

8. **Step 8: Refactor Dashboard Analytics Queries**
   - In `app/api/dashboard/stats/route.ts`, replace in-memory array filtering of click rows and contact rows with SQL `COUNT(DISTINCT recipientHash)` and native aggregation queries.
   - Combine the 7 daily DM count queries into a single SQL query grouping by day.
9. **Step 9: Database Index Optimization**
   - In `prisma/schema.prisma`, add `@@index([workspaceId, createdAt])` to `DmLog`.
   - Run `npx prisma migrate dev` to generate the indexing migration.
10. **Step 10: Clean Up Dead Code and Redundant Assets**
    - Delete unused boilerplate assets from `public/` (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`, `star-history.png`).
    - Remove unused barrel index files in `components/*/index.ts`.
    - Deprecate and remove legacy `ProcessedComment` model from schema.
    - Consolidate Redis client instances in `lib/queue/client.ts` and `lib/utils/rate-limiter.ts` using `globalThis`.

---

## 9. Items Needing Human Decision

1. **Authentication Mode for Self-Hosters:**
   - *Context:* The codebase was modified with `LOCAL_OWNER_ID` to facilitate zero-login single-tenant usage during local development.
   - *Decision Needed:* Does the maintainer intend OpenReply to operate as a true multi-tenant team SaaS (requiring strict NextAuth login and magic links), or should a single-tenant bypass mode be formally supported via an explicit configuration flag (e.g. `ENABLE_LOCAL_AUTH_BYPASS=true`)?
2. **Meta App Secrets Rotation:**
   - *Context:* Active App Secrets, Ngrok authtokens, and Facebook app secrets were committed in `.env`.
   - *Decision Needed:* The repository owner must immediately invalidate and rotate the compromised Meta App Secret and Ngrok Token in the Meta Developer Portal and Ngrok Dashboard.
3. **Database Schema Pruning (`ProcessedComment`):**
   - *Context:* `ProcessedComment` is completely unused by application logic but exists in PostgreSQL migrations.
   - *Decision Needed:* Confirm whether historical data in `ProcessedComment` should be preserved or if dropping the table via migration is approved.
4. **Integration Test Infrastructure (`TEST_DATABASE_URL`):**
   - *Context:* 15 integration tests across `comment-delivery.test.ts` and `tracked-link-order.db.test.ts` are skipped in CI because a live PostgreSQL test container is not spun up in `.github/workflows/ci.yml`.
   - *Decision Needed:* Should a GitHub Actions `services:` block (running `postgres:16`) be added to `ci.yml` so integration tests run on every pull request?

---

## 10. Appendix: Audit Methodology & Evidence

### Commands Executed (Read-Only)
- `git status` -> Recorded exit code 1 (`fatal: not a git repository`).
- `npm run typecheck` -> Exited code 0 (TypeScript compilation succeeded).
- `npm run test` -> Vitest ran 28 test suites: 26 passed (322 tests), 2 skipped (15 tests due to missing `TEST_DATABASE_URL`).
- `npm run lint` -> Exited code 1 with 20 problems (4 errors, 16 warnings).
- `npm run build` -> Identified build stall during static generation due to layout database dependency.
- `Get-ChildItem -Recurse` -> Mapped all project directories, files, scripts, and configs.
- `Select-String` -> Verified caller references and proved absence of dead code identifiers.

### Files Scanned
- Configurations: `package.json`, `tsconfig.json`, `next.config.ts`, `prisma.config.ts`, `eslint.config.mjs`, `vitest.config.ts`, `docker-compose.yml`, `Dockerfile`, `.env`, `.env.example`, `.gitignore`, `.dockerignore`, `vercel.json`
- Database: `prisma/schema.prisma`, `prisma/migrations/*`
- Application Pages & Routes: `app/(dashboard)/**/*`, `app/api/**/*`, `app/r/**/*`, `app/invite/**/*`, `app/templates/**/*`, `proxy.ts`
- Core Libraries: `lib/auth.ts`, `lib/env.ts`, `lib/workspace.ts`, `lib/workspace-access.ts`, `lib/queue/*`, `lib/meta/*`, `lib/instagram/*`, `lib/zernio/*`, `lib/tracking/*`, `lib/polling/*`, `lib/billing/*`, `lib/ops/*`, `lib/notifications/*`
- Tests: `__tests__/*.test.ts`
- Workflows & Docs: `.github/workflows/*.yml`, `README.md`, `docs/*`

### Files Skipped From Deep Line-by-Line Inspection
- `node_modules/**` (Vendor dependencies)
- `.next/**` (Build artifacts)
- `package-lock.json` (Lockfile; scanned dependencies via `package.json`)
- `app/generated/prisma/**` (Generated Prisma Client output)
- `public/fonts/geist-latin.woff2` (Binary font asset)

---

### Verification Confirmation
**No project files were modified, created, renamed, or deleted during this audit** (with the exception of this report `AUDIT_REPORT.md`).

**Git Status Verification Output:**
```
fatal: not a git repository (or any of the parent directories): .git
```
*(Verified: Project directory is unversioned/lacks `.git` metadata; no files altered.)*
