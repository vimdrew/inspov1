import { useMutation, useQueryClient } from "@tanstack/react-query";
import { StarIcon } from "lucide-react";
import { useState } from "react";

import { $rateOutfit } from "#/lib/outfits/functions.ts";
import { outfitsQueryOptions, outfitQueryOptions } from "#/lib/outfits/queries.ts";
import { cn } from "#/lib/utils";

const STARS = [1, 2, 3, 4, 5] as const;

type OutfitRow = {
  id: string;
  name: string;
  image: string | null;
  createdAt: string | Date;
  rating: number | null;
};

export function OutfitRating({ outfitId, rating }: { outfitId: string; rating: number | null }) {
  const queryClient = useQueryClient();
  const [hover, setHover] = useState<number | null>(null);

  const rateMutation = useMutation({
    mutationFn: (next: number | null) => $rateOutfit({ data: { outfitId, rating: next } }),
    onMutate: async (next) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ["outfits"] }),
        queryClient.cancelQueries({ queryKey: ["outfits", outfitId] }),
      ]);
      const prevList = queryClient.getQueryData<OutfitRow[]>(outfitsQueryOptions().queryKey);
      const prevDetail = queryClient.getQueryData<OutfitRow | null>(
        outfitQueryOptions(outfitId).queryKey,
      );
      const patch: Partial<OutfitRow> = { rating: next };
      queryClient.setQueryData<OutfitRow[]>(outfitsQueryOptions().queryKey, (prev) =>
        prev?.map((o) => (o.id === outfitId ? { ...o, ...patch } : o)),
      );
      queryClient.setQueryData<OutfitRow | null>(outfitQueryOptions(outfitId).queryKey, (prev) =>
        prev ? { ...prev, ...patch } : prev,
      );
      return { prevList, prevDetail };
    },
    onError: (_error, _vars, context) => {
      if (context?.prevList) {
        queryClient.setQueryData<OutfitRow[]>(outfitsQueryOptions().queryKey, context.prevList);
      }
      if (context?.prevDetail) {
        queryClient.setQueryData<OutfitRow | null>(
          outfitQueryOptions(outfitId).queryKey,
          context.prevDetail,
        );
      }
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<OutfitRow>(outfitQueryOptions(outfitId).queryKey, updated);
      queryClient.setQueryData<OutfitRow[]>(outfitsQueryOptions().queryKey, (prev) =>
        prev?.map((o) => (o.id === outfitId ? updated : o)),
      );
    },
  });

  const shown = hover ?? rating ?? 0;

  return (
    <div className="mt-3 flex items-center gap-1">
      {STARS.map((n) => (
        <button
          key={n}
          type="button"
          aria-label={
            rating === n
              ? `Remove rating from ${n} stars`
              : `Rate this outfit ${n} ${n === 1 ? "star" : "stars"}`
          }
          aria-pressed={rating === n}
          disabled={rateMutation.isPending}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(null)}
          onClick={() => rateMutation.mutate(rating === n ? null : n)}
          className={cn(
            "cursor-pointer transition-transform hover:scale-110 disabled:cursor-default",
          )}
        >
          <StarIcon
            size={18}
            strokeWidth={2}
            fill={n <= shown ? "currentColor" : "none"}
            className={n <= shown ? "text-foreground" : "text-foreground/30"}
          />
        </button>
      ))}
    </div>
  );
}
