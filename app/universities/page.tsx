"use client";

import { useEffect, useMemo, useState } from "react";
import { getUniversities, getCourses, type DataSource } from "@/lib/data";
import type { University, Course } from "@/lib/types";
import { PageHeader, VerifyBadge, DataNotice, SUBJECT_LABELS, LEVEL_LABELS } from "@/components/ui";

export default function UniversitiesPage() {
  const [unis, setUnis] = useState<University[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [source, setSource] = useState<DataSource>("seed");
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("");
  const [level, setLevel] = useState("");
  const [subject, setSubject] = useState("");
  const [language, setLanguage] = useState("");
  const [sort, setSort] = useState("name");

  useEffect(() => {
    (async () => {
      const [u, c] = await Promise.all([getUniversities(), getCourses()]);
      setUnis(u.rows);
      setCourses(c.rows);
      setSource(u.source);
      setLoading(false);
    })();
  }, []);

  const regions = useMemo(() => [...new Set(unis.map((u) => u.region))].sort(), [unis]);
  const courseCount = useMemo(() => {
    const m = new Map<string, number>();
    courses.forEach((c) => m.set(c.universityId, (m.get(c.universityId) || 0) + 1));
    return m;
  }, [courses]);

  const filtered = useMemo(() => {
    let rows = unis.filter(
      (u) =>
        (!q || `${u.name} ${u.city} ${u.region}`.toLowerCase().includes(q.toLowerCase())) &&
        (!region || u.region === region) &&
        (!level || u.degreeLevels.includes(level)) &&
        (!subject || u.subjects.includes(subject)) &&
        (!language || u.languages.includes(language))
    );
    rows = [...rows].sort((a, b) => (sort === "city" ? a.city.localeCompare(b.city) : a.name.localeCompare(b.name)));
    return rows;
  }, [unis, q, region, level, subject, language, sort]);

  const reset = () => {
    setQ(""); setRegion(""); setLevel(""); setSubject(""); setLanguage("");
  };

  return (
    <div className="pb-20">
      <PageHeader
        kicker="Directory"
        title="Universities in Italy"
        intro="Real Italian universities with links to their official websites. Programme details, fees and deadlines are always confirmed on the official pages — records marked “Needs review” are starter records awaiting a fresh official check."
      />
      <DataNotice source={source} />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mt-8 grid gap-3 rounded-2xl border border-[#103f35]/12 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6">
          <input className="field-input lg:col-span-2" type="search" placeholder="Search university or city…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search universities" />
          <select className="field-input" value={region} onChange={(e) => setRegion(e.target.value)} aria-label="Filter by region">
            <option value="">All regions</option>
            {regions.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select className="field-input" value={level} onChange={(e) => setLevel(e.target.value)} aria-label="Filter by degree level">
            <option value="">All levels</option>
            {Object.entries(LEVEL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select className="field-input" value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Filter by subject">
            <option value="">All subjects</option>
            {Object.entries(SUBJECT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select className="field-input" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort results">
            <option value="name">Sort: Name A–Z</option>
            <option value="city">Sort: City A–Z</option>
          </select>
          <select className="field-input" value={language} onChange={(e) => setLanguage(e.target.value)} aria-label="Filter by language">
            <option value="">Any language</option>
            <option value="english">Has English programmes</option>
            <option value="italian">Has Italian programmes</option>
          </select>
          <button type="button" className="btn-ghost" onClick={reset}>Reset filters</button>
        </div>

        {loading ? (
          <p className="mt-10 text-[#202824]/60" role="status">Loading universities…</p>
        ) : filtered.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-[#103f35]/25 p-10 text-center">
            <p className="font-display text-xl font-bold text-[#103f35]">No universities match those filters</p>
            <p className="mt-2 text-[#202824]/70">Try widening your search — or browse programmes directly on Universitaly.</p>
            <button type="button" className="btn-primary mt-5" onClick={reset}>Clear all filters</button>
          </div>
        ) : (
          <>
            <p className="mt-6 text-sm text-[#202824]/60">{filtered.length} {filtered.length === 1 ? "university" : "universities"}</p>
            <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((u) => (
                <article key={u.id} className="card flex flex-col p-6">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-display text-xl font-bold leading-snug text-[#103f35]">{u.name}</h2>
                    <VerifyBadge status={u.verificationStatus} />
                  </div>
                  <p className="mt-1.5 text-sm font-medium text-[#202824]/70">📍 {u.city} · {u.region} · {u.type}</p>
                  <p className="mt-3 flex flex-wrap gap-1.5">
                    {u.subjects.slice(0, 3).map((s) => (
                      <span key={s} className="rounded-full bg-[#103f35]/6 px-2.5 py-1 text-[0.72rem] font-semibold text-[#103f35]">{SUBJECT_LABELS[s] || s}</span>
                    ))}
                  </p>
                  <p className="mt-3 text-[0.85rem] text-[#202824]/65">
                    Levels: {u.degreeLevels.map((l) => LEVEL_LABELS[l]).join(" · ")}
                    {courseCount.get(u.id) ? ` · ${courseCount.get(u.id)} listed courses` : ""}
                  </p>
                  <div className="mt-auto pt-5 flex gap-2">
                    <a className="btn-primary flex-1 !py-2.5 text-sm" href={`/universities/detail/?slug=${u.slug}`}>View details</a>
                    <a className="btn-ghost !py-2.5 text-sm" href={u.website} target="_blank" rel="noopener noreferrer">Official site ↗</a>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
