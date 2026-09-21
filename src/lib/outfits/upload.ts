import { ENV } from "varlock/env";

import { $getUploadSignature } from "./functions";

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export type SelectedImage = {
  file: File;
  url: string;
  status: "processing" | "uploading" | "saved";
  upload: Promise<{ secureUrl: string }>;
};

export const uploadToCloudinary = (file: File): Promise<{ secureUrl: string }> =>
  $getUploadSignature().then(({ timestamp, signature, folder }) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", ENV.CLOUDINARY_API_KEY);
    formData.append("timestamp", String(timestamp));
    formData.append("signature", signature);
    formData.append("folder", folder);
    return fetch(`https://api.cloudinary.com/v1_1/${ENV.CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: "POST",
      body: formData,
    }).then((res) => {
      if (!res.ok) throw new Error("Upload failed");
      return res.json().then((data) => ({ secureUrl: data.secure_url as string }));
    });
  });

export const toBase64 = (bytes: ArrayBuffer): string => {
  const binary = new Uint8Array(bytes).reduce((acc, byte) => acc + String.fromCharCode(byte), "");
  return btoa(binary);
};

export const base64ToBlob = (base64: string, type: string): Blob => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type });
};
