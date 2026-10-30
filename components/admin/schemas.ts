import { SUBJECT_LABELS, LEVEL_LABELS } from "@/components/ui";

export type FieldType = "text" | "url" | "textarea" | "select" | "date" | "number" | "checks" | "lines" | "checkbox" | "datetime";
export interface Field {
  key: string;
  label: string;
  type: FieldType;
  options?: [string, string][];
  required?: boolean;
  hint?: string;
}

const STATUS: [string, string][] = [["draft", "Draft"], ["published", "Published"]];
const VERIFY: [string, string][] = [["verified", "Verified"], ["needs-review", "Needs review"], ["expired", "Expired"]];
const LEVELS = Object.entries(LEVEL_LABELS) as [string, string][];
const SUBJECTS = Object.entries(SUBJECT_LABELS) as [string, string][];

const commonTail: Field[] = [
  { key: "academicYear", label: "Academic year", type: "text" },
  { key: "sourceUrl", label: "Source URL (official)", type: "url" },
  { key: "lastVerified", label: "Last verified date", type: "date" },
  { key: "verificationStatus", label: "Verification status", type: "select", options: VERIFY },
  { key: "status", label: "Publishing status", type: "select", options: STATUS },
  { key: "adminNotes", label: "Admin notes (private)", type: "textarea" },
];

export const SCHEMAS: Record<string, { title: string; singular: string; idPrefix: string; nameKey: string; fields: Field[] }> = {
  universities: {
    title: "Universities", singular: "University", idPrefix: "u-", nameKey: "name",
    fields: [
      { key: "name", label: "Official name", type: "text", required: true },
      { key: "slug", label: "URL slug", type: "text", required: true, hint: "Lowercase, hyphens only — used in the page address." },
      { key: "city", label: "City", type: "text" },
      { key: "region", label: "Region", type: "text" },
      { key: "type", label: "Institution type", type: "select", options: [["Public", "Public"], ["Private", "Private"]] },
      { key: "website", label: "Official website", type: "url" },
      { key: "applicationUrl", label: "Admissions / application page", type: "url" },
      { key: "degreeLevels", label: "Degree levels offered", type: "checks", options: LEVELS },
      { key: "subjects", label: "Subject areas", type: "checks", options: SUBJECTS },
      { key: "languages", label: "Teaching languages available", type: "checks", options: [["english", "English"], ["italian", "Italian"]] },
      { key: "tuitionNote", label: "Tuition note", type: "textarea", hint: "Only verified text — otherwise write “Not verified”." },
      { key: "admissionNote", label: "Admission note", type: "textarea" },
      ...commonTail,
    ],
  },
  courses: {
    title: "Courses", singular: "Course", idPrefix: "c-", nameKey: "name",
    fields: [
      { key: "name", label: "Course / programme name", type: "text", required: true },
      { key: "slug", label: "URL slug", type: "text", required: true },
      { key: "universityId", label: "University", type: "select", options: [], hint: "Loaded from your universities." },
      { key: "level", label: "Degree level", type: "select", options: LEVELS },
      { key: "subject", label: "Subject", type: "select", options: SUBJECTS },
      { key: "language", label: "Teaching language", type: "select", options: [["english", "English"], ["italian", "Italian"], ["both", "Both"]] },
      { key: "durationYears", label: "Duration (years)", type: "number" },
      { key: "credits", label: "Credits (ECTS)", type: "number" },
      { key: "requirements", label: "Admission requirements", type: "textarea" },
      { key: "tuitionNote", label: "Tuition note", type: "textarea", hint: "Only verified fees — otherwise “Not verified”." },
      { key: "deadlineNote", label: "Deadline note", type: "textarea" },
      { key: "officialUrl", label: "Official course page", type: "url" },
      ...commonTail,
    ],
  },
  scholarships: {
    title: "Scholarships", singular: "Scholarship", idPrefix: "s-", nameKey: "name",
    fields: [
      { key: "name", label: "Scholarship name", type: "text", required: true },
      { key: "slug", label: "URL slug", type: "text", required: true },
      { key: "provider", label: "Provider", type: "text" },
      { key: "kind", label: "Type", type: "select", options: [["regional", "Regional (DSU)"], ["university", "University"], ["national", "National / Government"], ["other", "Other"]] },
      { key: "geographicEligibility", label: "Geographic eligibility", type: "textarea" },
      { key: "studentEligibility", label: "Student eligibility", type: "textarea" },
      { key: "degreeLevels", label: "Degree levels", type: "checks", options: LEVELS },
      { key: "requirements", label: "Requirements (income / merit)", type: "textarea" },
      { key: "benefits", label: "Benefits", type: "textarea", hint: "Amounts only when the official source states them." },
      { key: "documents", label: "Required documents (one per line)", type: "lines" },
      { key: "procedure", label: "How to apply", type: "textarea" },
      { key: "opensNote", label: "Opening note", type: "text" },
      { key: "closesNote", label: "Deadline note", type: "text" },
      { key: "officialUrl", label: "Official application / info link", type: "url" },
      ...commonTail,
    ],
  },
  faqs: {
    title: "FAQs & Knowledge", singular: "FAQ", idPrefix: "f-", nameKey: "question",
    fields: [
      { key: "category", label: "Category", type: "text", required: true },
      { key: "question", label: "Question", type: "text", required: true },
      { key: "answer", label: "Answer (approved guidance)", type: "textarea", required: true, hint: "The Guidance Assistant answers only from these entries." },
      { key: "sourceUrl", label: "Official source URL (optional)", type: "url" },
      { key: "status", label: "Publishing status", type: "select", options: STATUS },
    ],
  },
  admission_rounds: {
    title: "Admission Rounds & Deadlines", singular: "Admission Round", idPrefix: "r-", nameKey: "universityName",
    fields: [
      { key: "universityName", label: "University name", type: "text", required: true },
      { key: "programmeName", label: "Programme / course (optional)", type: "text" },
      { key: "intakeYear", label: "Intake year", type: "number" },
      { key: "intakeSemester", label: "Intake semester", type: "select", options: [["Fall", "Fall (Sep)"], ["Spring", "Spring (Feb)"], ["Full Year", "Full Year"]] },
      { key: "roundName", label: "Round", type: "select", options: [["First Call", "First Call"], ["Second Call", "Second Call"], ["Third Call", "Third Call"], ["Custom Round", "Custom Round"]] },
      { key: "customRoundLabel", label: "Custom round label (if Custom)", type: "text" },
      { key: "opensAt", label: "Applications open (date & time, Italy)", type: "datetime" },
      { key: "deadlineAt", label: "Application deadline (date & time, Italy)", type: "datetime", hint: "Times are Europe/Rome. The public status (Upcoming/Open/Closing Soon/Closed) is calculated automatically from these dates." },
      { key: "deadlineVerified", label: "Deadline verified against the official source", type: "checkbox", hint: "Leave OFF until you have checked the official announcement — unverified deadlines are publicly labelled NOT VERIFIED and never shown as open/closed." },
      { key: "manualStatus", label: "Manual status override", type: "select", options: [["", "Automatic (from dates)"], ["results-published", "Results Published"], ["awaiting-confirmation", "Awaiting Official Confirmation"]] },
      { key: "officialUrl", label: "Official application URL", type: "url" },
      { key: "sourceUrl", label: "Official announcement / source URL", type: "url" },
      { key: "lastVerified", label: "Last verified date", type: "date" },
      { key: "message", label: "Short notice / message", type: "textarea" },
      { key: "pinned", label: "Pin to the front of the ticker", type: "checkbox" },
      { key: "status", label: "Publishing status", type: "select", options: STATUS },
      { key: "adminNotes", label: "Admin notes (private)", type: "textarea" },
    ],
  },
  notices: {
    title: "Important Notices", singular: "Notice", idPrefix: "n-", nameKey: "title",
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "message", label: "Message", type: "textarea", required: true },
      { key: "category", label: "Category", type: "select", options: [
        ["University admission calls", "University admission calls"],
        ["Applications opening soon", "Applications opening soon"],
        ["Approaching deadlines", "Approaching deadlines"],
        ["Deadline extensions", "Application deadline extensions"],
        ["Results and rankings", "Results and rankings"],
        ["Scholarship applications", "Scholarship applications"],
        ["DSU / regional scholarships", "DSU / regional scholarship announcements"],
        ["Tuition fees & waivers", "Tuition-fee and fee-waiver announcements"],
        ["Document deadlines", "Document submission deadlines"],
        ["Universitaly updates", "Universitaly pre-enrolment updates"],
        ["Visa & appointments", "Visa and appointment information"],
        ["Official announcements", "Official university announcements"],
        ["Website & consultations", "Website alerts and consultation announcements"],
      ] },
      { key: "priority", label: "Priority", type: "select", options: [["low", "Low"], ["normal", "Normal"], ["high", "High"], ["urgent", "Urgent (red)"]] },
      { key: "startsAt", label: "Show from (date & time, Italy)", type: "datetime", hint: "Leave empty to show immediately when published." },
      { key: "endsAt", label: "Show until (date & time, Italy)", type: "datetime", hint: "After this time the notice stops appearing publicly but stays in your admin history." },
      { key: "sourceUrl", label: "Source URL (official)", type: "url" },
      { key: "lastVerified", label: "Last verified date", type: "date" },
      { key: "linkText", label: "Link text (optional)", type: "text" },
      { key: "linkUrl", label: "Link URL (optional)", type: "url" },
      { key: "pinned", label: "Pin to the front", type: "checkbox" },
      { key: "status", label: "Publishing status", type: "select", options: STATUS },
      { key: "adminNotes", label: "Admin notes (private)", type: "textarea" },
    ],
  },
};

export const TABLES = ["universities", "courses", "scholarships", "faqs", "admission_rounds", "notices"] as const;
