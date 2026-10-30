"use client";

import { OPEN_COOKIE_SETTINGS_EVENT } from "@/components/CookieConsent";

/** Footer "Cookie Settings" link: reopens the consent preferences
 *  panel (handled by CookieConsent, mounted in the root layout). */
export default function CookieSettingsLink() {
  return (
    <button
      type="button"
      className="hover:underline"
      onClick={() => window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT))}
    >
      Cookie Settings
    </button>
  );
}
