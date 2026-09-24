import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vite-plus/test";

import {
  extractOgVideo,
  hasTikTokImagePost,
  parseTikTokSlides,
  parseTikTokVideoUrl,
  sharedRouteHint,
} from "./link-parsers";

const fixture = (name: string) => readFileSync(join(import.meta.dirname, "fixtures", name), "utf8");

describe("parseTikTokVideoUrl", () => {
  it("extracts the video url from __UNIVERSAL_DATA_FOR_REHYDRATION__", () => {
    expect(parseTikTokVideoUrl(fixture("tiktok-video.html"))).toMatch(
      /^https:\/\/v16-webapp-prime\.tiktokcdn\.com\/.*video\.mp4\?q=1/,
    );
  });

  it("returns null for a photo post without playAddr state", () => {
    expect(parseTikTokVideoUrl(fixture("tiktok-photopost.html"))).toBeNull();
  });

  it("returns null for non-TikTok pages", () => {
    expect(parseTikTokVideoUrl(fixture("instagram-reel.html"))).toBeNull();
  });
});

describe("extractOgVideo", () => {
  it("extracts the reel mp4 from og:video", () => {
    const videoUrl = extractOgVideo(fixture("instagram-reel.html"));
    expect(videoUrl).toMatch(
      /^https:\/\/scontent-lax3-1\.cdninstagram\.com\/v\/t51\.2885-15\/reel\.mp4\?efg=/,
    );
    expect(videoUrl).toContain("_nc_ht=scontent-lax3-1");
  });

  it("returns null when there is no og:video", () => {
    expect(extractOgVideo(fixture("instagram-single.html"))).toBeNull();
  });
});

describe("slide detection", () => {
  it("finds slides on a TikTok photo post", () => {
    const html = fixture("tiktok-photopost.html");
    expect(parseTikTokSlides(html).length).toBeGreaterThan(0);
    expect(hasTikTokImagePost(html)).toBe(true);
  });

  it("detects no slides on a TikTok video post", () => {
    const html = fixture("tiktok-video.html");
    expect(parseTikTokSlides(html)).toEqual([]);
    expect(hasTikTokImagePost(html)).toBe(false);
  });
});

describe("sharedRouteHint", () => {
  it.each([
    ["https://www.tiktok.com/@user/video/123", "video"],
    ["https://vm.tiktok.com/ZM123/", null],
    ["https://vt.tiktok.com/ZM123/", null],
    ["https://www.tiktok.com/@user/123", null],
    ["https://www.tiktok.com/@user/photo/123", "link"],
    ["https://www.instagram.com/reel/C2xY-Abc/", "video"],
    ["https://www.instagram.com/reels/C3xY-Abc/", "video"],
    ["https://www.instagram.com/p/C1xY-Abc/", "link"],
    ["https://cdn.example.com/clip.mp4?token=abc", "video"],
    ["https://cdn.example.com/clip.mov", "video"],
    ["https://cdn.example.com/clip.webm", "video"],
    ["https://images.example.com/o/photo.png?w=800", "link"],
    ["https://images.example.com/o/photo.jpg", "link"],
    ["garbage", null],
  ])("%s -> %s", (url, expected) => {
    expect(sharedRouteHint(url)).toBe(expected);
  });
});
