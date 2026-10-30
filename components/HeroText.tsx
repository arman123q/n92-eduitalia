"use client";

import { useEffect, useState } from "react";
import { getSiteContent } from "@/lib/data";

interface HeroContent {
  headlineA: string;
  headlineB: string;
  subtext: string;
  primaryCta: string;
  secondaryCta: string;
}

const DEFAULTS: HeroContent = {
  headlineA: "Your Italian Dream.",
  headlineB: "A Clearer Plan.",
  subtext:
    "Discover suitable Italian universities, explore scholarship opportunities and plan your next steps with personalised study guidance.",
  primaryCta: "Check My Eligibility",
  secondaryCta: "Explore Universities",
};

/** Hero copy — editable in Admin → Website Content; built-in copy is the fallback. */
export default function HeroText() {
  const [c, setC] = useState<HeroContent>(DEFAULTS);
  useEffect(() => {
    getSiteContent<Partial<HeroContent>>("home_hero").then((v) => {
      if (v) setC({ ...DEFAULTS, ...v });
    }).catch(() => {});
  }, []);

  return (
    <div className="min-w-0 pt-2 lg:pt-8">
      <p className="kicker !text-[#e7d3a1]">Study · Plan · Grow in Italy</p>
      <h1 className="font-display mt-4 text-[clamp(2.05rem,10vw,2.7rem)] leading-[1.08] font-black text-[#faf9f5] [text-shadow:0_2px_18px_rgba(8,38,31,0.55)] sm:text-6xl lg:text-[4.2rem]">
        {c.headlineA}
        <span className="block text-[#e7d3a1]">{c.headlineB}</span>
      </h1>
      <p className="mt-5 max-w-xl text-lg leading-relaxed text-[#faf9f5]/90">{c.subtext}</p>
      <div className="mt-7 flex flex-wrap gap-3">
        <a href="/eligibility/" className="btn-gold">
          {c.primaryCta} <span aria-hidden="true">→</span>
        </a>
        <a href="/universities/" className="btn-ghost !border-[#faf9f5]/60 !text-[#faf9f5] hover:!bg-white/10">
          {c.secondaryCta}
        </a>
      </div>
      <p className="mt-5 text-sm leading-relaxed text-[#faf9f5]/70">
        For Indian students &amp; parents · Intake focus 2027–28 · No guaranteed-admission claims — honest
        guidance only.
      </p>
    </div>
  );
}
