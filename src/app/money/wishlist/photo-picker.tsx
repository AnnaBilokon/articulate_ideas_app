"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MAX_SIDE = 1600;

/** Resizes a photo or screenshot in the browser so it uploads fast and small. */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not read the photo."))), "image/jpeg", 0.85),
  );
}

// A photo for a wishlist item: take one, choose one, or paste a screenshot.
// It uploads straight away and hands back its storage path.
export function PhotoPicker({
  path,
  url,
  onChange,
}: {
  path: string | null;
  url: string | null;
  onChange: (photo: { path: string | null; url: string | null }) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chooser = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);

  async function upload(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("image", await shrink(file), "photo.jpg");
      const response = await fetch("/api/wishlist/image", { method: "POST", body });
      const json = (await response.json().catch(() => null)) as { path?: string; url?: string | null; error?: string } | null;
      if (!response.ok || !json?.path) throw new Error(json?.error ?? "Could not save the photo. Try again.");
      onChange({ path: json.path, url: json.url ?? null });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the photo. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="flex flex-col gap-2"
      onPaste={(e) => {
        const file = [...e.clipboardData.files].find((f) => f.type.startsWith("image/"));
        if (file) {
          e.preventDefault();
          void upload(file);
        }
      }}
    >
      {url ? (
        <div className="relative w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element -- a private, short-lived link, already resized */}
          <img src={url} alt="" className="max-h-48 rounded-lg object-contain ring-1 ring-foreground/10" />
          <button
            type="button"
            onClick={() => onChange({ path: null, url: null })}
            aria-label="Remove photo"
            className="absolute top-1.5 right-1.5 rounded-full bg-background/90 p-1 text-foreground shadow ring-1 ring-foreground/10"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <div
          tabIndex={0}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void upload([...e.dataTransfer.files].find((f) => f.type.startsWith("image/")));
          }}
          className={cn(
            "flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border px-4 py-5 text-center text-sm text-muted-foreground outline-none focus-visible:border-ring",
            busy && "opacity-60",
          )}
        >
          {busy ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
          <span>{busy ? "Saving the photo…" : "Add a photo or screenshot. You can also paste or drop one here."}</span>
          <div className="flex flex-wrap justify-center gap-2">
            <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => chooser.current?.click()}>
              <ImagePlus className="size-3.5" /> Choose
            </Button>
            <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => camera.current?.click()}>
              <Camera className="size-3.5" /> Take a photo
            </Button>
          </div>
        </div>
      )}
      {path && !url && <span className="text-xs text-muted-foreground">Photo saved.</span>}
      {error && (
        <span className="text-xs text-coral-foreground" role="alert">
          {error}
        </span>
      )}
      <input ref={chooser} type="file" accept="image/*" className="hidden" onChange={(e) => void upload(e.target.files?.[0])} />
      <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => void upload(e.target.files?.[0])} />
    </div>
  );
}
