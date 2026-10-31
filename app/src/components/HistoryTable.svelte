<script lang="ts">
  import type { Point } from '../lib/calc';
  import { toUnits } from '../lib/calc';

  let { points }: { points: Point[] } = $props();

  const fmt = (n: number, d = 4) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const rows = $derived([...points].reverse());

  const earnedTone = (p: Point) =>
    p.interest < 0n ? 'text-rust' : p.partial ? 'text-brass' : 'text-patina';

  function exportCsv() {
    const header = 'date,balance_usdt,net_flow_usdt,interest_usdt,status';
    const lines = points.map((p) =>
      `${p.date},${toUnits(p.balance)},${toUnits(p.netFlow)},${toUnits(p.interest)},${p.partial ? 'partial' : 'complete'}`);
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aave-tracker-history.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<section class="overflow-hidden rounded-xl border border-hairline bg-surface">
  <div class="flex items-center justify-between border-b border-hairline px-5 py-3.5">
    <h2 class="font-display text-base font-medium">Day by day</h2>
    <button
      onclick={exportCsv}
      disabled={points.length === 0}
      class="text-sm font-medium text-patina hover:underline disabled:opacity-40"
    >
      Download CSV
    </button>
  </div>

  {#if rows.length === 0}
    <p class="px-5 py-6 text-sm text-muted">Nothing recorded yet. The first daily figure appears after your next update.</p>
  {:else}
    <!-- Narrow screens: four columns do not fit, and pushing "Earned" off the
         edge hides the one number this page exists to show. Each day becomes a
         row instead, with the date and the earnings leading it. -->
    <ul class="divide-y divide-hairline sm:hidden">
      {#each rows as p (p.date)}
        <li class="flex items-baseline justify-between gap-3 px-5 py-3">
          <div class="min-w-0">
            <p class="flex items-center gap-1.5 text-sm">
              <span>{p.date}</span>
              {#if p.partial}
                <span class="rounded border border-brass/40 px-1.5 py-0.5 text-[11px] text-brass">running</span>
              {/if}
            </p>
            <p class="mt-0.5 text-xs text-faint">
              Balance {fmt(toUnits(p.balance), 2)}{#if p.netFlow !== 0n}, moved {fmt(toUnits(p.netFlow), 2)}{/if}
            </p>
          </div>
          <p class="readout shrink-0 text-lg tabular-nums {earnedTone(p)}">{fmt(toUnits(p.interest))}</p>
        </li>
      {/each}
    </ul>

    <div class="hidden max-h-[26rem] overflow-auto sm:block">
      <table class="w-full text-sm">
        <thead class="sticky top-0 bg-sunken text-xs text-muted">
          <tr>
            <th scope="col" class="px-5 py-2.5 text-left font-medium">Date (UTC)</th>
            <th scope="col" class="px-5 py-2.5 text-right font-medium">Balance</th>
            <th scope="col" class="whitespace-nowrap px-5 py-2.5 text-right font-medium">Moved in or out</th>
            <th scope="col" class="px-5 py-2.5 text-right font-medium">Earned</th>
          </tr>
        </thead>
        <tbody>
          {#each rows as p (p.date)}
            <tr class="border-t border-hairline">
              <td class="whitespace-nowrap px-5 py-2.5 text-left">
                {p.date}
                {#if p.partial}
                  <span class="ml-1.5 rounded border border-brass/40 px-1.5 py-0.5 text-[11px] text-brass">running</span>
                {/if}
              </td>
              <td class="px-5 py-2.5 text-right tabular-nums">{fmt(toUnits(p.balance), 2)}</td>
              <td class="px-5 py-2.5 text-right tabular-nums {p.netFlow !== 0n ? 'text-ink' : 'text-faint'}">
                {p.netFlow === 0n ? '—' : fmt(toUnits(p.netFlow), 2)}
              </td>
              <td class="px-5 py-2.5 text-right tabular-nums {earnedTone(p)}">{fmt(toUnits(p.interest))}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</section>
