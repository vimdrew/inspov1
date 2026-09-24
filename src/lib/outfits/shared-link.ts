const SHARED_URL_RE = /https?:\/\/[^\s<>"']+/;

export function extractSharedUrl(text: string): string | null {
  const match = text.match(SHARED_URL_RE);
  if (!match) return null;
  return match[0].replace(/[.,);]+$/, "");
}
