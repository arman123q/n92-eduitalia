/**
 * Lead submission for enquiry forms (eligibility review + contact page).
 *
 * LIVE mode (Supabase configured): inserts into the `leads` table via
 * PostgREST. The public key may INSERT only (RLS) — it cannot read leads.
 * Success is reported ONLY when the server confirms the insert.
 *
 * DEMO mode (not configured): the enquiry is stored only in this visitor's
 * browser and the UI states clearly that nothing was sent.
 */

import { SUPABASE_URL, SUPABASE_ANON_KEY, isDbConfigured } from "@/lib/supabase";

const DEMO_KEY = "n92_demo_enquiries";

export function isBackendConfigured() {
  return isDbConfigured();
}

/**
 * @param {object} lead full lead shape (see supabase/schema.sql → leads)
 * @returns {Promise<{ok:boolean, mode:'demo'|'supabase', message:string}>}
 */
export async function submitLead(lead) {
  if (!isDbConfigured()) {
    try {
      const existing = JSON.parse(localStorage.getItem(DEMO_KEY) || "[]");
      existing.push({ ...lead, consent: undefined, submittedAt: new Date().toISOString() });
      localStorage.setItem(DEMO_KEY, JSON.stringify(existing));
    } catch {
      /* storage unavailable — the demo message below still tells the truth */
    }
    return {
      ok: true,
      mode: "demo",
      message:
        "Demo mode: your enquiry has been stored only in this browser. It has NOT been sent to N92 Edu-Italia, because the secure enquiry database is not connected yet. For an immediate response, message us on WhatsApp (+91 94525 32786).",
    };
  }

  let res;
  try {
    res = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify([
        {
          name: lead.name,
          email: lead.email || null,
          whatsapp: lead.whatsapp || null,
          phone: lead.phone || null,
          preferred_contact: lead.preferredContact || null,
          intake: lead.intake || null,
          degree_level: lead.degreeLevel || null,
          subject_interest: lead.subjectInterest || null,
          budget_range: lead.budgetRange || null,
          summary: lead.summary || null,
          message: lead.message || null,
          consent: Boolean(lead.consent),
          marketing_consent: Boolean(lead.marketingConsent),
        },
      ]),
    });
  } catch {
    res = null;
  }
  if (!res || !res.ok) {
    return {
      ok: false,
      mode: "supabase",
      message:
        "Your enquiry could not be saved just now — please try again, or message us on WhatsApp (+91 94525 32786) and we will take it from there.",
    };
  }
  return {
    ok: true,
    mode: "supabase",
    message: "Thank you — your enquiry has been received and saved. N92 Edu-Italia will contact you shortly.",
  };
}

export function readDemoLeads() {
  try {
    return JSON.parse(localStorage.getItem(DEMO_KEY) || "[]");
  } catch {
    return [];
  }
}
