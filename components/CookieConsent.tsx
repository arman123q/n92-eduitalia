"use client";

import { useEffect, useState } from "react";
import { Cookie, ShieldCheck, X } from "lucide-react";

/**
 * GDPR cookie consent banner + Google Consent Mode v2 bridge
 * (added 31 Oct 2026).
 *
 * The root layout (app/layout.tsx) sets Consent Mode defaults to
 * DENIED for ad_storage, ad_user_data, ad_personalization and
 * analytics_storage before any Google tag loads. This banner is the
 * ONLY place consent can be granted:
 *  - No stored choice  -> banner shows; everything stays denied.
 *  - Visitor chooses   -> choice is stored in localStorage and pushed
 *    as a gtag('consent', 'update', ...) call.
 *  - Returning visitor -> the stored choice is re-applied on load.
 * Necessary cookies are always on and have no Consent Mode keys.
 * The footer "Cookie Settings" link reopens the preferences panel by
 * dispatching OPEN_COOKIE_SETTINGS_EVENT on window.
 */

export const OPEN_COOKIE_SETTINGS_EVENT = "n92:open-cookie-settings";
const STORAGE_KEY = "n92_cookie_consent_v1";

type Prefs = { analytics: boolean; advertising: boolean };

function gtag(...args: unknown[]) {
  if (typeof window === "undefined") return;
  const w = window as unknown as { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push(args);
}

function applyConsent(p: Prefs) {
  gtag("consent", "update", {
    analytics_storage: p.analytics ? "granted" : "denied",
    ad_storage: p.advertising ? "granted" : "denied",
    ad_user_data: p.advertising ? "granted" : "denied",
    ad_personalization: p.advertising ? "granted" : "denied",
  });
}

function loadStored(): Prefs | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const j = JSON.parse(raw) as Partial<Prefs>;
    return { analytics: !!j.analytics, advertising: !!j.advertising };
  } catch {
    return null;
  }
}

function store(p: Prefs) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ necessary: true, ...p, savedAt: new Date().toISOString() }),
    );
  } catch {
    /* storage unavailable: consent still applies for this page view */
  }
}

function Switch({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        checked ? "bg-[#103f35]" : "bg-[#103f35]/25"
      } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
          checked ? "left-[1.375rem]" : "left-0.5"
        }`}
      />
    </button>
  );
}

export default function CookieConsent() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [draft, setDraft] = useState<Prefs>({ analytics: false, advertising: false });

  useEffect(() => {
    setMounted(true);
    const stored = loadStored();
    if (stored) {
      setDraft(stored);
      applyConsent(stored); // re-apply the saved choice on every visit
    } else {
      setVisible(true);
    }
    const open = () => {
      const current = loadStored();
      if (current) setDraft(current);
      setCustomizing(true);
      setVisible(true);
    };
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, open);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, open);
  }, []);

  if (!mounted || !visible) return null;

  const choose = (p: Prefs) => {
    store(p);
    applyConsent(p);
    setVisible(false);
    setCustomizing(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] px-3 pb-3 sm:px-5 sm:pb-5">
      <div
        role="dialog"
        aria-label="Cookie consent"
        className="relative mx-auto max-w-3xl rounded-2xl border border-[#103f35]/15 bg-[#faf9f5] p-5 text-[#202824] shadow-2xl sm:p-6"
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#103f35]/10 text-[#103f35]">
            <Cookie size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-lg font-bold text-[#103f35]">Cookies on N92 Edu-Italia</h2>
            <p className="mt-1 text-sm leading-relaxed text-[#202824]/75">
              We use cookies to run this website, measure visits with Google Analytics and, if you allow
              it, support Google AdSense advertising. Analytics and advertising cookies stay{" "}
              <strong>off</strong> until you choose. Read our{" "}
              <a href="/privacy/" className="font-semibold text-[#103f35] underline decoration-[#c7a05a] decoration-2 underline-offset-2">
                Privacy Notice
              </a>
              .
            </p>
          </div>
        </div>

        {customizing ? (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-[#103f35]/10 bg-white px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-[#103f35]">Necessary cookies</p>
                <p className="text-xs text-[#202824]/65">Required for the website to work. Always active.</p>
              </div>
              <span className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-xs font-semibold text-[#103f35]">
                  <ShieldCheck size={14} aria-hidden="true" /> Always on
                </span>
                <Switch checked disabled label="Necessary cookies (always on)" />
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-[#103f35]/10 bg-white px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-[#103f35]">Analytics cookies</p>
                <p className="text-xs text-[#202824]/65">Google Analytics — helps us understand visits and improve the site.</p>
              </div>
              <Switch
                checked={draft.analytics}
                onChange={(v) => setDraft((d) => ({ ...d, analytics: v }))}
                label="Analytics cookies"
              />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-[#103f35]/10 bg-white px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-[#103f35]">Advertising cookies</p>
                <p className="text-xs text-[#202824]/65">Google AdSense — used for advertising and ad measurement.</p>
              </div>
              <Switch
                checked={draft.advertising}
                onChange={(v) => setDraft((d) => ({ ...d, advertising: v }))}
                label="Advertising cookies"
              />
            </div>
            <div className="flex flex-col gap-2 pt-1 sm:flex-row">
              <button type="button" className="btn-primary flex-1" onClick={() => choose(draft)}>
                Save My Preferences
              </button>
              <button
                type="button"
                className="btn-ghost flex-1"
                onClick={() => setCustomizing(false)}
              >
                Back
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <button type="button" className="btn-primary flex-1" onClick={() => choose({ analytics: true, advertising: true })}>
              Accept All
            </button>
            <button type="button" className="btn-ghost flex-1" onClick={() => choose({ analytics: false, advertising: false })}>
              Reject All
            </button>
            <button
              type="button"
              className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-[#103f35] underline decoration-[#c7a05a] decoration-2 underline-offset-4 hover:bg-[#103f35]/5"
              onClick={() => setCustomizing(true)}
            >
              Customize Preferences
            </button>
          </div>
        )}

        {customizing && (
          <button
            type="button"
            aria-label="Close cookie preferences"
            className="absolute right-3 top-3 hidden text-[#202824]/50 hover:text-[#103f35]"
            onClick={() => setVisible(false)}
          >
            <X size={18} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
