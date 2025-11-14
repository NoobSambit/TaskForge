import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Inter } from "next/font/google";
import { ServiceWorkerBootstrap } from "@/components/service-worker-bootstrap";
import { ThemeInitializer } from "@/components/ThemeInitializer";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000"),
  title: {
    default: "App",
    template: "%s | App",
  },
  description: "A Next.js 15 + TypeScript + TailwindCSS v4 scaffold with ShadCN UI setup.",
  manifest: "/manifest.json",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  appleWebApp: {
    capable: true,
    title: "App",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  userScalable: false,
  themeColor: {
    light: "#ffffff",
    dark: "#0f172a",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning data-theme="default">
      <body className={`${inter.variable} min-h-screen bg-background font-sans antialiased text-foreground`}>
        <ThemeInitializer />
        <ServiceWorkerBootstrap />
        {children}
      </body>
    </html>
  );
}
