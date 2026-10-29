/**
 * Runtime data layer.
 * Source of truth = Supabase (published rows only, enforced by RLS) when the
 * project is configured. Until then — or if a fetch fails — the bundled seed
 * snapshot is used and callers receive source:"seed" so the UI can label the
 * state honestly (spec §19: never pretend demo/seed data is live data).
 */
import seed from "@/data/seed.json";
import { restSelect, isDbConfigured } from "@/lib/supabase";
import type { University, Course, Scholarship, Faq, CalculatorDefaults } from "@/lib/types";

export type DataSource = "database" | "seed";
export interface DataResult<T> {
  rows: T[];
  source: DataSource;
}

function snakeToCamel(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = v;
  }
  return out;
}

async function fetchTable<T>(table: string, seedRows: T[], orderBy = "name"): Promise<DataResult<T>> {
  if (isDbConfigured()) {
    const rows = await restSelect<Record<string, unknown>>(
      table,
      `select=*&status=eq.published&order=${orderBy}.asc`
    );
    if (rows && rows.length > 0) {
      return { rows: rows.map((r) => snakeToCamel(r) as unknown as T), source: "database" };
    }
  }
  return { rows: seedRows, source: "seed" };
}

export function getUniversities(): Promise<DataResult<University>> {
  return fetchTable<University>("universities", seed.universities as University[]);
}
export function getCourses(): Promise<DataResult<Course>> {
  return fetchTable<Course>("courses", seed.courses as Course[]);
}
export function getScholarships(): Promise<DataResult<Scholarship>> {
  return fetchTable<Scholarship>("scholarships", seed.scholarships as Scholarship[]);
}
export function getFaqs(): Promise<DataResult<Faq>> {
  return fetchTable<Faq>("faqs", seed.faqs as Faq[], "question");
}
export async function getCalculatorDefaults(): Promise<{ value: CalculatorDefaults; source: DataSource }> {
  if (isDbConfigured()) {
    const rows = await restSelect<Record<string, unknown>>("calculator_settings", "select=value&limit=1");
    if (rows && rows.length > 0 && rows[0].value) {
      return { value: rows[0].value as unknown as CalculatorDefaults, source: "database" };
    }
  }
  return { value: seed.calculator as unknown as CalculatorDefaults, source: "seed" };
}

export function universityBySlug(rows: University[], slug: string | null): University | undefined {
  return rows.find((u) => u.slug === slug);
}

/** Published CMS content for a key (site_content). Null when unpublished/unconfigured. */
export async function getSiteContent<T>(key: string): Promise<T | null> {
  if (!isDbConfigured()) return null;
  const rows = await restSelect<{ published: T | null }>(
    "site_content",
    `select=published&key=eq.${encodeURIComponent(key)}&limit=1`
  );
  if (rows && rows.length > 0 && rows[0].published) return rows[0].published;
  return null;
}
export function courseBySlug(rows: Course[], slug: string | null): Course | undefined {
  return rows.find((c) => c.slug === slug);
}
export function scholarshipBySlug(rows: Scholarship[], slug: string | null): Scholarship | undefined {
  return rows.find((s) => s.slug === slug);
}
