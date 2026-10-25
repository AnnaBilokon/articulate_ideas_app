"use client";

import { useCallback, useLayoutEffect, useSyncExternalStore } from "react";
import {
  DEFAULT_PALETTE,
  LEGACY_PALETTE_KEY,
  PALETTES_STORAGE_KEY,
  isPaletteId,
  paletteFor,
  paletteWorkspaceOf,
  type PaletteChoices,
  type PaletteId,
  type PaletteWorkspace,
} from "@/lib/palettes";

// The palette lives on <html data-palette>, set before the first paint by
// paletteScript for the workspace the page belongs to. Each workspace's
// choice is saved in the browser; this hook reads and changes it.

const CHANGE_EVENT = "palettechange";

function readChoices(): PaletteChoices {
  try {
    const parsed = JSON.parse(localStorage.getItem(PALETTES_STORAGE_KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function readLegacy(): string | null {
  try {
    return localStorage.getItem(LEGACY_PALETTE_KEY);
  } catch {
    return null;
  }
}

/** Puts the workspace's palette on <html>. */
export function applyPalette(workspace: PaletteWorkspace) {
  const id = paletteFor(workspace, readChoices(), readLegacy());
  if (document.documentElement.getAttribute("data-palette") !== id) {
    document.documentElement.setAttribute("data-palette", id);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

/** Keeps <html> in the current workspace's palette as you move between workspaces. */
export function useWorkspacePalette(workspace: PaletteWorkspace) {
  // Before paint, so a page never shows in the last workspace's colours.
  useLayoutEffect(() => applyPalette(workspace), [workspace]);
  useLayoutEffect(() => {
    // Another tab changed a choice: apply it here too.
    const onStorage = (event: StorageEvent) => {
      if (event.key === PALETTES_STORAGE_KEY || event.key === LEGACY_PALETTE_KEY) applyPalette(workspace);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [workspace]);
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

function getSnapshot(): PaletteId {
  const value = document.documentElement.getAttribute("data-palette");
  return isPaletteId(value) ? value : DEFAULT_PALETTE;
}

// Unknown on the server: the saved palette is only in the browser.
const getServerSnapshot = () => null;

/** A workspace's palette, and a way to choose it. */
export function usePalette(workspace: PaletteWorkspace): [PaletteId | null, (id: PaletteId) => void] {
  const palette = useSyncExternalStore(
    subscribe,
    // The one on screen, or for another workspace its saved choice.
    () => (paletteWorkspaceOf(location.pathname) === workspace ? getSnapshot() : paletteFor(workspace, readChoices(), readLegacy())),
    getServerSnapshot,
  );

  const setPalette = useCallback(
    (id: PaletteId) => {
      try {
        localStorage.setItem(PALETTES_STORAGE_KEY, JSON.stringify({ ...readChoices(), [workspace]: id }));
      } catch {
        // Private mode or blocked storage: the choice lasts until reload.
      }
      // Only the workspace on screen changes colour; another's choice waits for it.
      if (paletteWorkspaceOf(location.pathname) === workspace) document.documentElement.setAttribute("data-palette", id);
      window.dispatchEvent(new Event(CHANGE_EVENT));
    },
    [workspace],
  );

  return [palette, setPalette];
}
