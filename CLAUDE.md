# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

- **Nuxt 4** (Vue 3, `compatibilityDate: 2025-07-15`) with the `@nuxt/ui` module and Tailwind CSS v4
- **Nitro server** for API routes under `server/api/**` (currently empty — the site is UI-only)
- **Drizzle ORM** against **Postgres** (the `pgvector/pgvector:pg16` image — pgvector is intentional; a RAG-backed chatbot is planned)
- **pnpm** is the package manager; **tsx** runs server-side TS scripts

## Common commands

```bash
pnpm install           # install deps (also runs `nuxt prepare` postinstall)
pnpm dev               # dev server on http://localhost:3000
pnpm build             # production build
pnpm preview           # preview the production build
pnpm generate          # static generation

make up                # start Postgres via docker-compose (reads .env)
make up-build          # rebuild + recreate containers
make down              # stop
make down-volumes      # stop + wipe the `my_website_pg_data` volume

make db-generate       # drizzle-kit generate — emit SQL migration from schema.ts
make db-migrate        # drizzle-kit migrate — apply pending migrations

make ingest            # chunk + embed every *.md in professional-experience-context/
```

`.env` must define `POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, and — for ingestion / RAG — `OPENAI_API_KEY`. Both the runtime (`server/database/index.ts`) and `drizzle.config.ts` read these directly from `process.env`, so the DB container and the app share one set of credentials.

## Architecture

Nuxt 4 uses the split `app/` + `server/` layout:

- `app/app.vue` is the shell (`<NuxtPage />`); `app/pages/` is file-based routing. `app/assets/css/main.css` is the Tailwind entry imported via `nuxt.config.ts`.
- `app/pages/index.vue` composes the resume sections from `app/components/resume/*.vue`, pulling content from the hand-maintained `app/data/resume.ts`. The chat section on that page is a **styled placeholder** — the RAG-backed chatbot will land on a separate branch.
- `app/components/resume/` components are auto-imported with the directory prefix, so `resume/Header.vue` → `<ResumeHeader />`, `resume/Skills.vue` → `<ResumeSkills />`, etc.
- `server/api/<route>/<method>.get.ts|post.ts|...` files become `/api/<route>` endpoints automatically (Nitro file-based routing). No handlers exist yet.

### Resume content flow

- `professional-experience-context/Resume.md` is the **source of truth** for resume content (it will also feed the planned RAG pipeline).
- `app/data/resume.ts` is a hand-maintained, typed, UI-friendly translation of that markdown. When the markdown changes, update this module — it's the single point the UI reads from. Skills are intentionally grouped here (Languages / Frontend / Backend / Data / Cloud & DevOps / AI / Integrations) rather than a flat list.

### Database layer (`server/database/`)

- `schema.ts` is a stub (`export {}`) right now — add tables as features land, then run `make db-generate` and `make db-migrate`. There is no migration history committed yet; the first real table will generate migration `0000_*.sql`.
- `index.ts` exports a shared `pool` and a `db` (Drizzle) instance bound to the full schema — import `db` from here in API handlers rather than constructing new clients.

## Content conventions

- `professional-experience-context/` is gitignored source material (resumes, SOWs, project write-ups). Treat it as read-only reference — don't commit anything inside it, and don't assume it's present in CI or for other contributors.
