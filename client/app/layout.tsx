import { Header } from "@/components/header";
import { QueryProvider } from "@/components/QueryProvider";
import { NetworkStatus } from "@/components/NetworkStatus";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/lib/auth-context";
import { SerwistProvider } from "@serwist/turbopack/react";
import { Geist } from "next/font/google";
import type { Metadata, Viewport } from "next";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "Streamly",
  description: "Discover and watch YouTube videos, save favorites, and share reviews.",
  applicationName: "Streamly",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Streamly", statusBarStyle: "default" },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = { themeColor: "#dc2626" };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={geist.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <SerwistProvider swUrl="/serwist/sw.js">
          <QueryProvider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
              <AuthProvider>
                <NetworkStatus />
                <Header />
                <main className="p-4 sm:p-6">{children}</main>
              </AuthProvider>
            </ThemeProvider>
          </QueryProvider>
        </SerwistProvider>
      </body>
    </html>
  );
}
