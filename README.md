# Tripsmith

Describe a trip and get a complete, editable plan you can share: a day-by-day itinerary, hotels, a flight estimate, visa requirements for your passport, a pre-trip checklist, a budget breakdown and practical info.

## Quick start

Requirements: Node 22+, pnpm 10+, PostgreSQL 16+.

```bash
pnpm install
cp .env.example .env          # then set AUTH_SECRET (openssl rand -base64 32)
pnpm db:migrate               # create tables
pnpm dev                      # http://localhost:3000
```

Sign in with any email. In development, the magic link is printed in the terminal running `pnpm dev`.

### Planning trips locally

- **Without an API key (sample mode):** set `LLM_MODE="mock"` and `RUN_WORKER_IN_WEB="true"` in `.env`. Plans come from curated data for Tokyo, Kyoto, Paris, Rome, Florence, Barcelona, London, Istanbul, Dubai and Bangkok.
- **With Claude:** set `ANTHROPIC_API_KEY` and `LLM_MODE="live"`.
- Generation runs in a background worker. Either set `RUN_WORKER_IN_WEB="true"`, or run `pnpm worker` in a second terminal.

```bash
pnpm test                     # unit tests
```

See [`CLAUDE.md`](./CLAUDE.md) for the stack, project layout, commands and conventions.

## Tests

```bash
pnpm test                # unit tests (Vitest)
pnpm test:integration    # rate limiter + maintenance against your local Postgres
pnpm test:e2e            # Playwright happy path + axe accessibility checks (builds and starts the app in sample mode)
```

CI (`.github/workflows/ci.yml`) runs formatting, lint, types, unit, integration and end-to-end tests against a Postgres service.

## Deploy to Railway

Tripsmith runs as **two services from this one repo plus a Postgres database**:

| Service  | Config file              | What it runs                                                                                                             |
| -------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `web`    | `railway.json` (default) | `pnpm build`, then migrations as the pre-deploy step (`pnpm db:deploy`), then `pnpm start`. Health check: `/api/health`. |
| `worker` | `railway.worker.json`    | `pnpm worker`: plan generation, planner edits and hourly maintenance.                                                    |

1. Create a Railway project and add **PostgreSQL**.
2. Add a service from this GitHub repo and name it `web`. It picks up `railway.json`. Generate a public domain for it.
3. Add a second service from the same repo and name it `worker`. In its settings, set the config-as-code file path to `/railway.worker.json`. It needs no public domain.
4. Set variables. Using Railway's _shared variables_ for the common ones is easiest:

   | Variable                                                                   | web     | worker | Notes                                                              |
   | -------------------------------------------------------------------------- | ------- | ------ | ------------------------------------------------------------------ |
   | `DATABASE_URL`                                                             | ✓       | ✓      | `${{Postgres.DATABASE_URL}}`                                       |
   | `ANTHROPIC_API_KEY`                                                        | ✓       | ✓      |                                                                    |
   | `ANTHROPIC_MODEL`                                                          | ✓       | ✓      | default `claude-opus-5-5`                                          |
   | `LLM_MODE`                                                                 | ✓       | ✓      | `live` (or `mock` for a demo without a key)                        |
   | `AUTH_SECRET`                                                              | ✓       |        | `openssl rand -base64 32`                                          |
   | `APP_URL`, `AUTH_URL`                                                      | ✓       |        | `https://<your web domain>`                                        |
   | `AUTH_RESEND_KEY`, `EMAIL_FROM`                                            | ✓       |        | magic-link email (sender domain verified in Resend)                |
   | `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`                                     | ✓       |        | optional; redirect URI `https://<domain>/api/auth/callback/google` |
   | `RUN_WORKER_IN_WEB`                                                        | `false` |        | the worker service does this job                                   |
   | Limits (`GENERATIONS_PER_DAY_*`, `EDITS_PER_DAY_*`, `GUEST_TRIP_TTL_DAYS`) | ✓       |        | optional, see `.env.example`                                       |

5. Deploy. The web service applies migrations before it starts; the worker creates its job tables on first start.

Node 22 is selected by `.node-version` and `engines`; pnpm by `packageManager`. Everything the worker and migrations need at runtime (`prisma`, `tsx`, `dotenv`) is a regular dependency, so they work even if dev dependencies are pruned.

> The Railway config files were written without access to Railway's documentation from the build environment. After the first deploy, check that the build command, pre-deploy step, start command and health check show up as expected in each service's settings.
