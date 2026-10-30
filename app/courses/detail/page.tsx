"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import CourseDetail from "@/components/CourseDetail";

function Inner() {
  const slug = useSearchParams().get("slug");
  return <CourseDetail slug={slug} />;
}

export default function DetailFallbackPage() {
  return (
    <Suspense fallback={<p className="mx-auto max-w-4xl px-4 py-16 text-[#202824]/60">Loading…</p>}>
      <Inner />
    </Suspense>
  );
}
