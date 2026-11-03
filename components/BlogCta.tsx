"use client";

/**
 * BlogCta — the premium end-of-article call to action shown on
 * every published blog article, after the article content and
 * before Related Articles (wired in app/blog/[slug]/page.tsx; the
 * article editor and SEO metadata are untouched).
 *
 * Destination: the site's existing Eligibility Assessment page,
 * /eligibility/ — the same URL the header, footer, hero and detail
 * pages already link to. No placeholder or fake form.
 *
 * Tracking: the click fires the GA4 event
 * "blog_eligibility_cta_click" through window.gtag — the exact
 * pattern components/CookieConsent.tsx uses. The layout loads
 * gtag.js with Consent Mode v2 defaults before anything else runs,
 * so the event is processed under the visitor's current consent
 * state; this component sets no cookies and bypasses nothing, and
 * a tracking failure can never break the navigation.
 *
 * Contrast (computed): gold button #C7A05A with forest text
 * #103F35 = 4.82:1 (WCAG AA for text); ivory #FAF9F5 on forest =
 * 11.17:1. The button is a real link — keyboard focusable with a
 * visible gold focus ring.
 */

const DESTINATION = "/eligibility/";

function trackCtaClick() {
  try {
    const w = window as unknown as { gtag?: (...a: unknown[]) => void };
    if (typeof w.gtag === "function") {
      w.gtag("event", "blog_eligibility_cta_click", {
        event_category: "blog",
        event_label: "eligibility_assessment",
        link_url: DESTINATION,
      });
    }
  } catch {
    // Analytics must never break navigation.
  }
}

export default function BlogCta() {
  return (
    <div className="mx-auto mt-14 max-w-3xl px-4 sm:px-6">
      <section
        aria-label="Free eligibility assessment"
        className="overflow-hidden rounded-3xl bg-[#103F35] px-6 py-9 text-[#FAF9F5] shadow-xl sm:px-10 sm:py-11"
      >
        <div className="h-1 w-14 rounded-full bg-[#C7A05A]" aria-hidden="true" />
        <h2 className="mt-5 font-display text-3xl font-bold leading-tight sm:text-4xl">
          Your Italy journey starts with the right university.
        </h2>
        <p className="mt-4 text-[1.05rem] leading-relaxed text-[#FAF9F5]/90">
          Not sure which Italian university matches your academic profile, budget and career goals?
        </p>
        <p className="mt-2 leading-relaxed text-[#FAF9F5]/70">
          Get a free preliminary profile assessment and personalised guidance on universities, courses, scholarships and admission requirements.
        </p>
        <a
          href={DESTINATION}
          onClick={trackCtaClick}
          className="mt-7 inline-block w-full rounded-full bg-[#C7A05A] px-7 py-3.5 text-center font-semibold text-[#103F35] transition hover:bg-[#d3b075] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C7A05A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#103F35] sm:w-auto"
        >
          Get Your Free Eligibility Assessment
        </a>
        <p className="mt-4 text-sm text-[#FAF9F5]/75">
          Start your Italy admission journey with N92 Edu-Italia.
        </p>
        <p className="mt-7 border-t border-white/10 pt-4 text-xs leading-relaxed text-[#FAF9F5]/50">
          Assessment is preliminary and does not guarantee admission, scholarship or visa approval. Final decisions are made by the relevant institutions and authorities.
        </p>
      </section>
    </div>
  );
}
