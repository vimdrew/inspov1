import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { AddLinkOutfitDialog } from "#/components/modals/add-link-outfit-dialog.tsx";
import { AddVideoOutfitDialog } from "#/components/modals/add-video-outfit-dialog.tsx";
import { OutfitCard } from "#/components/outfit-card.tsx";
import { authClient } from "#/lib/auth/auth-client.ts";
import { authQueryOptions } from "#/lib/auth/queries.ts";
import { outfitsQueryOptions } from "#/lib/outfits/queries.ts";

export const Route = createFileRoute("/_auth/_hasAddButton/")({
  loader: async ({ context }) => {
    // The gallery is the primary view, so block on the list before hydration.
    // Deferring it would dehydrate a pending query on the server and reject
    // with CancelledError when the SSR request tears down.
    await context.queryClient.query(outfitsQueryOptions());
  },
  head: () => ({
    meta: [
      { title: "Inspo — Browse outfits" },
      {
        name: "description",
        content: "Browse outfits shared by the community for styling inspiration.",
      },
    ],
  }),
  component: BrowsePage,
});

function BrowsePage() {
  const { data: outfits, isPending } = useQuery(outfitsQueryOptions());
  const [sort, setSort] = useState<"topRated" | "newest">("topRated");

  const sortedOutfits = useMemo(() => {
    if (!outfits) return outfits;
    if (sort === "newest") {
      return [...outfits].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }
    return [...outfits].sort((a, b) => {
      const byRating = (b.rating ?? -1) - (a.rating ?? -1);
      if (byRating !== 0) return byRating;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [outfits, sort]);

  return (
    <div className="min-h-svh bg-background">
      <Header />
      <main>
        {isPending ? (
          <OutfitGridSkeleton />
        ) : sortedOutfits?.length ? (
          <>
            <SortPicker value={sort} onChange={setSort} />
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-4">
              {sortedOutfits.map((outfit) => (
                <OutfitCard
                  key={outfit.id}
                  id={outfit.id}
                  name={outfit.name}
                  image={outfit.image}
                  rating={outfit.rating}
                />
              ))}
            </div>
          </>
        ) : (
          <EmptyState />
        )}
      </main>
      <HomeActionButtons />
    </div>
  );
}

type SortValue = "topRated" | "newest";

const SORT_OPTIONS: { value: SortValue; label: string }[] = [
  { value: "topRated", label: "Top rated" },
  { value: "newest", label: "Newest" },
];

function SortPicker({
  value,
  onChange,
}: {
  value: SortValue;
  onChange: (next: SortValue) => void;
}) {
  return (
    <div className="mx-auto flex max-w-5xl justify-end px-4 pt-4 md:px-12">
      <div className="flex border border-border">
        {SORT_OPTIONS.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={
                selected
                  ? "agdasima-regular bg-foreground px-3 py-1 text-[11px] tracking-[0.2em] text-background uppercase"
                  : "agdasima-regular bg-background px-3 py-1 text-[11px] tracking-[0.2em] text-muted-foreground uppercase transition-colors hover:text-foreground"
              }
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function HomeActionButtons() {
  return (
    <>
      <AddLinkOutfitDialog />
      <AddVideoOutfitDialog />
    </>
  );
}

function Header() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-20 h-[10%] max-h-200 border-b border-border bg-background/80 backdrop-blur">
      <div className="flex items-center justify-between px-3 py-3 md:px-4">
        <Link
          to="/"
          className="agdasima-bold text-sm tracking-[0.3em] uppercase transition-opacity hover:opacity-70"
        >
          Inspo
        </Link>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={async () => {
              await authClient.signOut({
                fetchOptions: {
                  onResponse: async () => {
                    queryClient.setQueryData(authQueryOptions().queryKey, null);
                    await router.invalidate();
                  },
                },
              });
            }}
            className="agdasima-regular text-xs tracking-[0.2em] text-muted-foreground uppercase transition-colors hover:text-foreground"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

function OutfitGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="aspect-[3/4] animate-pulse bg-muted" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-24 text-center">
      <p className="agdasima-bold text-2xl uppercase">No outfits yet</p>
      <p className="agdasima-regular text-xs tracking-widest text-muted-foreground uppercase">
        Add your first fit to get started.
      </p>
    </div>
  );
}
