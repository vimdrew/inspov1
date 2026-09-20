import { fitImageUrl } from "#/lib/outfits/image-url.ts";

type OutfitCardProps = {
  name: string;
  image: string | null;
};

export function OutfitCard({ name, image }: OutfitCardProps) {
  return (
    <article className="group">
      <div className="flex aspect-[3/4] items-center justify-center overflow-hidden">
        {image ? (
          <img
            src={fitImageUrl(image, 960)}
            alt={name}
            loading="lazy"
            className="max-h-full max-w-full object-contain transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />
        ) : null}
      </div>
    </article>
  );
}
