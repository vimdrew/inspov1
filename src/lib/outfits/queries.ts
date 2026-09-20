import { queryOptions } from "@tanstack/react-query";

import { $listOutfits } from "./functions";

/**
 * Shared query for the browse gallery (homepage). Kept as a reusable options
 * factory so loaders and components subscribe to the same cache entry.
 */
export const outfitsQueryOptions = () =>
  queryOptions({
    queryKey: ["outfits"],
    queryFn: ({ signal }) => $listOutfits({ signal }),
  });
