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
