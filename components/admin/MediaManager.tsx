"use client";

import { useEffect, useRef, useState } from "react";
import { storageList, storageUpload, storageDelete, storagePublicUrl, type StorageItem } from "@/lib/admin";

export default function MediaManager() {
  const [items, setItems] = useState<StorageItem[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setItems(await storageList());
  }
  useEffect(() => { load(); }, []);

  async function onUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("image/")) { setMsg({ ok: false, text: `${f.name}: only image files are allowed.` }); continue; }
      if (f.size > 5 * 1024 * 1024) { setMsg({ ok: false, text: `${f.name}: larger than 5 MB — please compress it first.` }); continue; }
      const r = await storageUpload(f);
      setMsg(r.ok ? { ok: true, text: `${f.name} uploaded.` } : { ok: false, text: r.error || "Upload failed." });
    }
    setUploading(false);
    load();
  }

  async function copy(name: string) {
    try {
      await navigator.clipboard.writeText(storagePublicUrl(name));
      setMsg({ ok: true, text: "Image URL copied — paste it wherever the site needs it." });
    } catch {
      setMsg({ ok: false, text: "Copy failed — the URL is shown under the image." });
    }
  }

  async function remove(name: string) {
    if (!confirm(`Delete ${name}? Pages using this image will show a broken image until updated.`)) return;
    const ok = await storageDelete(name);
    setMsg(ok ? { ok: true, text: "Image deleted." } : { ok: false, text: "Delete failed." });
    if (ok) load();
  }

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-[#103f35]">Media Library</h2>
      <p className="mt-1 text-sm text-[#202824]/60">Images are stored in the secure media bucket. Upload (max 5 MB, images only), copy the URL to use it, or delete with care.</p>
      {msg && <p className={`mt-3 rounded-lg px-4 py-2.5 text-sm ${msg.ok ? "bg-green-50 border border-green-300 text-green-900" : "bg-red-50 border border-red-300 text-red-900"}`} role="status">{msg.text}</p>}
      <div className="mt-5">
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onUpload(e.target.files)} />
        <button type="button" className="btn-primary" disabled={uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? "Uploading…" : "Upload images"}
        </button>
      </div>
      {items.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-[#103f35]/25 p-8 text-center text-[#202824]/65">No images uploaded yet.</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <figure key={it.name} className="card overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={storagePublicUrl(it.name)} alt={it.name} className="h-40 w-full object-cover" loading="lazy" />
              <figcaption className="p-3.5">
                <p className="truncate text-[0.8rem] font-medium">{it.name}</p>
                <p className="truncate text-[0.7rem] text-[#202824]/50">{storagePublicUrl(it.name)}</p>
                <div className="mt-2.5 flex gap-2">
                  <button type="button" className="btn-ghost !px-3 !py-1.5 text-[0.78rem]" onClick={() => copy(it.name)}>Copy URL</button>
                  <button type="button" className="btn-ghost !px-3 !py-1.5 text-[0.78rem] !border-red-300 !text-red-700" onClick={() => remove(it.name)}>Delete</button>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
