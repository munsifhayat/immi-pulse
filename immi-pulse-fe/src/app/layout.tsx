import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "IMMI-PULSE | AI-Powered Immigration Consulting",
    template: "%s | IMMI-PULSE",
  },
  description:
    "The intelligent platform for immigration consultants. AI-powered visa classification, document validation, and case management — built for OMARA-registered agents in Australia.",
  keywords: [
    "immigration",
    "AI",
    "visa",
    "OMARA",
    "Australia",
    "migration agent",
    "document validation",
    "case management",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${outfit.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
