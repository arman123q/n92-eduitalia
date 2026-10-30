/**
 * Admission-round status engine + notice helpers (framework-free, tested).
 * Dates are stored as UTC instants. The ADMIN enters times as Europe/Rome
 * wall-clock; conversions here make that explicit and correct (CET/CEST).
 * A round is NEVER shown open/closed from an unverified deadline.
 */

export const CLOSING_SOON_DAYS = 7;

export const ROUND_STATUS_META = {
  upcoming: { label: "UPCOMING", urgent: false },
  open: { label: "OPEN", urgent: false },
  "closing-soon": { label: "CLOSING SOON", urgent: true },
  closed: { label: "CLOSED", urgent: false },
  "results-published": { label: "RESULTS PUBLISHED", urgent: false },
  "awaiting-confirmation": { label: "AWAITING OFFICIAL CONFIRMATION", urgent: false },
  "not-verified": { label: "NOT VERIFIED", urgent: false },
};

/**
 * Compute the display status of a round.
 * round: { opensAt, deadlineAt, deadlineVerified, manualStatus }
 * now: Date
 */
export function computeRoundStatus(round, now = new Date()) {
  if (round.manualStatus) return round.manualStatus;
  if (!round.deadlineVerified || !round.deadlineAt) return "not-verified";
  const deadline = new Date(round.deadlineAt).getTime();
  const t = now.getTime();
  if (Number.isNaN(deadline)) return "not-verified";
  if (t > deadline) return "closed";
  if (round.opensAt) {
    const opens = new Date(round.opensAt).getTime();
    if (!Number.isNaN(opens) && t < opens) return "upcoming";
  }
  if (deadline - t <= CLOSING_SOON_DAYS * 24 * 3600 * 1000) return "closing-soon";
  return "open";
}

const URGENCY_RANK = {
  "closing-soon": 0,
  open: 1,
  upcoming: 2,
  "not-verified": 3,
  "awaiting-confirmation": 4,
  "results-published": 5,
  closed: 6,
};

/** Dedupe by id, pinned first, then by urgency (nearest deadline first). */
export function sortRounds(rounds, now = new Date()) {
  const seen = new Set();
  const list = [];
  for (const r of rounds) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    list.push({ ...r, computedStatus: computeRoundStatus(r, now) });
  }
  return list.sort((a, b) => {
    if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
    const rank = URGENCY_RANK[a.computedStatus] - URGENCY_RANK[b.computedStatus];
    if (rank !== 0) return rank;
    const da = a.deadlineAt ? new Date(a.deadlineAt).getTime() : Infinity;
    const db = b.deadlineAt ? new Date(b.deadlineAt).getTime() : Infinity;
    return a.computedStatus === "closed" ? db - da : da - db;
  });
}

/** A notice is publicly active when published and inside its window. */
export function isActiveNotice(notice, now = new Date()) {
  if (notice.status !== "published") return false;
  const t = now.getTime();
  if (notice.startsAt && new Date(notice.startsAt).getTime() > t) return false;
  if (notice.endsAt && new Date(notice.endsAt).getTime() < t) return false;
  return true;
}

const PRIORITY_RANK = { urgent: 0, high: 1, normal: 2, low: 3 };

export function sortNotices(notices) {
  const seen = new Set();
  const list = notices.filter((n) => {
    if (seen.has(n.id)) return false;
    seen.add(n.id);
    return true;
  });
  return list.sort((a, b) => {
    if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
    const rank = (PRIORITY_RANK[a.priority] ?? 2) - (PRIORITY_RANK[b.priority] ?? 2);
    if (rank !== 0) return rank;
    return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
  });
}

/** Offset (minutes) of a time zone at a given UTC instant. */
function tzOffsetMinutes(timeZone, utcDate) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const parts = Object.fromEntries(dtf.formatToParts(utcDate).map((p) => [p.type, p.value]));
  const asUTC = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute, +parts.second);
  return Math.round((asUTC - utcDate.getTime()) / 60000);
}

/**
 * Convert a Europe/Rome wall-clock "YYYY-MM-DDTHH:mm" (datetime-local value)
 * to a UTC ISO string. Two-pass offset resolution handles DST boundaries.
 */
export function romeLocalToUtcIso(local, timeZone = "Europe/Rome") {
  if (!local) return null;
  const [datePart, timePart] = local.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = (timePart || "00:00").split(":").map(Number);
  const guessUtc = Date.UTC(y, m - 1, d, hh, mm);
  const off1 = tzOffsetMinutes(timeZone, new Date(guessUtc));
  let utc = guessUtc - off1 * 60000;
  const off2 = tzOffsetMinutes(timeZone, new Date(utc));
  if (off2 !== off1) utc = guessUtc - off2 * 60000;
  return new Date(utc).toISOString();
}

/** Convert a UTC ISO string to a Europe/Rome "YYYY-MM-DDTHH:mm" value. */
export function utcToRomeLocal(iso, timeZone = "Europe/Rome") {
  if (!iso) return "";
  const date = new Date(iso);
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
  const parts = Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${String(parts.hour % 24).padStart(2, "0")}:${parts.minute}`;
}
