#!/usr/bin/env python3
"""
convert-checklist.py — convert the owner's Book1.ods (the original
Student Essentials checklist) into data/checklist-snapshot.json.

The spreadsheet is hand-made, so the parser is column-aware and
defensive (verified against the real file on 3 Nov 2026):
  * Column A = sequential line number; B = category code on header
    rows, a per-category sub-number on some rows, or (on a few
    rows) the item name itself; C = item name / category name;
    D = pack location on category header rows; E = packed flag
    (the author's personal tick state — not content, ignored).
  * A row whose B cell is exactly a category code and whose C cell
    is non-empty starts a new category (name from C, pack location
    from D).
  * An item row has a numeric A cell and a name in C, or in B when
    B holds non-numeric text.
  * A row with text but NO numeric A cell is a CONTINUATION of the
    previous item (appended to its description); before a
    category's first item it becomes the category intro.
  * Numbered rows with no text at all are blank — counted and
    reported, never turned into items.

Italy flagging (owner rules): original wording and structure are
preserved exactly; US-specific items are flagged, never deleted.
  * I-20 / SEVIS -> not-applicable (US visa system).
  * ALL Medicine (B) items -> review + informational-only note.
  * US-pin adapters -> review (Italy: Type C/L, 230V).
  * Category J ("To buy in Brooklyn") items -> review with a note
    (US shopping list; buy in Italy instead).
  * A few food items -> review (EU customs check).
Everything else defaults to applicable. The admin can change any
flag afterwards. Run: python3 scripts/convert-checklist.py Book1.ods
"""
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

T = "urn:oasis:names:tc:opendocument:xmlns:table:1.0"
CODES = ["A", "B", "C1", "C2", "D", "E1", "E2", "F", "G", "H", "J"]

MEDICINE_NOTE = (
    "Informational only — this is not medical advice and N92 does not recommend medicines or dosages. "
    "Carry medicines only with your doctor's prescription, and check airline and Italian customs rules before travelling."
)
US_ADAPTER_NOTE = "Italy uses Type C/L plugs at 230V — you need India-to-EU (Type C/L) adapters, not US-pin ones."
SPIKE_NOTE = "Check plug compatibility for Italy (Type C/L sockets, 230V) before packing."
FOOD_NOTE = "Check current EU/Italy customs rules for food items before packing."
BROOKLYN_NOTE = (
    "This item comes from a list written for buying in Brooklyn, USA (Walmart/Best Buy). "
    "The item itself may still be useful — buy it in Italy or from an Italian/EU store instead, and check EU plugs and voltage for electronics."
)
NOT_APPLICABLE_NOTES = {
    "I-20": "US student-visa document — not used for Italy. Italy requires a national study visa and, after arrival, a residence permit (permesso di soggiorno).",
    "SEVIS Fee Receipt": "SEVIS is a US-only system — it has no role in the Italian visa process.",
}


def cell_text(c) -> str:
    return " ".join("".join(p.itertext()) for p in c.iter() if p.tag.endswith("}p")).strip()


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit("usage: convert-checklist.py <Book1.ods>")
    with zipfile.ZipFile(sys.argv[1]) as z:
        root = ET.fromstring(z.read("content.xml"))
    table = root.find(".//table:table", {"table": T})

    categories, items = [], []
    current = None
    blanks = 0
    continuations = 0
    for row in table.findall(f"{{{T}}}table-row"):
        cols: dict[int, str] = {}
        col = 0
        for c in row.findall(f"{{{T}}}table-cell"):
            rep = int(c.get(f"{{{T}}}number-columns-repeated", "1"))
            txt = cell_text(c)
            if txt:
                cols[col] = txt
            col += rep
        a, b, cc, d = cols.get(0, ""), cols.get(1, ""), cols.get(2, ""), cols.get(3, "")

        # Category header: B is a code, C is the category name, and
        # A carries the row's line number (the sheet's junk letter
        # row R1 also has B='A', C='B' but no line number).
        if b in CODES and cc and re.fullmatch(r"\d+", a or ""):
            current = {"code": b, "name": cc, "displayOrder": len(categories) + 1}
            if d:
                if b == "J":
                    current["intro"] = f"Sheet note: {d}"
                else:
                    current["packLocation"] = d
            categories.append(current)
            continue
        # Junk/header rows (letter row, column titles).
        if a in ("", "1") and b in ("", "Sr. No."):
            continue
        # Item row: numeric A + a name in C, or in B (non-numeric).
        if re.fullmatch(r"\d+", a or ""):
            name = cc or (b if b and not re.fullmatch(r"\d+", b) else "")
            if not name:
                blanks += 1
                continue
            assert current is not None, f"item before any category: {name}"
            items.append({
                "sr": int(a), "categoryCode": current["code"], "name": name,
                "description": "", "note": "", "italyStatus": "applicable",
            })
            continue
        # Continuation row: text with no numeric A.
        text = " ".join(v for k, v in sorted(cols.items()) if v)
        if text and current is None:
            continue  # preamble (e.g. the A-Z letter row) — not content
        if text:
            continuations += 1
            if items and items[-1]["categoryCode"] == (current or {}).get("code"):
                prev = items[-1]
                prev["description"] = (prev["description"] + " " + text).strip()
            elif current is not None:
                current["intro"] = ((current.get("intro", "") + " " + text).strip())

    # ---- Italy flags ----
    for it in items:
        code, name = it["categoryCode"], it["name"]
        if name in NOT_APPLICABLE_NOTES:
            it["italyStatus"], it["note"] = "not-applicable", NOT_APPLICABLE_NOTES[name]
        elif code == "B":
            it["italyStatus"], it["note"] = "review", MEDICINE_NOTE
        elif code == "J":
            it["italyStatus"], it["note"] = "review", BROOKLYN_NOTE
        elif "US pin" in name:
            it["italyStatus"], it["note"] = "review", US_ADAPTER_NOTE
        elif "Spike-Buster" in name:
            it["italyStatus"], it["note"] = "review", SPIKE_NOTE
        elif code == "C2" and any(k in name for k in ("Pickle", "Paste Bottles")):
            it["italyStatus"], it["note"] = "review", FOOD_NOTE

    # ---- ids + per-category order ----
    per_cat: dict[str, int] = {}
    for it in items:
        per_cat[it["categoryCode"]] = per_cat.get(it["categoryCode"], 0) + 1
        it["displayOrder"] = per_cat[it["categoryCode"]]
        it["id"] = f"{it['categoryCode'].lower()}-{it.pop('sr')}"

    out = {
        "meta": {"source": "Book1.ods via scripts/convert-checklist.py", "itemCount": len(items),
                 "blankNumberedRowsSkipped": blanks, "continuationRowsAttached": continuations},
        "categories": categories, "items": items,
    }
    dest = Path(__file__).resolve().parent.parent / "data" / "checklist-snapshot.json"
    dest.write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n", encoding="utf8")

    from collections import Counter
    print("categories:", [(c["code"], c["name"]) for c in categories])
    for c in categories:
        print(f"  {c['code']}: {per_cat.get(c['code'], 0)} items")
    print("flags:", dict(Counter(i["italyStatus"] for i in items)))
    print(f"TOTAL: {len(items)} items | blank numbered rows skipped: {blanks} | continuations attached: {continuations}")
    print(f"-> {dest}")


if __name__ == "__main__":
    main()
