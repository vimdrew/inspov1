import "@tanstack/react-start/server-only";
import { removeBackground } from "./background.server";
import { uploadImageBytes } from "./cloudinary.server";
import { detectOutfitLinkKind, parseInstagramImages, parseTikTokImages } from "./link-parsers";
import { fetchFollowingSafeRedirects } from "./link-security";

const MAX_IMPORT_IMAGES = 20;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export class OutfitLinkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OutfitLinkError";
  }
}

const isHtml = (response: Response) =>
  (response.headers.get("content-type") ?? "").startsWith("text/html");

async function readPage(url: string): Promise<string> {
  const { response } = await fetchFollowingSafeRedirects(url);
  if (!response.ok || !isHtml(response)) {
    throw new OutfitLinkError("That link didn't return a page we could read");
  }
  return response.text();
}

async function readPageAfterRedirects(input: string): Promise<{ html: string; finalUrl: string }> {
  const { response, url: finalUrl } = await fetchFollowingSafeRedirects(input);
  if (!response.ok || !isHtml(response)) {
    throw new OutfitLinkError("That link didn't return a page we could read");
  }
  return { html: await response.text(), finalUrl };
}

export type ResolvedOutfitLink =
  | { kind: "tiktok"; label: string; images: string[]; degraded: boolean }
  | { kind: "instagram"; label: string; images: string[]; degraded: boolean }
  | { kind: "image"; label: string; images: string[]; degraded: false };

export async function resolveOutfitLink(input: string): Promise<ResolvedOutfitLink> {
  const kind = detectOutfitLinkKind(input);

  if (kind === "tiktok-video") {
    throw new OutfitLinkError("That's a TikTok video — share a photo post instead");
  }
  if (kind === "instagram-reel") {
    throw new OutfitLinkError("That's an Instagram Reel — share a photo post instead");
  }

  if (kind === "image") {
    const { response, url } = await fetchFollowingSafeRedirects(input);
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.startsWith("image/")) {
      throw new OutfitLinkError("That link didn't lead to an image");
    }
    return { kind: "image", label: "Shared image", images: [url], degraded: false };
  }

  if (kind === "tiktok" || kind === "tiktok-photo") {
    // Short links (vm./vt.tiktok.com) land on a stub page, so once the chain
    // resolves we re-fetch the final URL for the mounted-embed markup.
    const first = await readPageAfterRedirects(input);
    let images = parseTikTokImages(first.html);

    if (images.length === 0) {
      const final = await readPage(first.finalUrl);
      images = parseTikTokImages(final);
    }

    if (images.length === 0) {
      throw new OutfitLinkError("We couldn't find images in that TikTok post");
    }

    return {
      kind: "tiktok",
      label: "TikTok post",
      images: images.slice(0, MAX_IMPORT_IMAGES),
      degraded: false,
    };
  }

  const first = await readPageAfterRedirects(input);
  const parsed = parseInstagramImages(first.html);
  let { images } = parsed;
  let degraded = parsed.degraded;

  if (images.length === 0) {
    const final = await readPage(first.finalUrl);
    const retried = parseInstagramImages(final);
    images = retried.images;
    degraded = retried.degraded;
  }

  if (images.length === 0) {
    throw new OutfitLinkError("We couldn't find images in that Instagram post");
  }

  return {
    kind: "instagram",
    label: "Instagram post",
    images: images.slice(0, MAX_IMPORT_IMAGES),
    degraded,
  };
}

export async function importExternalImage(
  imageUrl: string,
  folder: string,
): Promise<{ imageUrl: string }> {
  const { response, url } = await fetchFollowingSafeRedirects(imageUrl);
  const contentType = (response.headers.get("content-type") ?? "").split(";")[0].trim();

  if (!response.ok || !contentType.startsWith("image/")) {
    throw new OutfitLinkError("One of the images didn't load");
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    throw new OutfitLinkError("One of the images was too large");
  }

  const cutout = await removeBackground(bytes, "outfit", contentType);
  const upload = cutout ?? bytes;
  const secureUrl = await uploadImageBytes(upload, contentType, folder);

  return { imageUrl: secureUrl || url };
}
