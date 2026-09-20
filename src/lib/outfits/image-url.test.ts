import { describe, expect, it } from "vite-plus/test";

import { parseImageUrl } from "./image-url";

describe("parseImageUrl", () => {
  it.each([
    {
      url: "https://res.cloudinary.com/inspo/image/upload/v1700000000/outfits/user-123/photo.jpg",
      expected: { folder: "outfits/user-123", publicId: "outfits/user-123/photo" },
    },
    {
      url: "https://res.cloudinary.com/inspo/image/upload/v1700000000/photo.png",
      expected: { folder: "", publicId: "photo" },
    },
    {
      url: "https://res.cloudinary.com/inspo/image/upload/outfits/user-1/latest",
      expected: { folder: "outfits/user-1", publicId: "outfits/user-1/latest" },
    },
  ])("parses $publicId", ({ url, expected }) => {
    expect(parseImageUrl(url)).toMatchObject(expected);
  });

  it.each([
    "https://evil.com/image/upload/v1/outfits/user-a/photo",
    "https://res.cloudinary.com/inspo/image/upload/v1",
    "not a url",
  ])("rejects $url", (url) => {
    expect(() => parseImageUrl(url)).toThrow("Invalid Cloudinary URL");
  });
});
