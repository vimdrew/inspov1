import { defineRelations } from "drizzle-orm";

import * as schema from "./";

export const relations = defineRelations(schema, (r) => ({
  user: {
    outfits: r.many.outfits({
      from: r.user.id,
      to: r.outfits.userId,
    }),
  },
  outfits: {
    owner: r.one.user({
      from: r.outfits.userId,
      to: r.user.id,
    }),
  },
}));
