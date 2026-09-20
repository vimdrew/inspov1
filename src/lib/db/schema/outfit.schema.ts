import { randomUUID } from "node:crypto";

import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { user } from "./auth.schema";

export const outfits = pgTable("outfits", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  name: text("name").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});
