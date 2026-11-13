import type { MetadataRoute } from "next";

// Lets the app be added to a phone's home screen as an app of its own, which
// an iPhone needs before it allows push notifications. Opened from there, it
// starts on the calendar; Journey home is in the logo menu.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "My Self Journey",
    short_name: "Journey",
    description: "Learning, goals, habits, fitness and money, in one place.",
    start_url: "/growth/calendar",
    scope: "/",
    shortcuts: [
      { name: "Calendar", url: "/growth/calendar", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Today's learning", url: "/learn", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Fitness", url: "/fitness", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Journey home", url: "/", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
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
