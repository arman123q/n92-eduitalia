"use client";

import { MapPin, Phone, Mail, Clock, Navigation, MessageCircle } from "lucide-react";
import { useServiceContent } from "@/components/useServiceContent";
import { COMPANY_DEFAULTS, COMPANY_CONTENT_KEY, type CompanyInfo } from "@/lib/company";

/** Premium Company Location section for the Contact page.
 * Shows only verified details (Admin → Website Content → Company);
 * empty fields are hidden rather than guessed. */
export function CompanyLocation() {
  const c = useServiceContent<CompanyInfo>(COMPANY_CONTENT_KEY, COMPANY_DEFAULTS);
  const hours = String(c.hours || "").split("\n").map((s) => s.trim()).filter(Boolean);
  const hasDetails = Boolean(c.address || c.phoneDisplay || c.email || hours.length);

  return (
    <section className="mt-12" aria-label="Company location and contact details">
      <h2 className="font-display text-2xl font-bold text-[#103f35]">Company location &amp; contact</h2>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="panel p-6 sm:p-7">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-[#103f35]">
            <MapPin size={19} className="text-[#103f35]" aria-hidden="true" /> {c.businessName}
          </h3>
          {c.address ? (
            <p className="mt-2.5 leading-relaxed text-[#202824]/80">{c.address}</p>
          ) : (
            <p className="mt-2.5 leading-relaxed text-[#202824]/65">
              Our office address will be published here shortly. You can reach us right away on WhatsApp,
              by phone or through the enquiry form.
            </p>
          )}
          <ul className="mt-5 space-y-3 text-[0.95rem]">
            {c.phoneDisplay && (
              <li className="flex items-center gap-2.5">
                <Phone size={16} className="shrink-0 text-[#103f35]" aria-hidden="true" />
                <a className="font-semibold text-[#103f35] underline decoration-[#c7a05a] decoration-2 underline-offset-4" href={`tel:${c.phoneHref || c.phoneDisplay.replace(/\s/g, "")}`}>
                  {c.phoneDisplay}
                </a>
              </li>
            )}
            {c.email && (
              <li className="flex items-center gap-2.5">
                <Mail size={16} className="shrink-0 text-[#103f35]" aria-hidden="true" />
                <a className="font-semibold text-[#103f35] underline decoration-[#c7a05a] decoration-2 underline-offset-4" href={`mailto:${c.email}`}>
                  {c.email}
                </a>
              </li>
            )}
            {hours.length > 0 && (
              <li className="flex items-start gap-2.5">
                <Clock size={16} className="mt-0.5 shrink-0 text-[#103f35]" aria-hidden="true" />
                <span className="text-[#202824]/80">
                  {hours.map((h) => (
                    <span key={h} className="block">{h}</span>
                  ))}
                </span>
              </li>
            )}
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            {c.directionsUrl && (
              <a className="btn-primary" href={c.directionsUrl} target="_blank" rel="noopener noreferrer">
                <Navigation size={15} className="mr-1.5 inline -mt-0.5" aria-hidden="true" /> Get Directions
              </a>
            )}
            <a className="btn-gold" href="https://wa.me/919452532786" target="_blank" rel="noopener noreferrer">
              <MessageCircle size={15} className="mr-1.5 inline -mt-0.5" aria-hidden="true" /> WhatsApp Us
            </a>
            {c.mapsUrl && (
              <a className="btn-ghost" href={c.mapsUrl} target="_blank" rel="noopener noreferrer">
                View on Google Maps
              </a>
            )}
          </div>
          {!hasDetails && (
            <p className="mt-4 text-[0.83rem] text-[#202824]/55">
              Full location details are being verified against our Google Business listing and will appear here.
            </p>
          )}
        </div>
        <div className="panel overflow-hidden">
          {c.embedUrl ? (
            <iframe
              title={`Map — ${c.businessName}`}
              src={c.embedUrl}
              className="h-full min-h-[320px] w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <a
              href={c.mapsUrl || "https://share.google/SMZxVZdUWDem9ucYB"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 bg-[#103f35] px-8 text-center"
            >
              <MapPin size={40} className="text-[#c7a05a]" aria-hidden="true" />
              <span className="font-display text-xl font-bold text-[#faf9f5]">Find us on Google Maps</span>
              <span className="max-w-sm text-sm leading-relaxed text-[#faf9f5]/75">
                Open our verified Google Business listing for the address, directions and independent reviews.
              </span>
              <span className="btn-gold mt-2">Open Google Maps</span>
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

/** Extra verified contact lines for the footer (client-side, admin-editable). */
export function FooterContact() {
  const c = useServiceContent<CompanyInfo>(COMPANY_CONTENT_KEY, COMPANY_DEFAULTS);
  return (
    <>
      {c.address && (
        <li className="flex items-start gap-2">
          <MapPin size={14} className="mt-0.5 shrink-0 text-[#e7d3a1]" aria-hidden="true" />
          <span>{c.address}</span>
        </li>
      )}
      {c.phoneDisplay && (
        <li className="flex items-center gap-2">
          <Phone size={14} className="shrink-0 text-[#e7d3a1]" aria-hidden="true" />
          <a className="underline font-semibold" href={`tel:${c.phoneHref || c.phoneDisplay.replace(/\s/g, "")}`}>
            {c.phoneDisplay}
          </a>
        </li>
      )}
      {c.email && (
        <li className="flex items-center gap-2">
          <Mail size={14} className="shrink-0 text-[#e7d3a1]" aria-hidden="true" />
          <a className="underline font-semibold" href={`mailto:${c.email}`}>{c.email}</a>
        </li>
      )}
      {c.mapsUrl && (
        <li>
          <a className="underline font-semibold" href={c.mapsUrl} target="_blank" rel="noopener noreferrer">
            Find us on Google Maps
          </a>
        </li>
      )}
    </>
  );
}
