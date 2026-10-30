"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui";
import { useServiceContent } from "@/components/useServiceContent";
import { validateLead } from "@/lib/eligibility";
import { submitLead, isBackendConfigured } from "@/lib/leads";
import { CONSULT_DEFAULTS, type ConsultContent } from "@/lib/journeyContent";

export default function BookConsultationPage() {
  const c = useServiceContent<ConsultContent>("consultation", CONSULT_DEFAULTS);
  const services = String(c.services || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const [form, setForm] = useState({
    name: "", email: "", whatsapp: "", preferredContact: "whatsapp",
    service: "", date: "", time: "", message: "",
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
    if (!form.service) e.service = "Please choose the service you want to discuss.";
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    setSending(true);
    const when = [form.date, form.time].filter(Boolean).join(" at ");
    const res = await submitLead({
      name: form.name,
      email: form.email,
      whatsapp: form.whatsapp,
      preferredContact: form.preferredContact,
      subjectInterest: `Free Consultation — ${form.service}`,
      summary: "Free consultation request (preferred time is a request, not confirmed)",
      message: [when ? `Preferred consultation time: ${when}` : "No preferred time given", form.message]
        .filter(Boolean)
        .join("\n"),
      consent: form.consent,
      marketingConsent: form.marketingConsent,
      website: form.website,
    });
    setSending(false);
    setStatus(res);
  }

  return (
    <div className="pb-20">
      <PageHeader kicker="Consultation" title={c.heading} intro={c.intro} />
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        {!isBackendConfigured() && (
          <div className="mt-6 rounded-lg bg-amber-50 border border-amber-300 px-4 py-3 text-[0.88rem] text-amber-900" role="note">
            <strong>Demo mode:</strong> the enquiry database is not connected in this build yet, so this form saves
            only in your own browser and does <strong>not</strong> reach us. For a real response today, please use
            WhatsApp below.
          </div>
        )}
        {status ? (
          <div className={`mt-8 rounded-xl px-5 py-4 ${status.ok ? "bg-[#103f35]/8 border border-[#103f35]/25" : "bg-red-50 border border-red-300"}`} role="status">
            <p className="font-semibold">{status.ok ? "Consultation request recorded — thank you" : "Something went wrong"}</p>
            <p className="mt-1 text-[0.93rem]">{status.message}</p>
            {status.ok && <p className="mt-1 text-[0.93rem]">{c.note}</p>}
            <a className="btn-gold mt-5" href="https://wa.me/919452532786" target="_blank" rel="noopener noreferrer">Continue on WhatsApp</a>
          </div>
        ) : (
          <form className="panel mt-8 grid gap-4 p-6 sm:grid-cols-2 sm:p-8" noValidate onSubmit={onSubmit}>
            <div className="sm:col-span-2">
              <label className="field-label" htmlFor="bc-service">Which service do you want to discuss? *</label>
              <select id="bc-service" className="field-input" value={form.service} onChange={set("service")} aria-invalid={errors.service ? "true" : undefined}>
                <option value="">Select a service…</option>
                {services.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {errors.service && <p className="field-error" role="alert">{errors.service}</p>}
            </div>
            <div>
              <label className="field-label" htmlFor="bc-name">Full name *</label>
              <input id="bc-name" className="field-input" autoComplete="name" value={form.name} onChange={set("name")} aria-invalid={errors.name ? "true" : undefined} />
              {errors.name && <p className="field-error" role="alert">{errors.name}</p>}
            </div>
            <div>
              <label className="field-label" htmlFor="bc-email">Email</label>
              <input id="bc-email" className="field-input" type="email" autoComplete="email" value={form.email} onChange={set("email")} />
            </div>
            <div>
              <label className="field-label" htmlFor="bc-phone">Phone / WhatsApp (with country code)</label>
              <input id="bc-phone" className="field-input" type="tel" autoComplete="tel" value={form.whatsapp} onChange={set("whatsapp")} aria-invalid={errors.contact ? "true" : undefined} />
              {errors.contact && <p className="field-error" role="alert">{errors.contact}</p>}
            </div>
            <div>
              <label className="field-label" htmlFor="bc-pref">Preferred contact method</label>
              <select id="bc-pref" className="field-input" value={form.preferredContact} onChange={set("preferredContact")}>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
                <option value="call">Phone call</option>
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="bc-date">Preferred date</label>
              <input id="bc-date" className="field-input" type="date" value={form.date} onChange={set("date")} />
            </div>
            <div>
              <label className="field-label" htmlFor="bc-time">Preferred time</label>
              <input id="bc-time" className="field-input" type="time" value={form.time} onChange={set("time")} />
            </div>
            <div className="sm:col-span-2">
              <label className="field-label" htmlFor="bc-msg">Anything we should know beforehand?</label>
              <textarea id="bc-msg" className="field-input" rows={4} value={form.message} onChange={set("message")} placeholder="Your current education, target intake, questions…" />
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
                {sending ? "Sending…" : "Request My Free Consultation"}
              </button>
              <p className="mt-3 text-[0.82rem] leading-relaxed text-[#202824]/55">
                Privacy note: we use your details only to arrange and respond to this consultation request.{" "}
                {c.note} See our <a className="underline font-semibold" href="/privacy/">Privacy Notice</a>,{" "}
                <a className="underline font-semibold" href="/refund-policy/">Refund Policy</a> and{" "}
                <a className="underline font-semibold" href="/terms/">Terms</a>.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
