import type { MetadataRoute } from "next";

// Lets the app be added to a phone's home screen as an app of its own, which
// an iPhone needs before it allows push notifications.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "My Self Journey",
    short_name: "Journey",
    description: "Learning, goals, habits and growth, in one place.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbfdf3",
    theme_color: "#3d0b37",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
