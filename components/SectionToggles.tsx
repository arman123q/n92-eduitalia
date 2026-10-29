"use client";

import { useEffect } from "react";
import { getSiteContent } from "@/lib/data";

const MAP: Record<string, string> = {
  showWhyItaly: "why-italy",
  showProcess: "process",
  showScholarships: "scholarships",
  showFaq: "faq",
};

/** Applies the admin's published homepage section toggles (Admin → Website Content). */
export default function SectionToggles() {
  useEffect(() => {
    getSiteContent<Record<string, boolean>>("home_sections").then((v) => {
      if (!v) return;
      for (const [key, id] of Object.entries(MAP)) {
        if (v[key] === false) {
          const el = document.getElementById(id);
          if (el) el.style.display = "none";
        }
      }
    }).catch(() => {});
  }, []);
  return null;
}
