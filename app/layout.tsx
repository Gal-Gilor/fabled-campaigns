import type { Metadata } from "next";
import localFont from "next/font/local";
import { SessionProvider } from "next-auth/react";
import "./globals.css";

const cinzel = localFont({
  src: "./fonts/cinzel-latin.woff2",
  variable: "--font-cinzel",
  weight: "400 700",
  display: "swap",
});

const roboto = localFont({
  src: "./fonts/roboto-latin.woff2",
  variable: "--font-roboto",
  weight: "400 600",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://fabledcampaigns.com"),
  title: "Fabled Campaigns",
  description:
    "Your AI Dungeon Master guide. Manage sessions, homebrew campaigns, encounters, characters, and roll to quest.",
  manifest: "/favicon/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon/favicon.ico" },
      { url: "/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: { url: "/favicon/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    other: [
      { rel: "icon", url: "/favicon/android-chrome-192x192.png", sizes: "192x192" },
      { rel: "icon", url: "/favicon/android-chrome-512x512.png", sizes: "512x512" },
    ],
  },
  openGraph: {
    title: "Fabled Campaigns",
    description:
      "Your AI Dungeon Master guide. Manage sessions, homebrew campaigns, encounters, characters, and roll to quest.",
    siteName: "Fabled Campaigns",
    url: "https://fabledcampaigns.com",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fabled Campaigns",
    description:
      "Your AI Dungeon Master guide. Manage sessions, homebrew campaigns, encounters, characters, and roll to quest.",
    images: ['/opengraph-image'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${cinzel.variable} ${roboto.variable} antialiased`}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
