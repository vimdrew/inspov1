export type ParsedImageUrl = {
  url: string;
  folder: string;
  publicId: string;
};

export const parseImageUrl = (url: string): ParsedImageUrl => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid Cloudinary URL");
  }
  if (parsed.hostname !== "res.cloudinary.com") {
    throw new Error("Invalid Cloudinary URL");
  }

  // /<cloud>/image/upload/v<version>/<public_id-with-optional-extension>
  const segments = parsed.pathname.split("/").filter(Boolean);
  const uploadIndex = segments.indexOf("upload");
  if (uploadIndex === -1 || segments.length <= uploadIndex + 2) {
    throw new Error("Invalid Cloudinary URL");
  }

  // Skip version segment (starts with "v") if present.
  let publicIdSegments = segments.slice(uploadIndex + 1);
  if (publicIdSegments[0]?.startsWith("v")) {
    publicIdSegments = publicIdSegments.slice(1);
  }

  const publicId = publicIdSegments.join("/").replace(/\.[a-zA-Z0-9]+$/, "");
  const folder = publicId.split("/").slice(0, -1).join("/") || "";

  return { url, folder, publicId };
};

/**
 * Returns the image resized to the given width, preserving its aspect ratio.
 * `c_limit` only ever shrinks, never crops or upscales.
 */
export const fitImageUrl = (url: string, width: number): string => {
  const parsed = new URL(url);
  if (parsed.hostname !== "res.cloudinary.com") {
    throw new Error("Invalid Cloudinary URL");
  }

  const segments = parsed.pathname.split("/").filter(Boolean);
  const uploadIndex = segments.indexOf("upload");
  if (uploadIndex === -1) {
    throw new Error("Invalid Cloudinary URL");
  }

  const transform = `c_limit,w_${width},f_auto,q_auto`;
  segments.splice(uploadIndex + 1, 0, transform);
  parsed.pathname = `/${segments.join("/")}`;

  return parsed.toString();
};
