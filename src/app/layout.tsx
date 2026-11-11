import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Swaram by Namith — Music for every mood", template: "%s · Swaram" },
  description:
    "Swaram (സ്വരം) is a liquid-glass music streaming experience with synced lyrics, offline downloads, listening together, collaborative playlists and friend activity. Built by Namith RN.",
  applicationName: "Swaram",
  authors: [{ name: "Namith RN", url: "https://namithrn.vercel.app" }],
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  openGraph: {
    title: "Swaram by Namith",
    description: "Stream, download and share music — together.",
    siteName: "Swaram",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const themeScript = `try{var t=localStorage.getItem('swaram:theme');document.documentElement.dataset.theme=t==='light'?'light':'dark'}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
