/**
 * Generate a paper identifier: YYMM.NNNNN
 * Example: 2608.01234
 *
 * The 5-digit suffix is randomized; callers should retry on unique violation.
 */
export function generatePaperId(date = new Date()): string {
  const yy = String(date.getUTCFullYear()).slice(-2);
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const suffix = String(Math.floor(Math.random() * 100000)).padStart(5, "0");
  return `${yy}${mm}.${suffix}`;
}
