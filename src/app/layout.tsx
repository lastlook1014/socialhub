import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/lib/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SocialHub — One Platform, Total Control",
  description:
    "SocialHub is the enterprise social operations, publishing, analytics & organization communications platform. One platform, total control — connect, organize, create, review, approve, publish, monitor, engage, analyze and report.",
  keywords: [
    "social media operations",
    "publishing",
    "analytics",
    "socialhub",
    "team collaboration",
    "mail center",
    "social media management",
  ],
  authors: [{ name: "SocialHub" }],
  icons: {
    icon: "/socialhub-logo.jpg",
    apple: "/socialhub-logo.jpg",
  },
  openGraph: {
    title: "SocialHub — One Platform, Total Control",
    description:
      "The enterprise social operations, publishing, analytics & organization communications platform.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
