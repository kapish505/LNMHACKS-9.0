import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import { ScrollShell } from "@/components/canvas/scroll-shell";
import { PageCircleReveal } from "@/components/canvas/page-circle-reveal";
import { ThemeProvider } from "@/lib/theme-context";

import Script from "next/script";

const inter = Inter({ subsets: ["latin"] });
const manrope = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-manrope" });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F0EDE8" },
    { media: "(prefers-color-scheme: dark)", color: "#090d16" },
  ],
};

export const metadata: Metadata = {
  title: "LNMHACKS",
  description: "LNMHACKS 9.0 — The Premier Hackathon",
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <head />
      <body className={`${inter.className} ${manrope.variable}`}>
        <Script
          id="theme-script"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('lnmhacks_theme');var isDark=t==='dark'||(!t&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(isDark){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}}catch(e){}})();`,
          }}
        />
        <ThemeProvider>
          <PageCircleReveal />
          <ScrollShell>
            {children}
          </ScrollShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
