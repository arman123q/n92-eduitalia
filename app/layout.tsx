import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Counsellor from "@/components/Counsellor";
import CookieConsent from "@/components/CookieConsent";

const display = Playfair_Display({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const body = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });

// Google Analytics 4 measurement ID. NOTE (31 Oct 2026): the owner's
// message text said "G-5QYEH4Q690" but the Google tag he pasted from his
// GA account says "G-5QYEH4Q69Q" (twice) — the pasted tag was used. If
// the property's real ID ends in 690, change this one line.
const GA_MEASUREMENT_ID = "G-5QYEH4Q69Q";

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
        {/* Google Analytics 4 (gtag.js), added 31 Oct 2026, with Consent
            Mode v2: every storage category defaults to DENIED, so GA sets
            no cookies and stores nothing for EEA (or any) visitors unless
            a future consent banner explicitly grants it — the site has no
            cookie banner yet, and this tag must never bypass consent. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('consent', 'default', {
                'ad_storage': 'denied',
                'ad_user_data': 'denied',
                'ad_personalization': 'denied',
                'analytics_storage': 'denied'
              });
              gtag('js', new Date());
              gtag('config', '${GA_MEASUREMENT_ID}');
            `,
          }}
        />
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} />
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
        <CookieConsent />
      </body>
    </html>
  );
}
