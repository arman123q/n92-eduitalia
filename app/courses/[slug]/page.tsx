import seed from "@/data/seed.json";
import CourseDetail from "@/components/CourseDetail";

export const dynamicParams = false;

export function generateStaticParams() {
  return (seed.courses as { slug: string }[]).map((r) => ({ slug: r.slug }));
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CourseDetail slug={slug} />;
}
