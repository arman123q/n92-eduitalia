"use client";

/**
 * Student Essentials — CHECKLIST admin (inside the Student
 * Essentials tab): manage categories and items over
 * checklist_categories / checklist_items. Same data discipline as
 * the rest of the admin: snapshot before update/delete, audit
 * after success, honest error surfacing. Italy applicability is
 * explicit per item (applicable / review / not-applicable).
 */
import { useCallback, useEffect, useState } from "react";
import { adminSelect, adminInsert, adminUpdate, adminDelete, audit, snapshot, toDb, fromDb } from "@/lib/admin";
import type { ChecklistCategory, ChecklistItem, ItalyStatus } from "@/lib/essentials-shared";

const inputCls = "w-full rounded-lg border border-[#103f35]/25 px-3 py-2 text-[0.92rem]";
const labelCls = "block text-[0.8rem] font-bold text-[#103f35]";

interface CatRow extends ChecklistCategory { published: boolean }
interface ItemRow extends ChecklistItem { published: boolean }

export default function ChecklistAdmin() {
  const [view, setView] = useState<"items" | "categories">("items");
  const [cats, setCats] = useState<CatRow[] | null>(null);
  const [items, setItems] = useState<ItemRow[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [itemForm, setItemForm] = useState<ItemRow | null>(null);
  const [catForm, setCatForm] = useState<CatRow | null>(null);

  const load = useCallback(async () => {
    const [c, i] = await Promise.all([
      adminSelect<Record<string, unknown>>("checklist_categories", "select=*&order=display_order.asc"),
      adminSelect<Record<string, unknown>>("checklist_items", "select=*&order=category_code.asc,display_order.asc"),
    ]);
    setCats(c ? c.map((r) => fromDb<CatRow>(r)) : null);
    setItems(i ? i.map((r) => fromDb<ItemRow>(r)) : null);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const fail = (what: string, res: { ok: boolean; error?: string }) => { if (!res.ok) setError(`${what} failed — ${res.error}`); return res.ok; };

  // ---------- items ----------
  const saveItem = async () => {
    if (!itemForm) return;
    setError("");
    if (!itemForm.name.trim()) { setError("Item name is required."); return; }
    if (!itemForm.categoryCode) { setError("Choose a category (create one first if needed)."); return; }
    const payload = {
      categoryCode: itemForm.categoryCode, name: itemForm.name.trim(), description: itemForm.description.trim(),
      note: itemForm.note.trim(), italyStatus: itemForm.italyStatus, published: itemForm.published,
      displayOrder: Number(itemForm.displayOrder) || 0,
    };
    if (itemForm.id) {
      const old = items?.find((r) => r.id === itemForm.id);
      if (old) await snapshot("checklist_items", itemForm.id, toDb(old as unknown as Record<string, unknown>));
      if (!fail("Save", await adminUpdate("checklist_items", `id=eq.${encodeURIComponent(itemForm.id)}`, toDb(payload)))) return;
      await audit("checklist_items", itemForm.id, "update");
    } else {
      const id = `i-${itemForm.categoryCode.toLowerCase()}-${Date.now().toString(36)}`;
      if (!fail("Create", await adminInsert("checklist_items", toDb({ id, ...payload })))) return;
      await audit("checklist_items", id, "create");
    }
    setItemForm(null); setNotice("Checklist item saved. Public visibility changes at the next successful redeployment."); void load();
  };

  const toggleItem = async (row: ItemRow) => {
    await snapshot("checklist_items", row.id, toDb(row as unknown as Record<string, unknown>));
    if (!fail("Status change", await adminUpdate("checklist_items", `id=eq.${encodeURIComponent(row.id)}`, { published: !row.published }))) return;
    await audit("checklist_items", row.id, !row.published ? "publish" : "unpublish"); void load();
  };

  const removeItem = async (row: ItemRow) => {
    if (!window.confirm(`Delete checklist item “${row.name}” permanently?`)) return;
    await snapshot("checklist_items", row.id, toDb(row as unknown as Record<string, unknown>));
    if (!fail("Delete", await adminDelete("checklist_items", `id=eq.${encodeURIComponent(row.id)}`))) return;
    await audit("checklist_items", row.id, "delete"); void load();
  };

  // ---------- categories ----------
  const saveCat = async () => {
    if (!catForm) return;
    setError("");
    const code = catForm.code.trim().toUpperCase();
    if (!/^[A-Z][A-Z0-9]?$/.test(code)) { setError("Category code must be 1–2 letters/digits (e.g. A, C1)."); return; }
    if (!catForm.name.trim()) { setError("Category name is required."); return; }
    const payload = { name: catForm.name.trim(), intro: (catForm.intro ?? "").trim(), packLocation: (catForm.packLocation ?? "").trim(), displayOrder: Number(catForm.displayOrder) || 0, published: catForm.published };
    const exists = cats?.some((c) => c.code === code);
    if (exists) {
      const old = cats?.find((c) => c.code === code);
      if (old) await snapshot("checklist_categories", code, toDb(old as unknown as Record<string, unknown>));
      if (!fail("Save", await adminUpdate("checklist_categories", `code=eq.${encodeURIComponent(code)}`, toDb(payload)))) return;
      await audit("checklist_categories", code, "update");
    } else {
      if (!fail("Create", await adminInsert("checklist_categories", toDb({ code, ...payload })))) return;
      await audit("checklist_categories", code, "create");
    }
    setCatForm(null); setNotice("Category saved."); void load();
  };

  const removeCat = async (row: CatRow) => {
    const used = items?.some((i) => i.categoryCode === row.code);
    if (used) { setError(`Category ${row.code} still has items — move or delete them first (the database protects this too).`); return; }
    if (!window.confirm(`Delete category ${row.code} — ${row.name}?`)) return;
    await snapshot("checklist_categories", row.code, toDb(row as unknown as Record<string, unknown>));
    if (!fail("Delete", await adminDelete("checklist_categories", `code=eq.${encodeURIComponent(row.code)}`))) return;
    await audit("checklist_categories", row.code, "delete"); void load();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-lg font-bold text-[#103f35]">Checklist {view === "items" ? "Items" : "Categories"}</h3>
        <div className="flex gap-2">
          <button type="button" className={`btn-ghost !px-3 !py-1.5 text-xs ${view === "items" ? "!bg-[#103f35] !text-white" : ""}`} onClick={() => setView("items")}>Items</button>
          <button type="button" className={`btn-ghost !px-3 !py-1.5 text-xs ${view === "categories" ? "!bg-[#103f35] !text-white" : ""}`} onClick={() => setView("categories")}>Categories</button>
          {view === "items" && <button type="button" className="btn-primary !px-4 !py-2 text-sm" onClick={() => { setItemForm({ id: "", categoryCode: cats?.[0]?.code ?? "", name: "", description: "", note: "", italyStatus: "review", displayOrder: 0, published: false }); setError(""); }}>New item</button>}
          {view === "categories" && <button type="button" className="btn-primary !px-4 !py-2 text-sm" onClick={() => { setCatForm({ code: "", name: "", intro: "", packLocation: "", displayOrder: 0, published: true }); setError(""); }}>New category</button>}
        </div>
      </div>
      {notice && <p className="mt-3 rounded-lg bg-[#103f35]/8 px-4 py-2.5 text-sm text-[#103f35]" role="status">{notice}</p>}
      {error && <p className="mt-3 rounded-lg bg-[#b3392e]/10 px-4 py-2.5 text-sm text-[#b3392e]" role="alert">{error}</p>}

      {view === "items" && !itemForm && (
        items === null ? <p className="mt-4 text-sm text-[#202824]/60">Could not load items (is migration_009 applied?).</p> : (
          <div className="mt-4 overflow-x-auto rounded-xl ring-1 ring-[#103f35]/10">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead><tr className="bg-[#103f35]/5 text-[#103f35]"><th className="px-4 py-2.5">Item</th><th className="px-4 py-2.5">Category</th><th className="px-4 py-2.5">Italy</th><th className="px-4 py-2.5">Status</th><th className="px-4 py-2.5">Order</th><th className="px-4 py-2.5">Actions</th></tr></thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id} className="border-t border-[#103f35]/8 align-top">
                    <td className="px-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3">{r.categoryCode}</td>
                    <td className="px-4 py-3">{r.italyStatus === "applicable" ? "Applicable" : r.italyStatus === "review" ? "Review" : "Not applicable"}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${r.published ? "bg-[#103f35] text-white" : "bg-[#C7A05A]/25 text-[#7a5c1e]"}`}>{r.published ? "Published" : "Draft"}</span></td>
                    <td className="px-4 py-3">{r.displayOrder}</td>
                    <td className="px-4 py-3"><div className="flex flex-wrap gap-1.5">
                      <button type="button" className="btn-ghost !px-3 !py-1 text-xs" onClick={() => { setItemForm(r); setError(""); }}>Edit</button>
                      <button type="button" className="btn-ghost !px-3 !py-1 text-xs" onClick={() => void toggleItem(r)}>{r.published ? "Unpublish" : "Publish"}</button>
                      <button type="button" className="btn-ghost !px-3 !py-1 text-xs !text-[#b3392e]" onClick={() => void removeItem(r)}>Delete</button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {view === "items" && itemForm && (
        <div className="mt-4 space-y-4 rounded-xl bg-white p-5 ring-1 ring-[#103f35]/10">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className={labelCls} htmlFor="ci-name">Item name *</label><input id="ci-name" className={inputCls} value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} /></div>
            <div><label className={labelCls} htmlFor="ci-cat">Category</label><select id="ci-cat" className={inputCls} value={itemForm.categoryCode} onChange={(e) => setItemForm({ ...itemForm, categoryCode: e.target.value })}>{(cats ?? []).map((c) => <option key={c.code} value={c.code}>{c.code} · {c.name}</option>)}</select></div>
            <div><label className={labelCls} htmlFor="ci-italy">Italy applicability</label><select id="ci-italy" className={inputCls} value={itemForm.italyStatus} onChange={(e) => setItemForm({ ...itemForm, italyStatus: e.target.value as ItalyStatus })}><option value="applicable">Applicable to Italy</option><option value="review">Review required</option><option value="not-applicable">Not applicable to Italy</option></select></div>
            <div><label className={labelCls} htmlFor="ci-order">Display order</label><input id="ci-order" type="number" className={inputCls} value={itemForm.displayOrder} onChange={(e) => setItemForm({ ...itemForm, displayOrder: Number(e.target.value) })} /></div>
          </div>
          <div><label className={labelCls} htmlFor="ci-desc">Description</label><textarea id="ci-desc" className={inputCls} rows={2} value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} /></div>
          <div><label className={labelCls} htmlFor="ci-note">Note (shown under the item, e.g. Italy-specific guidance)</label><textarea id="ci-note" className={inputCls} rows={2} value={itemForm.note} onChange={(e) => setItemForm({ ...itemForm, note: e.target.value })} /></div>
          <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={itemForm.published} onChange={(e) => setItemForm({ ...itemForm, published: e.target.checked })} /> Published (visible publicly after redeployment)</label>
          <div className="flex gap-2">
            <button type="button" className="btn-primary !px-5 !py-2.5 text-sm" onClick={() => void saveItem()}>{itemForm.id ? "Save changes" : "Create item"}</button>
            <button type="button" className="btn-ghost !px-5 !py-2.5 text-sm" onClick={() => setItemForm(null)}>Cancel</button>
          </div>
        </div>
      )}

      {view === "categories" && !catForm && (
        cats === null ? <p className="mt-4 text-sm text-[#202824]/60">Could not load categories.</p> : (
          <div className="mt-4 overflow-x-auto rounded-xl ring-1 ring-[#103f35]/10">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead><tr className="bg-[#103f35]/5 text-[#103f35]"><th className="px-4 py-2.5">Code</th><th className="px-4 py-2.5">Name</th><th className="px-4 py-2.5">Items</th><th className="px-4 py-2.5">Published</th><th className="px-4 py-2.5">Order</th><th className="px-4 py-2.5">Actions</th></tr></thead>
              <tbody>
                {cats.map((c) => (
                  <tr key={c.code} className="border-t border-[#103f35]/8">
                    <td className="px-4 py-3 font-bold">{c.code}</td>
                    <td className="px-4 py-3">{c.name}</td>
                    <td className="px-4 py-3">{items?.filter((i) => i.categoryCode === c.code).length ?? 0}</td>
                    <td className="px-4 py-3">{c.published ? "Yes" : "No"}</td>
                    <td className="px-4 py-3">{c.displayOrder}</td>
                    <td className="px-4 py-3"><div className="flex gap-1.5">
                      <button type="button" className="btn-ghost !px-3 !py-1 text-xs" onClick={() => { setCatForm(c); setError(""); }}>Edit</button>
                      <button type="button" className="btn-ghost !px-3 !py-1 text-xs !text-[#b3392e]" onClick={() => void removeCat(c)}>Delete</button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {view === "categories" && catForm && (
        <div className="mt-4 space-y-4 rounded-xl bg-white p-5 ring-1 ring-[#103f35]/10">
          <div className="grid gap-4 sm:grid-cols-3">
            <div><label className={labelCls} htmlFor="cc-code">Code *</label><input id="cc-code" className={inputCls} value={catForm.code} disabled={!!cats?.some((c) => c.code === catForm.code)} onChange={(e) => setCatForm({ ...catForm, code: e.target.value.toUpperCase() })} placeholder="A, C1, K…" /></div>
            <div><label className={labelCls} htmlFor="cc-name">Name *</label><input id="cc-name" className={inputCls} value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} /></div>
            <div><label className={labelCls} htmlFor="cc-order">Display order</label><input id="cc-order" type="number" className={inputCls} value={catForm.displayOrder} onChange={(e) => setCatForm({ ...catForm, displayOrder: Number(e.target.value) })} /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className={labelCls} htmlFor="cc-intro">Intro note (optional, shown under the heading)</label><input id="cc-intro" className={inputCls} value={catForm.intro ?? ""} onChange={(e) => setCatForm({ ...catForm, intro: e.target.value })} /></div>
            <div><label className={labelCls} htmlFor="cc-pack">Pack location (optional, e.g. Handbag)</label><input id="cc-pack" className={inputCls} value={catForm.packLocation ?? ""} onChange={(e) => setCatForm({ ...catForm, packLocation: e.target.value })} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={catForm.published} onChange={(e) => setCatForm({ ...catForm, published: e.target.checked })} /> Published</label>
          <div className="flex gap-2">
            <button type="button" className="btn-primary !px-5 !py-2.5 text-sm" onClick={() => void saveCat()}>Save category</button>
            <button type="button" className="btn-ghost !px-5 !py-2.5 text-sm" onClick={() => setCatForm(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
