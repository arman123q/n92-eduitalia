/**
 * Editable copy for the Student Journey section and the consultation
 * booking page (Admin → Website Content). Defaults are the built-in
 * wording; publishing in Admin overrides them.
 */

export interface JourneyContent {
  heading: string;
  intro: string;
  step1Title: string;
  step1Text: string;
  step2Title: string;
  step2Text: string;
  step3Title: string;
  step3Text: string;
  step4Title: string;
  step4Text: string;
  step5Title: string;
  step5Text: string;
  step6Title: string;
  step6Text: string;
  disclaimer: string;
}

export const JOURNEY_DEFAULTS: JourneyContent = {
  heading: "Your Journey to Italy — Step by Step",
  intro:
    "From your first free check to your first weeks in Italy, here is exactly how we work with you — one honest step at a time.",
  step1Title: "Free Eligibility Assessment",
  step1Text:
    "Start with the free online assessment. It takes a few minutes, needs no contact details, and shows your preliminary plan instantly.",
  step2Title: "Counselling & University Shortlisting",
  step2Text:
    "A counsellor reviews your profile with you and shortlists real universities and programmes, using official programme pages and requirements.",
  step3Title: "Application & Documentation",
  step3Text:
    "We help you prepare and check every document — transcripts, CV, statement of purpose and language proof — application by application.",
  step4Title: "Admission & Pre-enrolment",
  step4Text:
    "When a university admits you, we guide your pre-enrolment on Universitaly, the Italian Ministry's official portal for international students.",
  step5Title: "Visa Preparation & Guidance",
  step5Text:
    "We review your student-visa file with you, guide your application preparation and help you get ready for your appointment.",
  step6Title: "Accommodation & Arrival Support",
  step6Text:
    "Guidance on finding housing, arriving smoothly, your Codice Fiscale and your residence permit during your first weeks in Italy.",
  disclaimer:
    "Admission decisions are made by the universities, scholarship decisions by the awarding agencies and visa decisions by the Italian authorities. N92 Edu-Italia provides guidance at every step — we never guarantee an outcome.",
};

export interface ConsultContent {
  heading: string;
  intro: string;
  services: string; // one service per line
  note: string;
}

export const CONSULT_DEFAULTS: ConsultContent = {
  heading: "Book a Free Consultation",
  intro:
    "Choose the service you want to discuss, tell us how to reach you, and pick a time that suits you. A first consultation is free and without obligation.",
  services: [
    "University Course & Admission Guidance",
    "IELTS Online Coaching",
    "Visa & Documentation Support",
    "Accommodation & Arrival Support",
    "Scholarships & Funding Guidance",
    "Not sure yet — general guidance",
  ].join("\n"),
  note: "Your preferred date and time is a request, not a confirmed appointment. We will confirm your consultation on WhatsApp or email after reviewing your enquiry.",
};

export const EXTRA_CONTENT_DEFAULTS: Record<string, Record<string, unknown>> = {
  journey: { ...JOURNEY_DEFAULTS },
  consultation: { ...CONSULT_DEFAULTS },
};
