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
  // Favicons generated 3 Nov 2026 from the official logo artwork
  // (public/logo-header.png): a symbol-only square crop (arch, Italian
  // flag and "92" — the Edu-Italia wordmark is unreadable at tab size).
  // The apple-touch-icon is flattened onto black, the artwork's native
  // backdrop, because iOS composites transparency over black anyway.
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: [{ url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" }],
  },
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
            Mode v2. The bootstrap first reads any previously saved
            cookie-consent choice (localStorage key written by
            components/CookieConsent.tsx) and uses it as the consent
            DEFAULT, so a returning visitor's very first page_view
            already carries their real consent state (timing fix,
            31 Oct 2026 — previously the stored choice was only applied
            after the tag had fired, so every hit stayed denied).
            New visitors default to DENIED for every category: GA sets
            no cookies until the banner records an active choice. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              var n92Consent = {
                'ad_storage': 'denied',
                'ad_user_data': 'denied',
                'ad_personalization': 'denied',
                'analytics_storage': 'denied'
              };
              try {
                var n92Saved = JSON.parse(window.localStorage.getItem('n92_cookie_consent_v1') || 'null');
                if (n92Saved) {
                  var n92Ad = n92Saved.advertising ? 'granted' : 'denied';
                  n92Consent.analytics_storage = n92Saved.analytics ? 'granted' : 'denied';
                  n92Consent.ad_storage = n92Ad;
                  n92Consent.ad_user_data = n92Ad;
                  n92Consent.ad_personalization = n92Ad;
                }
              } catch (e) { /* storage unavailable: stay fully denied */ }
              gtag('consent', 'default', n92Consent);
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
