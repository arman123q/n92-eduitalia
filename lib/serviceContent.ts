/**
 * Editable copy for the service pages (Admin → Website Content).
 * The public pages and homepage bands read the PUBLISHED version from
 * site_content; these built-in defaults (the owner's approved wording)
 * are the fallback until an admin publishes changes.
 */

export interface ServicePageContent {
  headline: string;
  intro: string;
  includes: string; // one item per line
  cardText: string; // short text for the homepage services overview card
  ctaText: string;
  note: string; // honest disclaimer shown on the page
}

export interface RefundContent {
  headline: string;
  mainStatement: string;
  supportingText: string;
  cardText: string;
  instalment1Title: string;
  instalment1Text: string;
  instalment2Title: string;
  instalment2Text: string;
  instalment3Title: string;
  instalment3Text: string;
  closingNote: string;
}

export const IELTS_DEFAULTS: ServicePageContent = {
  headline: "IELTS Online Coaching — Prepare with Confidence.",
  intro:
    "Live online IELTS Academic coaching from N92 Edu-Italia — for students preparing for Italian universities and anywhere English proficiency matters.",
  includes: [
    "IELTS Academic preparation",
    "Online live classes",
    "Speaking practice",
    "Writing Task 1 and Task 2 evaluation",
    "Reading and Listening practice",
    "Mock tests",
    "Personal feedback",
  ].join("\n"),
  cardText:
    "Live online IELTS Academic coaching with speaking practice, writing evaluation, mock tests and personal feedback.",
  ctaText: "Book Your Free Demo Class",
  note: "N92 Edu-Italia is an independent coaching provider. We are not affiliated with IELTS, the British Council, IDP or Cambridge, and we do not guarantee any band score — your result depends on your preparation and your performance on test day.",
};

export const VISA_DEFAULTS: ServicePageContent = {
  headline: "Your Italy Journey, Made Easier.",
  intro:
    "Step-by-step consultancy and document guidance for your Italian university admission and student visa file — so your application is complete, consistent and ready.",
  includes: [
    "Universitaly pre-enrolment guidance",
    "University admission documentation checklist",
    "Document review and verification guidance",
    "Italian student visa file review",
    "Visa application preparation guidance",
    "Appointment booking guidance",
    "Guidance on required supporting documents",
  ].join("\n"),
  cardText:
    "Universitaly pre-enrolment, document checklists, visa file review and appointment guidance — from admission to visa application.",
  ctaText: "Get Visa Assistance",
  note: "N92 Edu-Italia provides consultancy and guidance only. Visas are issued solely by the Italian Embassy/Consulate and its authorised agencies, and we cannot guarantee visa approval.",
};

export const ACCOMMODATION_DEFAULTS: ServicePageContent = {
  headline: "From Arrival to Settling In — We've Got You Covered.",
  intro:
    "Practical guidance for your first steps in Italy — finding a place to live, arriving smoothly and completing the essential registrations.",
  includes: [
    "Student accommodation search guidance",
    "University residence and private housing guidance",
    "Airport arrival information",
    "First-week settling-in assistance",
    "Codice Fiscale guidance",
    "Permesso di Soggiorno (residence permit) guidance",
    "Basic local registration and essential arrival information",
  ].join("\n"),
  cardText:
    "Accommodation search guidance, arrival information, Codice Fiscale and residence-permit guidance for your first weeks in Italy.",
  ctaText: "Get Arrival Support",
  note: "N92 Edu-Italia provides guidance and information. We do not provide accommodation ourselves and cannot guarantee housing availability or appointment dates. The Codice Fiscale and Permesso di Soggiorno are issued by Italian government authorities — we guide you through their official procedures.",
};

export const REFUND_DEFAULTS: RefundContent = {
  headline: "Your Visa. Our Commitment.",
  mainStatement: "100% Consultancy Fee Refund if Your Italian Student Visa Is Rejected.",
  supportingText:
    "If your student visa application is refused, N92 Edu-Italia will refund 100% of the consultancy fees actually paid to N92, subject to the eligibility conditions and written refund agreement.",
  cardText:
    "If your Italian student visa is rejected, we refund 100% of the consultancy fees you actually paid to N92. Read the full policy for the conditions.",
  instalment1Title: "Instalment 1 — Registration",
  instalment1Text: "Initial payment at enrolment.",
  instalment2Title: "Instalment 2 — Application Stage",
  instalment2Text: "Payment at the agreed application-processing milestone.",
  instalment3Title: "Instalment 3 — Final Stage",
  instalment3Text: "Remaining payment at the agreed final consultancy milestone.",
  closingNote:
    "The three instalments together make up the total consultancy fee. The actual amounts, milestones and dates for your plan are defined in your written consultancy agreement with N92 Edu-Italia.",
};

export const SERVICE_CONTENT_DEFAULTS: Record<string, Record<string, unknown>> = {
  page_ielts: { ...IELTS_DEFAULTS },
  page_visa: { ...VISA_DEFAULTS },
  page_accommodation: { ...ACCOMMODATION_DEFAULTS },
  page_refund: { ...REFUND_DEFAULTS },
};
