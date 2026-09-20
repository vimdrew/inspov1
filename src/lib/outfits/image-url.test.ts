import { describe, expect, it } from "vite-plus/test";

import { fitImageUrl, parseImageUrl } from "./image-url";

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

describe("fitImageUrl", () => {
  it("injects a width-limiting transform after the upload segment", () => {
    expect(
      fitImageUrl(
        "https://res.cloudinary.com/inspo/image/upload/v1700000000/outfits/user-123/photo.jpg",
        960,
      ),
    ).toBe(
      "https://res.cloudinary.com/inspo/image/upload/c_limit,w_960,f_auto,q_auto/v1700000000/outfits/user-123/photo.jpg",
    );
  });

  it("handles urls without a version segment", () => {
    expect(
      fitImageUrl("https://res.cloudinary.com/inspo/image/upload/outfits/user-1/fit", 400),
    ).toBe(
      "https://res.cloudinary.com/inspo/image/upload/c_limit,w_400,f_auto,q_auto/outfits/user-1/fit",
    );
  });

  it("rejects non-cloudinary urls", () => {
    expect(() => fitImageUrl("https://evil.com/image/upload/v1/photo", 100)).toThrow(
      "Invalid Cloudinary URL",
    );
  });
});
