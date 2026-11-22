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

See [`CLAUDE.md`](./CLAUDE.md) for the stack, project layout, commands and conventions.
