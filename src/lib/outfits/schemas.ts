import { z } from "zod";

export const outfitNameSchema = z.object({
  name: z.string().min(1, "Give your outfit a name").max(120),
});

export const createOutfitSchema = outfitNameSchema.extend({
  imageUrl: z.url(),
});

export const updateOutfitSchema = outfitNameSchema.extend({
  outfitId: z.string(),
  imageUrl: z.url().optional(),
});

export const rateOutfitSchema = z.object({
  outfitId: z.string(),
  rating: z.number().int().min(1).max(5).nullable(),
});

export const resolveOutfitLinkSchema = z.object({
  url: z.url(),
});

export const importOutfitImageSchema = z.object({
  imageUrl: z.url(),
});

export const importOutfitFrameSchema = z.object({
  imageBase64: z.string().min(1),
  contentType: z.enum(["image/jpeg", "image/png"]),
});
