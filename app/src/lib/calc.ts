import type { Portfolio, Snapshot, Wallet } from './types';

export const DECIMALS = 6;
const UNIT = 10 ** DECIMALS;

export const toUnits = (raw: string | bigint): number => Number(raw) / UNIT;

export interface Point {
  date: string;
  balance: bigint;
  netFlow: bigint;
  interest: bigint;
  partial: boolean;
}

// Merges several wallets' snapshots by date.
// A wallet with no snapshot on a given date still counts at its last known
// balance (carried forward). Interest and net flow are summed only from
// snapshots that actually exist.
export function seriesFor(portfolio: Portfolio, selected: string): Point[] {
  const wallets: Wallet[] = selected === 'all'
    ? portfolio.wallets
    : portfolio.wallets.filter((w) => w.address === selected);

  const dates = [...new Set(wallets.flatMap((w) => w.snapshots.map((s) => s.date)))].sort();
  const byWalletDate = wallets.map((w) => new Map(w.snapshots.map((s) => [s.date, s])));
  const lastBalance: (bigint | null)[] = wallets.map(() => null);

  return dates.map((date) => {
    let balance = 0n, netFlow = 0n, interest = 0n, partial = false;
    wallets.forEach((_, i) => {
      const snap = byWalletDate[i].get(date);
      if (snap) {
        lastBalance[i] = BigInt(snap.balance);
        netFlow += BigInt(snap.netFlow);
        interest += BigInt(snap.interest);
        if (snap.partial) partial = true;
      }
      if (lastBalance[i] !== null) balance += lastBalance[i]!;
    });
    return { date, balance, netFlow, interest, partial };
  });
}

export interface Stats {
  balance: number;
  totalInterest: number;
  todayInterest: number;
  todayPartial: boolean;
  avgDaily7: number;
  apy7: number;
  change30: number | null;
  days: number;
  lastDate: string | null;
}

export function statsFor(points: Point[]): Stats {
  const empty: Stats = {
    balance: 0, totalInterest: 0, todayInterest: 0, todayPartial: false,
    avgDaily7: 0, apy7: 0, change30: null, days: 0, lastDate: null,
  };
  if (points.length === 0) return empty;

  const last = points[points.length - 1];
  const totalInterest = points.reduce((a, p) => a + p.interest, 0n);

  // The running day is incomplete, so it is left out of the average and the APY.
  const complete = points.filter((p) => !p.partial);
  const window = complete.slice(-7);
  const avgDaily7 = window.length ? toUnits(window.reduce((a, p) => a + p.interest, 0n)) / window.length : 0;
  const avgBalance = window.length ? window.reduce((a, p) => a + toUnits(p.balance), 0) / window.length : 0;
  const apy7 = avgBalance > 0 ? (avgDaily7 / avgBalance) * 365 * 100 : 0;

  const thirtyAgo = points.length > 30 ? points[points.length - 31] : null;
  const change30 = thirtyAgo ? toUnits(last.balance) - toUnits(thirtyAgo.balance) : null;

  return {
    balance: toUnits(last.balance),
    totalInterest: toUnits(totalInterest),
    todayInterest: toUnits(last.interest),
    todayPartial: last.partial,
    avgDaily7,
    apy7,
    change30,
    days: complete.length,
    lastDate: last.date,
  };
}

export interface RatePoint {
  date: string;
  apr: number;
  /** Funds moved that day, so the rate is an estimate. */
  approximate: boolean;
}

// Annualised rate actually earned each day, derived from the balances rather
// than from any rate Aave advertises.
//
// The denominator is the principal that was actually earning. On a day with no
// deposits that is simply yesterday's closing balance. When funds moved we do
// not know what time of day they arrived, so we assume midday and credit half
// the flow; those days are flagged `approximate` rather than quietly presented
// as exact. The running day is skipped entirely — annualising a part-day would
// read as a collapse in the rate.
export function rateSeries(points: Point[]): RatePoint[] {
  const out: RatePoint[] = [];
  points.forEach((p, i) => {
    if (p.partial) return;
    const previous = i > 0 ? toUnits(points[i - 1].balance) : 0;
    const flow = toUnits(p.netFlow);
    const principal = previous + flow / 2;
    if (principal <= 0) return;
    out.push({
      date: p.date,
      apr: (toUnits(p.interest) / principal) * 365 * 100,
      approximate: flow !== 0,
    });
  });
  return out;
}

export const hoursSince = (iso: string): number => (Date.now() - Date.parse(iso)) / 3_600_000;

// The cron runs once a day, so anything past ~36h means a run was missed.
export const STALE_AFTER_HOURS = 36;
