import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import ChecklistApp from "@/components/ChecklistApp";
import EssentialsTabs from "@/components/EssentialsTabs";
import { fetchChecklist } from "@/lib/essentials";

const BASE = "https://n92-eduitalia.pages.dev";

export const metadata: Metadata = {
  title: "Student Essentials Checklist — Packing for Italy | N92 Edu-Italia",
  description:
    "An interactive packing and preparation checklist for Indian students moving to Italy: search, filter by category, tick items off and print your list. US-specific items are clearly flagged as not applicable to Italy.",
  alternates: { canonical: `${BASE}/student-checklist/` },
  openGraph: {
    title: "Student Essentials Checklist | N92 Edu-Italia",
    description: "Tick off everything you need for Italy — documents, clothing, electronics, medicines and more, with Italy-specific flags.",
    url: `${BASE}/student-checklist/`,
    type: "website",
  },
};

export default async function StudentChecklistPage() {
  const { categories, items } = await fetchChecklist();
  return (
    <div className="pb-20">
      <PageHeader
        kicker="Student Essentials"
        title="Your Italy packing checklist"
        intro="Work through the list category by category and tick things off as you pack — your progress is saved in this browser. Items from general student checklists that do not apply to Italy are clearly flagged, and some need a quick review before you rely on them."
      />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mt-8">
          <EssentialsTabs active="checklist" />
        </div>
        <div className="mt-8">
          {items.length > 0 ? (
            <ChecklistApp categories={categories} items={items} />
          ) : (
            <div className="rounded-2xl border border-[#103f35]/15 bg-white p-10 text-center">
              <h2 className="font-display text-2xl font-bold text-[#103f35]">The checklist is being prepared</h2>
              <p className="mx-auto mt-2 max-w-xl text-[#202824]/65">
                We are finalising the Student Essentials list. Please check back shortly — or ask us on WhatsApp and we will help you plan what to carry.
              </p>
            </div>
          )}
        </div>
        <p className="mt-10 text-sm leading-relaxed text-[#202824]/55">
          About this list: it began as a general international-student checklist and has been reviewed for Italy. “Review for Italy”
          means the item may need adapting (for example plugs, voltage or local rules). Medicine entries are informational only and
          are not medical advice — always speak to your doctor about what you should carry, and check customs rules before travelling.
        </p>
      </div>
    </div>
  );
}
