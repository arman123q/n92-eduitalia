import ServicePage from "@/components/ServicePage";
import { IELTS_DEFAULTS } from "@/lib/serviceContent";

export default function IeltsCoachingPage() {
  return (
    <ServicePage
      contentKey="page_ielts"
      defaults={IELTS_DEFAULTS}
      kicker="Our services · IELTS"
      service="IELTS Online Coaching"
    />
  );
}
