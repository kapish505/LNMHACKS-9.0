import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ScrollShell } from "@/components/canvas/scroll-shell";
import { PageCircleReveal } from "@/components/canvas/page-circle-reveal";

const inter = Inter({ subsets: ["latin"] });

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
    <html lang="en" className="antialiased">
      <body className={inter.className}>
        <PageCircleReveal />
        <ScrollShell>
          {children}
        </ScrollShell>
      </body>
    </html>
  );
}
