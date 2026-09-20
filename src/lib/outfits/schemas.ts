import { z } from "zod";

export const createOutfitSchema = z.object({
  name: z.string().min(1, "Give your outfit a name").max(120),
  imageUrl: z.url(),
});
