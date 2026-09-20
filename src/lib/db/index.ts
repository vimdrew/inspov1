import "@tanstack/react-start/server-only";
import { setDefaultAutoSelectFamily } from "node:net";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { ENV } from "varlock/env";

import { authRelations } from "#/lib/db/schema/auth.schema.ts";
import { relations } from "#/lib/db/schema/relations.ts";

setDefaultAutoSelectFamily(false);

const client = postgres(ENV.DATABASE_URL);

export const db = drizzle({
  client,
  // authRelations uses defineRelationsPart,
  // so it must come after the main relations.
  // https://orm.drizzle.team/docs/relations-v2#relations-parts
  relations: { ...relations, ...authRelations },
});
