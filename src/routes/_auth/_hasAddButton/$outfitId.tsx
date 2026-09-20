import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { fitImageUrl } from "#/lib/outfits/image-url.ts";
import { outfitQueryOptions } from "#/lib/outfits/queries.ts";

export const Route = createFileRoute("/_auth/_hasAddButton/$outfitId")({
  head: () => ({
    meta: [
      { title: "Inspo — Outfit" },
      {
        name: "description",
        content: "View a single outfit with full detail.",
      },
    ],
  }),
  component: OutfitDetailPage,
});

const addedAtFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

type Outfit = {
  id: string;
  name: string;
  image: string | null;
  createdAt: string | Date;
};

function OutfitDetailPage() {
  const { outfitId } = Route.useParams();
  const { data: outfit, isPending } = useQuery(outfitQueryOptions(outfitId));

  return (
    <div className="min-h-svh bg-background">
      <nav className="agdasima-regular flex items-center gap-2 px-4 pt-6 pb-2 text-xs tracking-[0.2em] uppercase md:px-8">
        <Link to="/" className="text-muted-foreground transition-colors hover:text-foreground">
          Home
        </Link>
        <span className="text-foreground/30">&gt;</span>
        <Link to="/" className="text-muted-foreground transition-colors hover:text-foreground">
          Outfits
        </Link>
        <span className="text-foreground/30">&gt;</span>
        <span className="max-w-[14rem] truncate text-foreground">{outfit ? outfit.name : "…"}</span>
      </nav>

      <main className="mx-auto flex w-full max-w-5xl flex-col items-center justify-center px-4 pt-2 pb-16 md:px-12">
        {isPending ? (
          <DetailSkeleton />
        ) : outfit?.image ? (
          <div className="relative flex max-h-[72svh] w-full items-center justify-center">
            <img
              src={fitImageUrl(outfit.image, 1200)}
              alt={outfit.name}
              className="max-h-[72svh] max-w-full object-contain"
            />
            <OutfitInfoPanel outfit={outfit} className="absolute top-4 left-0 hidden md:block" />
          </div>
        ) : (
          <OutfitEmptyState />
        )}

        {outfit?.image ? <OutfitInfoPanel outfit={outfit} className="mt-6 md:hidden" /> : null}
      </main>
    </div>
  );
}

function OutfitInfoPanel({ outfit, className }: { outfit: Outfit; className?: string }) {
  return (
    <div className={className}>
      <div className="flex items-start gap-3">
        <div className="bg-card py-4 pr-8 pl-5 shadow-md ring-1 ring-foreground/10">
          <p className="agdasima-bold text-2xl tracking-[0.06em] uppercase">{outfit.name}</p>
          <div className="mt-3 h-px w-8 bg-foreground/20" />
          <p className="agdasima-regular mt-3 text-xs tracking-[0.2em] text-muted-foreground uppercase">
            Added {addedAtFormatter.format(new Date(outfit.createdAt))}
          </p>
        </div>
        <div className="mt-10 hidden h-px w-14 bg-border md:block" />
      </div>
    </div>
  );
}

function OutfitEmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <p className="agdasima-bold text-2xl uppercase">No image found</p>
      <p className="agdasima-regular text-xs tracking-widest text-muted-foreground uppercase">
        This outfit doesn&apos;t have a photo.
      </p>
      <Link
        to="/"
        className="agdasima-regular text-xs tracking-[0.2em] text-muted-foreground uppercase transition-colors hover:text-foreground"
      >
        Back to outfits
      </Link>
    </div>
  );
}

function DetailSkeleton() {
  return <div className="h-[60svh] w-full max-w-2xl animate-pulse bg-muted" />;
}
