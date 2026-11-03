"use client";

/**
 * Student Essentials — PRODUCTS bulk import (Excel/CSV).
 * Flow: choose file → parse (CSV natively; XLSX via a lazily
 * loaded SheetJS chunk) → validate with lib/import-products.js
 * → PREVIEW with row-level errors/warnings and duplicate flags
 * → import the selected rows in small batches with a progress
 * bar. Existing products are never overwritten or deleted:
 * duplicates are excluded by design, and every import is a
 * plain INSERT through the existing admin helpers (same auth +
 * RLS as the manual form; no service-role key anywhere).
 */
import { useMemo, useRef, useState } from "react";
import { adminInsert, audit, toDb } from "@/lib/admin";
// @ts-ignore - plain JS module
import { prepareImport, buildTemplateCsv } from "@/lib/import-products.js";

interface PreparedRow {
  rowNumber: number;
  blank?: boolean;
  product: Record<string, unknown> | null;
  errors: string[];
  warnings: string[];
  duplicate?: "existing" | "file";
}

const slugId = (name: string, salt: string) =>
  `p-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "product"}-${salt}`;

export default function ProductsImport({ existingNames, onImported }: { existingNames: string[]; onImported: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<PreparedRow[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [parseError, setParseError] = useState("");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [results, setResults] = useState<{ name: string; ok: boolean; error?: string }[]>([]);
  const [importing, setImporting] = useState(false);

  const usable = useMemo(() => (rows ?? []).filter((r) => !r.blank), [rows]);
  const ready = useMemo(() => usable.filter((r) => r.product && !r.duplicate), [usable]);
  const counts = {
    ready: ready.length,
    warnings: usable.filter((r) => r.product && !r.duplicate && r.warnings.length).length,
    errors: usable.filter((r) => r.errors.length).length,
    duplicates: usable.filter((r) => r.duplicate).length,
    blank: (rows ?? []).length - usable.length,
  };

  const handleFile = async (file: File) => {
    setParseError("");
    setResults([]);
    setProgress(null);
    setFileName(file.name);
    try {
      let objects: Record<string, unknown>[];
      if (/\.xlsx$/i.test(file.name)) {
        const XLSX = await import("xlsx");
        const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        if (!ws) throw new Error("The workbook has no sheets.");
        objects = XLSX.utils.sheet_to_json(ws, { defval: "" }) as Record<string, unknown>[];
      } else if (/\.csv$/i.test(file.name)) {
        const { parseCsv } = await import("@/lib/import-products.js");
        objects = parseCsv(await file.text()) as Record<string, unknown>[];
      } else {
        throw new Error("Please choose an .xlsx or .csv file.");
      }
      if (!objects.length) throw new Error("No data rows found. The first row must be the column headers.");
      const prepared = prepareImport(objects, existingNames) as PreparedRow[];
      setRows(prepared);
      setSelected(new Set(prepared.filter((r) => r.product && !r.duplicate).map((r) => r.rowNumber)));
    } catch (e) {
      setRows(null);
      setParseError(e instanceof Error ? e.message : "The file could not be read.");
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([buildTemplateCsv()], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "n92-products-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const runImport = async () => {
    const chosen = ready.filter((r) => selected.has(r.rowNumber));
    if (!chosen.length) return;
    setImporting(true);
    setResults([]);
    setProgress({ done: 0, total: chosen.length });
    const out: { name: string; ok: boolean; error?: string }[] = [];
    const stamp = Date.now().toString(36);
    let i = 0;
    for (const row of chosen) {
      const product = row.product as { name: string };
      const id = slugId(product.name, `${stamp}${i.toString(36)}`);
      const res = await adminInsert("essential_products", toDb({ id, ...product }));
      if (res.ok) await audit("essential_products", id, "create");
      out.push({ name: product.name, ok: res.ok, error: res.error });
      i++;
      setResults([...out]);
      setProgress({ done: i, total: chosen.length });
      // small batches breathe: yield to the UI every 3 rows
      if (i % 3 === 0) await new Promise((r) => setTimeout(r, 30));
    }
    setImporting(false);
    onImported();
  };

  const toggle = (rowNumber: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(rowNumber)) next.delete(rowNumber); else next.add(rowNumber);
      return next;
    });

  return (
    <div className="mt-4 rounded-xl bg-white p-5 ring-1 ring-[#103f35]/10">
      <h4 className="font-display text-base font-bold text-[#103f35]">Import Products (Excel/CSV)</h4>
      <p className="mt-1 max-w-3xl text-sm leading-relaxed text-[#202824]/60">
        Upload an .xlsx or .csv file using the template columns. You will see a full preview before anything is saved.
        Existing products are <strong>never overwritten or deleted</strong> — a product whose name already exists is skipped as a
        duplicate. Blank prices, links and offers stay blank (nothing is invented); only the product name is required.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.csv"
          className="hidden"
          aria-label="Choose an Excel or CSV file to import"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = ""; }}
        />
        <button type="button" className="btn-primary !px-4 !py-2 text-sm" onClick={() => fileRef.current?.click()}>
          Choose Excel/CSV file…
        </button>
        <button type="button" className="btn-ghost !px-4 !py-2 text-sm" onClick={downloadTemplate}>
          Download CSV template
        </button>
        {fileName && <span className="text-sm font-medium text-[#202824]/70">{fileName}</span>}
      </div>
      {parseError && <p className="mt-3 rounded-lg bg-[#b3392e]/10 px-4 py-2.5 text-sm text-[#b3392e]" role="alert">{parseError}</p>}

      {rows && (
        <div className="mt-5">
          <div className="flex flex-wrap gap-2 text-[0.8rem] font-bold" role="status">
            <span className="rounded-full bg-[#103f35]/10 px-3 py-1 text-[#103f35]">{counts.ready} ready</span>
            {counts.warnings > 0 && <span className="rounded-full bg-[#C7A05A]/20 px-3 py-1 text-[#8a6d35]">{counts.warnings} with warnings</span>}
            {counts.errors > 0 && <span className="rounded-full bg-[#b3392e]/12 px-3 py-1 text-[#b3392e]">{counts.errors} with errors (cannot import)</span>}
            {counts.duplicates > 0 && <span className="rounded-full bg-[#202824]/10 px-3 py-1 text-[#202824]/60">{counts.duplicates} duplicates (skipped)</span>}
            {counts.blank > 0 && <span className="rounded-full bg-[#202824]/6 px-3 py-1 text-[#202824]/50">{counts.blank} blank rows ignored</span>}
          </div>

          <div className="mt-3 max-h-[380px] overflow-y-auto rounded-lg ring-1 ring-[#103f35]/10">
            <table className="w-full text-left text-[0.85rem]">
              <thead className="sticky top-0 bg-[#FAF9F5]">
                <tr>
                  <th className="px-3 py-2 font-bold text-[#103f35]">Import</th>
                  <th className="px-3 py-2 font-bold text-[#103f35]">Row</th>
                  <th className="px-3 py-2 font-bold text-[#103f35]">Product</th>
                  <th className="px-3 py-2 font-bold text-[#103f35]">Status</th>
                  <th className="px-3 py-2 font-bold text-[#103f35]">Offers</th>
                  <th className="px-3 py-2 font-bold text-[#103f35]">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#103f35]/8">
                {usable.map((r) => {
                  const importable = !!r.product && !r.duplicate;
                  const offers = (r.product?.offers as unknown[] | undefined)?.length ?? 0;
                  return (
                    <tr key={r.rowNumber} className={r.errors.length ? "bg-[#b3392e]/4" : r.duplicate ? "opacity-55" : ""}>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          aria-label={`Import row ${r.rowNumber}`}
                          disabled={!importable || importing}
                          checked={importable && selected.has(r.rowNumber)}
                          onChange={() => toggle(r.rowNumber)}
                        />
                      </td>
                      <td className="px-3 py-2 font-medium">{r.rowNumber}</td>
                      <td className="px-3 py-2">
                        <span className="font-semibold text-[#202824]">{String(r.product?.name ?? "(no name)")}</span>
                        {r.product?.category ? <span className="block text-[0.78rem] text-[#202824]/55">{String(r.product.category)}</span> : null}
                      </td>
                      <td className="px-3 py-2">{r.product ? String(r.product.status) : "—"}</td>
                      <td className="px-3 py-2">{r.product ? offers : "—"}</td>
                      <td className="px-3 py-2">
                        {r.duplicate && <span className="block font-semibold text-[#202824]/60">{r.duplicate === "existing" ? "Duplicate — already exists, will be skipped" : "Duplicate — same name appears earlier in this file"}</span>}
                        {r.errors.map((e) => <span key={e} className="block font-medium text-[#b3392e]">{e}</span>)}
                        {r.warnings.map((w) => <span key={w} className="block text-[#8a6d35]">{w}</span>)}
                        {importable && !r.errors.length && !r.warnings.length && <span className="text-[#202824]/45">Ready</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {progress && (
            <div className="mt-4" role="status">
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#103f35]/10">
                <div className="h-full rounded-full bg-[#103F35] transition-all duration-300" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
              </div>
              <p className="mt-1.5 text-sm font-medium text-[#202824]/70">
                {importing ? `Importing… ${progress.done} of ${progress.total}` : `Finished: ${results.filter((x) => x.ok).length} imported, ${results.filter((x) => !x.ok).length} failed.`}
              </p>
              {results.filter((x) => !x.ok).map((x) => (
                <p key={x.name} className="text-sm text-[#b3392e]">“{x.name}” failed — {x.error}</p>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary !px-5 !py-2.5 text-sm"
              disabled={importing || selected.size === 0}
              onClick={() => void runImport()}
            >
              {importing ? "Importing…" : `Import ${selected.size} selected product${selected.size === 1 ? "" : "s"}`}
            </button>
            <p className="self-center text-[0.82rem] text-[#202824]/55">
              Rows with errors cannot be imported — fix them in the spreadsheet and re-upload. Nothing is saved until you press Import.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
