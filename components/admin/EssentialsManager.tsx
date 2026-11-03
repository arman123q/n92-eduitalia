"use client";

/**
 * Student Essentials admin tab: two managers — Products
 * Catalogue and Checklist (items + categories). Publishing works
 * exactly like the blog: the database updates immediately, public
 * pages update at the next successful redeployment.
 */
import { useState } from "react";
import ProductsAdmin from "./ProductsAdmin";
import ChecklistAdmin from "./ChecklistAdmin";
import TutorialAdmin from "./TutorialAdmin";

export default function EssentialsManager() {
  const [view, setView] = useState<"products" | "checklist" | "tutorial">("products");
  return (
    <div>
      <div className="rounded-xl border border-[#C7A05A]/60 bg-[#C7A05A]/10 p-4 text-[0.85rem] leading-relaxed text-[#202824]/80">
        <strong className="text-[#103f35]">How publishing works:</strong> saving here updates the database immediately; public
        pages (checklist + products) are rebuilt at the next successful site redeployment (Cloudflare → Deployments → Retry
        deployment), exactly like blog articles. Prices are shown publicly only with a verification date — otherwise visitors
        see “Check current price”. Never enter a price, link or rating you have not checked yourself.
      </div>
      <div className="mt-5 flex gap-2">
        <button type="button" onClick={() => setView("products")} aria-pressed={view === "products"} className={`rounded-full px-4 py-2 text-sm font-semibold ${view === "products" ? "bg-[#103f35] text-white" : "border border-[#103f35]/25 bg-white text-[#103f35]"}`}>
          Products
        </button>
        <button type="button" onClick={() => setView("checklist")} aria-pressed={view === "checklist"} className={`rounded-full px-4 py-2 text-sm font-semibold ${view === "checklist" ? "bg-[#103f35] text-white" : "border border-[#103f35]/25 bg-white text-[#103f35]"}`}>
          Checklist
        </button>
        <button type="button" onClick={() => setView("tutorial")} aria-pressed={view === "tutorial"} className={`rounded-full px-4 py-2 text-sm font-semibold ${view === "tutorial" ? "bg-[#103f35] text-white" : "border border-[#103f35]/25 bg-white text-[#103f35]"}`}>
          Tutorial Video
        </button>
      </div>
      <div className="mt-5">{view === "products" ? <ProductsAdmin /> : view === "checklist" ? <ChecklistAdmin /> : <TutorialAdmin />}</div>
    </div>
  );
}
