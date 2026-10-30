/** Shared record types for the N92 Edu-Italia data layer (spec §6/§7/§8). */

export type VerificationStatus = "verified" | "needs-review" | "expired";
export type PublishStatus = "draft" | "published";

export interface University {
  id: string;
  slug: string;
  name: string;
  city: string;
  region: string;
  type: "Public" | "Private";
  website: string;
  applicationUrl: string;
  degreeLevels: string[]; // bachelor | master | phd
  subjects: string[];
  languages: string[]; // english | italian
  tuitionNote: string;
  scholarshipNote: string;
  applicationStatus: string;
  admissionNote: string;
  featured?: boolean;
  academicYear: string;
  sourceUrl: string;
  lastVerified: string;
  verificationStatus: VerificationStatus;
  status: PublishStatus;
  adminNotes?: string;
}

export interface Course {
  id: string;
  slug: string;
  name: string;
  universityId: string;
  level: "bachelor" | "master" | "phd";
  subject: string;
  language: "english" | "italian" | "both";
  durationYears: number | null;
  credits: number | null;
  requirements: string;
  tuitionNote: string; // "Not verified" when unknown — never invented
  deadlineNote: string; // "Check official page" when unknown
  officialUrl: string;
  academicYear: string;
  sourceUrl: string;
  lastVerified: string;
  verificationStatus: VerificationStatus;
  status: PublishStatus;
  adminNotes?: string;
}

export interface Scholarship {
  id: string;
  slug: string;
  name: string;
  provider: string;
  kind: "regional" | "university" | "national" | "other";
  academicYear: string;
  geographicEligibility: string;
  studentEligibility: string;
  degreeLevels: string[];
  requirements: string;
  documents: string[];
  procedure: string;
  opensNote: string;
  closesNote: string;
  benefits: string; // amounts only when verified
  officialUrl: string;
  sourceUrl: string;
  lastVerified: string;
  verificationStatus: VerificationStatus;
  status: PublishStatus;
  adminNotes?: string;
}

export interface Faq {
  id: string;
  category: string;
  question: string;
  answer: string;
  sourceUrl?: string;
  status: PublishStatus;
}

export interface CalculatorDefaults {
  tuitionAnnual: number;
  monthly: {
    accommodation: number;
    food: number;
    transport: number;
    insurance: number;
    materials: number;
    personal: number;
  };
  oneTime: {
    permit: number;
    setup: number;
    travel: number;
  };
  fxRateInr: number; // EUR -> INR, an editable assumption with a date label
  fxDate: string;
  notes: string;
}

export interface AdmissionRound {
  id: string;
  universityId?: string | null;
  universityName: string;
  programmeName?: string | null;
  intakeYear?: number | null;
  intakeSemester?: string | null;
  roundName: string;
  customRoundLabel?: string | null;
  opensAt?: string | null;
  deadlineAt?: string | null;
  deadlineVerified: boolean;
  manualStatus?: string | null;
  officialUrl?: string | null;
  sourceUrl?: string | null;
  lastVerified?: string | null;
  message?: string | null;
  pinned: boolean;
  status: PublishStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface Notice {
  id: string;
  title: string;
  message: string;
  category: string;
  priority: "low" | "normal" | "high" | "urgent";
  startsAt?: string | null;
  endsAt?: string | null;
  sourceUrl?: string | null;
  lastVerified?: string | null;
  linkText?: string | null;
  linkUrl?: string | null;
  pinned: boolean;
  status: PublishStatus;
  createdAt?: string;
  updatedAt?: string;
}
