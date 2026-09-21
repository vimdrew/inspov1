import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { desc, eq } from "drizzle-orm";

import { authMiddleware, freshAuthMiddleware } from "#/lib/auth/middleware.ts";
import { db } from "#/lib/db/index.ts";
import { outfits } from "#/lib/db/schema/outfit.schema.ts";

import { removeBackground } from "./background.server";
import { destroyImage, signUpload } from "./cloudinary.server";
import { parseImageUrl } from "./image-url";
import { importExternalImage, resolveOutfitLink } from "./link-import.server";
import { importImageLimiter, resolveLinkLimiter } from "./rate-limit";
import {
  createOutfitSchema,
  importOutfitImageSchema,
  resolveOutfitLinkSchema,
  updateOutfitSchema,
} from "./schemas";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

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

    if (!outfit) {
      throw new Error("Failed to create outfit");
    }

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

export const $getOutfit = createServerFn({ method: "GET" })
  .validator((outfitId: string) => outfitId)
  .handler(async ({ data: outfitId }) => {
    const [outfit] = await db.select().from(outfits).where(eq(outfits.id, outfitId));
    return outfit ?? null;
  });

export const $removeOutfitBackground = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { name: string; type: string; imageBase64: string }) => data)
  .handler(async ({ data }) => {
    if (!data.type.startsWith("image/")) {
      throw new Error("Invalid image type");
    }

    const bytes = Buffer.from(data.imageBase64, "base64");
    if (bytes.length > MAX_IMAGE_SIZE) {
      throw new Error("Image is too large");
    }

    const result = await removeBackground(bytes, data.name, data.type);

    return { imageBase64: result ? Buffer.from(result).toString("base64") : null };
  });

export const $updateOutfit = createServerFn({ method: "POST" })
  .middleware([freshAuthMiddleware])
  .validator(updateOutfitSchema)
  .handler(async ({ context, data }) => {
    const [outfit] = await db.select().from(outfits).where(eq(outfits.id, data.outfitId)).limit(1);

    if (!outfit) {
      throw new Error("Outfit not found");
    }
    if (outfit.userId !== context.user.id) {
      throw new Error("Outfit belongs to another user");
    }

    let imageUrl = outfit.image;
    if (data.imageUrl) {
      const incoming = parseImageUrl(data.imageUrl);
      if (incoming.folder !== `outfits/${context.user.id}`) {
        throw new Error("Image belongs to another user");
      }
      imageUrl = incoming.url;
    }

    const [updated] = await db
      .update(outfits)
      .set({ name: data.name.trim(), image: imageUrl })
      .where(eq(outfits.id, data.outfitId))
      .returning();

    if (!updated) {
      throw new Error("Failed to update outfit");
    }

    if (data.imageUrl && outfit.image) {
      try {
        await destroyImage(parseImageUrl(outfit.image).publicId);
      } catch (error) {
        console.error("Failed to remove replaced outfit image from Cloudinary:", error);
      }
    }

    return updated;
  });

export const $resolveOutfitLink = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(resolveOutfitLinkSchema)
  .handler(async ({ context, data }) => {
    if (!resolveLinkLimiter.check(context.user.id)) {
      setResponseStatus(429, "Too many requests");
      throw new Error("Too many lookups — try again in a moment");
    }
    return resolveOutfitLink(data.url);
  });

export const $importOutfitImage = createServerFn({ method: "POST" })
  .middleware([freshAuthMiddleware])
  .validator(importOutfitImageSchema)
  .handler(async ({ context, data }) => {
    if (!importImageLimiter.check(context.user.id)) {
      setResponseStatus(429, "Too many requests");
      throw new Error("Too many imports — try again in a moment");
    }
    return importExternalImage(data.imageUrl, `outfits/${context.user.id}`);
  });

export const $deleteOutfit = createServerFn({ method: "POST" })
  .middleware([freshAuthMiddleware])
  .validator((data: { outfitId: string }) => data)
  .handler(async ({ context, data }) => {
    const [outfit] = await db.select().from(outfits).where(eq(outfits.id, data.outfitId)).limit(1);

    if (!outfit) {
      throw new Error("Outfit not found");
    }
    if (outfit.userId !== context.user.id) {
      throw new Error("Outfit belongs to another user");
    }

    await db.delete(outfits).where(eq(outfits.id, data.outfitId));

    if (outfit.image) {
      try {
        await destroyImage(parseImageUrl(outfit.image).publicId);
      } catch (error) {
        console.error("Failed to remove outfit image from Cloudinary:", error);
      }
    }

    return { deleted: true };
  });
