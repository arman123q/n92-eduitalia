import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import EssentialsTabs from "@/components/EssentialsTabs";
import ProductsCatalogue from "@/components/ProductsCatalogue";
import { fetchProducts } from "@/lib/essentials";

const BASE = "https://n92-eduitalia.pages.dev";

export const metadata: Metadata = {
  title: "Student Essentials Products — Recommended for Italy | N92 Edu-Italia",
  description:
    "Products recommended for Indian students moving to Italy, with marketplace links and honestly dated price checks. Prices are only shown when verified — otherwise check the current price at the store.",
  alternates: { canonical: `${BASE}/student-checklist/products/` },
  openGraph: {
    title: "Student Essentials Products | N92 Edu-Italia",
    description: "Recommended student products with marketplace links and dated price verification.",
    url: `${BASE}/student-checklist/products/`,
    type: "website",
  },
};

export default async function StudentProductsPage() {
  const { products } = await fetchProducts();
  return (
    <div className="pb-20">
      <PageHeader
        kicker="Student Essentials"
        title="Products that help in Italy"
        intro="A short, practical catalogue for your move — luggage, adapters, kitchen basics and more. Every product here was added by our team with a link to the store; we never invent prices."
      />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mt-8">
          <EssentialsTabs active="products" />
        </div>

        <div className="mt-6 rounded-2xl border border-[#C7A05A]/50 bg-[#C7A05A]/10 p-4 text-[0.85rem] leading-relaxed text-[#202824]/75" role="note">
          <strong className="text-[#103f35]">Affiliate disclosure:</strong> some links on this page are affiliate links. If you buy
          through them, N92 Edu-Italia may earn a small commission at no extra cost to you. Prices change constantly — we only show a
          price together with the date we last verified it; otherwise please check the current price on the store's page.
        </div>

        <div className="mt-8">
          {products.length > 0 ? (
            <ProductsCatalogue products={products} />
          ) : (
            <div className="rounded-2xl border border-[#103f35]/15 bg-white p-10 text-center">
              <h2 className="font-display text-2xl font-bold text-[#103f35]">Products are being added</h2>
              <p className="mx-auto mt-2 max-w-xl text-[#202824]/65">
                Our team is preparing the first recommended products with verified store links. Meanwhile, the{" "}
                <a href="/student-checklist/" className="font-semibold text-[#103f35] underline decoration-[#c7a05a] decoration-2 underline-offset-4">
                  essentials checklist
                </a>{" "}
                will help you plan what to carry.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
