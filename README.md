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
