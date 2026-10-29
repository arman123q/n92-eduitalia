"use client";

import { useEffect, useMemo, useState } from "react";
import { getFaqs, type DataSource } from "@/lib/data";
import type { Faq } from "@/lib/types";
import { PageHeader, DataNotice } from "@/components/ui";

export default function FaqPage() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [source, setSource] = useState<DataSource>("seed");
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const f = await getFaqs();
      setFaqs(f.rows);
      setSource(f.source);
    })();
  }, []);

  const filtered = useMemo(
    () => faqs.filter((f) => !q || `${f.question} ${f.answer}`.toLowerCase().includes(q.toLowerCase())),
    [faqs, q]
  );
  const categories = useMemo(() => [...new Set(filtered.map((f) => f.category))], [filtered]);

  return (
    <div className="pb-20">
      <PageHeader
        kicker="Questions"
        title="Frequently asked questions"
        intro="Straight answers, grounded in official sources. If your question is not here, ask the Guidance Assistant (bottom-right) or message us on WhatsApp."
      />
      <DataNotice source={source} />
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <input className="field-input mt-8" type="search" placeholder="Search questions…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search FAQs" />
        {filtered.length === 0 ? (
          <p className="mt-8 text-[#202824]/70">No matching questions. Try different words, or ask us directly on WhatsApp.</p>
        ) : (
          categories.map((cat) => (
            <section key={cat} className="mt-9">
              <h2 className="font-display text-xl font-bold text-[#103f35]">{cat}</h2>
              <div className="mt-3 divide-y divide-[#103f35]/10 rounded-2xl border border-[#103f35]/10 bg-white px-5">
                {filtered.filter((f) => f.category === cat).map((f) => (
                  <details key={f.id} className="group py-4">
                    <summary className="cursor-pointer list-none font-display text-lg font-bold text-[#103f35] flex items-center justify-between gap-4">
                      {f.question}
                      <span aria-hidden="true" className="text-[#c7a05a] transition-transform group-open:rotate-45 text-2xl leading-none">+</span>
                    </summary>
                    <p className="mt-2.5 leading-relaxed text-[#202824]/80">{f.answer}</p>
                    {f.sourceUrl && (
                      <p className="mt-2 text-sm">
                        <a className="underline font-semibold" href={f.sourceUrl} target="_blank" rel="noopener noreferrer">Official source ↗</a>
                      </p>
                    )}
                  </details>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
