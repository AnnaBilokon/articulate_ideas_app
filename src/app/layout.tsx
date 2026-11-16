import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { BottomNav, SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { DEFAULT_PALETTE, paletteScript } from "@/lib/palettes";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "My Self Journey",
  description: "Learning, goals, habits and growth, in one place.",
};

// Edge to edge on a phone, so the bottom bar can sit clear of the home
// indicator (env(safe-area-inset-bottom)).
export const viewport: Viewport = { viewportFit: "cover" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The inline script and next-themes set data-palette and the dark class
    // before the first paint, so <html> differs from the server render.
    <html
      lang="en"
      data-palette={DEFAULT_PALETTE}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: paletteScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <SiteHeader />
          {children}
          <BottomNav />
        </ThemeProvider>
      </body>
    </html>
  );
}
