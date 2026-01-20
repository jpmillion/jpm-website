import { sql } from "drizzle-orm";
import * as p from "drizzle-orm/pg-core";

export const projects = p.pgTable("projects", {
  id: p.uuid("id").defaultRandom().primaryKey(),
  name: p.text("name").notNull(),
  description: p.text("description"),
  url: p.text("url"),
  repo_url: p.text("repo_url"),
  created_at: p.timestamp("created_at").defaultNow().notNull(),
});