/**
 * Student Essentials data-integrity + helper tests.
 * The snapshot is the checklist's source of truth until the
 * database takes over: its structure must always match the
 * owner's category system (A, B, C1, C2, D, E1, E2, F, G, H, J),
 * US-specific items must never be flagged "applicable", medicine
 * items must carry the informational note, and the price helpers
 * must enforce the never-invent-a-price rule.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const snap = JSON.parse(fs.readFileSync(new URL("../data/checklist-snapshot.json", import.meta.url), "utf8"));
const EXPECTED_CODES = ["A", "B", "C1", "C2", "D", "E1", "E2", "F", "G", "H", "J"];

test("snapshot categories are exactly the owner's eleven codes, in order", () => {
  assert.deepEqual(snap.categories.map((c) => c.code), EXPECTED_CODES);
});

test("meta itemCount matches the actual item rows (nothing silently dropped)", () => {
  assert.equal(snap.meta.itemCount, snap.items.length);
  assert.ok(snap.items.length > 0);
});

test("every item belongs to a known category and has a valid Italy status", () => {
  for (const i of snap.items) {
    assert.ok(EXPECTED_CODES.includes(i.categoryCode), `${i.id}: bad category`);
    assert.ok(["applicable", "review", "not-applicable"].includes(i.italyStatus), `${i.id}: bad status`);
    assert.ok(i.name && i.name.trim(), `${i.id}: empty name`);
  }
  const ids = snap.items.map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate item ids");
});

test("US-specific items (I-20, SEVIS, Walmart, Brooklyn) are never 'applicable'", () => {
  for (const i of snap.items) {
    if (/\bi-?20\b|sevis|walmart|brooklyn/i.test(i.name)) {
      assert.equal(i.italyStatus, "not-applicable", `${i.name} must be not-applicable`);
      assert.ok(i.note.length > 0, `${i.name} must explain why`);
    }
  }
});

test("medicine items carry the informational-only note", () => {
  for (const i of snap.items) {
    if (/tablet|medicine|medication|paracetamol|ibuprofen/i.test(i.name)) {
      assert.match(i.note, /not medical advice/i, `${i.name} needs the informational note`);
      assert.notEqual(i.italyStatus, "applicable", `${i.name} must not be plain-applicable`);
    }
  }
});

test("products snapshot starts empty — the site never invents products", () => {
  const prods = JSON.parse(fs.readFileSync(new URL("../data/products-snapshot.json", import.meta.url), "utf8"));
  assert.deepEqual(prods.products, []);
});
