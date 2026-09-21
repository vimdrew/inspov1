import "@tanstack/react-start/server-only";
import { v2 as cloudinary } from "cloudinary";
import { ENV } from "varlock/env";

cloudinary.config({
  cloud_name: ENV.CLOUDINARY_CLOUD_NAME,
  api_key: ENV.CLOUDINARY_API_KEY,
  api_secret: ENV.CLOUDINARY_API_SECRET,
});

export const signUpload = (timestamp: number, folder: string) =>
  cloudinary.utils.api_sign_request({ timestamp, folder }, ENV.CLOUDINARY_API_SECRET);

export const destroyImage = (publicId: string) => cloudinary.uploader.destroy(publicId);

/**
 * Server-side upload for bytes already fetched on the server (link import).
 * This deliberately diverges from the browser's signed-client upload: the
 * dashboard never exposes the upload signature flow for those flows because
 * the untrusted image bytes must be re-checked and background-removed before
 * reaching Cloudinary, which can only happen here.
 */
export const uploadImageBytes = (bytes: Uint8Array, contentType: string, folder: string) =>
  new Promise<string>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image", format: contentType === "image/png" ? "png" : "jpg" },
      (error, result) => {
        if (error || !result?.secure_url) {
          reject(error ?? new Error("Cloudinary upload returned no URL"));
          return;
        }
        resolve(result.secure_url);
      },
    );
    stream.end(Buffer.from(bytes));
  });
