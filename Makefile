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

db-seed:
	pnpm tsx server/database/seed.ts
