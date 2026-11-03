"use client";

/**
 * Student Essentials — TUTORIAL admin ("How to Use This Guide").
 * Manages the single essentials_tutorial row (id 'main'): video
 * URL, title, description, published flag. The public page fetches
 * it at runtime, so changes apply WITHOUT a redeployment. Preview
 * uses the same URL parser as the public modal, so what the owner
 * sees here is exactly what visitors get. Requires migration_010;
 * until it is applied this tab shows how to enable the feature.
 */
import { useCallback, useEffect, useState } from "react";
import { adminSelect, adminInsert, adminUpdate, adminDelete, audit, snapshot, toDb } from "@/lib/admin";
// @ts-ignore - plain JS module
import { parseVideoUrl } from "@/lib/video-url.js";
// @ts-ignore - plain JS module
import { isSafeImageUrl } from "@/lib/sanitize.js";

const inputCls = "w-full rounded-lg border border-[#103f35]/25 px-3 py-2 text-[0.92rem]";
const labelCls = "block text-[0.8rem] font-bold text-[#103f35]";

interface TutorialRow {
  id: string;
  videoUrl: string;
  title: string;
  description: string;
  published: boolean;
}

export default function TutorialAdmin() {
  const [loaded, setLoaded] = useState<"pending" | "ok" | "missing">("pending");
  const [form, setForm] = useState<TutorialRow>({ id: "main", videoUrl: "", title: "How to Use This Guide", description: "", published: false });
  const [exists, setExists] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const rows = await adminSelect<Record<string, unknown>>("essentials_tutorial", "select=*");
    if (!rows) { setLoaded("missing"); return; }
    setLoaded("ok");
    const row = rows.find((r) => r.id === "main") ?? rows[0];
    if (row) {
      setExists(true);
      setForm({
        id: "main",
        videoUrl: String(row.video_url ?? ""),
        title: String(row.title ?? ""),
        description: String(row.description ?? ""),
        published: row.published === true,
      });
    } else setExists(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const parsed = form.videoUrl.trim() ? parseVideoUrl(form.videoUrl) : null;

  const save = async () => {
    setError("");
    const url = form.videoUrl.trim();
    if (!url) { setError("Video URL is empty — use Remove to take the tutorial offline, or paste a video URL."); return; }
    if (!isSafeImageUrl(url)) { setError("Video URL must be a valid HTTPS URL."); return; }
    if (!parseVideoUrl(url)) { setError("This URL cannot be embedded safely. Use a YouTube link (watch, youtu.be, embed or shorts) or a direct HTTPS video file."); return; }
    setBusy(true);
    const payload = { videoUrl: url, title: form.title.trim() || "How to Use This Guide", description: form.description.trim(), published: form.published };
    let res: { ok: boolean; error?: string };
    if (exists) {
      const old = { id: "main", video_url: form.videoUrl, title: form.title, description: form.description, published: form.published };
      await snapshot("essentials_tutorial", "main", old);
      res = await adminUpdate("essentials_tutorial", "id=eq.main", toDb(payload));
      if (res.ok) await audit("essentials_tutorial", "main", "update");
    } else {
      res = await adminInsert("essentials_tutorial", toDb({ id: "main", ...payload }));
      if (res.ok) await audit("essentials_tutorial", "main", "create");
    }
    setBusy(false);
    if (!res.ok) { setError(`Save failed — ${res.error}`); return; }
    setNotice(form.published
      ? "Tutorial saved and PUBLISHED — it is live on the Student Essentials page immediately (no redeployment needed)."
      : "Tutorial saved as UNPUBLISHED — visitors keep seeing the empty state until you publish.");
    void load();
  };

  const remove = async () => {
    if (!window.confirm("Remove the tutorial video completely? Visitors will see the empty state.")) return;
    setError("");
    const res = await adminDelete("essentials_tutorial", "id=eq.main");
    if (!res.ok) { setError(`Remove failed — ${res.error}`); return; }
    await audit("essentials_tutorial", "main", "delete");
    setForm({ id: "main", videoUrl: "", title: "How to Use This Guide", description: "", published: false });
    setExists(false);
    setNotice("Tutorial removed. The public page now shows the empty state.");
  };

  if (loaded === "pending") return <p className="text-sm text-[#202824]/60">Loading tutorial settings…</p>;
  if (loaded === "missing") {
    return (
      <div className="rounded-xl border border-[#C7A05A]/60 bg-[#C7A05A]/10 p-5 text-sm leading-relaxed text-[#202824]/80">
        <strong className="text-[#103f35]">Tutorial storage is not enabled yet.</strong> The{" "}
        <code className="rounded bg-white px-1.5 py-0.5 text-[0.82rem]">essentials_tutorial</code> table does not exist. Ask for{" "}
        <strong>migration_010_essentials_tutorial.sql</strong>, review it, and run it once in the Supabase SQL Editor — then this tab
        will manage the “How to Use This Guide” video. Until then, visitors see the polished empty state.
      </div>
    );
  }

  return (
    <div>
      <h3 className="font-display text-lg font-bold text-[#103f35]">“How to Use This Guide” Video</h3>
      <p className="mt-1 max-w-2xl text-sm text-[#202824]/60">
        Changes here go live on the public page immediately — no redeployment. Supported: YouTube (watch, youtu.be, embed,
        shorts links), direct HTTPS video files (MP4/WebM), or any other HTTPS page (shown to visitors as a safe external link).
      </p>
      {notice && <p className="mt-3 rounded-lg bg-[#103f35]/8 px-4 py-2.5 text-sm text-[#103f35]" role="status">{notice}</p>}
      {error && <p className="mt-3 rounded-lg bg-[#b3392e]/10 px-4 py-2.5 text-sm text-[#b3392e]" role="alert">{error}</p>}

      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl bg-white p-5 ring-1 ring-[#103f35]/10">
          <div>
            <label className={labelCls} htmlFor="tut-url">Video URL</label>
            <input id="tut-url" className={inputCls} value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} placeholder="https://www.youtube.com/watch?v=…" />
            {form.videoUrl.trim() && !parsed && <p className="mt-1.5 text-xs font-semibold text-[#b3392e]">This URL cannot be embedded safely — check it is a valid HTTPS YouTube or video-file link.</p>}
            {parsed?.type === "external" && <p className="mt-1.5 text-xs font-semibold text-[#8a6d35]">This link will be shown to visitors as an external “Watch the video” button (third-party pages are never embedded directly).</p>}
          </div>
          <div>
            <label className={labelCls} htmlFor="tut-title">Video title</label>
            <input id="tut-title" className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className={labelCls} htmlFor="tut-desc">Short description</label>
            <textarea id="tut-desc" className={inputCls} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What visitors will learn from this video…" />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
            Published (visible on the public page)
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary !px-5 !py-2.5 text-sm" disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : exists ? "Save changes" : "Add tutorial"}</button>
            {exists && <button type="button" className="btn-ghost !px-5 !py-2.5 text-sm !text-[#b3392e]" onClick={() => void remove()}>Remove video</button>}
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 ring-1 ring-[#103f35]/10">
          <p className={labelCls}>Preview — exactly what visitors see</p>
          <div className="mt-2">
            {parsed?.type === "youtube" && (
              <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
                <iframe src={parsed.embedUrl} title="Tutorial preview" className="h-full w-full" allow="encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
              </div>
            )}
            {parsed?.type === "file" && (
              <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
                <video src={parsed.url} controls className="h-full w-full" preload="metadata" />
              </div>
            )}
            {parsed?.type === "external" && (
              <div className="rounded-xl border border-[#103f35]/15 p-5 text-center text-sm text-[#202824]/70">
                External video link: <span className="font-semibold text-[#103f35]">{parsed.url}</span>
              </div>
            )}
            {!parsed && (
              <div className="flex aspect-video w-full flex-col items-center justify-center rounded-xl bg-[#103f35]/6 text-center">
                <p className="font-display text-lg font-bold text-[#103f35]">Video guide coming soon</p>
                <p className="mt-1 max-w-xs text-sm text-[#202824]/55">This empty state is what visitors see until a video is published.</p>
              </div>
            )}
          </div>
          <p className="mt-3 font-display text-lg font-bold text-[#103f35]">{form.title || "How to Use This Guide"}</p>
          {form.description && <p className="mt-1 text-sm leading-relaxed text-[#202824]/70">{form.description}</p>}
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[#202824]/45">
            Status: {form.published ? "Published" : "Not published"}
          </p>
        </div>
      </div>
    </div>
  );
}
