"use client";

import { useState } from "react";
import { validateLead } from "@/lib/eligibility";
import { submitLead, isBackendConfigured } from "@/lib/leads";

/**
 * Enquiry form for the service pages. Submits to the existing Supabase
 * leads system (insert-only under RLS), tagged with the service name so
 * the enquiry is identifiable in the admin Leads CRM.
 */
export default function ServiceEnquiryForm({
  service,
  submitLabel,
  heading,
}: {
  service: string;
  submitLabel: string;
  heading?: string;
}) {
  const [form, setForm] = useState({
    name: "", email: "", whatsapp: "", preferredContact: "whatsapp",
    intake: "2027", degreeLevel: "", message: "",
    consent: false, marketingConsent: false, website: "",
  });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [sending, setSending] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validateLead(form) as unknown as Record<string, string | undefined>;
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    setSending(true);
    const res = await submitLead({
      ...form,
      subjectInterest: service,
      summary: `Service enquiry: ${service}`,
    });
    setSending(false);
    setStatus(res);
  }

  return (
    <section className="panel mt-10 p-6 sm:p-8" aria-label={`Enquiry form — ${service}`}>
      <h2 className="font-display text-2xl font-bold text-[#103f35]">{heading || `Enquire — ${service}`}</h2>
      {!isBackendConfigured() && (
        <div className="mt-4 rounded-lg bg-amber-50 border border-amber-300 px-4 py-3 text-[0.88rem] text-amber-900" role="note">
          <strong>Demo mode:</strong> the enquiry database is not connected in this build yet, so this form saves
          only in your own browser and does <strong>not</strong> reach us. For a real response today, please use WhatsApp below.
        </div>
      )}
      {status ? (
        <div className={`mt-5 rounded-xl px-5 py-4 ${status.ok ? "bg-[#103f35]/8 border border-[#103f35]/25" : "bg-red-50 border border-red-300"}`} role="status">
          <p className="font-semibold">{status.ok ? "Enquiry recorded" : "Something went wrong"}</p>
          <p className="mt-1 text-[0.93rem]">{status.message}</p>
          <a className="btn-gold mt-5" href="https://wa.me/919452532786" target="_blank" rel="noopener noreferrer">Continue on WhatsApp</a>
        </div>
      ) : (
        <form className="mt-5 grid gap-4 sm:grid-cols-2" noValidate onSubmit={onSubmit}>
          <div>
            <label className="field-label" htmlFor={`sf-name-${service}`}>Full name *</label>
            <input id={`sf-name-${service}`} className="field-input" autoComplete="name" value={form.name} onChange={set("name")} aria-invalid={errors.name ? "true" : undefined} />
            {errors.name && <p className="field-error" role="alert">{errors.name}</p>}
          </div>
          <div>
            <label className="field-label" htmlFor={`sf-email-${service}`}>Email</label>
            <input id={`sf-email-${service}`} className="field-input" type="email" autoComplete="email" value={form.email} onChange={set("email")} />
          </div>
          <div>
            <label className="field-label" htmlFor={`sf-wa-${service}`}>WhatsApp (with country code)</label>
            <input id={`sf-wa-${service}`} className="field-input" type="tel" autoComplete="tel" value={form.whatsapp} onChange={set("whatsapp")} aria-invalid={errors.contact ? "true" : undefined} />
            {errors.contact && <p className="field-error" role="alert">{errors.contact}</p>}
          </div>
          <div>
            <label className="field-label" htmlFor={`sf-pref-${service}`}>Preferred contact method</label>
            <select id={`sf-pref-${service}`} className="field-input" value={form.preferredContact} onChange={set("preferredContact")}>
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
              <option value="call">Phone call</option>
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor={`sf-intake-${service}`}>Intended intake</label>
            <select id={`sf-intake-${service}`} className="field-input" value={form.intake} onChange={set("intake")}>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
              <option value="2028">2028</option>
              <option value="not-sure">Not sure yet</option>
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor={`sf-degree-${service}`}>Degree level (if applicable)</label>
            <select id={`sf-degree-${service}`} className="field-input" value={form.degreeLevel} onChange={set("degreeLevel")}>
              <option value="">Select…</option>
              <option value="bachelor">Bachelor's</option>
              <option value="master">Master's</option>
              <option value="single_cycle">Single-cycle Master's</option>
              <option value="phd">PhD</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="field-label" htmlFor={`sf-msg-${service}`}>Your message</label>
            <textarea id={`sf-msg-${service}`} className="field-input" rows={4} value={form.message} onChange={set("message")} placeholder="Tell us briefly what you need help with." />
          </div>
          <div className="hidden" aria-hidden="true">
            <label>Website<input type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} /></label>
          </div>
          <div className="sm:col-span-2 space-y-2 text-[0.9rem]">
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-[#103f35]" checked={form.consent} onChange={set("consent")} />
              <span>I agree that N92 Edu-Italia may process my details to respond to this enquiry, as described in the <a className="underline font-semibold" href="/privacy/">Privacy Notice</a>. *</span>
            </label>
            {errors.consent && <p className="field-error" role="alert">{errors.consent}</p>}
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-[#103f35]" checked={form.marketingConsent} onChange={set("marketingConsent")} />
              <span>Optional: also send me study-in-Italy updates and scholarship alerts.</span>
            </label>
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary w-full" disabled={sending}>
              {sending ? "Sending…" : submitLabel}
            </button>
            <p className="mt-3 text-[0.82rem] leading-relaxed text-[#202824]/55">
              Privacy note: we use your details only to respond to this enquiry. See our{" "}
              <a className="underline font-semibold" href="/privacy/">Privacy Notice</a>,{" "}
              <a className="underline font-semibold" href="/refund-policy/">Refund Policy</a> and{" "}
              <a className="underline font-semibold" href="/terms/">Terms</a>.
            </p>
          </div>
        </form>
      )}
    </section>
  );
}
