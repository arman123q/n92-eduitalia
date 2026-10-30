"use client";

/**
 * Guidance Assistant — a deterministic FAQ search over admin-approved
 * knowledge entries. It is NOT an AI model and is labelled accordingly
 * (spec §10). Answers come only from the published FAQ data; when nothing
 * matches, it says so and routes the student to a human.
 */
import { useEffect, useRef, useState } from "react";
import { getFaqs } from "@/lib/data";
import type { Faq } from "@/lib/types";

interface Msg {
  from: "user" | "assistant";
  text: string;
  sourceUrl?: string;
}

const SUGGESTED = [
  "Do I need IELTS to study in Italy?",
  "What are DSU regional scholarships?",
  "How much does it cost to study in Italy for a year?",
  "How does the student visa process work?",
  "Which documents should I prepare first?",
];

function score(faq: Faq, query: string): number {
  const words = query.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  const hay = `${faq.question} ${faq.answer} ${faq.category}`.toLowerCase();
  return words.reduce((n, w) => n + (hay.includes(w) ? 1 : 0), 0);
}

export default function Counsellor() {
  const [open, setOpen] = useState(false);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      from: "assistant",
      text: "Hello! I am the N92 Guidance Assistant. I answer from our approved, source-linked guidance notes — I am a rules-based helper, not an AI counsellor, and I never guess about admissions, visas or scholarships. Try one of the suggested questions, or type your own.",
    },
  ]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && faqs.length === 0) getFaqs().then((f) => setFaqs(f.rows)).catch(() => {});
  }, [open, faqs.length]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, open]);

  function ask(text: string) {
    const q = text.trim();
    if (!q) return;
    const ranked = faqs.map((f) => ({ f, s: score(f, q) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s);
    const reply: Msg =
      ranked.length > 0
        ? { from: "assistant", text: ranked[0].f.answer, sourceUrl: ranked[0].f.sourceUrl }
        : {
            from: "assistant",
            text: "I don't have an approved answer for that yet, and I won't guess — wrong guidance on admissions or visas can cost you a year. Please ask us directly on WhatsApp (+91 94525 32786) and a human will answer. You can also browse the FAQ page.",
          };
    setMsgs((m) => [...m, { from: "user", text: q }, reply]);
    setInput("");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-50 flex items-center gap-2 rounded-full bg-[#103f35] px-4 py-3 sm:px-5 sm:py-3.5 font-semibold text-white shadow-2xl border border-[#c7a05a]/60 hover:bg-[#1a5747]"
      >
        <span aria-hidden="true">💬</span> <span className="hidden sm:inline">{open ? "Close assistant" : "Guidance Assistant"}</span><span className="sr-only sm:hidden">{open ? "Close assistant" : "Open Guidance Assistant"}</span>
      </button>
      {open && (
        <section
          aria-label="Guidance Assistant chat"
          className="fixed bottom-24 right-4 left-4 sm:left-auto sm:w-[24rem] z-50 flex max-h-[70vh] flex-col overflow-hidden rounded-2xl border border-[#103f35]/20 bg-white shadow-2xl"
        >
          <header className="bg-[#103f35] px-5 py-3.5 text-white">
            <p className="font-display font-bold">Guidance Assistant</p>
            <p className="text-[0.75rem] text-white/70">Rules-based guidance from approved notes — not an AI model.</p>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {msgs.map((m, i) => (
              <div key={i} className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[0.88rem] leading-relaxed ${m.from === "user" ? "ml-auto bg-[#103f35] text-white" : "bg-[#faf9f5] border border-[#103f35]/12 text-[#202824]"}`}>
                <p>{m.text}</p>
                {m.sourceUrl && (
                  <a className="mt-1.5 inline-block font-semibold underline" href={m.sourceUrl} target="_blank" rel="noopener noreferrer">
                    Official source ↗
                  </a>
                )}
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <div className="border-t border-[#103f35]/10 px-4 py-3">
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED.map((s) => (
                <button key={s} type="button" onClick={() => ask(s)} className="rounded-full border border-[#103f35]/25 px-2.5 py-1 text-[0.72rem] font-medium text-[#103f35] hover:bg-[#103f35]/5">
                  {s}
                </button>
              ))}
            </div>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                ask(input);
              }}
            >
              <input className="field-input flex-1" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your question…" aria-label="Your question" />
              <button type="submit" className="btn-primary !px-4">Ask</button>
            </form>
            <button type="button" className="mt-2 text-[0.75rem] font-semibold text-[#103f35] underline" onClick={() => setMsgs(msgs.slice(0, 1))}>
              Reset conversation
            </button>
          </div>
        </section>
      )}
    </>
  );
}
