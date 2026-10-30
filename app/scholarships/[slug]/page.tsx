import seed from "@/data/seed.json";
import ScholarshipDetail from "@/components/ScholarshipDetail";

export const dynamicParams = false;

export function generateStaticParams() {
  return (seed.scholarships as { slug: string }[]).map((r) => ({ slug: r.slug }));
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ScholarshipDetail slug={slug} />;
}
