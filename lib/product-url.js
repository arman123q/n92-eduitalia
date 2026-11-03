/**
 * product-url.js — purchase-link honesty helpers for the public
 * catalogue. A "View Product" link may be shown ONLY for a
 * verified DIRECT retailer product page — never for a
 * marketplace search-results URL, and never for a non-HTTPS URL.
 * Pure functions, unit-tested, shared by the catalogue page and
 * the checklist-page products panel.
 */

function parseHttps(url) {
  if (typeof url !== "string" || !url.trim()) return null;
  try {
    const u = new URL(url.trim());
    return u.protocol === "https:" ? u : null;
  } catch {
    return null;
  }
}

function isSearchShaped(u) {
  const path = u.pathname.toLowerCase();
  if (/(^|\/)search(\/|$)/.test(path)) return true;
  if (/(^|\/)s\/?$/.test(path)) return true; // Amazon /s results
  if (u.searchParams.has("k") && /(^|\/)s\/?$/.test(path)) return true;
  return false;
}

export function isDirectProductUrl(rawUrl) {
  const u = parseHttps(rawUrl);
  if (!u) return false;
  if (isSearchShaped(u)) return false;
  const host = u.hostname.replace(/^www\./, "");
  const path = u.pathname;
  if (host === "amazon.in" || host === "amazon.com" || host.endsWith(".amazon.in") || host.endsWith(".amazon.com")) {
    return /\/(dp|gp\/product)\//.test(path);
  }
  if (host === "flipkart.com" || host.endsWith(".flipkart.com")) {
    return /\/p\//.test(path);
  }
  if (host === "myntra.com" || host.endsWith(".myntra.com")) {
    return /\/\d+\/buy\/?$/.test(path) || /\/buy(\/|$)/.test(path);
  }
  // Any other HTTPS retailer page that is not search-shaped
  // (brand stores like portronics.com/products/…, FirstCry
  // product pages, etc.) counts as a direct product page.
  return true;
}

/**
 * The URL a card may link to for one offer: the affiliate URL if
 * it is itself a direct product URL, else the product URL if it
 * is direct, else null (no link may be shown).
 */
export function directOfferUrl(offer) {
  if (!offer) return null;
  if (offer.affiliateUrl && isDirectProductUrl(offer.affiliateUrl)) return offer.affiliateUrl;
  if (offer.productUrl && isDirectProductUrl(offer.productUrl)) return offer.productUrl;
  return null;
}

/**
 * Categories that must be presented as INFORMATION, not shopping:
 * documents/services, medicines and food carry guidance and
 * customs warnings instead of purchase affordances.
 * Returns "documents" | "medicines" | "food" | null.
 */
export function sensitiveCategoryKind(category) {
  const c = String(category ?? "").toLowerCase();
  if (!c) return null;
  if (c.includes("document")) return "documents";
  if (c.includes("medicine") || c.includes("medical")) return "medicines";
  if (c.includes("food")) return "food";
  return null;
}

export const SENSITIVE_NOTICES = {
  documents:
    "Informational — this is a document or service item, obtained from the issuing institution or relevant service. It is not a retail product.",
  medicines:
    "Informational only — N92 does not sell medicines and this is not medical advice. Suitability and dosage are for your doctor or pharmacist to confirm; check Italy customs rules before carrying medicines.",
  food:
    "Food item — choose sealed, labelled, commercially packaged products where permitted, and check Italy customs rules before travelling with food.",
};
