"use client";

import { useEffect, useRef, useState } from "react";
import {
  assess,
  validateStep,
  validateLead,
  QUALIFICATIONS,
  TARGET_DEGREES,
  MARKS_BANDS,
  ENGLISH_STATUSES,
  BUDGET_BANDS,
} from "@/lib/eligibility";
import { submitLead } from "@/lib/leads";
import type { LucideIcon } from "lucide-react";
import { Zap, GraduationCap, TriangleAlert, Compass, Award, FolderCheck, CircleCheck, ArrowLeft } from "lucide-react";

const FIELDS = [
  ["engineering-technology", "Engineering & Technology"],
  ["computer-science-data", "Computer Science & Data"],
  ["business-management", "Business & Management"],
  ["medicine-health", "Medicine & Health Sciences"],
  ["architecture-design", "Architecture & Design"],
  ["humanities-social", "Humanities & Social Sciences"],
  ["natural-sciences", "Natural Sciences"],
  ["law", "Law"],
  ["other", "Other / Not decided"],
];

const EMPTY = {
  degree: "",
  qualification: "",
  field: "",
  marks: "",
  gradYear: "",
  englishStatus: "",
  studyField: "",
  intake: "",
  teachingLanguage: "",
  budget: "",
  funding: "",
  uniType: "",
};

const STORAGE_KEY = "n92_assessment_v1";

function Field({ label, error, children, id }: { label: string; error?: string; children: React.ReactNode; id: string }) {
  return (
    <div>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      {children}
      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function Select({ id, value, onChange, error, children }: { id: string; value: string; onChange: (v: string) => void; error?: string; children: React.ReactNode }) {
  return (
    <select
      id={id}
      className="field-input"
      value={value}
      aria-invalid={error ? "true" : undefined}
      onChange={(e) => onChange(e.target.value)}
    >
      {children}
    </select>
  );
}

function ResultList({ title, items, icon: Icon }: { title: string; items: string[]; icon: LucideIcon }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="mt-5">
      <h4 className="font-display text-lg font-bold text-[#103f35] flex items-center gap-2">
        <Icon size={20} strokeWidth={1.8} className="text-[#103f35]" aria-hidden="true" /> {title}
      </h4>
      <ul className="mt-2 space-y-2 text-[0.93rem] leading-relaxed text-[#202824]">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2">
            <span aria-hidden="true" className="text-[#c7a05a] font-bold">
              •
            </span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Eligibility() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [lead, setLead] = useState({ name: "", email: "", whatsapp: "", consent: false, marketingConsent: false, website: "" });
  const [leadErrors, setLeadErrors] = useState<Record<string, string | undefined>>({});
  const [leadStatus, setLeadStatus] = useState<{ ok: boolean; mode: string; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // state preservation across refresh / navigation
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.data) {
          setData({ ...EMPTY, ...parsed.data });
          if (parsed.step >= 1 && parsed.step <= 4) setStep(parsed.step);
        }
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ data, step }));
    } catch {}
  }, [data, step]);

  const set = (key: string) => (value: string) => {
    setData((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  function goNext() {
    const e = validateStep(step, data) as unknown as Record<string, string | undefined>;
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    setStep(step + 1);
    requestAnimationFrame(() => headingRef.current?.focus());
  }
  function goBack() {
    setErrors({});
    setStep(step - 1);
    requestAnimationFrame(() => headingRef.current?.focus());
  }
  function restart() {
    setData(EMPTY);
    setErrors({});
    setLeadStatus(null);
    setStep(1);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  async function onLeadSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validateLead(lead) as unknown as Record<string, string | undefined>;
    setLeadErrors(e);
    if (Object.keys(e).length > 0) return;
    setSubmitting(true);
    const summary = `${(TARGET_DEGREES as Record<string, { label: string }>)[data.degree]?.label || data.degree} | ${data.studyField || data.field} | intake ${data.intake} | budget ${data.budget} | funding ${data.funding}`;
    const res = await submitLead({ ...lead, summary });
    setSubmitting(false);
    setLeadStatus(res);
  }

  const results = step === 4 ? assess(data) : null;
  const progressPct = step === 4 ? 100 : (step - 1) * 33 + 11;

  return (
    <section id="check" className="panel min-w-0 p-4 sm:p-8" aria-label="Eligibility assessment">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 ref={headingRef} tabIndex={-1} className="font-display text-[1.65rem] leading-tight font-bold text-[#103f35]">
            Check Your Eligibility
          </h2>
          <p className="mt-1 text-[0.92rem] text-[#202824]/75">
            Get instant, personalised recommendations for Italian universities, scholarships and next steps.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[#103f35]/8 px-3 py-1 text-xs font-bold text-[#103f35] border border-[#103f35]/15">
          Free
        </span>
      </div>

      {/* progress */}
      <div className="mt-5" aria-hidden={step === 4}>
        <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-2 text-[0.8rem] font-semibold text-[#103f35] sm:gap-2">
          {["Profile", "Preferences", "Finance", "Results"].map((label, i) => {
            const n = i + 1;
            const active = step === n;
            const done = step > n;
            return (
              <li key={label} className="flex items-center gap-1.5 sm:gap-2">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.72rem] font-bold ${
                    active
                      ? "bg-[#103f35] text-white"
                      : done
                        ? "bg-[#c7a05a] text-[#0b2e27]"
                        : "bg-[#103f35]/10 text-[#103f35]/60"
                  }`}
                >
                  {done ? "✓" : n}
                </span>
                <span className={`${active ? "" : "hidden min-[480px]:inline"} ${active ? "" : "text-[#103f35]/55"}`}>{label}</span>
                {n < 4 && <span className="mx-0.5 h-px w-3 sm:mx-1 sm:w-7 bg-[#103f35]/20" aria-hidden="true" />}
              </li>
            );
          })}
        </ol>
        <div className="mt-3 h-1.5 rounded-full bg-[#103f35]/10" role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100} aria-label="Assessment progress">
          <div className="h-full rounded-full bg-[#c7a05a] transition-all duration-500" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {step === 1 && (
        <form className="mt-6" noValidate onSubmit={(e) => { e.preventDefault(); goNext(); }}>
          <fieldset>
            <legend className="sr-only">Step 1 — Academic profile</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="I want to study" id="f-degree" error={errors.degree}>
                <Select id="f-degree" value={data.degree} onChange={set("degree")} error={errors.degree}>
                  <option value="">Select degree level</option>
                  {Object.entries(TARGET_DEGREES).map(([v, o]) => (
                    <option key={v} value={v}>{o.label}</option>
                  ))}
                </Select>
              </Field>
              <Field label="My current qualification" id="f-qual" error={errors.qualification}>
                <Select id="f-qual" value={data.qualification} onChange={set("qualification")} error={errors.qualification}>
                  <option value="">Select qualification</option>
                  {Object.entries(QUALIFICATIONS).map(([v, o]) => (
                    <option key={v} value={v}>{o.label}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Academic marks (approx.)" id="f-marks" error={errors.marks}>
                <Select id="f-marks" value={data.marks} onChange={set("marks")} error={errors.marks}>
                  <option value="">Select marks band</option>
                  {MARKS_BANDS.map((m) => (
                    <option key={m} value={m}>{m}%</option>
                  ))}
                </Select>
              </Field>
              <Field label="My academic field" id="f-field">
                <Select id="f-field" value={data.field} onChange={set("field")}>
                  <option value="">Select field (optional)</option>
                  {FIELDS.map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Graduation year" id="f-year">
                <input
                  id="f-year"
                  className="field-input"
                  type="number"
                  min="1980"
                  max="2030"
                  placeholder="e.g. 2024 (optional)"
                  value={data.gradYear}
                  onChange={(e) => set("gradYear")(e.target.value)}
                />
              </Field>
            </div>
          </fieldset>
          <button type="submit" className="btn-primary mt-6 w-full">
            Continue <span aria-hidden="true">→</span>
          </button>
        </form>
      )}

      {step === 2 && (
        <form className="mt-6" noValidate onSubmit={(e) => { e.preventDefault(); goNext(); }}>
          <fieldset>
            <legend className="sr-only">Step 2 — Language and study preferences</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="English / language status" id="f-eng" error={errors.englishStatus}>
                <Select id="f-eng" value={data.englishStatus} onChange={set("englishStatus")} error={errors.englishStatus}>
                  <option value="">Select status</option>
                  {Object.entries(ENGLISH_STATUSES).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Preferred teaching language" id="f-lang" error={errors.teachingLanguage}>
                <Select id="f-lang" value={data.teachingLanguage} onChange={set("teachingLanguage")} error={errors.teachingLanguage}>
                  <option value="">Select language</option>
                  <option value="english">English-taught</option>
                  <option value="italian">Italian-taught</option>
                  <option value="either">Either is fine</option>
                </Select>
              </Field>
              <Field label="Preferred study field" id="f-sfield">
                <Select id="f-sfield" value={data.studyField} onChange={set("studyField")}>
                  <option value="">Select field (optional)</option>
                  {FIELDS.map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Preferred intake" id="f-intake" error={errors.intake}>
                <Select id="f-intake" value={data.intake} onChange={set("intake")} error={errors.intake}>
                  <option value="">Select intake year</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                  <option value="2028">2028</option>
                </Select>
              </Field>
            </div>
          </fieldset>
          <div className="mt-6 flex gap-3">
            <button type="button" className="btn-ghost flex-1 inline-flex items-center justify-center gap-1.5" onClick={goBack}><ArrowLeft size={16} aria-hidden="true" /> Back</button>
            <button type="submit" className="btn-primary flex-[2]">Continue →</button>
          </div>
        </form>
      )}

      {step === 3 && (
        <form className="mt-6" noValidate onSubmit={(e) => { e.preventDefault(); goNext(); }}>
          <fieldset>
            <legend className="sr-only">Step 3 — Financial profile</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Budget per year" id="f-budget" error={errors.budget}>
                <Select id="f-budget" value={data.budget} onChange={set("budget")} error={errors.budget}>
                  <option value="">Select budget</option>
                  {Object.entries(BUDGET_BANDS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Funding preference" id="f-funding" error={errors.funding}>
                <Select id="f-funding" value={data.funding} onChange={set("funding")} error={errors.funding}>
                  <option value="">Select preference</option>
                  <option value="scholarship-essential">Scholarship is essential</option>
                  <option value="scholarship-preferred">Scholarship preferred</option>
                  <option value="self-funded">Self-funded</option>
                </Select>
              </Field>
              <Field label="Preferred university type" id="f-unitype">
                <Select id="f-unitype" value={data.uniType} onChange={set("uniType")}>
                  <option value="">No preference</option>
                  <option value="public">Public universities</option>
                  <option value="private">Private universities</option>
                </Select>
              </Field>
            </div>
          </fieldset>
          <div className="mt-6 flex gap-3">
            <button type="button" className="btn-ghost flex-1 inline-flex items-center justify-center gap-1.5" onClick={goBack}><ArrowLeft size={16} aria-hidden="true" /> Back</button>
            <button type="submit" className="btn-gold flex-[2]">Show My Results →</button>
          </div>
          <p className="mt-4 text-center text-[0.8rem] text-[#202824]/60">
            <Zap size={13} className="inline -mt-0.5 text-[#c7a05a]" aria-hidden="true" /> Instant preliminary guidance · 100% free · No obligation · Your answers stay in your browser
          </p>
        </form>
      )}

      {step === 4 && results && (
        <div className="mt-6">
          <div className="rounded-xl border border-[#c7a05a]/50 bg-[#faf6ea] px-4 py-3 text-[0.85rem] leading-relaxed">
            <strong className="text-[#103f35]">Preliminary assessment.</strong> This guidance is based only on the
            answers you gave. It is not an admission decision and does not guarantee admission, a scholarship or a
            visa. Always verify requirements on{" "}
            <a className="underline font-semibold" href="https://www.universitaly.it/" target="_blank" rel="noopener noreferrer">
              Universitaly
            </a>{" "}
            and official university pages.
          </div>

          <ResultList title="What we see in your profile" items={results.factors} icon={GraduationCap} />
          {results.checks.length > 0 && <ResultList title="Requirements to check" items={results.checks} icon={TriangleAlert} />}
          <ResultList title="Course-search directions" items={results.courseDirections} icon={Compass} />
          <ResultList title="Scholarship research priorities" items={results.scholarshipPriorities} icon={Award} />
          <ResultList title="Documents to prepare" items={results.documents} icon={FolderCheck} />
          <ResultList title="Your next steps" items={results.nextSteps} icon={CircleCheck} />

          <div className="mt-7 border-t border-[#103f35]/10 pt-6">
            <h3 className="font-display text-xl font-bold text-[#103f35]">Request a Personalised Review (optional)</h3>
            <p className="mt-1 text-[0.9rem] text-[#202824]/75">
              Want N92 Edu-Italia to review this plan with you? Leave one way to reach you. Browsing and this
              assessment never require your contact details.
            </p>
            <div className="mt-3 rounded-lg bg-amber-50 border border-amber-300 px-3 py-2 text-[0.82rem] text-amber-900" role="note">
              <strong>Demo mode:</strong> in this build stage the enquiry database is not connected, so submissions
              are stored only in your own browser and are <strong>not sent</strong> to N92 Edu-Italia. For an
              immediate response, message us on WhatsApp.
            </div>
            {leadStatus ? (
              <div className={`mt-4 rounded-lg px-4 py-3 text-[0.9rem] ${leadStatus.ok ? "bg-[#103f35]/8 border border-[#103f35]/25" : "bg-red-50 border border-red-300"}`} role="status">
                {leadStatus.message}
              </div>
            ) : (
              <form className="mt-4 grid gap-4 sm:grid-cols-2" noValidate onSubmit={onLeadSubmit}>
                <Field label="Full name" id="l-name" error={leadErrors.name}>
                  <input id="l-name" className="field-input" type="text" autoComplete="name" value={lead.name}
                    aria-invalid={leadErrors.name ? "true" : undefined}
                    onChange={(e) => setLead((l) => ({ ...l, name: e.target.value }))} />
                </Field>
                <Field label="Email" id="l-email">
                  <input id="l-email" className="field-input" type="email" autoComplete="email" value={lead.email}
                    onChange={(e) => setLead((l) => ({ ...l, email: e.target.value }))} />
                </Field>
                <Field label="WhatsApp number" id="l-wa" error={leadErrors.contact}>
                  <input id="l-wa" className="field-input" type="tel" autoComplete="tel" value={lead.whatsapp}
                    aria-invalid={leadErrors.contact ? "true" : undefined}
                    onChange={(e) => setLead((l) => ({ ...l, whatsapp: e.target.value }))} />
                </Field>
                {/* honeypot — hidden from people, tempting to bots */}
                <div className="hidden" aria-hidden="true">
                  <label>
                    Website
                    <input type="text" tabIndex={-1} autoComplete="off" value={lead.website}
                      onChange={(e) => setLead((l) => ({ ...l, website: e.target.value }))} />
                  </label>
                </div>
                <div className="sm:col-span-2 space-y-2 text-[0.88rem]">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" className="mt-1 h-4 w-4 accent-[#103f35]" checked={lead.consent}
                      onChange={(e) => setLead((l) => ({ ...l, consent: e.target.checked }))} />
                    <span>
                      I agree that N92 Edu-Italia may process my details to respond to this enquiry, as described in
                      the <a className="underline font-semibold" href="/privacy/">Privacy Notice</a>. *
                    </span>
                  </label>
                  {leadErrors.consent && <p className="field-error" role="alert">{leadErrors.consent}</p>}
                  {leadErrors.contact && <p className="field-error" role="alert">{leadErrors.contact}</p>}
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" className="mt-1 h-4 w-4 accent-[#103f35]" checked={lead.marketingConsent}
                      onChange={(e) => setLead((l) => ({ ...l, marketingConsent: e.target.checked }))} />
                    <span>Optional: also send me occasional study-in-Italy updates and scholarship alerts.</span>
                  </label>
                </div>
                <button type="submit" className="btn-primary sm:col-span-2" disabled={submitting}>
                  {submitting ? "Sending…" : "Request My Personalised Review"}
                </button>
              </form>
            )}
            <button type="button" className="btn-ghost mt-5" onClick={restart}>
              Start a new assessment
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
