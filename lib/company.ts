/**
 * Company contact & location details (Admin → Website Content → Company).
 * ONLY details verified from the owner's Google Business listing belong
 * here. Anything not yet verified stays empty — the website hides empty
 * fields instead of guessing an address, phone number or hours.
 */

export interface CompanyInfo {
  businessName: string;
  address: string; // full written address, one line
  phoneDisplay: string; // e.g. +39 …
  phoneHref: string; // tel: link value, e.g. +39…
  email: string;
  hours: string; // one line per day/range
  mapsUrl: string; // Google listing / maps link
  directionsUrl: string; // Google Maps directions link
  embedUrl: string; // optional Google Maps embed URL (only when reliable)
}

export const COMPANY_DEFAULTS: CompanyInfo = {
  businessName: "N92 Edu-Italia",
  address: "",
  phoneDisplay: "",
  phoneHref: "",
  email: "",
  hours: "",
  // The owner's own Google share link for the business listing.
  mapsUrl: "https://share.google/SMZxVZdUWDem9ucYB",
  directionsUrl: "https://share.google/SMZxVZdUWDem9ucYB",
  embedUrl: "",
};

export const COMPANY_CONTENT_KEY = "company";
