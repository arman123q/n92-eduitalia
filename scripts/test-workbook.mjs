/**
 * Workbook acceptance test (parse + validate ONLY — no import,
 * no writes): runs the owner's enriched workbook through the
 * real import engine and prints the census the delivery reports.
 */
import * as XLSX from "xlsx";
import fs from "node:fs";
import { prepareImport } from "../lib/import-products.js";

const wb = XLSX.read(fs.readFileSync("/home/hatch/workspace/user/files/N92_Student_Essentials_Enriched_Working.xlsx"));
const ws = wb.Sheets[wb.SheetNames[0]];
const objects = XLSX.utils.sheet_to_json(ws, { defval: "" });
const rows = prepareImport(objects, ["Portronics JuicemateGo Pro 12W Universal International Travel Adapter"]);

const blank = rows.filter((r) => r.blank);
const withProduct = rows.filter((r) => r.product);
const nameErrors = rows.filter((r) => r.errors.some((e) => e.includes("name is required")));
const errorRows = rows.filter((r) => r.errors.length);
const warnRows = rows.filter((r) => r.warnings.length);
const dupes = rows.filter((r) => r.duplicate);
const cats = {};
for (const r of withProduct) cats[r.product.category] = (cats[r.product.category] ?? 0) + 1;

console.log(`sheet: ${wb.SheetNames[0]} | data rows: ${rows.length}`);
console.log(`blank rows: ${blank.length}`);
console.log(`rows with a resolved product: ${withProduct.length}`);
console.log(`"Product name is required" errors: ${nameErrors.length}`);
console.log(`rows with any error: ${errorRows.length}`);
for (const r of errorRows.slice(0, 6)) console.log(`  row ${r.rowNumber}: ${r.errors.join(" | ")}`);
console.log(`rows with warnings: ${warnRows.length} (first warning: ${warnRows[0]?.warnings[0] ?? "—"})`);
console.log(`duplicates flagged: ${dupes.length}`);
for (const r of dupes) console.log(`  row ${r.rowNumber}: "${r.product.name}" (${r.duplicate})`);
console.log(`statuses: ${JSON.stringify(withProduct.reduce((a, r) => ((a[r.product.status] = (a[r.product.status] ?? 0) + 1), a), {}))}`);
console.log(`offers created: ${withProduct.reduce((a, r) => a + r.product.offers.length, 0)} (search links intentionally not mapped)`);
console.log(`categories: ${JSON.stringify(cats)}`);
console.log("first 8 product names:");
for (const r of withProduct.slice(0, 8)) console.log(`  row ${r.rowNumber}: ${r.product.name}`);
const ok = nameErrors.length === 0 && withProduct.length >= 200;
console.log(ok ? "\nWORKBOOK PARSE: NAMES RESOLVED" : "\nWORKBOOK PARSE: PROBLEM");
process.exit(ok ? 0 : 1);
