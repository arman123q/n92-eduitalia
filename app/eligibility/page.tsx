import Eligibility from "@/components/Eligibility";
import { PageHeader } from "@/components/ui";

export const metadata = {
  title: "Eligibility Assessment — Study in Italy | N92 Edu-Italia",
  description:
    "Free preliminary eligibility assessment for Indian students planning to study in Italy. Results first — contact details only if you ask for a personalised review.",
};

export default function EligibilityPage() {
  return (
    <div className="pb-20">
      <PageHeader
        kicker="Free assessment"
        title="Check your eligibility for Italy"
        intro="Answer three short steps. Your preliminary result appears instantly — before any contact request — and your answers never leave your browser unless you choose to request a review."
      />
      <div className="mx-auto max-w-3xl px-4 sm:px-6 mt-8">
        <Eligibility />
      </div>
    </div>
  );
}
