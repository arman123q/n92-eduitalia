import test from "node:test";
import assert from "node:assert/strict";
import { computeBudget, scenarios } from "../lib/calc.js";

const INPUT = {
  tuitionAnnual: 2000,
  monthly: { accommodation: 400, food: 250, transport: 30, insurance: 15, materials: 25, personal: 100 },
  oneTime: { permit: 170, setup: 500, travel: 400 },
  fxRateInr: 100,
};

test("monthly total sums all categories", () => {
  assert.equal(computeBudget(INPUT).monthlyTotal, 820);
});

test("annual recurring = 12 x monthly + tuition; one-time NOT annualised", () => {
  const r = computeBudget(INPUT);
  assert.equal(r.annualLiving, 9840);
  assert.equal(r.annualRecurring, 11840);
  assert.equal(r.oneTimeTotal, 1070);
  assert.equal(r.firstYearTotal, 12910);
});

test("INR conversion uses the provided rate", () => {
  const r = computeBudget(INPUT);
  assert.equal(r.inr.firstYearTotal, 1291000);
  assert.equal(r.inr.monthlyTotal, 82000);
});

test("invalid / negative values are treated as zero", () => {
  const r = computeBudget({ ...INPUT, monthly: { ...INPUT.monthly, food: -5, transport: "x" } });
  assert.equal(r.monthlyTotal, 820 - 250 - 30);
});

test("scenarios scale monthly costs only (low 0.8x, high 1.3x, per-category rounding)", () => {
  const s = scenarios(INPUT);
  assert.equal(s.low.monthlyTotal, 656); // 320+200+24+12+20+80
  assert.equal(s.high.monthlyTotal, 1067); // 520+325+39+20+33+130 (categories rounded individually)
  assert.equal(s.low.tuition, s.high.tuition);
  assert.equal(s.typical.firstYearTotal, computeBudget(INPUT).firstYearTotal);
});
