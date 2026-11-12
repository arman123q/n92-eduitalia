"use client";

/**
 * ProfilePhoto — the student's profile photograph (Feature 2).
 *
 * The photo is stored in the PRIVATE `student-avatars` bucket at
 * `<user_id>/profile-photo` (Migration 014). The component:
 *  - validates type (JPEG/PNG/WebP) and size (≤ 3 MB) before upload;
 *  - downscales very large images in the browser where practical;
 *  - shows a preview BEFORE anything is uploaded;
 *  - uploads with a real progress indicator (XHR);
 *  - displays through short-lived signed URLs only;
 *  - degrades to a clear "being set up" note while the storage
 *    bucket does not exist yet (pre-Migration-014), instead of
 *    presenting broken controls.
 */
import { useEffect, useRef, useState } from "react";
import {
  studentAvatarMeta,
  studentAvatarSignedUrl,
  uploadStudentAvatar,
  deleteStudentAvatar,
  validateAvatarFile,
} from "@/lib/student";

const MAX_DIM = 1024;

function isBucketMissing(message: string | undefined): boolean {
  return Boolean(message && /bucket/i.test(message));
}

/** Downscale an image file to at most MAX_DIM px on its long edge.
 *  Returns the original file when it is already small enough or when
 *  resizing is not possible (the 3 MB validation still applies). */
async function prepareForUpload(file: File): Promise<Blob> {
  try {
    const url = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight));
    if (scale >= 1 && file.size <= 1024 * 1024) { URL.revokeObjectURL(url); return file; }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) { URL.revokeObjectURL(url); return file; }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    const type = file.type === "image/png" || file.type === "image/webp" ? file.type : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));
    return blob ?? file;
  } catch {
    return file;
  }
}

export default function ProfilePhoto({ userId, displayName }: { userId: string; displayName: string | null }) {
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [uploadedAt, setUploadedAt] = useState<string | null>(null);
  const [setupPending, setSetupPending] = useState(false);
  const [pending, setPending] = useState<{ file: File; preview: string } | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    const meta = await studentAvatarMeta(userId);
    if (!meta.ok) {
      if (isBucketMissing(meta.error)) setSetupPending(true);
      return;
    }
    setSetupPending(false);
    setUploadedAt(meta.meta.createdAt);
    if (meta.meta.exists) {
      const signed = await studentAvatarSignedUrl(userId);
      if (signed.ok && signed.url) setCurrentUrl(signed.url);
    } else {
      setCurrentUrl(null);
    }
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [userId]);

  function choose(file: File) {
    setError("");
    setNotice("");
    const v = validateAvatarFile({ type: file.type, size: file.size });
    if (!v.ok) { setError(v.error); return; }
    setPending({ file, preview: URL.createObjectURL(file) });
  }

  async function upload() {
    if (!pending) return;
    setBusy(true);
    setError("");
    setProgress(0);
    const blob = await prepareForUpload(pending.file);
    if (blob.size > 3 * 1024 * 1024) {
      setBusy(false);
      setProgress(null);
      setError("The image is still larger than 3 MB after resizing. Please choose a smaller photo.");
      return;
    }
    const r = await uploadStudentAvatar(userId, blob, setProgress);
    setBusy(false);
    setProgress(null);
    if (!r.ok) {
      if (isBucketMissing(r.error)) { setSetupPending(true); setPending(null); return; }
      setError(r.error || "The photo upload failed.");
      return;
    }
    URL.revokeObjectURL(pending.preview);
    setPending(null);
    setNotice("Profile photo updated.");
    await refresh();
  }

  async function remove() {
    setBusy(true);
    setError("");
    const r = await deleteStudentAvatar(userId);
    setBusy(false);
    setConfirmRemove(false);
    if (!r.ok) { setError(r.error || "Could not remove the photo."); return; }
    setCurrentUrl(null);
    setUploadedAt(null);
    setNotice("Profile photo removed.");
  }

  const shown = pending?.preview || currentUrl;
  const initial = (displayName || "?").trim().charAt(0).toUpperCase();

  return (
    <section className="panel mt-6 p-6" aria-label="Profile photo">
      <h2 className="font-display text-lg font-bold text-[#103f35]">Profile photo</h2>
      {setupPending ? (
        <p className="mt-2 text-[0.9rem] text-[#202824]/65">
          Profile photos are being set up by the N92 team and will be available here soon.
          Your photo will be stored privately — only you and the N92 team can see it.
        </p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            {shown ? (
              <img src={shown} alt="Your profile photo" className="h-24 w-24 rounded-full object-cover border border-[#103f35]/20" />
            ) : (
              <span aria-hidden="true" className="flex h-24 w-24 items-center justify-center rounded-full bg-[#103f35]/10 text-3xl font-bold text-[#103f35]">{initial}</span>
            )}
            <div className="space-y-2">
              <p className="text-[0.85rem] text-[#202824]/60">
                JPEG, PNG or WebP, up to 3 MB.{uploadedAt && !pending ? ` Uploaded ${new Date(uploadedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}.` : ""}
              </p>
              {!pending && (
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-primary !py-2" disabled={busy} onClick={() => fileRef.current?.click()}>
                    {currentUrl ? "Change Photo" : "Upload Photo"}
                  </button>
                  {currentUrl && !confirmRemove && (
                    <button type="button" className="btn-ghost !py-2" disabled={busy} onClick={() => setConfirmRemove(true)}>Remove Photo</button>
                  )}
                  {currentUrl && confirmRemove && (
                    <>
                      <button type="button" className="btn-ghost !py-2 !border-[#b3392e] !text-[#b3392e]" disabled={busy} onClick={remove}>Confirm remove</button>
                      <button type="button" className="btn-ghost !py-2" disabled={busy} onClick={() => setConfirmRemove(false)}>Keep photo</button>
                    </>
                  )}
                </div>
              )}
              {pending && (
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-primary !py-2" disabled={busy} onClick={upload}>
                    {busy ? "Uploading…" : "Upload this photo"}
                  </button>
                  <button type="button" className="btn-ghost !py-2" disabled={busy}
                    onClick={() => { URL.revokeObjectURL(pending.preview); setPending(null); }}>Cancel</button>
                </div>
              )}
              <input ref={fileRef} type="file" className="hidden" accept="image/jpeg,image/png,image/webp"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) choose(f); e.target.value = ""; }} />
            </div>
          </div>
          {progress !== null && (
            <div className="mt-3" role="status" aria-label="Upload progress">
              <div className="h-2 w-full max-w-sm overflow-hidden rounded bg-[#103f35]/10">
                <div className="h-full bg-[#103f35] transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
              <p className="mt-1 text-[0.8rem] text-[#202824]/60">Uploading… {Math.round(progress * 100)}%</p>
            </div>
          )}
        </>
      )}
      {error && <p className="field-error mt-3" role="alert">{error}</p>}
      {notice && <p className="mt-3 text-[0.9rem] font-semibold text-[#103f35]" role="status">{notice}</p>}
    </section>
  );
}
