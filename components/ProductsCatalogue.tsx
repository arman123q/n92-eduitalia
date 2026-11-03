"use client";

import { useMemo, useState } from "react";
import { ExternalLink, ImageOff, Info, Search, X } from "lucide-react";
import { formatPrice, marketplaceLabel, offerHasVerifiedPrice, type EssentialProduct } from "@/lib/essentials-shared";
// @ts-ignore - plain JS module
import { isSafeImageUrl } from "@/lib/sanitize.js";
// @ts-ignore - plain JS module
import { directOfferUrl, sensitiveCategoryKind, SENSITIVE_NOTICES } from "@/lib/product-url.js";

/**
 * Products catalogue (client side): SEARCH (name, category,
 * description) + category filter, working together, plus cards.
 * Affiliate/honesty rules:
 *  - a "View Product" link is shown ONLY for a verified DIRECT
 *    retailer product URL (lib/product-url.js) — marketplace
 *    search URLs never become purchase links;
 *  - prices display ONLY when verified on a recorded date —
 *    otherwise "Check current price";
 *  - a product without a verified image shows a neutral
 *    "Image coming soon" placeholder — never the N92 logo;
 *  - Documents / Medicines / Food products are informational:
 *    they show their guidance notice and NO shopping links.
 * Nothing here is scraped or invented.
 */
export default function ProductsCatalogue({ products }: { products: EssentialProduct[] }) {
  const categories = useMemo(() => ["All", ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))], [products]);
  const [active, setActive] = useState("All");
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const visible = products.filter((p) => {
    if (active !== "All" && p.category !== active) return false;
    if (!q) return true;
    return p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
  });

  const clearAll = () => { setQuery(""); setActive("All"); };

  return (
    <div>
      <div className="relative" role="search">
        <Search size={19} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#103f35]/45" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products by name, category or description…"
          aria-label="Search products"
          className="w-full rounded-full border border-[#103f35]/20 bg-white py-3.5 pl-11 pr-11 text-[1rem] shadow-sm outline-none transition focus:border-[#C7A05A] focus:ring-2 focus:ring-[#C7A05A]/30 [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-[#103f35]/8 text-[#103f35] transition hover:bg-[#103f35]/15">
            <X size={15} aria-hidden="true" />
          </button>
        )}
      </div>

      {categories.length > 2 && (
        <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filter products by category">
          {categories.map((c) => (
            <button key={c} type="button" onClick={() => setActive(c)} aria-pressed={active === c} className={`rounded-full px-4 py-2 text-[0.85rem] font-semibold ${active === c ? "bg-[#103f35] text-white" : "border border-[#103f35]/25 bg-white text-[#103f35]"}`}>
              {c}
            </button>
          ))}
        </div>
      )}

      <p className="mt-5 text-sm text-[#202824]/55" role="status">
        Showing {visible.length} of {products.length} products
        {active !== "All" && <> in <strong className="text-[#103f35]">{active}</strong></>}
        {q && <> matching “{query.trim()}”</>}
      </p>

      <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      {visible.length === 0 && products.length > 0 && (
        <div className="mt-10 rounded-xl border border-[#103f35]/15 bg-white p-8 text-center">
          <h2 className="font-display text-xl font-bold text-[#103f35]">No products found</h2>
          <p className="mx-auto mt-2 max-w-md text-[#202824]/60">
            Nothing matches{q ? <> “{query.trim()}”</> : " your filters"}{active !== "All" && <> in {active}</>}. Try a different search, or clear everything to browse the full catalogue.
          </p>
          <button type="button" onClick={clearAll} className="btn-primary mt-4 !px-5 !py-2.5 text-sm">Clear search and filters</button>
        </div>
      )}

      {visible.length === 0 && products.length === 0 && (
        <p className="mt-10 rounded-xl border border-[#103f35]/15 bg-white p-6 text-center text-[#202824]/60">
          No products in this category yet.
        </p>
      )}
    </div>
  );
}

function ProductCard({ product: p }: { product: EssentialProduct }) {
  const gallery = [p.imageUrl, ...p.images].filter((u) => u && isSafeImageUrl(u));
  const [main, setMain] = useState(0);
  const mainSrc = gallery[Math.min(main, Math.max(gallery.length - 1, 0))];
  const sensitive = sensitiveCategoryKind(p.category);

  return (
    <article className="card group flex flex-col overflow-hidden p-0 transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative">
        {mainSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mainSrc} alt={p.name} className="h-52 w-full object-cover" loading="lazy" />
        ) : (
          <span className="flex h-52 w-full flex-col items-center justify-center gap-2.5 bg-gradient-to-br from-[#f1ead9] to-[#e7ddc6] text-[#8a7a55]" role="img" aria-label="Product image coming soon">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/70 ring-1 ring-[#C7A05A]/40">
              <ImageOff size={24} aria-hidden="true" />
            </span>
            <span className="text-[0.82rem] font-bold uppercase tracking-[0.12em]">Image coming soon</span>
          </span>
        )}
        {p.category && (
          <span className="absolute left-4 top-4 rounded-full bg-[#C7A05A] px-3 py-1 text-xs font-semibold text-[#103F35]">{p.category}</span>
        )}
        {sensitive && (
          <span className="absolute right-4 top-4 rounded-full bg-[#103F35] px-3 py-1 text-xs font-bold text-white">Information</span>
        )}
      </div>

      {gallery.length > 1 && (
        <div className="flex gap-2 px-5 pt-3">
          {gallery.map((u, i) => (
            <button key={i} type="button" onClick={() => setMain(i)} aria-label={`Show image ${i + 1} of ${p.name}`} className={`h-12 w-12 overflow-hidden rounded-lg ring-2 ${i === main ? "ring-[#C7A05A]" : "ring-transparent"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="" className="h-full w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-1 flex-col p-5">
        <h2 className="font-display text-[1.25rem] font-bold leading-snug text-[#103f35]">{p.name}</h2>
        {p.description && <p className="mt-2 text-[0.92rem] leading-relaxed text-[#202824]/70">{p.description}</p>}

        {sensitive && (
          <p className="mt-3 flex gap-2 rounded-xl bg-[#C7A05A]/14 px-3.5 py-3 text-[0.83rem] leading-relaxed text-[#5c4a1f]">
            <Info size={16} aria-hidden="true" className="mt-0.5 flex-none text-[#8a6d35]" />
            <span>{SENSITIVE_NOTICES[sensitive as keyof typeof SENSITIVE_NOTICES]}</span>
          </p>
        )}

        {p.specs.length > 0 && (
          <dl className="mt-4 space-y-1.5 border-t border-[#103f35]/10 pt-3 text-[0.85rem]">
            {p.specs.map((s, i) => (
              <div key={i} className="flex justify-between gap-4">
                <dt className="font-medium text-[#202824]/55">{s.label}</dt>
                <dd className="text-right font-medium text-[#202824]">{s.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {!sensitive && p.offers.length > 0 && (
          <ul className="mt-4 space-y-2.5 border-t border-[#103f35]/10 pt-4">
            {p.offers.map((o, i) => {
              const url = directOfferUrl(o);
              const verified = offerHasVerifiedPrice(o);
              return (
                <li key={i} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[0.9rem] font-semibold text-[#202824]">{marketplaceLabel(o)}</p>
                    <p className="text-[0.8rem] text-[#202824]/55">
                      {verified ? (
                        <>Price verified {o.lastVerifiedDate}</>
                      ) : (
                        <>Check current price</>
                      )}
                      {o.availability === "in-stock" && <> · <span className="text-[#103f35]">In stock</span></>}
                      {o.availability === "out-of-stock" && <> · <span className="text-[#b3392e]">Out of stock</span></>}
                    </p>
                  </div>
                  <div className="flex flex-none items-center gap-3">
                    <span className="font-display text-[1.05rem] font-bold text-[#103f35]">{formatPrice(o)}</span>
                    {url && (
                      <a
                        href={url}
                        target="_blank"
                        rel="sponsored noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-full bg-[#103f35] px-3.5 py-1.5 text-[0.8rem] font-semibold text-white hover:bg-[#0b2e27]"
                      >
                        View Product <ExternalLink size={13} aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </article>
  );
}
