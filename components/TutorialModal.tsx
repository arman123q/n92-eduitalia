"use client";

/**
 * "How to Use This Guide" — the tutorial modal. Fetches the
 * admin-managed tutorial AT RUNTIME (lib/tutorial) every time it
 * opens, so admin changes apply without a redeployment. Renders:
 *  - YouTube via a youtube-nocookie embed (URL normalised by
 *    lib/video-url.js — the same parser the admin preview uses)
 *  - direct media files via a native <video> element
 *  - any other HTTPS URL as a safe external-link card (arbitrary
 *    iframes are never embedded)
 *  - a polished empty state when nothing is published — never a
 *    broken player.
 */
import { useEffect, useState } from "react";
import { ExternalLink, Play, X } from "lucide-react";
import { fetchTutorial, type TutorialData } from "@/lib/tutorial";
// @ts-ignore - plain JS module
import { parseVideoUrl } from "@/lib/video-url.js";

type State = { kind: "loading" } | { kind: "empty" } | { kind: "ready"; data: TutorialData };

export default function TutorialModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    if (!open) return;
    setState({ kind: "loading" });
    let live = true;
    fetchTutorial().then((data) => {
      if (!live) return;
      setState(data ? { kind: "ready", data } : { kind: "empty" });
    });
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      live = false;
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const parsed = state.kind === "ready" ? parseVideoUrl(state.data.videoUrl) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="How to use this guide">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-[#160f24]/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-[#FAF9F5] p-6 shadow-2xl sm:rounded-3xl sm:p-8">
        <button type="button" onClick={onClose} aria-label="Close guide" className="absolute right-4 top-4 rounded-full bg-[#103f35]/8 p-2 text-[#103f35] transition hover:bg-[#103f35]/15">
          <X size={18} aria-hidden="true" />
        </button>

        {state.kind === "loading" && (
          <div className="py-6" aria-live="polite">
            <div className="aspect-video w-full animate-pulse rounded-2xl bg-[#103f35]/10" />
            <p className="mt-4 text-center text-sm text-[#202824]/55">Loading the guide…</p>
          </div>
        )}

        {state.kind === "empty" && (
          <div className="py-4 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#C7A05A]/20 text-[#8a6d35]">
              <Play size={26} aria-hidden="true" />
            </span>
            <h2 className="font-display mt-4 text-2xl font-bold text-[#103f35]">Video guide coming soon</h2>
            <p className="mx-auto mt-2 max-w-md leading-relaxed text-[#202824]/65">
              Our team is preparing a short video walkthrough of this checklist. Meanwhile, the guide below is fully
              self-explanatory: pick a category, tick items as you pack, and watch your progress ring fill up.
            </p>
          </div>
        )}

        {state.kind === "ready" && (
          <div>
            <h2 className="font-display pr-10 text-2xl font-bold text-[#103f35] sm:text-[1.7rem]">{state.data.title}</h2>
            {parsed?.type === "youtube" && (
              <div className="mt-4 aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-lg">
                <iframe
                  src={parsed.embedUrl}
                  title={state.data.title}
                  className="h-full w-full"
                  loading="lazy"
                  allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>
            )}
            {parsed?.type === "file" && (
              <div className="mt-4 aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-lg">
                <video src={parsed.url} controls className="h-full w-full" preload="metadata" />
              </div>
            )}
            {parsed?.type === "external" && (
              <div className="mt-4 rounded-2xl border border-[#103f35]/15 bg-white p-6 text-center">
                <p className="text-[#202824]/70">This guide is hosted on an external site.</p>
                <a href={parsed.url} target="_blank" rel="noopener noreferrer" className="btn-primary mt-3 inline-flex items-center gap-2 !px-5 !py-2.5 text-sm">
                  Watch the video <ExternalLink size={15} aria-hidden="true" />
                </a>
              </div>
            )}
            {!parsed && (
              <p className="mt-4 rounded-xl bg-[#b3392e]/10 px-4 py-3 text-sm text-[#b3392e]">
                The video link could not be loaded safely. Please try again later.
              </p>
            )}
            {state.data.description && (
              <p className="mt-4 leading-relaxed text-[#202824]/75">{state.data.description}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
