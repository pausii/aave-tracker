// How many days of history the charts show. The stat cards keep their own fixed
// windows (today, last 7 days) because those answer different questions.
export type Range = 7 | 30 | 90 | 0; // 0 means everything

const KEY = 'aave-tracker:range';
export const RANGES: { value: Range; label: string }[] = [
  { value: 7, label: '7D' },
  { value: 30, label: '30D' },
  { value: 90, label: '90D' },
  { value: 0, label: 'All' },
];

class RangeStore {
  days = $state<Range>(30);

  init() {
    // Guard the null first: Number(null) is 0, which happens to be a valid
    // Range meaning "All", so a missing preference would silently override
    // the default.
    const raw = localStorage.getItem(KEY);
    if (raw === null) return;
    const stored = Number(raw);
    if (RANGES.some((r) => r.value === stored)) this.days = stored as Range;
  }

  set(days: Range) {
    this.days = days;
    localStorage.setItem(KEY, String(days));
  }

  /** Trim a chronological series to the selected window. */
  clip<T>(series: T[]): T[] {
    return this.days === 0 ? series : series.slice(-this.days);
  }

  /** Describe the window honestly: a 30-day setting over 11 days of history
   *  is showing everything, and should say so. */
  labelFor(shown: number, total: number): string {
    return this.days === 0 || shown >= total ? 'since you supplied' : `over the last ${this.days} days`;
  }
}

export const range = new RangeStore();
