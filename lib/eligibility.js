/**
 * N92 Edu-Italia — eligibility rules engine (framework-free, unit-tested).
 *
 * Produces a TRANSPARENT, PRELIMINARY assessment only.
 * It never outputs admission/scholarship/visa probabilities and never declares
 * a student definitively eligible — official requirements live on Universitaly
 * and each university's official programme page.
 */

export const QUALIFICATIONS = {
  "class-12": { label: "Class 12 (Higher Secondary)", rank: 1 },
  diploma: { label: "Diploma (after Class 12)", rank: 1 },
  bachelor: { label: "Bachelor's degree", rank: 2 },
  master: { label: "Master's degree", rank: 3 },
  phd: { label: "PhD / Doctorate", rank: 4 },
  other: { label: "Other qualification", rank: 0 },
};

export const TARGET_DEGREES = {
  bachelor: { label: "Bachelor's", needsRank: 1, needsLabel: "Class 12 or equivalent" },
  master: { label: "Master's", needsRank: 2, needsLabel: "a completed Bachelor's degree" },
  phd: { label: "PhD", needsRank: 3, needsLabel: "a completed Master's degree" },
};

export const MARKS_BANDS = ["90+", "75–89", "60–74", "50–59", "Below 50"];

export const ENGLISH_STATUSES = {
  "ielts-6.5+": "IELTS 6.5 or above",
  "ielts-5.5-6": "IELTS 5.5 – 6.0",
  "ielts-below-5.5": "IELTS below 5.5",
  toefl: "TOEFL taken",
  moi: "Medium of Instruction (MOI) letter available",
  "italian-b2": "Italian B2 or above (CILS/CELI)",
  "none-yet": "No language test taken yet",
};

export const BUDGET_BANDS = {
  "under-5000": "Under €5,000 per year",
  "5000-8000": "€5,000 – €8,000 per year",
  "8000-12000": "€8,000 – €12,000 per year",
  "12000-18000": "€12,000 – €18,000 per year",
  "18000+": "€18,000+ per year",
};

const FIELD_DIRECTIONS = {
  "engineering-technology":
    "Engineering & Technology — research directions include Politecnico di Milano, Politecnico di Torino and the Universities of Bologna, Padova and Trento. Verify each programme on its official page.",
  "computer-science-data":
    "Computer Science & Data — research directions include Sapienza (Rome), Bologna, Padova, Trento and Ca' Foscari (Venice), which publish English-taught computing programmes. Verify entry requirements officially.",
  "business-management":
    "Business & Management — research directions include Bologna, Sapienza, Ca' Foscari and Trento for English-taught management programmes. Verify GMAT/experience rules per programme.",
  "medicine-health":
    "Medicine & Health — note: Medicine in Italy has a separate national admission test route (IMAT for English-taught Medicine & Surgery). Research directions include Pavia, Milan, Sapienza and Bologna. Treat deadlines as critical.",
  "architecture-design":
    "Architecture & Design — research directions include Politecnico di Milano, IUAV Venice and Florence. Portfolio requirements are common — verify per programme.",
  "humanities-social":
    "Humanities & Social Sciences — research directions include Bologna, Sapienza, Florence and Ca' Foscari. Many programmes are Italian-taught; check the teaching language carefully.",
  "natural-sciences":
    "Natural Sciences — research directions include Padova, Bologna, Sapienza and Trento. Verify laboratory/subject prerequisites on official pages.",
  law: "Law — most Law programmes in Italy are Italian-taught and country-specific. Verify whether an English-taught option fits your career plan before shortlisting.",
  other:
    "Start from the Universitaly course search and filter by your field, degree level and teaching language, then verify on official university pages.",
};

/** Validate one step of the assessment. Returns {field: errorMessage}. */
export function validateStep(step, d) {
  const e = {};
  if (step === 1) {
    if (!d.degree) e.degree = "Please select the degree you want to study.";
    if (!d.qualification) e.qualification = "Please select your highest completed qualification.";
    if (!d.marks) e.marks = "Please select your approximate academic marks.";
  }
  if (step === 2) {
    if (!d.englishStatus) e.englishStatus = "Please select your current English / language status.";
    if (!d.intake) e.intake = "Please select your preferred intake year.";
    if (!d.teachingLanguage) e.teachingLanguage = "Please select your preferred teaching language.";
  }
  if (step === 3) {
    if (!d.budget) e.budget = "Please select your approximate annual budget.";
    if (!d.funding) e.funding = "Please select your funding preference.";
  }
  return e;
}

/** Validate the lead (personalised review) form. */
export function validateLead(l) {
  const e = {};
  if (!l.name || l.name.trim().length < 2) e.name = "Please enter your full name.";
  const hasEmail = l.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(l.email.trim());
  const hasPhone = l.whatsapp && /^[+\d][\d\s-]{7,}$/.test(l.whatsapp.trim());
  if (!hasEmail && !hasPhone)
    e.contact = "Please provide a valid email address or a WhatsApp number so we can reach you.";
  if (!l.consent) e.consent = "Please confirm consent so we can process your enquiry.";
  if (l.website) e.website = "Spam check failed."; // honeypot
  return e;
}

/**
 * Build the preliminary assessment.
 * @param {object} d assessment answers
 * @returns {{factors:string[], checks:string[], courseDirections:string[],
 *            scholarshipPriorities:string[], documents:string[], nextSteps:string[]}}
 */
export function assess(d) {
  const factors = [];
  const checks = [];
  const courseDirections = [];
  const scholarshipPriorities = [];
  const documents = [];
  const nextSteps = [];

  const target = TARGET_DEGREES[d.degree];
  const qual = QUALIFICATIONS[d.qualification];

  // ---------- profile factors ----------
  if (target && qual) {
    factors.push(
      `You are planning a ${target.label} and your highest completed qualification is ${qual.label.toLowerCase()}.`
    );
  }
  if (d.marks) factors.push(`Your reported academic marks are in the ${d.marks}% band.`);
  if (d.field) factors.push(`Your academic background field is ${d.field.replace(/-/g, " ")}.`);
  if (d.intake) factors.push(`Your preferred intake is ${d.intake}, which leaves time to prepare documents and language proof if you start now.`);
  if (d.budget && BUDGET_BANDS[d.budget])
    factors.push(`Your stated budget is ${BUDGET_BANDS[d.budget].toLowerCase()}.`);

  // ---------- qualification level ----------
  if (target && qual && qual.rank > 0 && qual.rank < target.needsRank) {
    checks.push(
      `Entry level gap: a ${target.label} in Italy normally requires ${target.needsLabel}. Based on your answers, you would first need to complete that level (or an accepted equivalent) before applying.`
    );
  }
  if (d.qualification === "other") {
    checks.push(
      "Your qualification type needs an individual check — Italian universities assess foreign qualifications case by case, and pre-enrolment runs through Universitaly."
    );
  }

  // ---------- language ----------
  const wantsEnglish = d.teachingLanguage === "english" || d.teachingLanguage === "either";
  const wantsItalian = d.teachingLanguage === "italian" || d.teachingLanguage === "either";
  if (wantsEnglish) {
    if (d.englishStatus === "none-yet") {
      checks.push(
        "English proof still needed: most English-taught programmes ask for proof of English (commonly around B2 level — IELTS/TOEFL, and some universities accept a Medium of Instruction letter). Check the exact accepted proofs on each programme page and book a test early."
      );
    } else if (d.englishStatus === "ielts-below-5.5") {
      checks.push(
        "Your IELTS band is below the level most English-taught programmes ask for (commonly B2, roughly IELTS 5.5–6.5 depending on the university). Plan a retake or preparation course, and verify each programme's minimum."
      );
    } else if (d.englishStatus === "italian-b2") {
      checks.push(
        "You reported Italian B2 but prefer English-taught study — you will still need accepted English proof (IELTS/TOEFL or MOI, as the programme specifies)."
      );
    }
  }
  if (wantsItalian && d.englishStatus !== "italian-b2") {
    checks.push(
      "Italian-taught programmes normally require certified Italian (commonly B2 — CILS/CELI). If you do not hold it yet, either plan Italian study well before enrolment or shortlist English-taught programmes."
    );
  }
  if (d.englishStatus === "moi") {
    checks.push(
      "MOI letters are accepted by some universities and not others — confirm acceptance in writing on each shortlisted programme's official page before relying on it."
    );
  }

  // ---------- marks ----------
  if (d.marks === "Below 50" || d.marks === "50–59") {
    checks.push(
      "Marks check: some Italian programmes and scholarship rankings consider academic marks, and competitive courses may set their own expectations. Verify minimums per programme and strengthen your file with a clear statement of purpose and relevant experience."
    );
  }

  // ---------- graduation gap ----------
  const year = parseInt(d.gradYear, 10);
  if (!Number.isNaN(year) && year <= 2021 && d.gradYear) {
    checks.push(
      "Study gap: with a graduation year of " +
        year +
        ", keep your CV current and be ready to explain your work or activities since graduating — some universities ask about gaps during pre-evaluation."
    );
  }

  // ---------- course directions ----------
  if (d.studyField && FIELD_DIRECTIONS[d.studyField]) courseDirections.push(FIELD_DIRECTIONS[d.studyField]);
  else if (d.field && FIELD_DIRECTIONS[d.field]) courseDirections.push(FIELD_DIRECTIONS[d.field]);
  else courseDirections.push(FIELD_DIRECTIONS.other);
  courseDirections.push(
    "Use the official Universitaly portal to search recognised programmes and start pre-enrolment — it is the Italian Ministry's official gateway for international students."
  );

  // ---------- scholarships & budget ----------
  const lowBudget = d.budget === "under-5000" || d.budget === "5000-8000";
  if (d.funding === "scholarship-essential" || lowBudget) {
    scholarshipPriorities.push(
      "Priority 1 — Regional Right-to-Study (DSU) scholarships: awarded by the region where you study (not the university), based mainly on family income. They can combine a tuition-fee waiver with a grant and housing/canteen services. Amounts, deadlines and income rules differ by region — always verify on the regional agency and Universitaly."
    );
    checks.push(
      "Budget reality check: as a rough guide, student living costs alone in Italy often fall around €7,000–€11,000 per year depending on the city and housing (an estimate, not a quote). With your stated budget, scholarship research and lower-cost cities should come first."
    );
  }
  if (d.funding !== "self-funded") {
    scholarshipPriorities.push(
      "Priority — Invest Your Talent in Italy (Italian Government / MAECI): a scholarship programme for selected countries including India, for specific Master's programmes. Check the current call, eligible courses and deadlines on the official site."
    );
    scholarshipPriorities.push(
      "Also research university-level merit scholarships and tuition waivers on each shortlisted university's official 'fees and scholarships' pages — these are programme-specific and never guaranteed."
    );
  } else {
    scholarshipPriorities.push(
      "Even when self-funding, check your eligibility for the regional DSU fee waiver — many students qualify for reduced tuition based on family income."
    );
  }

  // ---------- documents ----------
  documents.push(
    "Passport (valid well beyond your planned course end date).",
    "Academic transcripts / mark sheets for your completed qualification.",
    "Degree certificate or provisional certificate (or Class 12 certificate for Bachelor's applications).",
    "Curriculum Vitae (CV) in a clear European-style format.",
    "Statement of Purpose / motivation letter tailored to each programme.",
    "Letters of Recommendation (usually 1–2, where the programme asks for them)."
  );
  if (wantsEnglish && (d.englishStatus === "none-yet" || d.englishStatus === "ielts-below-5.5"))
    documents.push("English test result (IELTS/TOEFL) — still to obtain, see the checks above.");
  else if (wantsEnglish) documents.push("English proficiency proof (test score or MOI letter, as accepted by the programme).");
  if (d.funding !== "self-funded")
    documents.push(
      "Family income and asset documents for DSU/ISEE-equivalent assessment — these typically need translation and legalisation, so start early."
    );
  documents.push("Passport-size photographs and any programme-specific items (e.g. portfolio for Architecture/Design).");

  // ---------- next steps ----------
  nextSteps.push("Shortlist 4–6 programmes on Universitaly and each university's official site; note each deadline in one place.");
  nextSteps.push("Clear the language checks above before application windows open — test dates fill up.");
  if (d.funding !== "self-funded")
    nextSteps.push("Prepare your family income documents early; DSU scholarship calls have their own deadlines, separate from admission.");
  nextSteps.push("Complete pre-enrolment on Universitaly, then follow the student-visa instructions of the Embassy of Italy in New Delhi / your consulate.");
  nextSteps.push("Request a personalised review below if you want N92 Edu-Italia to check this plan with you — optional, and free.");

  return { factors, checks, courseDirections, scholarshipPriorities, documents, nextSteps };
}
