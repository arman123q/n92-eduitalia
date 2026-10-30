import seed from "@/data/seed.json";
import UniversityDetail from "@/components/UniversityDetail";

export const dynamicParams = false;

export function generateStaticParams() {
  return (seed.universities as { slug: string }[]).map((r) => ({ slug: r.slug }));
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <UniversityDetail slug={slug} />;
}
