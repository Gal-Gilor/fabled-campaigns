import type { Metadata } from "next";
import { Cinzel, Roboto } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import "./globals.css";

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://fabled-campaigns.vercel.app"),
  title: "Fabled Campaigns",
  description:
    "Your AI Dungeon Master guide. Manage sessions, homebrew campaigns, encounters, characters, and roll to quest.",
  alternates: {
    canonical: "/",
  },
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
    url: "https://fabled-campaigns.vercel.app",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Fabled Campaigns — AI Dungeon Master guide for tabletop RPGs",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fabled Campaigns",
    description:
      "Your AI Dungeon Master guide. Manage sessions, homebrew campaigns, encounters, characters, and roll to quest.",
    images: ["/og-image.png"],
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
