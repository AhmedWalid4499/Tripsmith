@AGENTS.md

# Tripsmith

AI trip planner. A user describes a trip (destination or "surprise me", dates or length, departure city, travellers, budget + currency, style, interests, passport nationality) and gets a complete, editable, shareable plan: day-by-day itinerary, hotels per city, flight estimate, visa requirements, a pre-trip checklist, a budget breakdown and practical info.

## Status

| Phase                     | Scope                                                                        | State |
| ------------------------- | ---------------------------------------------------------------------------- | ----- |
| 1. Foundation             | Scaffold, Tailwind/shadcn, Prisma schema + migration, Auth.js, layout        | Done  |
| 2. Trip form + generation | Multi-step form, prompts + Zod, mock providers, pg-boss worker, SSE progress | Next  |
| 3. Planner UI             | Timeline, hotels, visa card, checklist, budget chart, edit/regenerate        |       |
| 4. Sharing                | `/t/[slug]`, OG image, print stylesheet, share toggle                        |       |
| 5. Hardening              | Rate limits, error/empty/loading states, tests, Railway deploy               |       |

## Stack

- **Next.js 16.4** (App Router, Turbopack, **Cache Components + Partial Prefetching on**). This is newer than most training data: read `node_modules/next/dist/docs/` before using an API you're unsure of. `middleware.ts` is now `proxy.ts`.
- **TypeScript**, **Tailwind CSS 4** (CSS-first config in `src/app/globals.css`, no `tailwind.config`), **shadcn/ui** (Radix base, components in `src/components/ui`).
- **PostgreSQL + Prisma 7** (`prisma-client` generator → `src/generated/prisma`, driver adapter `@prisma/adapter-pg`, config in `prisma.config.ts`).
- **Auth.js v5** (`next-auth@beta`): email magic link (Resend) + Google, Prisma adapter, database sessions.
- **Anthropic SDK** for generation, model from `ANTHROPIC_MODEL` (default `claude-opus-5-5`). Structured JSON output validated with **Zod**, never regex parsing.
- **pg-boss** for background jobs (Postgres-backed, no Redis). Separate `worker` service in production.
- Deploy target: **Railway** (web + worker + Postgres).
- Package manager: **pnpm**. Node ≥ 22.

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
```

Local Postgres: `DATABASE_URL="postgresql://tripsmith:tripsmith@localhost:5432/tripsmith?schema=public"`. Copy `.env.example` to `.env` and fill in `AUTH_SECRET`. Without `AUTH_RESEND_KEY`, magic links are printed to the server console.

## Layout

```
prisma/                 schema.prisma, migrations/
src/app/                routes (App Router)
src/components/ui/      shadcn primitives (don't put app logic here)
src/components/<area>/  feature components (layout, landing, auth, account, trips, planner, share)
src/server/             server-only code: db, env, auth, session (DAL), actions/, generation/, providers/, jobs/
src/lib/                isomorphic helpers: money/, countries, dates, utils
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
- Guests can create one trip without an account (cookie token, hashed in `Trip.guestTokenHash`). Unclaimed guest trips expire after `GUEST_TRIP_TTL_DAYS`.

### Money

- Store money as integer **minor units** (`*Minor`) next to an ISO 4217 `currency`. Source prices may be any currency (JPY, THB…). Display currencies are only `USD | EUR | EGP` (`Currency` enum, `lib/money/currencies.ts`).
- All conversion goes through `src/lib/money/` using an `FxRateSnapshot`. No ad-hoc maths elsewhere.
- Every price shows **estimate** or **live** (`priceSource`) plus a "last checked" time (`priceCheckedAt`). Use the `estimate` / `live` badge variants.
- Budget category totals for flights, hotels and activities are **computed**, never stored. `BudgetLine` holds only manual lines and the buffer.

### Visa (high-stakes)

- `VisaInfo.officialUrl` comes **only** from the curated table (`src/lib/visa/official-sources.ts`), never from model output, because models invent plausible-looking URLs.
- Model-derived visa info is `confidence: AI_ESTIMATE` and always shown as unverified, with the "verify before you travel" disclaimer.

### Providers

- Live data sits behind interfaces: `FlightProvider`, `HotelProvider`, `ActivityProvider`, `VisaProvider`, `WeatherProvider`, `FxProvider` (`src/server/providers/`). Each has `Mock*` and `LLMEstimate*` implementations, selected by `*_PROVIDER` env flags. Add real APIs as new implementations behind those flags.

### Generation

- Never run generation inside a web request. Enqueue a pg-boss job. The worker writes `GenerationJob` progress, and the UI streams it via SSE.
- Generation is chunked: one outline call, then one call per day (also used for "regenerate day"). Every model response is parsed with Zod. Log token usage to `LlmUsage`.

### UI and accessibility

- Mobile-first. WCAG AA contrast (tokens in `globals.css` are tuned for it). Every interactive element is keyboard-reachable with a visible focus ring.
- Design: warm paper background, ink text, deep-sea teal (`primary`) for actions, terracotta as a sparing accent, Fraunces for headings (`font-display`), Geist for body. **No gradient "AI" looks.**
- Use shadcn primitives from `@/components/ui`. To add more, run `pnpm dlx shadcn@latest add <name>` (needs network access to ui.shadcn.com) or write them in the same style.
- Forms: Server Actions + `useActionState`, Zod validation on the server, field errors via `aria-invalid` / `aria-describedby`.

### Git

- Conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`).
- Keep this file up to date when a decision changes.
