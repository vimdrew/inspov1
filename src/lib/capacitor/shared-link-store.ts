import { sharedRouteHint, type SharedRoute } from "#/lib/outfits/link-parsers";

const STORAGE_KEY = "pending-shared-url";

type Listener = () => void;

type PendingLink = { url: string | null; route: SharedRoute | null };

const listeners = new Set<Listener>();

const EMPTY: PendingLink = { url: null, route: null };

let current: PendingLink = readFromStorage();

function readFromStorage(): PendingLink {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw === null) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "string") {
      // Legacy sessions stored the bare URL.
      return { url: parsed, route: sharedRouteHint(parsed) };
    }
    if (parsed && typeof parsed === "object") {
      const entry = parsed as Record<string, unknown>;
      if (typeof entry.url === "string") {
        const route = entry.route === "link" || entry.route === "video" ? entry.route : null;
        return { url: entry.url, route };
      }
    }
    return EMPTY;
  } catch {
    return typeof raw === "string" && raw.startsWith("https://")
      ? { url: raw, route: sharedRouteHint(raw) }
      : EMPTY;
  }
}

function writeToStorage(value: PendingLink) {
  try {
    if (value.url === null) {
      sessionStorage.removeItem(STORAGE_KEY);
    } else {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    }
  } catch {
    // Storage unavailable — keep the value in memory only.
  }
}

export function getSharedUrl(): string | null {
  return current.url;
}

export function getSharedRoute(): SharedRoute | null {
  return current.route;
}

export function setSharedUrl(value: string, route: SharedRoute | null = null) {
  current = { url: value, route };
  writeToStorage(current);
  emit();
}

export function clearSharedUrl() {
  current = { url: null, route: null };
  writeToStorage(current);
  emit();
}

export function subscribeSharedUrl(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit() {
  for (const listener of listeners) listener();
}
