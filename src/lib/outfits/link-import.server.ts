import "@tanstack/react-start/server-only";
import { removeBackground } from "./background.server";
import { uploadImageBytes } from "./cloudinary.server";
import {
  detectOutfitLinkKind,
  extractOgVideo,
  hasTikTokImagePost,
  parseInstagramImages,
  parseTikTokImages,
  parseTikTokVideoUrl,
} from "./link-parsers";
import { fetchFollowingSafeRedirects } from "./link-security";

const MAX_IMPORT_IMAGES = 20;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/**
 * TikTok strips photo-post slide data (`imagePost.images`) from desktop and
 * headless requests (botType "others"); a mobile Web user agent gets the full
 * payload. See https://github.com/inspov1 issue — verified against a live
 * slideshow post on 2026-09-23.
 */
const MOBILE_BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-Dest": "document",
  "Upgrade-Insecure-Requests": "1",
};

export class OutfitLinkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OutfitLinkError";
  }
}

const isHtml = (response: Response) =>
  (response.headers.get("content-type") ?? "").startsWith("text/html");

type FetchInit = RequestInit & { redirect?: "manual" };

async function readPage(url: string, init?: FetchInit): Promise<string> {
  const { response } = await fetchFollowingSafeRedirects(url, init);
  if (!response.ok || !isHtml(response)) {
    throw new OutfitLinkError("That link didn't return a page we could read");
  }
  return response.text();
}

async function readPageAfterRedirects(
  input: string,
  init?: FetchInit,
): Promise<{ html: string; finalUrl: string }> {
  const { response, url: finalUrl } = await fetchFollowingSafeRedirects(input, init);
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
    // The mobile-UA request is required: desktop fetches get a bot-stripped
    // page without `imagePost.images` even when the post is a slideshow.
    const headers = MOBILE_BROWSER_HEADERS;
    const first = await readPageAfterRedirects(input, { headers });
    let images = parseTikTokImages(first.html);

    if (images.length === 0) {
      const final = await readPage(first.finalUrl, { headers });
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

/**
 * Resolves a link to a playable video URL: TikTok (mobile-UA page parse for
 * playAddr), Instagram (og:video), or a direct video URL passed through after
 * checking its content type.
 */
export async function resolveVideoLink(
  input: string,
): Promise<{ label: string; videoUrl: string }> {
  const kind = detectOutfitLinkKind(input);

  if (kind === "tiktok" || kind === "tiktok-photo" || kind === "tiktok-video") {
    const headers = MOBILE_BROWSER_HEADERS;
    const first = await readPageAfterRedirects(input, { headers });
    let videoUrl = parseTikTokVideoUrl(first.html);

    if (!videoUrl) {
      const final = await readPage(first.finalUrl, { headers });
      videoUrl = parseTikTokVideoUrl(final);
    }

    if (!videoUrl) {
      throw new OutfitLinkError("We couldn't find a video in that TikTok post");
    }

    return { label: "TikTok video", videoUrl };
  }

  if (kind === "instagram" || kind === "instagram-reel") {
    const first = await readPageAfterRedirects(input);
    let videoUrl = extractOgVideo(first.html);

    if (!videoUrl) {
      const final = await readPage(first.finalUrl);
      videoUrl = extractOgVideo(final);
    }

    if (!videoUrl) {
      throw new OutfitLinkError("We couldn't find a video in that Instagram post");
    }

    return { label: "Instagram video", videoUrl };
  }

  const { response, url } = await fetchFollowingSafeRedirects(input);
  const contentType = (response.headers.get("content-type") ?? "").split(";")[0].trim();

  if (!response.ok) {
    throw new OutfitLinkError("That link didn't lead to a video");
  }
  if (contentType.startsWith("text/html")) {
    const videoUrl = extractOgVideo(await response.text());
    if (videoUrl) return { label: "Shared video", videoUrl };
    throw new OutfitLinkError("We couldn't find a video in that link");
  }
  if (!contentType.startsWith("video/")) {
    void response.body?.cancel();
    throw new OutfitLinkError("That link didn't lead to a video");
  }
  void response.body?.cancel();

  return { label: "Shared video", videoUrl: url };
}

/**
 * Decides whether a shared link is a photo post (route to the link flow, which
 * imports images) or a video (route to the frame-pick flow). Needed because
 * TikTok short links give no hint client-side; only the page tells whether it
 * has slideshow images or a playable video.
 */
export async function classifySharedLink(input: string): Promise<"link" | "video"> {
  const kind = detectOutfitLinkKind(input);

  if (kind === "tiktok" || kind === "tiktok-photo" || kind === "tiktok-video") {
    const headers = MOBILE_BROWSER_HEADERS;
    const first = await readPageAfterRedirects(input, { headers });
    let html = first.html;

    if (!hasTikTokImagePost(html) && !parseTikTokVideoUrl(html)) {
      html = await readPage(first.finalUrl, { headers });
    }

    if (hasTikTokImagePost(html)) return "link";
    if (parseTikTokVideoUrl(html)) return "video";
    throw new OutfitLinkError("We couldn't tell what that TikTok post contains");
  }

  if (kind === "instagram" || kind === "instagram-reel") {
    const first = await readPageAfterRedirects(input);
    let html = first.html;

    if (!extractOgVideo(html) && parseInstagramImages(html).images.length === 0) {
      html = await readPage(first.finalUrl);
    }

    if (extractOgVideo(html)) return "video";
    if (parseInstagramImages(html).images.length > 0) return "link";
    throw new OutfitLinkError("We couldn't tell what that Instagram post contains");
  }

  const { response } = await fetchFollowingSafeRedirects(input);
  const contentType = (response.headers.get("content-type") ?? "").split(";")[0].trim();

  if (!response.ok) {
    throw new OutfitLinkError("That link couldn't be read");
  }
  if (contentType.startsWith("video/")) return "video";
  if (contentType.startsWith("image/")) return "link";
  if (contentType.startsWith("text/html")) {
    if (extractOgVideo(await response.text())) return "video";
    return "link";
  }
  void response.body?.cancel();
  throw new OutfitLinkError("That link didn't lead to an image or video");
}
