/**
 * Cost calculator maths (framework-free, unit-tested).
 * Every figure is a user-editable planning assumption — never an official fee.
 */

/**
 * @param {{tuitionAnnual:number, monthly:{accommodation:number, food:number,
 * transport:number, insurance:number, materials:number, personal:number},
 * oneTime:{permit:number, setup:number, travel:number}, fxRateInr:number}} input
 */
export function computeBudget(input) {
  const m = input.monthly;
  const monthlyTotal = num(m.accommodation) + num(m.food) + num(m.transport) + num(m.insurance) + num(m.materials) + num(m.personal);
  const annualLiving = monthlyTotal * 12;
  const tuition = num(input.tuitionAnnual);
  const annualRecurring = annualLiving + tuition;
  const oneTimeTotal = num(input.oneTime.permit) + num(input.oneTime.setup) + num(input.oneTime.travel);
  const firstYearTotal = annualRecurring + oneTimeTotal;
  const fx = num(input.fxRateInr) || 0;
  return {
    monthlyTotal,
    annualLiving,
    tuition,
    annualRecurring,
    oneTimeTotal,
    firstYearTotal,
    inr: {
      monthlyTotal: Math.round(monthlyTotal * fx),
      firstYearTotal: Math.round(firstYearTotal * fx),
      annualRecurring: Math.round(annualRecurring * fx),
    },
  };
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Low / typical / high scenarios from explicitly defined multipliers. */
export function scenarios(input) {
  const scale = (factor) => ({
    ...input,
    monthly: Object.fromEntries(Object.entries(input.monthly).map(([k, v]) => [k, Math.round(num(v) * factor)])),
  });
  return {
    low: computeBudget(scale(0.8)),
    typical: computeBudget(input),
    high: computeBudget(scale(1.3)),
  };
}
