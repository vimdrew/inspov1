const STORAGE_KEY = "pending-shared-url";

type Listener = () => void;

const listeners = new Set<Listener>();

let url: string | null = readFromStorage();

function readFromStorage(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

function writeToStorage(value: string | null) {
  try {
    if (value === null) {
      sessionStorage.removeItem(STORAGE_KEY);
    } else {
      sessionStorage.setItem(STORAGE_KEY, value);
    }
  } catch {
    // Storage unavailable — keep the value in memory only.
  }
}

export function getSharedUrl(): string | null {
  return url;
}

export function setSharedUrl(value: string) {
  url = value;
  writeToStorage(value);
  emit();
}

export function clearSharedUrl() {
  url = null;
  writeToStorage(null);
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
