"use client";

/**
 * Student Essentials — PRODUCTS admin (inside the Student
 * Essentials tab). Full CRUD over essential_products with the
 * marketplace-offer editor: multiple offers per product, manual
 * affiliate URLs, prices with verification dates. Nothing here
 * invents data — empty price/date simply renders publicly as
 * "Check current price". Mirrors BlogManager's data discipline:
 * snapshot before update/delete, audit after success, RC-3
 * zero-row errors surfaced honestly.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { adminSelect, adminInsert, adminUpdate, adminDelete, audit, snapshot, toDb, fromDb, storageUpload } from "@/lib/admin";
// @ts-ignore - plain JS module
import { isSafeImageUrl } from "@/lib/sanitize.js";
import { MARKETPLACES, marketplaceLabel, type EssentialProduct, type ProductOffer } from "@/lib/essentials-shared";
import ProductsImport from "./ProductsImport";

const inputCls = "w-full rounded-lg border border-[#103f35]/25 px-3 py-2 text-[0.92rem]";
const labelCls = "block text-[0.8rem] font-bold text-[#103f35]";

interface ProductRow extends EssentialProduct { status: "draft" | "published" }

const emptyOffer = (): ProductOffer => ({
  marketplace: "amazon-in", marketplaceLabel: "", productUrl: "", affiliateUrl: "",
  price: null, currency: "INR", lastVerifiedDate: "", availability: "unknown",
});

interface FormState extends Omit<ProductRow, "offers" | "specs" | "images"> {
  offers: ProductOffer[];
  specs: { label: string; value: string }[];
  images: string[];
}

const blank = (): FormState => ({
  id: "", name: "", description: "", category: "", imageUrl: "", images: [], specs: [], offers: [],
  status: "draft", displayOrder: 0,
});

export default function ProductsAdmin() {
  const [rows, setRows] = useState<ProductRow[] | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [listQuery, setListQuery] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const extraFileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const data = await adminSelect<Record<string, unknown>>("essential_products", "select=*&order=display_order.asc,created_at.asc");
    setRows(data ? data.map((r) => fromDb<ProductRow>(r)) : null);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const set = (patch: Partial<FormState>) => setForm((f) => (f ? { ...f, ...patch } : f));

  const save = async () => {
    if (!form) return;
    setError("");
    const name = form.name.trim();
    if (!name) { setError("Product name is required."); return; }
    for (const [i, o] of form.offers.entries()) {
      for (const [field, v] of [["Product URL", o.productUrl], ["Affiliate URL", o.affiliateUrl]] as const) {
        if (v.trim() && !isSafeImageUrl(v.trim())) { setError(`Offer ${i + 1}: ${field} must be an HTTPS URL.`); return; }
      }
    }
    if (form.imageUrl.trim() && !isSafeImageUrl(form.imageUrl.trim())) { setError("Product image must be an HTTPS URL (or use Upload)."); return; }
    setBusy(true);
    const payload: Record<string, unknown> = {
      name, description: form.description.trim(), category: form.category.trim(),
      imageUrl: form.imageUrl.trim(), images: form.images.map((x) => x.trim()).filter(Boolean),
      specs: form.specs.filter((s) => s.label.trim() || s.value.trim()),
      offers: form.offers, status: form.status, displayOrder: Number(form.displayOrder) || 0,
    };
    let res: { ok: boolean; error?: string };
    if (form.id) {
      const old = rows?.find((r) => r.id === form.id);
      if (old) await snapshot("essential_products", form.id, toDb(old as unknown as Record<string, unknown>));
      res = await adminUpdate("essential_products", `id=eq.${encodeURIComponent(form.id)}`, toDb(payload));
      if (res.ok) await audit("essential_products", form.id, "update");
    } else {
      const id = `p-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "product"}-${Date.now().toString(36)}`;
      res = await adminInsert("essential_products", toDb({ id, ...payload }));
      if (res.ok) await audit("essential_products", id, "create");
    }
    setBusy(false);
    if (!res.ok) { setError(`Save failed — ${res.error}`); return; }
    setForm(null);
    setNotice(`“${name}” saved as ${form.status}. ${form.status === "published" ? "It appears publicly after the next successful redeployment." : "Drafts are never shown publicly."}`);
    void load();
  };

  const toggleStatus = async (row: ProductRow) => {
    await snapshot("essential_products", row.id, toDb(row as unknown as Record<string, unknown>));
    const next = row.status === "published" ? "draft" : "published";
    const res = await adminUpdate("essential_products", `id=eq.${encodeURIComponent(row.id)}`, { status: next });
    if (res.ok) { await audit("essential_products", row.id, next === "published" ? "publish" : "unpublish"); setNotice(`“${row.name}” is now ${next}. Public visibility changes at the next successful redeployment.`); void load(); }
    else setError(`Status change failed — ${res.error}`);
  };

  const remove = async (row: ProductRow) => {
    if (!window.confirm(`Delete “${row.name}” permanently?`)) return;
    await snapshot("essential_products", row.id, toDb(row as unknown as Record<string, unknown>));
    const res = await adminDelete("essential_products", `id=eq.${encodeURIComponent(row.id)}`);
    if (res.ok) { await audit("essential_products", row.id, "delete"); setNotice(`“${row.name}” deleted.`); void load(); }
    else setError(`Delete failed — ${res.error}`);
  };

  const uploadTo = async (file: File, apply: (url: string) => void) => {
    setError("");
    const up = await storageUpload(file);
    if (up.ok && up.url) apply(up.url);
    else setError(`Image upload failed — ${up.error ?? "unknown error"}`);
  };

  const categories = Array.from(new Set((rows ?? []).map((r) => r.category).filter(Boolean)));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-lg font-bold text-[#103f35]">Products Catalogue</h3>
        {!form && (
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-ghost !px-4 !py-2 text-sm" aria-expanded={showImport} onClick={() => setShowImport((v) => !v)}>Import Products (Excel/CSV)</button>
            <button type="button" className="btn-primary !px-4 !py-2 text-sm" onClick={() => { setForm(blank()); setError(""); }}>New product</button>
          </div>
        )}
      </div>
      {notice && <p className="mt-3 rounded-lg bg-[#103f35]/8 px-4 py-2.5 text-sm text-[#103f35]" role="status">{notice}</p>}
      {error && <p className="mt-3 rounded-lg bg-[#b3392e]/10 px-4 py-2.5 text-sm text-[#b3392e]" role="alert">{error}</p>}
      {showImport && !form && (
        <ProductsImport
          existingNames={(rows ?? []).map((r) => r.name)}
          onImported={() => { void load(); }}
        />
      )}

      {!form && rows !== null && rows.length > 0 && (
        <div className="relative mt-4 max-w-md" role="search">
          <input
            type="search"
            value={listQuery}
            onChange={(e) => setListQuery(e.target.value)}
            placeholder="Search products by name or category…"
            aria-label="Search products"
            className="w-full rounded-full border border-[#103f35]/25 bg-white py-2.5 pl-4 pr-10 text-[0.92rem] outline-none focus:border-[#C7A05A] focus:ring-2 focus:ring-[#C7A05A]/30 [&::-webkit-search-cancel-button]:hidden"
          />
          {listQuery && (
            <button type="button" onClick={() => setListQuery("")} aria-label="Clear product search" className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-[#103f35]/8 text-[#103f35] hover:bg-[#103f35]/15">×</button>
          )}
        </div>
      )}

      {!form && (
        rows === null ? <p className="mt-4 text-sm text-[#202824]/60">Could not load products (is migration_009 applied?).</p> :
        rows.length === 0 ? <p className="mt-4 text-sm text-[#202824]/60">No products yet. Add your first product — you provide the real store links, prices and images; nothing is invented.</p> : (
          <div className="mt-4 overflow-x-auto rounded-xl ring-1 ring-[#103f35]/10">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead><tr className="bg-[#103f35]/5 text-[#103f35]"><th className="px-4 py-2.5">Product</th><th className="px-4 py-2.5">Category</th><th className="px-4 py-2.5">Offers</th><th className="px-4 py-2.5">Status</th><th className="px-4 py-2.5">Order</th><th className="px-4 py-2.5">Actions</th></tr></thead>
              <tbody>
                {rows.filter((r) => { const q = listQuery.trim().toLowerCase(); return !q || r.name.toLowerCase().includes(q) || (r.category ?? "").toLowerCase().includes(q); }).map((r) => (
                  <tr key={r.id} className="border-t border-[#103f35]/8 align-top">
                    <td className="px-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3">{r.category || "—"}</td>
                    <td className="px-4 py-3">{r.offers?.length ?? 0}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${r.status === "published" ? "bg-[#103f35] text-white" : "bg-[#C7A05A]/25 text-[#7a5c1e]"}`}>{r.status === "published" ? "Published" : "Draft"}</span></td>
                    <td className="px-4 py-3">{r.displayOrder}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <button type="button" className="btn-ghost !px-3 !py-1 text-xs" onClick={() => { setForm({ ...r, images: r.images ?? [], specs: r.specs ?? [], offers: r.offers ?? [] }); setError(""); }}>Edit</button>
                        <button type="button" className="btn-ghost !px-3 !py-1 text-xs" onClick={() => void toggleStatus(r)}>{r.status === "published" ? "Unpublish" : "Publish"}</button>
                        <button type="button" className="btn-ghost !px-3 !py-1 text-xs !text-[#b3392e]" onClick={() => void remove(r)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {listQuery.trim() && rows.filter((r) => { const q = listQuery.trim().toLowerCase(); return r.name.toLowerCase().includes(q) || (r.category ?? "").toLowerCase().includes(q); }).length === 0 && (
              <p className="px-4 py-3 text-sm text-[#202824]/60">No products match “{listQuery.trim()}”. <button type="button" className="font-bold text-[#103f35] underline" onClick={() => setListQuery("")}>Clear search</button></p>
            )}
            {listQuery.trim() && (
              <p className="px-4 py-2 text-[0.8rem] text-[#202824]/50" role="status">Showing {rows.filter((r) => { const q = listQuery.trim().toLowerCase(); return r.name.toLowerCase().includes(q) || (r.category ?? "").toLowerCase().includes(q); }).length} of {rows.length} products</p>
            )}
          </div>
        )
      )}

      {form && (
        <div className="mt-4 space-y-5 rounded-xl bg-white p-5 ring-1 ring-[#103f35]/10">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className={labelCls} htmlFor="prod-name">Product name *</label><input id="prod-name" className={inputCls} value={form.name} onChange={(e) => set({ name: e.target.value })} /></div>
            <div><label className={labelCls} htmlFor="prod-cat">Category</label><input id="prod-cat" className={inputCls} value={form.category} onChange={(e) => set({ category: e.target.value })} list="prod-cats" placeholder="e.g. Luggage" /><datalist id="prod-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist></div>
            <div><label className={labelCls} htmlFor="prod-status">Status</label><select id="prod-status" className={inputCls} value={form.status} onChange={(e) => set({ status: e.target.value as FormState["status"] })}><option value="draft">Draft</option><option value="published">Published</option></select></div>
            <div><label className={labelCls} htmlFor="prod-order">Display order</label><input id="prod-order" type="number" className={inputCls} value={form.displayOrder} onChange={(e) => set({ displayOrder: Number(e.target.value) })} /></div>
          </div>
          <div><label className={labelCls} htmlFor="prod-desc">Description</label><textarea id="prod-desc" className={inputCls} rows={3} value={form.description} onChange={(e) => set({ description: e.target.value })} /></div>

          <fieldset className="rounded-xl border border-[#103f35]/15 p-4">
            <legend className="px-1 text-[0.8rem] font-bold text-[#103f35]">Images</legend>
            <label className={labelCls} htmlFor="prod-img">Main image URL</label>
            <div className="flex flex-wrap items-start gap-3">
              <input id="prod-img" className={`${inputCls} min-w-[220px] flex-1`} value={form.imageUrl} onChange={(e) => set({ imageUrl: e.target.value })} placeholder="https://…" />
              <button type="button" className="btn-ghost !px-3 !py-2 text-sm" onClick={() => fileRef.current?.click()}>Upload</button>
              {form.imageUrl && <button type="button" className="btn-ghost !px-3 !py-2 text-sm !text-[#b3392e]" onClick={() => set({ imageUrl: "" })}>Remove</button>}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadTo(f, (url) => set({ imageUrl: url })); e.target.value = ""; }} />
            </div>
            {form.imageUrl && isSafeImageUrl(form.imageUrl) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.imageUrl} alt="" className="mt-3 h-28 w-auto rounded-lg object-cover" />
            )}
            <div className="mt-4 space-y-2">
              {form.images.map((u, i) => (
                <div key={i} className="flex gap-2">
                  <input className={inputCls} value={u} aria-label={`Additional image ${i + 1} URL`} onChange={(e) => { const next = [...form.images]; next[i] = e.target.value; set({ images: next }); }} placeholder="https://…" />
                  <button type="button" className="btn-ghost !px-3 !py-1 text-xs !text-[#b3392e]" onClick={() => set({ images: form.images.filter((_, j) => j !== i) })}>Remove</button>
                </div>
              ))}
              <div className="flex gap-2">
                <button type="button" className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => set({ images: [...form.images, ""] })}>Add image URL</button>
                <button type="button" className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => extraFileRef.current?.click()}>Upload additional image</button>
                <input ref={extraFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadTo(f, (url) => set({ images: [...form.images, url] })); e.target.value = ""; }} />
              </div>
            </div>
          </fieldset>

          <fieldset className="rounded-xl border border-[#103f35]/15 p-4">
            <legend className="px-1 text-[0.8rem] font-bold text-[#103f35]">Specifications</legend>
            <div className="space-y-2">
              {form.specs.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <input className={inputCls} placeholder="Label (e.g. Weight)" value={s.label} onChange={(e) => { const next = [...form.specs]; next[i] = { ...s, label: e.target.value }; set({ specs: next }); }} />
                  <input className={inputCls} placeholder="Value (e.g. 2.1 kg)" value={s.value} onChange={(e) => { const next = [...form.specs]; next[i] = { ...s, value: e.target.value }; set({ specs: next }); }} />
                  <button type="button" className="btn-ghost !px-3 !py-1 text-xs !text-[#b3392e]" onClick={() => set({ specs: form.specs.filter((_, j) => j !== i) })}>Remove</button>
                </div>
              ))}
              <button type="button" className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => set({ specs: [...form.specs, { label: "", value: "" }] })}>Add specification</button>
            </div>
          </fieldset>

          <fieldset className="rounded-xl border border-[#103f35]/15 p-4">
            <legend className="px-1 text-[0.8rem] font-bold text-[#103f35]">Marketplace offers</legend>
            <p className="text-xs text-[#202824]/55">Add your own store and affiliate links. A price is shown publicly ONLY with a verification date — otherwise the site displays “Check current price”. Links open with rel=&quot;sponsored&quot;.</p>
            <div className="mt-3 space-y-4">
              {form.offers.map((o, i) => (
                <div key={i} className="rounded-lg bg-[#FAF9F5] p-3 ring-1 ring-[#103f35]/10">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-[#103f35]">Offer {i + 1} — {marketplaceLabel(o)}</p>
                    <button type="button" className="btn-ghost !px-3 !py-1 text-xs !text-[#b3392e]" onClick={() => set({ offers: form.offers.filter((_, j) => j !== i) })}>Remove offer</button>
                  </div>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    <div><label className={labelCls} htmlFor={`offer-${i}-marketplace`}>Marketplace</label><select id={`offer-${i}-marketplace`} className={inputCls} value={o.marketplace} onChange={(e) => { const next = [...form.offers]; next[i] = { ...o, marketplace: e.target.value as ProductOffer["marketplace"] }; set({ offers: next }); }}>{MARKETPLACES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</select></div>
                    {o.marketplace === "other" && <div><label className={labelCls} htmlFor={`offer-${i}-custom`}>Custom marketplace name</label><input id={`offer-${i}-custom`} className={inputCls} value={o.marketplaceLabel} onChange={(e) => { const next = [...form.offers]; next[i] = { ...o, marketplaceLabel: e.target.value }; set({ offers: next }); }} /></div>}
                    <div><label className={labelCls} htmlFor={`offer-${i}-purl`}>Product URL</label><input id={`offer-${i}-purl`} className={inputCls} value={o.productUrl} placeholder="https://…" onChange={(e) => { const next = [...form.offers]; next[i] = { ...o, productUrl: e.target.value }; set({ offers: next }); }} /></div>
                    <div><label className={labelCls} htmlFor={`offer-${i}-aurl`}>Affiliate URL (optional)</label><input id={`offer-${i}-aurl`} className={inputCls} value={o.affiliateUrl} placeholder="https://…" onChange={(e) => { const next = [...form.offers]; next[i] = { ...o, affiliateUrl: e.target.value }; set({ offers: next }); }} /></div>
                    <div><label className={labelCls} htmlFor={`offer-${i}-price`}>Price</label><input id={`offer-${i}-price`} className={inputCls} type="number" min="0" step="0.01" value={o.price ?? ""} placeholder="Leave empty if unverified" onChange={(e) => { const next = [...form.offers]; next[i] = { ...o, price: e.target.value === "" ? null : Number(e.target.value) }; set({ offers: next }); }} /></div>
                    <div><label className={labelCls} htmlFor={`offer-${i}-currency`}>Currency</label><select id={`offer-${i}-currency`} className={inputCls} value={o.currency} onChange={(e) => { const next = [...form.offers]; next[i] = { ...o, currency: e.target.value }; set({ offers: next }); }}>{["INR", "EUR", "USD", "GBP"].map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
                    <div><label className={labelCls} htmlFor={`offer-${i}-verified`}>Price last verified</label><input id={`offer-${i}-verified`} className={inputCls} type="date" value={o.lastVerifiedDate} onChange={(e) => { const next = [...form.offers]; next[i] = { ...o, lastVerifiedDate: e.target.value }; set({ offers: next }); }} /></div>
                    <div><label className={labelCls} htmlFor={`offer-${i}-avail`}>Availability</label><select id={`offer-${i}-avail`} className={inputCls} value={o.availability} onChange={(e) => { const next = [...form.offers]; next[i] = { ...o, availability: e.target.value as ProductOffer["availability"] }; set({ offers: next }); }}><option value="unknown">Not stated</option><option value="in-stock">In stock</option><option value="out-of-stock">Out of stock</option></select></div>
                  </div>
                  {o.price !== null && !o.lastVerifiedDate && <p className="mt-2 text-xs font-semibold text-[#8a6d35]">Price set without a verification date — the public page will show “Check current price” until you add the date.</p>}
                </div>
              ))}
              <button type="button" className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => set({ offers: [...form.offers, emptyOffer()] })}>Add marketplace offer</button>
            </div>
          </fieldset>

          <div className="flex gap-2">
            <button type="button" className="btn-primary !px-5 !py-2.5 text-sm" disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : form.id ? "Save changes" : "Create product"}</button>
            <button type="button" className="btn-ghost !px-5 !py-2.5 text-sm" onClick={() => setForm(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
