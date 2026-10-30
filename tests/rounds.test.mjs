import test from "node:test";
import assert from "node:assert/strict";
import {
  computeRoundStatus, sortRounds, isActiveNotice, sortNotices,
  romeLocalToUtcIso, utcToRomeLocal,
} from "../lib/rounds.js";

const NOW = new Date("2026-10-30T12:00:00Z");
const base = { opensAt: "2026-10-01T00:00:00Z", deadlineAt: "2026-12-31T23:59:00Z", deadlineVerified: true, manualStatus: null };

test("open when inside window and deadline far away", () => {
  assert.equal(computeRoundStatus(base, NOW), "open");
});

test("closing soon within 7 days of deadline", () => {
  assert.equal(computeRoundStatus({ ...base, deadlineAt: "2026-11-05T00:00:00Z" }, NOW), "closing-soon");
  assert.equal(computeRoundStatus({ ...base, deadlineAt: "2026-11-06T12:00:01Z" }, NOW), "open");
});

test("upcoming before opening", () => {
  assert.equal(computeRoundStatus({ ...base, opensAt: "2026-12-01T00:00:00Z" }, NOW), "upcoming");
});

test("closed after deadline", () => {
  assert.equal(computeRoundStatus({ ...base, deadlineAt: "2026-10-01T00:00:00Z" }, NOW), "closed");
});

test("unverified deadline is NEVER shown open/closed", () => {
  assert.equal(computeRoundStatus({ ...base, deadlineVerified: false }, NOW), "not-verified");
  assert.equal(computeRoundStatus({ ...base, deadlineAt: null }, NOW), "not-verified");
  assert.equal(computeRoundStatus({ ...base, deadlineVerified: false, deadlineAt: "2020-01-01T00:00:00Z" }, NOW), "not-verified");
});

test("manual status overrides computation", () => {
  assert.equal(computeRoundStatus({ ...base, manualStatus: "results-published" }, NOW), "results-published");
  assert.equal(computeRoundStatus({ ...base, manualStatus: "awaiting-confirmation", deadlineVerified: false, deadlineAt: null }, NOW), "awaiting-confirmation");
});

test("sortRounds: pinned first, closing-soon before open, closed last, dedupes", () => {
  const rounds = [
    { id: "a", deadlineAt: "2026-12-31T00:00:00Z", deadlineVerified: true },
    { id: "b", deadlineAt: "2026-11-02T00:00:00Z", deadlineVerified: true },
    { id: "c", deadlineAt: "2026-11-02T00:00:00Z", deadlineVerified: true, pinned: true },
    { id: "d", deadlineAt: "2026-01-01T00:00:00Z", deadlineVerified: true },
    { id: "b", deadlineAt: "2026-11-02T00:00:00Z", deadlineVerified: true },
  ];
  const sorted = sortRounds(rounds, NOW);
  assert.deepEqual(sorted.map((r) => r.id), ["c", "b", "a", "d"]);
});

test("notice window: expired and future notices are inactive", () => {
  assert.equal(isActiveNotice({ status: "published", endsAt: "2026-10-01T00:00:00Z" }, NOW), false);
  assert.equal(isActiveNotice({ status: "published", startsAt: "2026-12-01T00:00:00Z" }, NOW), false);
  assert.equal(isActiveNotice({ status: "published", startsAt: "2026-10-01T00:00:00Z", endsAt: "2026-12-01T00:00:00Z" }, NOW), true);
  assert.equal(isActiveNotice({ status: "draft" }, NOW), false);
});

test("sortNotices: pinned, then priority, dedupes", () => {
  const notices = [
    { id: "n1", priority: "normal", createdAt: "2026-10-01" },
    { id: "n2", priority: "urgent", createdAt: "2026-10-02" },
    { id: "n3", priority: "low", pinned: true, createdAt: "2026-10-03" },
    { id: "n2", priority: "urgent", createdAt: "2026-10-02" },
  ];
  assert.deepEqual(sortNotices(notices).map((n) => n.id), ["n3", "n2", "n1"]);
});

test("Rome conversions handle CET (winter, UTC+1) and CEST (summer, UTC+2)", () => {
  assert.equal(romeLocalToUtcIso("2027-01-15T12:00"), "2027-01-15T11:00:00.000Z");
  assert.equal(romeLocalToUtcIso("2026-07-15T12:00"), "2026-07-15T10:00:00.000Z");
  assert.equal(utcToRomeLocal("2027-01-15T11:00:00.000Z"), "2027-01-15T12:00");
  assert.equal(utcToRomeLocal("2026-07-15T10:00:00.000Z"), "2026-07-15T12:00");
});
