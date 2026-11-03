/**
 * import-products.js — bulk product import engine for Admin →
 * Student Essentials → Products. Pure functions (no DOM, no
 * network), unit-tested, shared by the CSV path and the XLSX path
 * (both converge on normalizeRows).
 *
 * HARD RULES (owner requirements):
 *  - Existing products are NEVER overwritten or deleted: a row
 *    whose name matches an existing product (or an earlier row in
 *    the same file) is flagged "duplicate" and excluded.
 *  - Nothing is invented: blank price / URL / offer fields stay
 *    blank (the public UI then shows "Check current price").
 *  - Only `name` is required — exactly like the manual form.
 *  - URLs must be HTTPS; prices must be real numbers; dates are
 *    normalised to ISO (yyyy-mm-dd) from ISO or DD/MM/YYYY.
 */

const MARKETPLACE_ALIASES = {
  "amazon-in": "amazon-in", "amazon in": "amazon-in", "amazon india": "amazon-in",
  "amazon": "amazon-in", "amazon.in": "amazon-in",
  "flipkart": "flipkart", "meesho": "meesho", "shopsy": "shopsy",
  "other": "other", "other / custom": "other", "custom": "other",
};

export const TEMPLATE_HEADERS = [
  "name", "category", "description", "specifications", "images", "status", "display_order",
  "offer1_marketplace", "offer1_product_url", "offer1_affiliate_url", "offer1_price",
  "offer1_currency", "offer1_last_verified_date", "offer1_availability",
  "offer2_marketplace", "offer2_product_url", "offer2_affiliate_url", "offer2_price",
  "offer2_currency", "offer2_last_verified_date", "offer2_availability",
];

export function buildTemplateCsv() {
  return TEMPLATE_HEADERS.join(",") + "\n";
}

/** Normalise a spreadsheet header to a canonical key. */
export function canonicalKey(header) {
  return String(header ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/__+/g, "_")
    .replace(/^_|_$/g, "");
}

const KEY_ALIASES = {
  product_name: "name", title: "name",
  specs: "specifications", specification: "specifications",
  image: "images", image_url: "images", image_urls: "images", main_image: "images",
  order: "display_order", displayorder: "display_order", sort_order: "display_order",
  marketplace: "offer1_marketplace", product_url: "offer1_product_url",
  affiliate_url: "offer1_affiliate_url", affiliate_link: "offer1_affiliate_url",
  price: "offer1_price", currency: "offer1_currency",
  last_verified_date: "offer1_last_verified_date", verified_date: "offer1_last_verified_date",
  availability: "offer1_availability",
};

export function normalizeRowKeys(row) {
  const out = {};
  for (const [k, v] of Object.entries(row ?? {})) {
    let key = canonicalKey(k);
    // offer_1_price -> offer1_price
    key = key.replace(/^offer_(\d+)_/, "offer$1_");
    if (KEY_ALIASES[key]) key = KEY_ALIASES[key];
    if (out[key] === undefined || out[key] === "") out[key] = v;
  }
  return out;
}

/** Minimal, correct CSV parser: BOM, CRLF, quoted fields, "" escapes. */
export function parseCsv(text) {
  const src = String(text ?? "").replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  const pushField = () => { row.push(field); field = ""; };
  const pushRow = () => { rows.push(row); row = []; };
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') { quoted = true; continue; }
    if (ch === ",") { pushField(); continue; }
    if (ch === "\n") { pushField(); pushRow(); continue; }
    if (ch === "\r") continue;
    field += ch;
  }
  if (field !== "" || row.length) { pushField(); pushRow(); }
  if (!rows.length) return [];
  const headers = rows[0].map((h) => String(h ?? ""));
  return rows.slice(1).map((cells) => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = cells[i] ?? ""; });
    return obj;
  });
}

const isBlank = (v) => v === undefined || v === null || String(v).trim() === "";
const str = (v) => (v === undefined || v === null ? "" : String(v).trim());

function isHttpsUrl(v) {
  try {
    const u = new URL(v);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

/** "2026-11-02" stays; "02/11/2026"/"02-11-2026" (DD/MM/YYYY) -> ISO; invalid -> null. */
export function normalizeDate(v) {
  const s = str(v);
  if (!s) return "";
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`);
    return !isNaN(d) && d.getUTCDate() === Number(m[3]) && d.getUTCMonth() === Number(m[2]) - 1 ? `${m[1]}-${m[2]}-${m[3]}` : null;
  }
  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) {
    const [, dd, mm, yyyy] = m;
    const iso = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    const d = new Date(`${iso}T00:00:00Z`);
    return !isNaN(d) && d.getUTCDate() === Number(dd) && d.getUTCMonth() === Number(mm) - 1 ? iso : null;
  }
  return null;
}

/** "₹4,999" / "4,999.00" / 4999 -> number; blank -> null; invalid -> undefined. */
export function parsePrice(v) {
  if (isBlank(v)) return null;
  if (typeof v === "number") return v >= 0 ? v : undefined;
  const cleaned = String(v).replace(/[₹$€£,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return undefined;
  const n = Number(cleaned);
  return n >= 0 ? n : undefined;
}

export function parseSpecs(v, warnings) {
  if (isBlank(v)) return [];
  const s = str(v);
  if (s.startsWith("{")) {
    try {
      const obj = JSON.parse(s);
      return Object.entries(obj).map(([label, value]) => ({ label: String(label).trim(), value: String(value).trim() }));
    } catch {
      warnings.push("Specifications looked like JSON but could not be parsed — imported as none. Use 'Label: Value; Label: Value' or valid JSON.");
      return [];
    }
  }
  const specs = [];
  for (const part of s.split(";")) {
    const seg = part.trim();
    if (!seg) continue;
    const idx = seg.indexOf(":");
    if (idx === -1) {
      specs.push({ label: seg, value: "" });
      warnings.push(`Specification “${seg}” has no value (expected 'Label: Value').`);
    } else {
      specs.push({ label: seg.slice(0, idx).trim(), value: seg.slice(idx + 1).trim() });
    }
  }
  return specs;
}

function parseOffer(raw, n, errors, warnings) {
  const get = (field) => raw[`offer${n}_${field}`];
  const fields = ["marketplace", "product_url", "affiliate_url", "price", "currency", "last_verified_date", "availability"];
  if (fields.every((f) => isBlank(get(f)))) return null;

  const mpRaw = str(get("marketplace")).toLowerCase();
  let marketplace = MARKETPLACE_ALIASES[mpRaw];
  let marketplaceLabel = "";
  if (!mpRaw) {
    marketplace = "other";
    warnings.push(`Offer ${n}: no marketplace given — saved as “Other / Custom”.`);
  } else if (!marketplace) {
    marketplace = "other";
    marketplaceLabel = str(get("marketplace"));
    warnings.push(`Offer ${n}: marketplace “${get("marketplace")}” is not a known store — saved as a custom store with that label.`);
  }

  const productUrl = str(get("product_url"));
  const affiliateUrl = str(get("affiliate_url"));
  if (productUrl && !isHttpsUrl(productUrl)) errors.push(`Offer ${n}: Product URL must be an HTTPS URL.`);
  if (affiliateUrl && !isHttpsUrl(affiliateUrl)) errors.push(`Offer ${n}: Affiliate URL must be an HTTPS URL.`);

  const price = parsePrice(get("price"));
  if (price === undefined) errors.push(`Offer ${n}: price “${get("price")}” is not a valid number.`);

  let currency = str(get("currency")).toUpperCase() || "INR";
  if (!/^[A-Z]{3}$/.test(currency)) {
    warnings.push(`Offer ${n}: currency “${get("currency")}” is not a 3-letter code — saved as INR.`);
    currency = "INR";
  }

  const date = normalizeDate(get("last_verified_date"));
  if (date === null) errors.push(`Offer ${n}: verification date “${get("last_verified_date")}” is not a valid date (use YYYY-MM-DD or DD/MM/YYYY).`);
  if (price !== null && price !== undefined && price > 0 && !date) {
    warnings.push(`Offer ${n}: price has no verification date — it will display publicly as “Check current price” until a date is added.`);
  }
  if (date && (price === null || price === 0)) {
    warnings.push(`Offer ${n}: a verification date is set but no price — the date alone will not display a price.`);
  }

  const avRaw = str(get("availability")).toLowerCase();
  const availability = ["in-stock", "in stock", "available", "yes"].includes(avRaw)
    ? "in-stock"
    : ["out-of-stock", "out of stock", "sold out", "no"].includes(avRaw)
      ? "out-of-stock"
      : "unknown";

  if (!productUrl && !affiliateUrl && (price === null || price === undefined)) {
    warnings.push(`Offer ${n}: has no store link and no price — skipped.`);
    return null;
  }
  return { marketplace, marketplaceLabel, productUrl, affiliateUrl, price: price ?? null, currency, lastVerifiedDate: date || "", availability };
}

/**
 * Normalise one spreadsheet row. Returns
 * { rowNumber, blank, product|null, errors[], warnings[] }.
 * `product` uses the admin payload shape (camelCase, no id).
 */
export function normalizeProductRow(inputRow, rowNumber) {
  const raw = normalizeRowKeys(inputRow);
  const errors = [];
  const warnings = [];

  const allBlank = Object.values(raw).every((v) => isBlank(v));
  if (allBlank) return { rowNumber, blank: true, product: null, errors, warnings };

  const name = str(raw.name);
  if (!name) errors.push("Product name is required.");
  if (name.length > 200) errors.push("Product name is longer than 200 characters.");

  const category = str(raw.category);
  if (category.length > 60) warnings.push(`Category “${category}” is unusually long — check for a typo.`);

  const imagesRaw = str(raw.images);
  const imageList = imagesRaw ? imagesRaw.split(/\s*[|,]\s*/).filter(Boolean) : [];
  for (const u of imageList) {
    if (!isHttpsUrl(u)) errors.push(`Image URL “${u.slice(0, 60)}” must be an HTTPS URL.`);
  }

  const specs = parseSpecs(raw.specifications, warnings);

  const offers = [];
  for (let n = 1; n <= 4; n++) {
    const offer = parseOffer(raw, n, errors, warnings);
    if (offer) offers.push(offer);
  }

  const statusRaw = str(raw.status).toLowerCase();
  let status = "draft";
  if (["published", "publish", "live", "active", "yes"].includes(statusRaw)) status = "published";
  else if (statusRaw && !["draft", "unpublished", "no"].includes(statusRaw)) {
    warnings.push(`Status “${raw.status}” not recognised — imported as Draft (publish later from the product list if needed).`);
  }

  let displayOrder = 0;
  if (!isBlank(raw.display_order)) {
    const n = Number(String(raw.display_order).replace(/[^\d.-]/g, ""));
    if (Number.isFinite(n) && n >= 0) displayOrder = Math.round(n);
    else warnings.push(`Display order “${raw.display_order}” is not a number — saved as 0.`);
  }

  const product = errors.length
    ? null
    : {
        name,
        description: str(raw.description),
        category,
        imageUrl: imageList[0] ?? "",
        images: imageList.slice(1),
        specs,
        offers,
        status,
        displayOrder,
      };
  return { rowNumber, blank: false, product, errors, warnings };
}

/** Full pipeline: raw spreadsheet objects → validated rows + duplicate flags. */
export function prepareImport(rawRows, existingNames) {
  const existing = new Set((existingNames ?? []).map((n) => String(n).trim().toLowerCase()));
  const seen = new Set();
  const rows = rawRows.map((r, i) => {
    const result = normalizeProductRow(r, i + 2); // +2: header row + 1-based
    if (result.product) {
      const key = result.product.name.trim().toLowerCase();
      if (existing.has(key)) result.duplicate = "existing";
      else if (seen.has(key)) result.duplicate = "file";
      else seen.add(key);
    }
    return result;
  });
  return rows;
}
