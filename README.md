# jpm-website

Personal site for John Million. Built with Nuxt 4, Nuxt UI, Tailwind v4, and Drizzle ORM + Postgres (pgvector). Renders a resume today; a RAG-backed chatbot is planned for a future branch.

## Setup

```bash
pnpm install
cp .env .env.local   # optional — or just edit .env directly
```

`.env` needs `POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`.

## Development

```bash
make up      # start Postgres (pgvector/pg16) via docker-compose
pnpm dev     # Nuxt dev server on http://localhost:3000
make down    # stop Postgres
```

The DB isn't required to run the site in its current state — the page is UI-only — but the stack is already wired up so Postgres is ready when the chatbot lands.

## Production

```bash
pnpm build      # build
pnpm preview    # preview the production build
```

## Database

Drizzle schema lives at `server/database/schema.ts`; runtime client at `server/database/index.ts`.

```bash
make db-generate    # generate a SQL migration from schema changes
make db-migrate     # apply pending migrations
```

The schema is a stub until the chatbot work adds tables.

## Resume content

The resume shown on the site is rendered from `app/data/resume.ts`, a typed, hand-maintained translation of `professional-experience-context/Resume.md` (gitignored). Update the markdown first, then mirror the changes into `app/data/resume.ts`; the UI components in `app/components/resume/` will pick it up automatically.
