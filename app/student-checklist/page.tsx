import type { Metadata } from "next";
import StudentEssentialsClient from "@/components/StudentEssentialsClient";
import { fetchChecklist, fetchProducts } from "@/lib/essentials";

const BASE = "https://n92-eduitalia.pages.dev";

export const metadata: Metadata = {
  title: "Italy Student Checklist & Essentials | N92 Edu-Italia",
  description:
    "Everything Indian students need to prepare before moving to Italy: an interactive packing checklist with 11 categories, Italy applicability flags, a progress tracker and recommended student products.",
  alternates: { canonical: `${BASE}/student-checklist/` },
  openGraph: {
    title: "Italy Student Checklist & Essentials | N92 Edu-Italia",
    description: "Tick off everything you need for Italy — documents, medicines, kitchen, clothes, electronics and more, with Italy-specific flags.",
    url: `${BASE}/student-checklist/`,
    type: "website",
  },
};

export default async function StudentChecklistPage() {
  const [{ categories, items }, { products }] = await Promise.all([fetchChecklist(), fetchProducts()]);
  return <StudentEssentialsClient categories={categories} items={items} products={products} />;
}
