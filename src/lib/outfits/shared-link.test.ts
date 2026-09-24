import { describe, expect, it } from "vite-plus/test";

import { extractSharedUrl } from "./shared-link";

describe("extractSharedUrl", () => {
  it.each([
    [
      "https://www.tiktok.com/@user/video/1234567890",
      "https://www.tiktok.com/@user/video/1234567890",
    ],
    [
      "Check out this cool outfit https://www.instagram.com/p/C1xY-Abc/ what do you think?",
      "https://www.instagram.com/p/C1xY-Abc/",
    ],
    ["So stylish! https://vm.tiktok.com/ZM123/ ;)", "https://vm.tiktok.com/ZM123/"],
    ["https://vt.tiktok.com/ZM123/ - saved this one", "https://vt.tiktok.com/ZM123/"],
    [
      "Look what I found: https://www.instagram.com/reel/C2xY-Abc/ 🤩",
      "https://www.instagram.com/reel/C2xY-Abc/",
    ],
    ["(via https://www.instagram.com/p/C3xY-Abc/)", "https://www.instagram.com/p/C3xY-Abc/"],
    ["http://example.com/image.png; check it out", "http://example.com/image.png"],
    [
      "Followed by text https://images.example.com/photo.jpg?w=800 now",
      "https://images.example.com/photo.jpg?w=800",
    ],
  ])("extracts the leading URL from %s", (text, expected) => {
    expect(extractSharedUrl(text)).toBe(expected);
  });

  it("returns the first URL when several appear", () => {
    expect(extractSharedUrl("see https://a.com/1 and https://b.com/2")).toBe("https://a.com/1");
  });

  it("returns null when there is no URL", () => {
    expect(extractSharedUrl("just some plain text")).toBeNull();
    expect(extractSharedUrl("")).toBeNull();
  });
});
