import { useMutation, useQueryClient } from "@tanstack/react-query";

import { $createOutfit } from "./functions";
import { outfitsQueryOptions, outfitQueryOptions } from "./queries";

type Outfit = Awaited<ReturnType<typeof $createOutfit>>;

/**
 * Creates an outfit and writes the canonical row into the list + detail caches.
 * Handles cache only — consumers own success/error toasts so the result can be
 * shown in context (e.g. "3 of 5 added" when importing multiple links).
 */
export const useCreateOutfit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, imageUrl }: { name: string; imageUrl: string }) =>
      $createOutfit({ data: { name, imageUrl } }),
    onSuccess: (outfit) => {
      queryClient.setQueryData<Outfit>(outfitQueryOptions(outfit.id).queryKey, outfit);
      queryClient.setQueryData<Outfit[]>(outfitsQueryOptions().queryKey, (prev) => [
        outfit,
        ...(prev ?? []),
      ]);
    },
  });
};
