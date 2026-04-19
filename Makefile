-include .env

up:
	docker-compose up -d

up-build:
	docker-compose up -d --build --force-recreate --remove-orphans

down:
	docker-compose down

down-volumes:
	docker-compose down -v

db-generate:
	pnpm drizzle-kit generate

db-migrate:
	pnpm drizzle-kit migrate

# Chunk + embed every markdown file in professional-experience-context/
# into the `documents` and `chunks` tables. Idempotent via content hash.
ingest:
	pnpm tsx --env-file=.env server/scripts/ingest.ts
