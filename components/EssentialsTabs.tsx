import Link from "next/link";

/** Sub-navigation shared by the two Student Essentials pages. */
export default function EssentialsTabs({ active }: { active: "checklist" | "products" }) {
  const base = "rounded-full px-5 py-2.5 text-sm font-semibold transition";
  const on = "bg-[#103f35] text-white";
  const off = "border border-[#103f35]/25 bg-white text-[#103f35] hover:border-[#103f35]";
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Student Essentials sections">
      <Link href="/student-checklist/" className={`${base} ${active === "checklist" ? on : off}`} aria-current={active === "checklist" ? "page" : undefined}>
        Essentials Checklist
      </Link>
      <Link href="/student-checklist/products/" className={`${base} ${active === "products" ? on : off}`} aria-current={active === "products" ? "page" : undefined}>
        Products Catalogue
      </Link>
    </div>
  );
}
