"use client";

/**
 * Client composition for /student-checklist/: the cinematic hero,
 * the essentials dashboard and the tutorial modal (the modal's
 * open state lives here because the hero's "How to Use This
 * Guide" button triggers it).
 */
import { useState } from "react";
import EssentialsHero from "@/components/EssentialsHero";
import ChecklistApp from "@/components/ChecklistApp";
import TutorialModal from "@/components/TutorialModal";
import type { ChecklistCategory, ChecklistItem, EssentialProduct } from "@/lib/essentials-shared";

export default function StudentEssentialsClient({
  categories,
  items,
  products,
}: {
  categories: ChecklistCategory[];
  items: ChecklistItem[];
  products: EssentialProduct[];
}) {
  const [guideOpen, setGuideOpen] = useState(false);
  return (
    <div className="pb-20">
      <EssentialsHero onHowTo={() => setGuideOpen(true)} />
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6">
        <div className="mt-8">
          {items.length > 0 ? (
            <ChecklistApp categories={categories} items={items} products={products} />
          ) : (
            <div className="rounded-3xl border border-[#103f35]/15 bg-white p-10 text-center">
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
      <TutorialModal open={guideOpen} onClose={() => setGuideOpen(false)} />
    </div>
  );
}
