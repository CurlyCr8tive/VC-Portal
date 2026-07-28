// Derived values — computed on read, never stored, so they can't go stale
// relative to the dates/numbers they're derived from.

/**
 * Days between pitchSentDate and landedDate (inclusive of partial days truncated down).
 * Returns null if either date is missing, so callers can render "—" instead of NaN.
 */
export function computeLeadTimeDays(pitchSentDate, landedDate) {
  if (!pitchSentDate || !landedDate) return null;
  const pitch = new Date(pitchSentDate);
  const landed = new Date(landedDate);
  if (Number.isNaN(pitch.getTime()) || Number.isNaN(landed.getTime())) return null;
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((landed - pitch) / msPerDay);
}

export function formatCurrency(value) {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export function formatDate(dateStr) {
  if (!dateStr) return "—";
  return dateStr; // already YYYY-MM-DD from <input type="date">; kept as-is for simplicity
}
