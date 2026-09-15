/**
 * Minimal pure line diff (LCS) for the version comparison view (P1-E).
 * Dependency-free and unit-testable; only used to render added/removed lines
 * of the abstract between two paper versions.
 */

export interface DiffLine {
  type: "same" | "added" | "removed";
  text: string;
}

export function diffLines(before: string, after: string): DiffLine[] {
  // Empty text has zero lines (not one empty line from split("\n")).
  const a = before === "" ? [] : before.split("\n");
  const b = after === "" ? [] : after.split("\n");
  const n = a.length;
  const m = b.length;

  // LCS length table (bottom-up).
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ type: "same", text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: "removed", text: a[i] });
      i++;
    } else {
      out.push({ type: "added", text: b[j] });
      j++;
    }
  }
  while (i < n) {
    out.push({ type: "removed", text: a[i] });
    i++;
  }
  while (j < m) {
    out.push({ type: "added", text: b[j] });
    j++;
  }
  return out;
}
