import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Counsellor from "@/components/Counsellor";

const display = Playfair_Display({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const body = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  title: "N92 Edu-Italia — Study in Italy | Eligibility Check, Universities & Scholarships",
  description:
    "Discover suitable Italian universities, explore scholarship opportunities and plan your next steps with personalised study guidance. Free preliminary eligibility assessment for Indian students.",
  metadataBase: new URL("https://n92eduitalia.example/"),
  openGraph: {
    title: "N92 Edu-Italia — Your Italian Dream. A Clearer Plan.",
    description:
      "Free eligibility check, university and scholarship guidance for Indian students planning to study in Italy.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <head>
        {/* Google AdSense site verification — owner's publisher script,
            added 31 Oct 2026. Loads in the head of every page via this
            root layout; do not duplicate it elsewhere. */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1129138042140372"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <a
          href="#check"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-[#103f35] focus:text-white focus:px-4 focus:py-2"
        >
          Skip to eligibility check
        </a>
        <Header />
        <main id="top">{children}</main>
        <Footer />
        <Counsellor />
      </body>
    </html>
  );
}
