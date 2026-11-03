/**
 * Student Essentials types + pure helpers, shared by the server
 * pages and client components. Data fetching lives in
 * lib/essentials.ts (build-time only), mirroring the blog split
 * (lib/blog-shared.ts / lib/blog.ts).
 */

export type ItalyStatus = "applicable" | "review" | "not-applicable";

export interface ChecklistCategory {
  code: string;
  name: string;
  displayOrder: number;
  /** Category-level note from the source sheet (snapshot data). */
  intro?: string;
  /** Where the sheet says these items are packed (snapshot data). */
  packLocation?: string;
}

export interface ChecklistItem {
  id: string;
  categoryCode: string;
  name: string;
  description: string;
  note: string;
  italyStatus: ItalyStatus;
  displayOrder: number;
}

export type Marketplace = "amazon-in" | "flipkart" | "meesho" | "shopsy" | "other";

export const MARKETPLACES: { id: Marketplace; label: string }[] = [
  { id: "amazon-in", label: "Amazon India" },
  { id: "flipkart", label: "Flipkart" },
  { id: "meesho", label: "Meesho" },
  { id: "shopsy", label: "Shopsy" },
  { id: "other", label: "Other / Custom" },
];

export function marketplaceLabel(offer: ProductOffer): string {
  if (offer.marketplace === "other") return offer.marketplaceLabel || "Store";
  return MARKETPLACES.find((m) => m.id === offer.marketplace)?.label ?? "Store";
}

export interface ProductOffer {
  marketplace: Marketplace;
  marketplaceLabel: string;
  productUrl: string;
  affiliateUrl: string;
  /** null = price not provided; the UI then shows "Check current price". */
  price: number | null;
  currency: string;
  /** ISO date (yyyy-mm-dd) the price was last verified, or "". */
  lastVerifiedDate: string;
  availability: "in-stock" | "out-of-stock" | "unknown";
}

export interface EssentialProduct {
  id: string;
  name: string;
  description: string;
  category: string;
  imageUrl: string;
  images: string[];
  specs: { label: string; value: string }[];
  offers: ProductOffer[];
  displayOrder: number;
}

/**
 * An offer may display a price ONLY when both a price and a
 * verification date exist — otherwise the UI must say
 * "Check current price" (affiliate honesty rule: never invent or
 * present stale prices as current).
 */
export function offerHasVerifiedPrice(o: ProductOffer): boolean {
  return typeof o.price === "number" && o.price > 0 && !!o.lastVerifiedDate;
}

export function formatPrice(o: ProductOffer): string {
  if (!offerHasVerifiedPrice(o)) return "Check current price";
  const symbols: Record<string, string> = { INR: "₹", EUR: "€", USD: "$", GBP: "£" };
  const sym = symbols[o.currency] ?? `${o.currency} `;
  return `${sym}${Number(o.price).toLocaleString("en-IN")}`;
}
