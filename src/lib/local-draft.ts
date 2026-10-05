// Drafts kept in this browser, so a refresh or a closed tab doesn't lose them.
// Read with useSyncExternalStore(noSubscribe, () => readStored(key), () => "").

export function readStored(key: string): string {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

export function writeStored(key: string, value: string) {
  try {
    if (value && value !== "0") localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    // Storage unavailable (private mode): drafts just aren't kept.
  }
}

export const noSubscribe = () => () => {};
