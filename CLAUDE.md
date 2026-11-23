@AGENTS.md

# Tripsmith

AI trip planner. A user describes a trip (destination or "surprise me", dates or length, departure city, travellers, budget + currency, style, interests, passport nationality) and gets a complete, editable, shareable plan: day-by-day itinerary, hotels per city, flight estimate, visa requirements, a pre-trip checklist, a budget breakdown and practical info.

## Status

| Phase                     | Scope                                                                        | State |
| ------------------------- | ---------------------------------------------------------------------------- | ----- |
| 1. Foundation             | Scaffold, Tailwind/shadcn, Prisma schema + migration, Auth.js, layout        | Done  |
| 2. Trip form + generation | Multi-step form, prompts + Zod, mock providers, pg-boss worker, SSE progress | Done  |
| 3. Planner UI             | Timeline, hotels, visa card, checklist, budget chart, edit/regenerate        | Done  |
| 4. Sharing                | `/t/[slug]`, OG image, print stylesheet, share toggle                        | Done  |
| 5. Hardening              | Rate limits, error/empty/loading states, tests, Railway deploy               | Next  |

## Stack

- **Next.js 16.4** (App Router, Turbopack, **Cache Components + Partial Prefetching on**). This is newer than most training data: read `node_modules/next/dist/docs/` before using an API you're unsure of. `middleware.ts` is now `proxy.ts`.
- **TypeScript**, **Tailwind CSS 4** (CSS-first config in `src/app/globals.css`, no `tailwind.config`), **shadcn/ui** (Radix base, components in `src/components/ui`).
- **PostgreSQL + Prisma 7** (`prisma-client` generator → `src/generated/prisma`, driver adapter `@prisma/adapter-pg`, config in `prisma.config.ts`).
- **Auth.js v5** (`next-auth@beta`): email magic link (Resend) + Google, Prisma adapter, database sessions.
- **Anthropic SDK** for generation, model from `ANTHROPIC_MODEL` (default `claude-opus-5-5`). Structured JSON output validated with **Zod**, never regex parsing.
- **pg-boss** for background jobs (Postgres-backed, no Redis). Separate `worker` service in production.
- Deploy target: **Railway** (web + worker + Postgres).
- Package manager: **pnpm**. Node ≥ 22. The package is **ESM** (`"type": "module"`): the generated Prisma client uses `import.meta`, and the worker uses top-level `await`.
- **Vitest** for unit tests (`tests/unit/`).

## Commands

```bash
pnpm dev                 # dev server on :3000
pnpm build               # prisma generate + next build
pnpm start               # serve the production build
pnpm lint                # eslint
pnpm typecheck           # next typegen + tsc
pnpm format              # prettier --write
pnpm db:migrate          # create/apply a migration in dev (prisma migrate dev)
pnpm db:deploy           # apply migrations in prod (prisma migrate deploy)
pnpm db:generate         # regenerate the Prisma client (run after schema edits)
pnpm db:studio           # Prisma Studio
pnpm worker              # generation worker (pg-boss consumer)
pnpm test                # Vitest unit tests
pnpm tsx-server <file>   # run a TS script with server-only modules, e.g.
pnpm tsx-server scripts/smoke-generate.ts "Rome and Florence" 6 US   # generate a trip in-process and print it
```

`prisma migrate dev` refuses to run in non-interactive shells (agents, CI). In that case write the migration SQL by hand in `prisma/migrations/<timestamp>_<name>/migration.sql`, run `pnpm db:deploy`, then check for drift with `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` (it should print an empty migration).

Local Postgres: `DATABASE_URL="postgresql://tripsmith:tripsmith@localhost:5432/tripsmith?schema=public"`. Copy `.env.example` to `.env` and fill in `AUTH_SECRET`. Without `AUTH_RESEND_KEY`, magic links are printed to the server console.

**Sample mode** (no API key needed): set `LLM_MODE="mock"` and `RUN_WORKER_IN_WEB="true"`, then `pnpm dev`. Plans come from curated data for Tokyo, Kyoto, Paris, Rome, Florence, Barcelona, London, Istanbul, Dubai and Bangkok (`src/server/providers/mock/data/`). Other destinations fail with a clear message. `MOCK_PLANNER_DELAY_MS` adds fake latency so you can see the live progress UI.

## Layout

```
prisma/                 schema.prisma, migrations/
src/app/                routes (App Router)
src/components/ui/      shadcn primitives (don't put app logic here)
src/components/<area>/  feature components (layout, landing, auth, account, trips, planner, share)
src/server/             server-only code: db, env, auth, session (DAL), actions/, generation/, providers/, jobs/
src/lib/                isomorphic helpers: money/, budget, checklist, trip-input (shared form/server schemas), visa/, countries, dates
src/server/generation/  planner (llm-planner + mock-planner), prompts, Zod schemas, orchestrator (runFullPlan, planDay), progress
src/server/providers/   provider interfaces (types.ts), mock/ (curated data), llm/ (estimates), registry.ts
src/server/jobs/        pg-boss queues (trip-full-plan, trip-edit), worker, LISTEN/NOTIFY listener for SSE
src/server/planner/     resequenceDays (persist new item order + recalculated times)
src/components/planner/ trip planner: tabs, itinerary editor (dnd-kit), panels, live job provider
src/components/share/   shared view, share dialog, print button
src/server/share.ts     public share gate (uncached) + cached shared content
src/server/og.tsx       Open Graph image helpers (brand colours as hex, fonts from src/assets/fonts)
src/worker/index.ts     worker entrypoint (Railway "worker" service)
scripts/                dev scripts (smoke-generate.ts)
tests/unit/             Vitest
src/generated/prisma/   generated Prisma client (git-ignored)
```

## Conventions

### Cache Components rules (these bite)

- Anything that reads cookies/headers/searchParams/the session must render **inside a `<Suspense>` boundary**. Keep pages' static chrome outside the boundary so it prerenders; put a skeleton fallback inside.
- Never `await` the session at the top of a layout. Use `getCurrentUser()` / `requireUser()` from `src/server/session.ts` inside the suspended component.
- `getCurrentUser()` calls `await connection()` before `auth()`, because Auth.js uses crypto randomness that would otherwise fail prerendering. Keep it that way.
- `src/server/env.ts` validates env **lazily** (`env()`); never read required secrets at module scope, or `next build` breaks without them.

### Auth

- Server Actions are public endpoints: re-check the session in every action (`getCurrentUser()`), never trust IDs from the client.
- Inside Server Actions, call Auth.js `signIn(..., { redirect: false })` and then `redirect()` yourself. Auth.js's own redirect goes via `/api/auth/verify-request`, which the client router can't follow from an action.
- Guests can create one trip without an account (cookie `ts_guest`, SHA-256 hash stored in `Trip.guestTokenHash`). Unclaimed guest trips expire after `GUEST_TRIP_TTL_DAYS` (cleanup job lands in Phase 5).
- On sign-in, the Auth.js `signIn` event calls `claimGuestTrips()`, which moves the guest's trips onto the account. It is imported lazily to avoid an auth ↔ session import cycle.
- Trip access goes through `src/server/trip-access.ts` (`findOwnedTrip`, `canEditTrip`). Pages and route handlers return 404, never 403, for trips the viewer doesn't own.

### Money

- Store money as integer **minor units** (`*Minor`) next to an ISO 4217 `currency`. Source prices may be any currency (JPY, THB…). Display currencies are only `USD | EUR | EGP` (`Currency` enum, `lib/money/currencies.ts`).
- All conversion goes through `src/lib/money/` using an `FxRateSnapshot`. No ad-hoc maths elsewhere.
- Every price shows **estimate** or **live** (`priceSource`) plus a "last checked" time (`priceCheckedAt`). Use the `estimate` / `live` badge variants.
- Budget category totals for flights, hotels and activities are **computed**, never stored. `BudgetLine` holds only manual lines and the buffer.

### Visa (high-stakes)

- `VisaInfo.officialUrl` comes **only** from the curated table (`src/lib/visa/official-sources.ts`), never from model output, because models invent plausible-looking URLs.
- Model-derived visa info is `confidence: AI_ESTIMATE` and always shown as unverified, with the "verify before you travel" disclaimer.
- Curated entries (`MockVisaProvider`) are `confidence: CURATED`, shown as "Curated summary, last reviewed <date>", still with the disclaimer. Review both the curated pairs and the official-sources table regularly; rules and portals change.

### Providers

- Live data sits behind interfaces: `FlightProvider`, `HotelProvider`, `ActivityProvider`, `VisaProvider`, `WeatherProvider`, `FxProvider` (`src/server/providers/types.ts`). Each has `Mock*` and `LLMEstimate*` implementations, selected by `*_PROVIDER` env flags. Add real APIs as new implementations behind those flags.
- `*_PROVIDER="mock"` means: curated data first, then the LLM estimate if the sample has nothing. `"llm"` means LLM estimate only. FX has no LLM fallback (rates must come from data).
- Mock providers return `null` when they don't know a place; the registry then tries the next provider.
- In `LLM_MODE=mock`, `LLMEstimate*` providers use simple heuristics and never call the API.

### Generation

- Never run generation inside a web request. Enqueue a pg-boss job. The worker writes `GenerationJob` progress, and the UI streams it via SSE.
- Generation is chunked: one outline call, then one call per day. `planDay(tripId, dayNumber, …)` reads its context from the database and keeps locked items, so "regenerate this day" reuses it.
- `generateStructured()` (`src/server/llm/client.ts`) is the only way to call the model: streaming, structured output built from the Zod schema, `stop_reason` checked (refusal / max_tokens) **before** parsing, Zod validation, one retry on invalid output, token usage logged to `LlmUsage`. For models that support it, the server-side refusal fallback (`fallbacks: "default"`) is enabled.
- Model output schemas use `.nullable()` rather than `.optional()`. The SDK moves constraints the API doesn't support (patterns, numeric bounds, `minItems` > 1, `maxItems`) into descriptions, and Zod enforces them after parsing. Business rules (nights summing to length − 1, day count) are fixed in code (`normalizeOutline`), not trusted from the model.
- Model output never supplies URLs. Prompts forbid them, and visa links come from the curated table.
- `runFullPlan` never throws: failures are recorded on `GenerationJob.error` (user-friendly text) and the trip goes to `FAILED`, with a "Try again" action. A retry starts clean.
- Progress: `reportProgress()` updates the job and calls `pg_notify('trip_progress', tripId)`. `/api/trips/[id]/events` (SSE) listens through one shared `LISTEN` connection per process and polls every 4 s as a fallback.
- The web app only _sends_ jobs (`getBoss("sender")`, no maintenance). The worker (`pnpm worker`, or in-process with `RUN_WORKER_IN_WEB=true`) consumes them. Server-only modules load outside Next.js through `node --conditions=react-server`.

### UI and accessibility

- Mobile-first. WCAG AA contrast (tokens in `globals.css` are tuned for it). Every interactive element is keyboard-reachable with a visible focus ring.
- Design: warm paper background, ink text, deep-sea teal (`primary`) for actions, terracotta as a sparing accent, Fraunces for headings (`font-display`), Geist for body. **No gradient "AI" looks.**
- Use shadcn primitives from `@/components/ui`. To add more, run `pnpm dlx shadcn@latest add <name>` (needs network access to ui.shadcn.com) or write them in the same style.
- Forms: Server Actions + `useActionState`, Zod validation on the server, field errors via `aria-invalid` / `aria-describedby`.

### Git

- Conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`).
- Keep this file up to date when a decision changes.

### Planner editing

- `/trips/[id]` renders `TripPlanner`: server-rendered panels inside client tabs (`PlannerTabs`, selected tab in the URL hash). The itinerary editor and checklist are client components; stays, visa, budget and info are server components.
- All edits are Server Actions in `src/server/actions/planner.ts`. Each one resolves the record through its trip and checks ownership (`findOwnedTrip`); unknown or foreign records get the same "not found" answer.
- Cheap edits run inline: reorder or move items, remove, lock, choose a hotel, tick the checklist, switch display currency. Anything that needs the planner (regenerate a day, swap an item) is a `GenerationJob` (`REGENERATE_DAY` / `SWAP_ACTIVITY`) on the `trip-edit` queue, handled by `runEditJob`. Only one job runs per trip at a time; actions refuse with a "busy" message otherwise.
- After any reorder, `resequenceDays()` rewrites order and times with the pure `retimeDay()` (`src/lib/retime.ts`): the day keeps its earliest start, travel info survives only where the neighbour is unchanged, and meals keep their booked time unless pushed later. The client runs the same function for instant feedback, so the UI doesn't jump after saving.
- `TripLiveProvider` follows the active edit job over SSE. It locks editing while a job runs, marks the busy day or item, toasts the outcome and calls `router.refresh()`. The SSE stream closes only when the trip is settled **and** no job is active.
- Drag and drop uses dnd-kit with a dedicated handle, `KeyboardSensor` and spoken announcements. Every drag action also has a menu equivalent ("Move to another day").
- Budget totals are always recomputed from the plan on render (`computeBudget`). The budget chart follows the dataviz rules: a meter for total vs budget, ranked single-hue bars (≤ 24px, 4px rounded data-end), figures as text, hover/focus tooltips, and a semantic table.
- Radix `SelectValue` renders empty until hydration; pass the label as children (`<SelectValue>{value}</SelectValue>`) for anything visible on first paint.

### Sharing

- A trip is public when `isPublic` is true and it has a `shareSlug`: a readable title prefix plus a 12-character random base62 token (`makeShareSlug`, `src/lib/share.ts`). Only the token matters for access. Only **signed-in owners** can share; guest trips expire, so they can't.
- `/t/[slug]` access is checked by `findSharedTrip()` on **every** request, with no caching, so turning sharing off or replacing the link takes effect immediately on all instances. The content (`getSharedTripContent`) is `"use cache"` with `cacheTag("trip:<id>")` and `cacheLife("minutes")`. Planner and share Server Actions call `updateTag` for it. Worker edits (regenerate / swap) can't, so they appear when the cache lifetime runs out.
- The shared view never includes passport nationality, visa details, the checklist, the owner's identity or guest tokens. Prices and the budget appear only if the owner ticks "Show prices" (`shareShowCosts`, off by default). Shared pages are `noindex, nofollow`.
- "Create a new link" replaces the slug (the old link 404s). Turning sharing off keeps the slug, so turning it back on restores the same link.
- Open Graph images: `src/app/t/[slug]/opengraph-image.tsx` (trip card) and `src/app/opengraph-image.tsx` (site card). A private or unknown link renders the generic card and never leaks trip details. Satori needs hex colours (`OG` in `src/server/og.tsx`) and `.woff` fonts (`src/assets/fonts/`, OFL).
- Print: one `@media print` block in `globals.css`. It hides controls (`[data-slot=button]`, switches, select triggers, `[data-print="hide"]`), prints every planner tab on its own page, keeps list items together and prints external URLs. Mark a button that must survive on paper with `data-print="keep"` (e.g. the official visa link).
