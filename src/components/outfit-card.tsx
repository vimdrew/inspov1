import { Link } from "@tanstack/react-router";
import { StarIcon } from "lucide-react";

import { fitImageUrl } from "#/lib/outfits/image-url.ts";

type OutfitCardProps = {
  id: string;
  name: string;
  image: string | null;
  rating: number | null;
};

export function OutfitCard({ id, name, image, rating }: OutfitCardProps) {
  return (
    <Link
      to="/o/$outfitId"
      params={{ outfitId: id }}
      aria-label={`View ${name}`}
      className="group block"
    >
      <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden">
        {image ? (
          <img
            src={fitImageUrl(image, 960)}
            alt={name}
            loading="lazy"
            className="max-h-full max-w-full object-contain transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />
        ) : null}
        {rating != null ? (
          <span className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-black/70 px-1.5 py-1 text-white">
            <StarIcon size={10} fill="currentColor" strokeWidth={2} />
            <span className="agdasima-bold text-[10px] tracking-widest">{rating}</span>
          </span>
        ) : null}
      </div>
    </Link>
  );
}
