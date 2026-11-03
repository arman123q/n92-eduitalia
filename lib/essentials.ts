/**
 * Build-time data for the Student Essentials section — same
 * architecture as the blog (lib/blog.ts): the public pages are
 * static, so published categories, items and products are fetched
 * from Supabase while `next build` runs (publishable key + RLS
 * public-read-published-only). If the fetch fails — tables not yet
 * created (migration_009 pending), network down — the build falls
 * back to the snapshot files in data/ and logs a loud warning.
 * The checklist snapshot is generated from the owner's Book1.ods
 * by scripts/convert-checklist.py; the products snapshot starts
 * empty because product data is only ever entered by the owner in
 * the admin (the site never invents products or prices).
 */
import checklistSnapshot from "@/data/checklist-snapshot.json";
import productsSnapshot from "@/data/products-snapshot.json";
import type { ChecklistCategory, ChecklistItem, EssentialProduct, ProductOffer } from "@/lib/essentials-shared";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function rest(path: string): Promise<unknown[] | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  const key = SUPABASE_ANON_KEY;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as unknown[];
  } catch (err) {
    console.warn(`[essentials] WARNING: Supabase fetch failed for ${path.split("?")[0]} (${err instanceof Error ? err.message : String(err)}). Falling back to snapshot — recently published changes may be missing from this build.`);
    return null;
  }
}

type Row = Record<string, unknown>;
const str = (v: unknown, d = "") => (typeof v === "string" ? v : d);
const num = (v: unknown, d = 0) => (typeof v === "number" ? v : d);

function mapOffer(o: Row): ProductOffer {
  return {
    marketplace: (["amazon-in", "flipkart", "meesho", "shopsy", "other"].includes(str(o.marketplace)) ? str(o.marketplace) : "other") as ProductOffer["marketplace"],
    marketplaceLabel: str(o.marketplaceLabel),
    productUrl: str(o.productUrl),
    affiliateUrl: str(o.affiliateUrl),
    price: typeof o.price === "number" ? o.price : null,
    currency: str(o.currency, "INR"),
    lastVerifiedDate: str(o.lastVerifiedDate),
    availability: (["in-stock", "out-of-stock"].includes(str(o.availability)) ? str(o.availability) : "unknown") as ProductOffer["availability"],
  };
}

export async function fetchChecklist(): Promise<{ categories: ChecklistCategory[]; items: ChecklistItem[]; source: "supabase" | "snapshot" }> {
  const [catRows, itemRows] = await Promise.all([
    rest("checklist_categories?select=code,name,intro,pack_location,display_order&published=eq.true&order=display_order.asc"),
    rest("checklist_items?select=id,category_code,name,description,note,italy_status,display_order&published=eq.true&order=display_order.asc"),
  ]);
  if (catRows && itemRows) {
    return {
      source: "supabase",
      categories: (catRows as Row[]).map((r) => ({ code: str(r.code), name: str(r.name), displayOrder: num(r.display_order), intro: str(r.intro) || undefined, packLocation: str(r.pack_location) || undefined })),
      items: (itemRows as Row[]).map((r) => ({
        id: str(r.id), categoryCode: str(r.category_code), name: str(r.name), description: str(r.description),
        note: str(r.note), italyStatus: (["applicable", "review", "not-applicable"].includes(str(r.italy_status)) ? str(r.italy_status) : "review") as ChecklistItem["italyStatus"],
        displayOrder: num(r.display_order),
      })),
    };
  }
  const snap = checklistSnapshot as { categories: Row[]; items: Row[] };
  return {
    source: "snapshot",
    categories: snap.categories.map((r) => ({ code: str(r.code), name: str(r.name), displayOrder: num(r.displayOrder), intro: str(r.intro) || undefined, packLocation: str(r.packLocation) || undefined })),
    items: snap.items.map((r) => ({
      id: str(r.id), categoryCode: str(r.categoryCode), name: str(r.name), description: str(r.description),
      note: str(r.note), italyStatus: str(r.italyStatus, "review") as ChecklistItem["italyStatus"], displayOrder: num(r.displayOrder),
    })),
  };
}

export async function fetchProducts(): Promise<{ products: EssentialProduct[]; source: "supabase" | "snapshot" }> {
  const rows = await rest("essential_products?select=id,name,description,category,image_url,images,specs,offers,display_order&status=eq.published&order=display_order.asc");
  const mapProduct = (r: Row): EssentialProduct => ({
    id: str(r.id), name: str(r.name), description: str(r.description), category: str(r.category),
    imageUrl: str(r.image_url ?? r.imageUrl),
    images: Array.isArray(r.images) ? (r.images as unknown[]).map((x) => str(x)).filter(Boolean) : [],
    specs: Array.isArray(r.specs) ? (r.specs as Row[]).map((s) => ({ label: str(s.label), value: str(s.value) })).filter((s) => s.label || s.value) : [],
    offers: Array.isArray(r.offers) ? (r.offers as Row[]).map(mapOffer) : [],
    displayOrder: num(r.display_order ?? r.displayOrder),
  });
  if (rows) return { source: "supabase", products: (rows as Row[]).map(mapProduct) };
  const snap = productsSnapshot as { products: Row[] };
  return { source: "snapshot", products: snap.products.map((r) => mapProduct({ ...r, image_url: r.imageUrl, display_order: r.displayOrder })) };
}
