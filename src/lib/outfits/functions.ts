import { createServerFn } from "@tanstack/react-start";
import { desc, eq } from "drizzle-orm";

import { authMiddleware, freshAuthMiddleware } from "#/lib/auth/middleware.ts";
import { db } from "#/lib/db/index.ts";
import { outfits } from "#/lib/db/schema/outfit.schema.ts";

import { destroyImage, signUpload } from "./cloudinary.server";
import { parseImageUrl } from "./image-url";
import { createOutfitSchema } from "./schemas";

export const $getUploadSignature = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const timestamp = Math.round(Date.now() / 1000);
    const folder = `outfits/${context.user.id}`;
    const signature = signUpload(timestamp, folder);
    return { timestamp, signature, folder };
  });

export const $createOutfit = createServerFn({ method: "POST" })
  .middleware([freshAuthMiddleware])
  .validator(createOutfitSchema)
  .handler(async ({ context, data }) => {
    const imageUrl = parseImageUrl(data.imageUrl);
    if (imageUrl.folder !== `outfits/${context.user.id}`) {
      throw new Error("Image belongs to another user");
    }

    const [outfit] = await db
      .insert(outfits)
      .values({
        name: data.name.trim(),
        userId: context.user.id,
        image: imageUrl.url,
      })
      .returning();

    return outfit;
  });

export const $deleteOrphanImage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { imageUrl: string }) => data)
  .handler(async ({ context, data }) => {
    const imageUrl = parseImageUrl(data.imageUrl);
    if (imageUrl.folder !== `outfits/${context.user.id}`) {
      return { deleted: false };
    }

    const inUse = await db.select().from(outfits).where(eq(outfits.image, imageUrl.url));
    if (inUse) {
      return { deleted: false };
    }

    await destroyImage(imageUrl.publicId);
    return { deleted: true };
  });

export const $listOutfits = createServerFn({ method: "GET" }).handler(async () => {
  return db.select().from(outfits).orderBy(desc(outfits.createdAt));
});
