"use client";

/**
 * "Recommended Student Essentials" — the middle panel of the
 * Student Essentials dashboard. Fed by the SAME published
 * products as the full catalogue (Admin → Student Essentials →
 * Products). Premium empty state while the catalogue is empty —
 * products, prices and links are only ever owner-entered.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ImageOff, PackageOpen } from "lucide-react";
import { formatPrice, marketplaceLabel, offerHasVerifiedPrice, type EssentialProduct } from "@/lib/essentials-shared";
// @ts-ignore - plain JS module
import { sensitiveCategoryKind } from "@/lib/product-url.js";
// @ts-ignore - plain JS module
import { isSafeImageUrl } from "@/lib/sanitize.js";

export default function RecommendedProducts({ products: allProducts }: { products: EssentialProduct[] }) {
  // Documents / Medicines / Food are informational, never "recommended shopping".
  const products = useMemo(() => allProducts.filter((p) => !sensitiveCategoryKind(p.category)), [allProducts]);
  const categories = useMemo(() => ["All", ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))], [products]);
  const [active, setActive] = useState("All");
  const visible = (active === "All" ? products : products.filter((p) => p.category === active)).slice(0, 4);

  return (
    <section aria-label="Recommended student products" className="flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-[#103f35]/10">
      <div className="p-6 pb-0">
        <h2 className="font-display text-[1.45rem] font-bold leading-tight text-[#103f35]">Recommended Student Essentials</h2>
        <p className="mt-1.5 text-[0.88rem] leading-relaxed text-[#202824]/60">
          Handpicked products for your Italy journey. Purchase through our affiliate links to support N92.
        </p>
        {products.length > 0 && categories.length > 2 && (
          <div className="mt-4 flex flex-wrap gap-1.5" role="group" aria-label="Filter recommended products">
            {categories.map((c) => (
              <button key={c} type="button" onClick={() => setActive(c)} aria-pressed={active === c} className={`rounded-full px-3.5 py-1.5 text-[0.8rem] font-semibold ${active === c ? "bg-[#103f35] text-white" : "bg-[#103f35]/6 text-[#103f35] hover:bg-[#103f35]/10"}`}>
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {products.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[#C7A05A]/18 text-[#8a6d35]">
            <PackageOpen size={36} aria-hidden="true" />
          </span>
          <h3 className="font-display mt-5 text-[1.35rem] font-bold text-[#103f35]">Products are being added</h3>
          <p className="mt-2 max-w-xs text-[0.92rem] leading-relaxed text-[#202824]/60">
            Our team is preparing a curated list of recommended products with verified store links. Stay tuned!
          </p>
          <svg viewBox="0 0 320 44" className="mt-8 w-full max-w-[300px] text-[#103f35]/14" aria-hidden="true" fill="currentColor">
            <path d="M0 44 L0 30 L14 30 L14 20 L22 20 L22 30 L38 30 L38 14 L44 8 L50 14 L50 30 L70 30 L70 24 L86 24 L86 30 L104 30 L104 18 L112 18 L112 10 L116 6 L120 10 L120 18 L128 18 L128 30 L150 30 L150 26 L166 26 L166 30 L186 30 L186 16 L194 16 L194 30 L214 30 L214 22 L230 22 L230 30 L248 30 L248 12 L254 12 L254 6 L258 6 L258 12 L264 12 L264 30 L284 30 L284 24 L298 24 L298 30 L320 30 L320 44 Z" />
          </svg>
        </div>
      ) : (
        <div className="flex flex-1 flex-col p-6 pt-4">
          <ul className="divide-y divide-[#103f35]/8">
            {visible.map((p) => {
              const img = [p.imageUrl, ...p.images].find((u) => u && isSafeImageUrl(u));
              const best = p.offers.find((o) => offerHasVerifiedPrice(o)) ?? p.offers[0];
              return (
                <li key={p.id} className="flex gap-3.5 py-3.5">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt="" className="h-16 w-16 flex-none rounded-xl object-cover ring-1 ring-[#103f35]/10" loading="lazy" />
                  ) : (
                    <span className="flex h-16 w-16 flex-none flex-col items-center justify-center gap-0.5 rounded-xl bg-[#f1ead9] text-[#8a7a55] ring-1 ring-[#C7A05A]/35" role="img" aria-label="Product image coming soon">
                      <ImageOff size={17} aria-hidden="true" />
                      <span className="px-1 text-center text-[0.5rem] font-bold uppercase leading-tight tracking-wide">Image soon</span>
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[#202824]">{p.name}</p>
                    {p.category && <p className="text-[0.78rem] font-medium uppercase tracking-wide text-[#8a6d35]">{p.category}</p>}
                    {best ? (
                      <p className="mt-0.5 text-[0.85rem] text-[#202824]/65">
                        <span className="font-display font-bold text-[#103f35]">{formatPrice(best)}</span>
                        {" · "}{marketplaceLabel(best)}
                        {offerHasVerifiedPrice(best) && <> · verified {best.lastVerifiedDate}</>}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-[0.85rem] text-[#202824]/55">See the catalogue for stores</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <Link href="/student-checklist/products/" className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-bold text-[#103f35] hover:underline hover:decoration-[#C7A05A] hover:decoration-2 hover:underline-offset-4">
            View the full catalogue <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      )}
    </section>
  );
}
