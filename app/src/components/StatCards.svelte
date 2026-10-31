<script lang="ts">
  import type { Stats } from '../lib/calc';

  let { stats }: { stats: Stats } = $props();

  const fmt = (n: number, d = 2) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const signed = (n: number, d = 2) => `${n >= 0 ? '+' : '−'}${fmt(Math.abs(n), d)}`;
</script>

<!-- The balance is the headline figure, so it is not just another identical
     card: it stands alone and larger than the rest. -->
<section class="grid gap-4 lg:grid-cols-[1.15fr_2fr]">
  <div class="rounded-xl border border-hairline bg-surface px-5 py-5">
    <p class="text-sm text-muted">Supplied balance</p>
    <p class="readout mt-1.5 text-4xl sm:text-[2.75rem]">
      {fmt(stats.balance)}<span class="ml-2 font-sans text-base font-medium text-faint">USDT</span>
    </p>
    <p class="mt-2 text-sm text-patina">
      {signed(stats.totalInterest, 4)} earned since you supplied
    </p>
  </div>

  <div class="grid grid-cols-1 divide-y divide-hairline rounded-xl border border-hairline bg-surface sm:grid-cols-3 sm:divide-x sm:divide-y-0">
    <div class="px-5 py-4">
      <p class="text-sm text-muted">Earned today</p>
      <p class="readout mt-1 text-2xl {stats.todayPartial ? 'text-brass' : 'text-ink'}">{fmt(stats.todayInterest, 4)}</p>
      <p class="mt-1 text-xs text-faint">{stats.todayPartial ? 'Day still running' : 'Day complete'}</p>
    </div>
    <div class="px-5 py-4">
      <p class="text-sm text-muted">Average day</p>
      <p class="readout mt-1 text-2xl">{fmt(stats.avgDaily7, 4)}</p>
      <p class="mt-1 text-xs text-faint">Last {Math.min(7, stats.days)} full days</p>
    </div>
    <div class="px-5 py-4">
      <p class="text-sm text-muted">Rate that implies</p>
      <p class="readout mt-1 text-2xl">{fmt(stats.apy7)}<span class="ml-0.5 font-sans text-base text-faint">%</span></p>
      <p class="mt-1 text-xs text-faint">{stats.days} full {stats.days === 1 ? 'day' : 'days'} recorded</p>
    </div>
  </div>
</section>
