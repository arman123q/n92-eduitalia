"use client";

import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { formatPrice, marketplaceLabel, offerHasVerifiedPrice, type EssentialProduct } from "@/lib/essentials-shared";
// @ts-ignore - plain JS module
import { isSafeImageUrl } from "@/lib/sanitize.js";

/**
 * Products catalogue (client side): category filter + cards.
 * Affiliate compliance: every offer link opens in a new tab with
 * rel="sponsored noopener noreferrer"; prices are shown ONLY when
 * the owner verified them on a recorded date — otherwise the card
 * says "Check current price". Nothing here is scraped or invented.
 */
export default function ProductsCatalogue({ products }: { products: EssentialProduct[] }) {
  const categories = useMemo(() => ["All", ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))], [products]);
  const [active, setActive] = useState("All");
  const visible = active === "All" ? products : products.filter((p) => p.category === active);

  return (
    <div>
      {categories.length > 2 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter products by category">
          {categories.map((c) => (
            <button key={c} type="button" onClick={() => setActive(c)} aria-pressed={active === c} className={`rounded-full px-4 py-2 text-[0.85rem] font-semibold ${active === c ? "bg-[#103f35] text-white" : "border border-[#103f35]/25 bg-white text-[#103f35]"}`}>
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      {visible.length === 0 && (
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

  return (
    <article className="card group flex flex-col overflow-hidden p-0 transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative">
        {mainSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mainSrc} alt={p.name} className="h-52 w-full object-cover" loading="lazy" />
        ) : (
          <span className="flex h-52 w-full items-center justify-center bg-[#103f35]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-header.png" alt="" className="h-20 w-auto opacity-90" />
          </span>
        )}
        {p.category && (
          <span className="absolute left-4 top-4 rounded-full bg-[#C7A05A] px-3 py-1 text-xs font-semibold text-[#103F35]">{p.category}</span>
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

        {p.offers.length > 0 && (
          <ul className="mt-4 space-y-2.5 border-t border-[#103f35]/10 pt-4">
            {p.offers.map((o, i) => {
              const url = o.affiliateUrl || o.productUrl;
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
                    {url && isSafeImageUrl(url) && (
                      <a
                        href={url}
                        target="_blank"
                        rel="sponsored noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-full bg-[#103f35] px-3.5 py-1.5 text-[0.8rem] font-semibold text-white hover:bg-[#0b2e27]"
                      >
                        View <ExternalLink size={13} aria-hidden="true" />
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
