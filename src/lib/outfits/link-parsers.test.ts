import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vite-plus/test";

import { detectOutfitLinkKind, parseInstagramImages, parseTikTokImages } from "./link-parsers";

const fixture = (name: string) => readFileSync(join(import.meta.dirname, "fixtures", name), "utf8");

describe("parseTikTokImages", () => {
  it("extracts every slide from __UNIVERSAL_DATA_FOR_REHYDRATION__", () => {
    const images = parseTikTokImages(fixture("tiktok-photopost.html"));
    expect(images.length).toBe(3);
    expect(images[0]).toMatch(/^https:\/\/p16-sign-va\.tiktokcdn\.com\/.*tik_1_1\.jpeg/);
    expect(images[2]).toMatch(/tik_3_3\.jpeg/);
  });

  it("falls back to SIGI_STATE when UNIVERSAL_DATA is absent", () => {
    const images = parseTikTokImages(fixture("tiktok-sigistate.html"));
    expect(images.length).toBe(2);
    expect(images[0]).toMatch(/slide_a\.jpeg/);
    expect(images[1]).toMatch(/slide_b\.jpeg/);
  });

  it("falls back to og:image when no embedded state is present", () => {
    const images = parseTikTokImages(fixture("instagram-single.html"));
    expect(images).toEqual(["https://scontent-lax3-1.cdninstagram.com/v/t51.2885-15/single.jpg"]);
  });

  it("returns empty when nothing can be extracted", () => {
    expect(parseTikTokImages("<html><body>nothing</body></html>")).toEqual([]);
  });
});

describe("parseInstagramImages", () => {
  it("extracts every carousel frame", () => {
    const result = parseInstagramImages(fixture("instagram-carousel.html"));
    expect(result.images.length).toBe(2);
    expect(result.images[0]).toMatch(/frame_1\.jpg$/);
    expect(result.images[1]).toMatch(/frame_2\.jpg$/);
    expect(result.degraded).toBe(false);
  });

  it("extracts a single photo from ld+json", () => {
    const result = parseInstagramImages(fixture("instagram-single.html"));
    expect(result.images).toEqual([
      "https://scontent-lax3-1.cdninstagram.com/v/t51.2885-15/single.jpg",
    ]);
    expect(result.degraded).toBe(false);
  });

  it("degrades to og:image when no structured data is present", () => {
    const result = parseInstagramImages(fixture("tiktok-photopost.html"));
    expect(result.images).toEqual([
      "https://p16-sign-va.tiktokcdn.com/tos-maliva-p-0068/og-cover.jpeg",
    ]);
    expect(result.degraded).toBe(true);
  });

  it("returns no images for an unrecognized page", () => {
    const result = parseInstagramImages("<html><body>nothing</body></html>");
    expect(result.images).toEqual([]);
    expect(result.degraded).toBe(false);
  });
});

describe("detectOutfitLinkKind", () => {
  it.each([
    ["https://www.tiktok.com/@user/photo/123", "tiktok-photo"],
    ["https://www.tiktok.com/@user/video/123", "tiktok-video"],
    ["https://vm.tiktok.com/ZM123/", "tiktok"],
    ["https://vt.tiktok.com/ZM123/", "tiktok"],
    ["https://www.instagram.com/p/C1xY-Abc/", "instagram"],
    ["https://www.instagram.com/reel/C2xY-Abc/", "instagram-reel"],
    ["https://www.instagram.com/reels/C3xY-Abc/", "instagram-reel"],
    ["https://images.example.com/o/photo.png?w=800", "image"],
    ["https://www.pinterest.com/pin/123/", "image"],
    ["garbage", "image"],
  ])("%s -> %s", (url, expected) => {
    expect(detectOutfitLinkKind(url)).toBe(expected);
  });
});
