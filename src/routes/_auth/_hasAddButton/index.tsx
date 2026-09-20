import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";

import { OutfitCard } from "#/components/outfit-card.tsx";
import { authClient } from "#/lib/auth/auth-client.ts";
import { authQueryOptions } from "#/lib/auth/queries.ts";
import { outfitsQueryOptions } from "#/lib/outfits/queries.ts";

export const Route = createFileRoute("/_auth/_hasAddButton/")({
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

  return (
    <div className="min-h-svh bg-background">
      <Header />
      <main>
        {isPending ? (
          <OutfitGridSkeleton />
        ) : outfits?.length ? (
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-4">
            {outfits.map((outfit) => (
              <OutfitCard key={outfit.id} id={outfit.id} name={outfit.name} image={outfit.image} />
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </main>
    </div>
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
