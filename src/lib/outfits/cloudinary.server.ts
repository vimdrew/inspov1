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
