const SCRIPT_RE = /<script[^>]*id=["']([A-Za-z0-9_-]+)["'][^>]*>(.*?)<\/script>/gs;
const JSON_SCRIPT_RE = /<script[^>]*type="application\/(?:ld\+)?json"[^>]*>(.*?)<\/script>/gs;
const OG_IMAGE_RE = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i;
const OG_VIDEO_RE = /<meta[^>]+property=["']og:video["'][^>]+content=["']([^"']+)["']/i;

export function extractScriptJson(html: string, id: string): string | null {
  for (const match of html.matchAll(SCRIPT_RE)) {
    if (match[1] === id) {
      return match[2]?.trim() || null;
    }
  }
  return null;
}

export function extractOgImage(html: string): string | null {
  return html.match(OG_IMAGE_RE)?.[1] ?? null;
}

export function extractOgVideo(html: string): string | null {
  return html.match(OG_VIDEO_RE)?.[1] ?? null;
}

function pickImageUrl(image: unknown): string | null {
  if (!image || typeof image !== "object") return null;
  const node = image as Record<string, unknown>;
  const imageUrl =
    node.imageURL && typeof node.imageURL === "object"
      ? (node.imageURL as Record<string, unknown>)
      : node;

  for (const candidate of [imageUrl, node]) {
    const urlList = candidate.urlList;
    if (Array.isArray(urlList)) {
      const first = urlList.find((u) => typeof u === "string" && u.startsWith("https://"));
      if (typeof first === "string") return first;
    }
    for (const key of ["url", "image_url"]) {
      if (typeof candidate[key] === "string" && candidate[key].startsWith("https://")) {
        return candidate[key];
      }
    }
  }
  return null;
}

function collectTikTokImagePost(node: unknown, images: string[], seen: Set<unknown>): void {
  if (node == null || typeof node !== "object" || seen.has(node)) return;
  seen.add(node);

  if (Array.isArray(node)) {
    for (const item of node) collectTikTokImagePost(item, images, seen);
    return;
  }

  const record = node as Record<string, unknown>;
  const post = record.imagePost;
  if (post && typeof post === "object") {
    const list = (post as Record<string, unknown>).images;
    if (Array.isArray(list)) {
      for (const image of list) {
        const url = pickImageUrl(image);
        if (url) images.push(url);
      }
    }
    return;
  }

  for (const key of Object.keys(record)) {
    collectTikTokImagePost(record[key], images, seen);
  }
}

const TIKTOK_SCRIPT_IDS = ["__UNIVERSAL_DATA_FOR_REHYDRATION__", "SIGI_STATE"];

/**
 * Slide URLs found in `imagePost.images`, which only photo posts (slideshows)
 * carry. Video posts still expose `playAddr` but no slides, so this is the
 * reliable way to tell a slideshow from a video on a TikTok page.
 */
export const parseTikTokSlides = (html: string): string[] => {
  const slides: string[] = [];
  for (const id of TIKTOK_SCRIPT_IDS) {
    const raw = extractScriptJson(html, id);
    if (!raw) continue;
    try {
      collectTikTokImagePost(JSON.parse(raw), slides, new Set());
    } catch {
      // Try the next script id.
    }
  }
  return [...new Set(slides)];
};

export const hasTikTokImagePost = (html: string): boolean => parseTikTokSlides(html).length > 0;

export const parseTikTokImages = (html: string): string[] => {
  const slides = parseTikTokSlides(html);
  if (slides.length > 0) return slides;

  const og = extractOgImage(html);
  return og ? [og] : [];
};

const VIDEO_ADDR_KEYS = ["playAddr", "downloadAddr"];

function collectTikTokVideoUrls(node: unknown, urls: string[], seen: Set<unknown>): void {
  if (node == null || typeof node !== "object" || seen.has(node)) return;
  seen.add(node);

  if (Array.isArray(node)) {
    for (const item of node) collectTikTokVideoUrls(item, urls, seen);
    return;
  }

  const record = node as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (VIDEO_ADDR_KEYS.includes(key) && record[key] && typeof record[key] === "object") {
      const addr = record[key] as Record<string, unknown>;
      const list = addr.urlList;
      if (Array.isArray(list)) {
        const first = list.find((u) => typeof u === "string" && u.startsWith("https://"));
        if (typeof first === "string") urls.push(first);
      }
      if (typeof addr.url === "string" && addr.url.startsWith("https://")) {
        urls.push(addr.url);
      }
      continue;
    }
    collectTikTokVideoUrls(record[key], urls, seen);
  }
}

export const parseTikTokVideoUrl = (html: string): string | null => {
  for (const id of TIKTOK_SCRIPT_IDS) {
    const raw = extractScriptJson(html, id);
    if (!raw) continue;
    try {
      const urls: string[] = [];
      collectTikTokVideoUrls(JSON.parse(raw), urls, new Set());
      if (urls.length > 0) return urls[0];
    } catch {
      // Try the next script id.
    }
  }
  return null;
};

function collectInstagramCarouselFrames(node: unknown, frames: string[], seen: Set<unknown>): void {
  if (node == null || typeof node !== "object" || seen.has(node)) return;
  seen.add(node);

  if (Array.isArray(node)) {
    for (const item of node) collectInstagramCarouselFrames(item, frames, seen);
    return;
  }

  const record = node as Record<string, unknown>;
  if (Array.isArray(record.carousel_media)) {
    for (const media of record.carousel_media) {
      if (!media || typeof media !== "object") continue;
      const entry = media as Record<string, unknown>;
      const direct = typeof entry.display_url === "string" ? entry.display_url : null;
      const versions = entry.image_versions2;
      const candidates =
        versions && typeof versions === "object"
          ? (versions as Record<string, unknown>).candidates
          : null;
      const first =
        Array.isArray(candidates) && candidates.length > 0
          ? (candidates[0] as Record<string, unknown>)?.url
          : null;
      const url = direct ?? (typeof first === "string" ? first : null);
      if (url && url.startsWith("https://")) frames.push(url);
    }
    return;
  }

  for (const key of Object.keys(record)) {
    collectInstagramCarouselFrames(record[key], frames, seen);
  }
}

function collectInstagramSingleImage(node: unknown, urls: string[], seen: Set<unknown>): void {
  if (node == null || typeof node !== "object" || seen.has(node)) return;
  seen.add(node);

  if (Array.isArray(node)) {
    for (const item of node) collectInstagramSingleImage(item, urls, seen);
    return;
  }

  const record = node as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    const value = record[key];
    if (key === "display_url" || key === "image_url" || key === "image") {
      if (typeof value === "string" && value.startsWith("https://")) urls.push(value);
    }
    collectInstagramSingleImage(value, urls, seen);
  }
}

const parseJsonScripts = (html: string): Array<Record<string, unknown>> =>
  Array.from(html.matchAll(JSON_SCRIPT_RE), (m) => m[1])
    .map((raw) => {
      try {
        return JSON.parse(raw.trim()) as unknown;
      } catch {
        return null;
      }
    })
    .filter((data): data is Record<string, unknown> => data != null && typeof data === "object");

export function parseInstagramImages(html: string): { images: string[]; degraded: boolean } {
  const scripts = parseJsonScripts(html);

  const frames: string[] = [];
  for (const data of scripts) collectInstagramCarouselFrames(data, frames, new Set());
  if (frames.length > 0) {
    return { images: [...new Set(frames)], degraded: false };
  }

  const singles: string[] = [];
  for (const data of scripts) collectInstagramSingleImage(data, singles, new Set());
  if (singles.length > 0) {
    return { images: [...new Set(singles)], degraded: false };
  }

  const og = extractOgImage(html);
  return { images: og ? [og] : [], degraded: og !== null };
}

export type ParsedInstagramImages = ReturnType<typeof parseInstagramImages>;

export type LookbookLinkKind =
  | "tiktok"
  | "tiktok-photo"
  | "tiktok-video"
  | "instagram"
  | "instagram-reel"
  | "image";

export function detectOutfitLinkKind(input: string): LookbookLinkKind {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return "image";
  }

  const host = url.hostname.replace(/^www\./i, "");

  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) {
    if (url.pathname.includes("/photo")) return "tiktok-photo";
    if (url.pathname.includes("/video")) return "tiktok-video";
    return "tiktok";
  }

  if (host === "instagram.com" || host.endsWith(".instagram.com")) {
    if (url.pathname.startsWith("/reel/") || url.pathname.startsWith("/reels/")) {
      return "instagram-reel";
    }
    return "instagram";
  }

  return "image";
}

const VIDEO_EXTENSION_RE = /\.(mp4|mov|webm|m4v|mkv)(\?.*)?$/i;
const IMAGE_EXTENSION_RE = /\.(jpe?g|png|gif|webp|avif|heic)(\?.*)?$/i;

export type SharedRoute = "link" | "video";

/**
 * Client-side routing decision for a shared/pasted link. Definitive URLs
 * (TikTok /video/, Reels, media extensions) classify instantly. Ambiguous
 * TikTok short links (vt./vm. or bare tiktok.com paths) return null so a
 * server classifier can check the page for slideshow data vs an actual video.
 */
export function sharedRouteHint(input: string): SharedRoute | null {
  const kind = detectOutfitLinkKind(input);
  if (kind === "tiktok-video" || kind === "instagram-reel" || VIDEO_EXTENSION_RE.test(input)) {
    return "video";
  }
  if (kind === "tiktok-photo" || kind === "instagram" || IMAGE_EXTENSION_RE.test(input)) {
    return "link";
  }
  return null;
}
