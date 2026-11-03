/**
 * Static guards on migration_009_student_essentials.sql — the
 * behavioural proof lives in the PG rig
 * (~/workspace/pgtest/test-migration-009.mjs, 16/16); these keep
 * the file's safety invariants from regressing in an edit.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const sql = fs.readFileSync(new URL("../supabase/migration_009_student_essentials.sql", import.meta.url), "utf8");
const OWNER = "sh10ad786@gmail.com";

test("creates exactly the three essentials tables", () => {
  for (const t of ["checklist_categories", "checklist_items", "essential_products"]) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${t}`));
  }
});

test("every write policy is pinned to the owner account (3 tables)", () => {
  assert.equal((sql.match(new RegExp(OWNER.replace(".", "\\."), "g")) || []).length, 6, "3 tables × using + with check");
});

test("public reads are published-only on all three tables", () => {
  assert.match(sql, /checklist_categories_public_read[\s\S]*?using \(published = true\)/);
  assert.match(sql, /checklist_items_public_read[\s\S]*?using \(published = true\)/);
  assert.match(sql, /essential_products_public_read[\s\S]*?using \(status = 'published'\)/);
});

test("never redefines touch_updated_at() — only references it in triggers", () => {
  assert.ok(!/create( or replace)? function public\.touch_updated_at/.test(sql));
  assert.equal((sql.match(/execute function public\.touch_updated_at\(\)/g) || []).length, 3);
});

test("italy_status is constrained to the three approved values", () => {
  assert.match(sql, /italy_status in \('applicable', 'review', 'not-applicable'\)/);
});

test("no service-role key, no leads table access, RLS enabled everywhere", () => {
  assert.ok(!/service_role/i.test(sql));
  assert.ok(!/public\.leads/.test(sql));
  assert.equal((sql.match(/enable row level security/g) || []).length, 3);
});
