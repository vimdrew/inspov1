import "@tanstack/react-start/server-only";
import { ENV } from "varlock/env";

const REMOVE_BACKGROUND_TIMEOUT_MS = 40_000;

/**
 * Calls the background-remover service and returns the cut-out image bytes.
 * Returns null on any failure (non-200, timeout, network error) so the caller
 * can fall back to the original upload — same graceful degradation as the
 * HF-direct implementation. The shared secret stays server-side only.
 */
export const removeBackground = async (
  bytes: Uint8Array,
  filename: string,
  contentType: string,
): Promise<Uint8Array | null> => {
  const formData = new FormData();
  formData.append("file", new Blob([bytes.slice()], { type: contentType }), filename);

  let response: Response;
  try {
    response = await fetch(`${ENV.BG_REMOVER_API_URL}/remove-background`, {
      method: "POST",
      headers: { "X-Password": ENV.BG_REMOVER_API_PASSWORD },
      body: formData,
      signal: AbortSignal.timeout(REMOVE_BACKGROUND_TIMEOUT_MS),
    });
  } catch (error) {
    console.error("Background removal failed (network/timeout):", error);
    return null;
  }

  if (!response.ok) {
    console.error(`Background removal failed with status ${response.status}`);
    return null;
  }

  return new Uint8Array(await response.arrayBuffer());
};
