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
