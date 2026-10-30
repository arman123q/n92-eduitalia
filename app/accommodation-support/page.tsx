import ServicePage from "@/components/ServicePage";
import { ACCOMMODATION_DEFAULTS } from "@/lib/serviceContent";

export default function AccommodationSupportPage() {
  return (
    <ServicePage
      contentKey="page_accommodation"
      defaults={ACCOMMODATION_DEFAULTS}
      kicker="Our services · Arrival"
      service="Accommodation & Arrival Support"
    />
  );
}
