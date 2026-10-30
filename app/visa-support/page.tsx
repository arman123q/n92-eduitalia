import ServicePage from "@/components/ServicePage";
import { VISA_DEFAULTS } from "@/lib/serviceContent";

export default function VisaSupportPage() {
  return (
    <ServicePage
      contentKey="page_visa"
      defaults={VISA_DEFAULTS}
      kicker="Our services · Visa & Documents"
      service="Visa & Documentation Support"
    />
  );
}
