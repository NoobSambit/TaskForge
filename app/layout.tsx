import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Inter } from "next/font/google";
import { ServiceWorkerBootstrap } from "@/components/service-worker-bootstrap";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000"),
  title: {
    default: "Task Manager PWA",
    template: "%s | TaskApp",
  },
  description: "A Progressive Web App for task management with offline support. Manage your tasks efficiently with real-time sync and offline capabilities.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "TaskApp",
    statusBarStyle: "black-translucent",
  },
  applicationName: "Task Manager PWA",
  keywords: ["task manager", "todo", "productivity", "PWA", "offline"],
  authors: [{ name: "TaskApp Team" }],
  creator: "TaskApp",
  publisher: "TaskApp",
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  userScalable: false,
  themeColor: "#2563eb",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} min-h-screen bg-background font-sans antialiased text-foreground`}>
        <ServiceWorkerBootstrap />
        {children}
      </body>
    </html>
  );
}
