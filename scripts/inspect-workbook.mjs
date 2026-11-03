import * as XLSX from "xlsx";
import fs from "node:fs";

const path = "/home/hatch/workspace/user/files/N92_Student_Essentials_Enriched_Working.xlsx";
const wb = XLSX.read(fs.readFileSync(path));
console.log("sheets:", wb.SheetNames);
for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
  const grid = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  console.log("---", name, "| data rows:", rows.length, "| range:", ws["!ref"]);
  console.log("headers:", JSON.stringify(grid[0]));
  rows.slice(0, 3).forEach((r, i) => console.log(`row${i + 1}:`, JSON.stringify(r).slice(0, 500)));
  // Column value census for the key columns
  const keys = Object.keys(rows[0] ?? {});
  for (const k of keys) {
    const filled = rows.filter((r) => String(r[k] ?? "").trim() !== "").length;
    console.log(`  col "${k}": ${filled}/${rows.length} filled`);
  }
}
