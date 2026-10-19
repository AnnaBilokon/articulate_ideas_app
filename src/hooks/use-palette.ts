"use client";

import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_PALETTE, PALETTE_STORAGE_KEY, isPaletteId, type PaletteId } from "@/lib/palettes";

// The palette lives on <html data-palette>, set before the first paint by
// paletteScript. This hook reads it from there instead of keeping a copy.

const CHANGE_EVENT = "palettechange";

function subscribe(onChange: () => void) {
  // Another tab picked a palette: apply it here too.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== PALETTE_STORAGE_KEY) return;
    document.documentElement.setAttribute(
      "data-palette",
      isPaletteId(event.newValue) ? event.newValue : DEFAULT_PALETTE,
    );
    onChange();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): PaletteId {
  const value = document.documentElement.getAttribute("data-palette");
  return isPaletteId(value) ? value : DEFAULT_PALETTE;
}

// Unknown on the server: the saved palette is only in the browser.
const getServerSnapshot = () => null;

export function usePalette(): [PaletteId | null, (id: PaletteId) => void] {
  const palette = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setPalette = useCallback((id: PaletteId) => {
    document.documentElement.setAttribute("data-palette", id);
    try {
      localStorage.setItem(PALETTE_STORAGE_KEY, id);
    } catch {
      // Private mode or blocked storage: the choice lasts until reload.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return [palette, setPalette];
}
