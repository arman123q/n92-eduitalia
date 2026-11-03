/**
 * Static guarantees for supabase/migration_008_blog.sql (owner
 * corrections of 3 Nov 2026): the migration must NOT create or
 * replace the existing production function touch_updated_at() — it
 * only references it from the blog_posts trigger — while still
 * creating the blog_posts table with its two RLS policies. The
 * behavioural proof (function definition byte-identical after the
 * migration runs, access rules for all three identities) lives in
 * the PostgreSQL rig: ~/workspace/pgtest/test-migration-008.mjs.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const sql = fs.readFileSync(new URL("../supabase/migration_008_blog.sql", import.meta.url), "utf8").toLowerCase();

test("migration_008 does not create or replace any function", () => {
  assert.ok(!/create\s+(or\s+replace\s+)?function/.test(sql), "migration must not touch touch_updated_at()");
  assert.ok(!/alter\s+function|drop\s+function/.test(sql), "migration must not alter or drop functions");
});

test("migration_008 trigger references the existing touch_updated_at()", () => {
  assert.ok(sql.includes("execute function public.touch_updated_at()"), "trigger must reference the production function");
});

test("migration_008 still creates blog_posts with both RLS policies", () => {
  assert.ok(sql.includes("create table if not exists public.blog_posts"));
  assert.ok(sql.includes("blog_public_read"), "public-read-published policy missing");
  assert.ok(sql.includes("blog_admin_write"), "owner-pinned write policy missing");
  assert.ok(sql.includes("sh10ad786@gmail.com"), "owner pin missing");
});
