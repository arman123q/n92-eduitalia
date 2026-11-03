"use client";

import { useCallback, useEffect, useState } from "react";
import { adminSelect, adminInsert, adminUpdate, adminDelete, audit, snapshot, toDb, fromDb, storageUpload } from "@/lib/admin";
// @ts-ignore - plain JS module
import { sanitizeHtml, isSafeImageUrl } from "@/lib/sanitize.js";
import RichTextEditor from "@/components/RichTextEditor";
import ArticleView from "@/components/ArticleView";
import { formatBlogDate, type BlogPost } from "@/lib/blog-shared";
import { Eye, Pencil, Plus, Trash2, X } from "lucide-react";

/**
 * Blog / Articles manager (owner-only via RLS: migration_008 pins
 * writes to the admin account; drafts are visible only because the
 * same FOR ALL policy lets the owner read them).
 *
 * PUBLISHING MODEL (static export): saving a post only changes the
 * database. A post becomes a public page at the NEXT SUCCESSFUL SITE
 * DEPLOYMENT, which fetches published posts and bakes them into
 * static pages. If a deployment's fetch fails it falls back to the
 * last snapshot — so an unpublish is confirmed only once a
 * successful deployment has completed. The banner below repeats
 * this in-product.
 */

interface PostForm {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  contentHtml: string;
  seoTitle: string;
  metaDescription: string;
  focusKeyword: string;
  featuredImageUrl: string;
  imageAlt: string;
  authorName: string;
  category: string;
  tags: string; // comma-separated in the form and the database
  publishedDate: string; // yyyy-mm-dd or ""
  status: "draft" | "published";
  updatedAt?: string;
}

const CATEGORY_PRESETS = ["Study in Italy", "Admissions", "Scholarships", "Visa & Documents", "Costs & Budget", "Student Life", "Universities"];

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
}

function emptyForm(): PostForm {
  return {
    id: "", slug: "", title: "", excerpt: "", contentHtml: "", seoTitle: "", metaDescription: "",
    focusKeyword: "", featuredImageUrl: "", imageAlt: "", authorName: "N92 Edu-Italia",
    category: "Study in Italy", tags: "", publishedDate: "", status: "draft",
  };
}

function toPreviewPost(f: PostForm): BlogPost {
  return {
    ...f,
    tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean),
    publishedDate: f.publishedDate || null,
    createdAt: "",
    updatedAt: f.updatedAt ?? "",
  };
}

const inputCls = "w-full rounded-lg border border-[#103f35]/25 bg-white px-3 py-2 text-[0.92rem] text-[#202824]";
const labelCls = "block text-[0.8rem] font-semibold uppercase tracking-wide text-[#103f35]/70 mb-1";

export default function BlogManager() {
  const [posts, setPosts] = useState<PostForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState<PostForm | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<BlogPost | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const rows = await adminSelect<Record<string, unknown>>("blog_posts", "select=*&order=updated_at.desc");
    if (rows) setPosts(rows.map((r) => fromDb<PostForm>(r)));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const set = (patch: Partial<PostForm>) => setForm((f) => (f ? { ...f, ...patch } : f));

  const startNew = () => { setForm(emptyForm()); setIsNew(true); setSlugTouched(false); setError(""); setNotice(""); };
  const startEdit = (p: PostForm) => { setForm({ ...p }); setIsNew(false); setSlugTouched(true); setError(""); setNotice(""); };

  const uploadImage = async (file: File): Promise<string | null> => {
    const res = await storageUpload(file);
    if (res.ok && res.url) return res.url;
    setError(res.error || "Image upload failed.");
    return null;
  };

  const save = async () => {
    if (!form) return;
    setError("");
    const title = form.title.trim();
    const slug = slugify(form.slug || form.title);
    if (!title) { setError("Title is required."); return; }
    if (!slug) { setError("URL slug is required."); return; }
    if (slug === "__no-articles") { setError('The slug "__no-articles" is reserved by the system. Please choose another.'); return; }
    // Featured image URL is validated SEPARATELY (it is rendered
    // outside the sanitised article HTML): HTTPS or safe relative
    // only — http:, javascript:, data:, blob: and protocol-relative
    // URLs are rejected at save time, and renderers re-check.
    const imgUrl = form.featuredImageUrl.trim();
    if (imgUrl && !isSafeImageUrl(imgUrl)) {
      setError("Featured image URL is not allowed. Use an HTTPS image URL (or the Upload button) — HTTP, javascript:, data:, blob: and protocol-relative URLs are rejected.");
      return;
    }
    if (posts.some((p) => p.slug === slug && p.id !== form.id)) {
      setError(`Another article already uses the slug "${slug}". Change the slug.`);
      return;
    }
    setSaving(true);
    // Sanitise at SAVE time with the shared DOMPurify allowlist
    // (lib/sanitize.js). The public page sanitises AGAIN at render
    // time through the same function — stored HTML is never trusted.
    const cleanHtml = sanitizeHtml(form.contentHtml || "");
    const publishedDate = form.status === "published" && !form.publishedDate
      ? new Date().toISOString().slice(0, 10)
      : form.publishedDate || null;
    const payload: Record<string, unknown> = {
      slug, title,
      excerpt: form.excerpt.trim(),
      contentHtml: cleanHtml,
      seoTitle: form.seoTitle.trim(),
      metaDescription: form.metaDescription.trim(),
      focusKeyword: form.focusKeyword.trim(),
      featuredImageUrl: form.featuredImageUrl.trim(),
      imageAlt: form.imageAlt.trim(),
      authorName: form.authorName.trim() || "N92 Edu-Italia",
      category: form.category.trim() || "Study in Italy",
      tags: form.tags.trim(),
      publishedDate,
      status: form.status,
    };
    if (isNew) {
      const id = `b-${slug}`;
      const res = await adminInsert("blog_posts", toDb({ id, ...payload }));
      setSaving(false);
      if (!res.ok) { setError(`Save failed — ${res.error || "the database rejected the change."}`); return; }
      await audit("create", "blog_posts", id);
      setNotice(`Article created as ${form.status}. ${form.status === "published" ? "It becomes a public page after the next successful site redeployment." : "Drafts stay private until published."}`);
    } else {
      const old = posts.find((p) => p.id === form.id);
      if (old) await snapshot("blog_posts", form.id, toDb(old as unknown as Record<string, unknown>));
      const res = await adminUpdate("blog_posts", `id=eq.${encodeURIComponent(form.id)}`, toDb(payload));
      setSaving(false);
      if (!res.ok) { setError(`Save failed — ${res.error || "the database rejected the change."}`); return; }
      await audit("update", "blog_posts", form.id);
      setNotice(`Article saved (${form.status}). ${form.status === "published" ? "Changes appear publicly after the next successful site redeployment." : ""}`);
    }
    setForm(null);
    void load();
  };

  const toggleStatus = async (p: PostForm) => {
    const next = p.status === "published" ? "draft" : "published";
    await snapshot("blog_posts", p.id, toDb(p as unknown as Record<string, unknown>));
    const patch: Record<string, unknown> = { status: next };
    if (next === "published" && !p.publishedDate) patch.publishedDate = new Date().toISOString().slice(0, 10);
    const res = await adminUpdate("blog_posts", `id=eq.${encodeURIComponent(p.id)}`, toDb(patch));
    if (!res.ok) { setError(`Status change failed — ${res.error || "the database rejected the change."}`); return; }
    await audit(next === "published" ? "publish" : "unpublish", "blog_posts", p.id);
    setNotice(next === "published"
      ? `"${p.title}" is marked Published. It becomes a public page after the next successful site redeployment.`
      : `"${p.title}" is back to Draft. It stays public until a successful redeployment rebuilds the site without it.`);
    void load();
  };

  const remove = async (p: PostForm) => {
    if (!window.confirm(`Delete "${p.title}" permanently? This cannot be undone.`)) return;
    await snapshot("blog_posts", p.id, toDb(p as unknown as Record<string, unknown>));
    const res = await adminDelete("blog_posts", `id=eq.${encodeURIComponent(p.id)}`);
    if (!res.ok) { setError(`Delete failed — ${res.error || "the database rejected the change."}`); return; }
    await audit("delete", "blog_posts", p.id);
    setNotice(`"${p.title}" deleted from the database. If it was published, its page disappears at the next successful redeployment.`);
    void load();
  };

  if (form) {
    return (
      <div>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold text-[#103f35]">{isNew ? "New article" : "Edit article"}</h2>
          <button type="button" onClick={() => setForm(null)} className="rounded-full border border-[#103f35]/25 px-4 py-1.5 text-[0.85rem] font-semibold text-[#103f35]">Back to list</button>
        </div>
        {error && <p role="alert" className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-[0.9rem] text-red-800">{error}</p>}

        <div className="mt-5 grid gap-4">
          <div>
            <label className={labelCls} htmlFor="blog-title">Title</label>
            <input id="blog-title" className={inputCls} value={form.title} onChange={(e) => {
              const title = e.target.value;
              set(slugTouched ? { title } : { title, slug: slugify(title) });
            }} placeholder="e.g. How to Apply to Italian Public Universities in 2027" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="blog-slug">URL slug</label>
              <input id="blog-slug" className={inputCls} value={form.slug} onChange={(e) => { setSlugTouched(true); set({ slug: e.target.value }); }} placeholder="how-to-apply-italian-universities-2027" />
              <p className="mt-1 text-[0.78rem] text-[#202824]/50">Public address: /blog/{slugify(form.slug || form.title) || "…"}/</p>
            </div>
            <div>
              <label className={labelCls} htmlFor="blog-status">Status</label>
              <select id="blog-status" className={inputCls} value={form.status} onChange={(e) => set({ status: e.target.value as PostForm["status"] })}>
                <option value="draft">Draft (private)</option>
                <option value="published">Published (goes public at next redeployment)</option>
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="blog-category">Category</label>
              <input id="blog-category" className={inputCls} list="blog-categories" value={form.category} onChange={(e) => set({ category: e.target.value })} />
              <datalist id="blog-categories">
                {[...CATEGORY_PRESETS, ...posts.map((p) => p.category)].filter((v, i, a) => a.indexOf(v) === i).map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label className={labelCls} htmlFor="blog-date">Publication date</label>
              <input id="blog-date" type="date" className={inputCls} value={form.publishedDate} onChange={(e) => set({ publishedDate: e.target.value })} />
            </div>
            <div>
              <label className={labelCls} htmlFor="blog-author">Author name</label>
              <input id="blog-author" className={inputCls} value={form.authorName} onChange={(e) => set({ authorName: e.target.value })} />
            </div>
            <div>
              <label className={labelCls} htmlFor="blog-tags">Tags (comma-separated)</label>
              <input id="blog-tags" className={inputCls} value={form.tags} onChange={(e) => set({ tags: e.target.value })} placeholder="admissions, 2027 intake, public universities" />
            </div>
          </div>

          <div>
            <label className={labelCls} htmlFor="blog-excerpt">Excerpt (listing summary)</label>
            <textarea id="blog-excerpt" className={inputCls} rows={2} value={form.excerpt} onChange={(e) => set({ excerpt: e.target.value })} placeholder="One or two honest sentences summarising the article." />
          </div>

          <div>
            <span className={labelCls}>Article content</span>
            <RichTextEditor
              key={form.id || "new"}
              initialHtml={form.contentHtml}
              onChange={(html) => set({ contentHtml: html })}
              onImageUpload={uploadImage}
            />
            <p className="mt-1 text-[0.78rem] text-[#202824]/50">Tip: use Heading 2 / Heading 3 for sections — the article page keeps a clean heading hierarchy automatically.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="blog-image">Featured image URL</label>
              <div className="flex gap-2">
                <input id="blog-image" className={inputCls} value={form.featuredImageUrl} onChange={(e) => set({ featuredImageUrl: e.target.value })} placeholder="https://…" />
                <label className="shrink-0 cursor-pointer rounded-lg bg-[#103f35] px-3 py-2 text-[0.85rem] font-semibold text-white">
                  Upload
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const url = await uploadImage(f); if (url) set({ featuredImageUrl: url }); } e.target.value = ""; }} />
                </label>
              </div>
              {form.featuredImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.featuredImageUrl} alt="" className="mt-2 h-28 w-auto rounded-lg border border-[#103f35]/15 object-cover" />
              )}
            </div>
            <div>
              <label className={labelCls} htmlFor="blog-image-alt">Featured image alt text</label>
              <input id="blog-image-alt" className={inputCls} value={form.imageAlt} onChange={(e) => set({ imageAlt: e.target.value })} placeholder="Describe the image for accessibility and SEO" />
            </div>
          </div>

          <fieldset className="rounded-xl border border-[#103f35]/15 bg-white p-4">
            <legend className="px-1 text-[0.8rem] font-bold uppercase tracking-wide text-[#103f35]">SEO</legend>
            <div className="grid gap-4">
              <div>
                <label className={labelCls} htmlFor="blog-seo-title">SEO title</label>
                <input id="blog-seo-title" className={inputCls} value={form.seoTitle} onChange={(e) => set({ seoTitle: e.target.value })} placeholder="Leave empty to use the article title" />
                <p className="mt-1 text-[0.78rem] text-[#202824]/50">{form.seoTitle.length}/60 characters recommended</p>
              </div>
              <div>
                <label className={labelCls} htmlFor="blog-meta">Meta description</label>
                <textarea id="blog-meta" className={inputCls} rows={2} value={form.metaDescription} onChange={(e) => set({ metaDescription: e.target.value })} placeholder="Leave empty to use the excerpt" />
                <p className="mt-1 text-[0.78rem] text-[#202824]/50">{form.metaDescription.length}/160 characters recommended</p>
              </div>
              <div>
                <label className={labelCls} htmlFor="blog-keyword">Focus keyword</label>
                <input id="blog-keyword" className={inputCls} value={form.focusKeyword} onChange={(e) => set({ focusKeyword: e.target.value })} placeholder="e.g. study in italy for indian students" />
              </div>
            </div>
          </fieldset>

          <div className="flex flex-wrap gap-3">
            <button type="button" disabled={saving} onClick={() => void save()} className="rounded-full bg-[#103f35] px-6 py-2.5 font-semibold text-white disabled:opacity-50">
              {saving ? "Saving…" : isNew ? "Create article" : "Save changes"}
            </button>
            <button type="button" onClick={() => setPreview(toPreviewPost(form))} className="inline-flex items-center gap-1.5 rounded-full border border-[#103f35]/30 px-5 py-2.5 font-semibold text-[#103f35]">
              <Eye size={16} aria-hidden="true" /> Preview
            </button>
            <button type="button" onClick={() => setForm(null)} className="rounded-full px-4 py-2.5 font-semibold text-[#202824]/60">Cancel</button>
          </div>
        </div>
        {preview && <PreviewModal post={preview} onClose={() => setPreview(null)} />}
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-xl border border-[#c7a05a]/50 bg-[#c7a05a]/10 px-4 py-3 text-[0.88rem] leading-relaxed text-[#5c4a1f]">
        <strong>How publishing works:</strong> this website is a static build. Saving an article updates the database;
        a Published article becomes a public page only after the next <strong>successful site redeployment</strong>
        (Cloudflare → Deployments → Retry deployment). If a deployment cannot reach the database it uses the last
        snapshot instead — so an <strong>unpublish is confirmed only once a successful deployment has completed</strong>.
      </div>
      {error && <p role="alert" className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-[0.9rem] text-red-800">{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-[0.9rem] text-emerald-900">{notice}</p>}

      <div className="mt-5 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-[#103f35]">Blog / Articles</h2>
        <button type="button" onClick={startNew} className="inline-flex items-center gap-1.5 rounded-full bg-[#103f35] px-4 py-2 text-[0.88rem] font-semibold text-white">
          <Plus size={16} aria-hidden="true" /> New article
        </button>
      </div>

      {loading ? (
        <p className="mt-6 text-[#202824]/60" role="status">Loading articles…</p>
      ) : posts.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-[#103f35]/25 p-8 text-center text-[#202824]/65">
          No articles yet. Create your first draft — it stays private until you publish it and redeploy the site.
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-2xl border border-[#103f35]/12 bg-white">
          <table className="w-full min-w-[720px] text-left text-[0.9rem]">
            <thead>
              <tr className="border-b border-[#103f35]/10 text-[0.75rem] uppercase tracking-wide text-[#103f35]/60">
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id} className="border-b border-[#103f35]/8 last:border-0">
                  <td className="px-4 py-3">
                    <span className="font-semibold text-[#103f35]">{p.title}</span>
                    <span className="block text-[0.78rem] text-[#202824]/50">/blog/{p.slug}/</span>
                  </td>
                  <td className="px-4 py-3">{p.category}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-[0.75rem] font-bold ${p.status === "published" ? "bg-emerald-100 text-emerald-800" : "bg-[#c7a05a]/20 text-[#8a6d35]"}`}>
                      {p.status === "published" ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3">{formatBlogDate(p.publishedDate || null) || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <button type="button" title="Preview" aria-label={`Preview ${p.title}`} onClick={() => setPreview(toPreviewPost(p))} className="rounded-lg border border-[#103f35]/20 p-1.5 text-[#103f35]"><Eye size={15} /></button>
                      <button type="button" title="Edit" aria-label={`Edit ${p.title}`} onClick={() => startEdit(p)} className="rounded-lg border border-[#103f35]/20 p-1.5 text-[#103f35]"><Pencil size={15} /></button>
                      <button type="button" onClick={() => void toggleStatus(p)} className="rounded-lg bg-[#103f35] px-2.5 py-1.5 text-[0.78rem] font-semibold text-white">
                        {p.status === "published" ? "Unpublish" : "Publish"}
                      </button>
                      <button type="button" title="Delete" aria-label={`Delete ${p.title}`} onClick={() => void remove(p)} className="rounded-lg border border-red-200 p-1.5 text-red-700"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {preview && <PreviewModal post={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

function PreviewModal({ post, onClose }: { post: BlogPost; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/50 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Article preview">
      <div className="relative mx-auto max-w-4xl rounded-2xl bg-[#faf9f5] pb-16 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-[#103f35]/10 bg-[#faf9f5]/95 px-4 py-3 backdrop-blur">
          <span className="text-[0.8rem] font-bold uppercase tracking-wide text-[#8a6d35]">
            Preview — {post.status === "published" ? "will look like this once deployed" : "draft, not public"}
          </span>
          <button type="button" onClick={onClose} aria-label="Close preview" className="rounded-full border border-[#103f35]/25 p-1.5 text-[#103f35]"><X size={16} /></button>
        </div>
        <ArticleView post={post} />
      </div>
    </div>
  );
}
