<script lang="ts">
  import type { Stats } from '../lib/calc';
  import { toUnits } from '../lib/calc';
  import { live } from '../lib/live.svelte';

  let { stats, snapshotBalanceRaw, updatedAt }: {
    stats: Stats;
    snapshotBalanceRaw: bigint;
    updatedAt: string;
  } = $props();

  const fmt = (n: number, d = 2) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const signed = (n: number, d = 2) => `${n >= 0 ? '+' : '−'}${fmt(Math.abs(n), d)}`;

  const showingLive = $derived(live.enabled && live.value !== null);
  // What has accrued since the stored snapshot was taken.
  const drift = $derived(showingLive ? toUnits(live.value! - snapshotBalanceRaw) : 0);
  const balance = $derived(showingLive ? toUnits(live.value!) : stats.balance);

  // Split the figure so the digits that move each poll read as movement
  // rather than noise in a wall of numbers.
  const parts = $derived.by(() => {
    const [whole, decimals = ''] = fmt(balance, showingLive ? 6 : 2).split('.');
    return showingLive
      ? { head: `${whole}.${decimals.slice(0, 2)}`, tail: decimals.slice(2) }
      : { head: `${whole}.${decimals}`, tail: '' };
  });

  const readAt = $derived(
    new Date(updatedAt).toLocaleString('en-US', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', hour12: false }),
  );
</script>

<!-- The balance is the headline figure, so it is not just another identical
     card: it stands alone and larger than the rest. -->
<section class="grid gap-4 lg:grid-cols-[1.15fr_2fr]">
  <div class="rounded-xl border border-hairline bg-surface px-5 py-5">
    <div class="flex items-center justify-between gap-2">
      <p class="text-sm text-muted">Supplied balance</p>
      <button
        onclick={() => live.toggle()}
        aria-pressed={live.enabled}
        title={live.enabled
          ? 'Stop reading the chain. The page will show the last daily snapshot.'
          : 'Read the current balance from a public Ethereum node every 15 seconds. That node will see which wallet is asked about.'}
        class="flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors
               {live.enabled ? 'border-patina/40 text-patina' : 'border-hairline text-faint hover:text-muted'}"
      >
        <span class="relative flex h-1.5 w-1.5">
          {#if showingLive}
            <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-patina opacity-60"></span>
          {/if}
          <span class="relative inline-flex h-1.5 w-1.5 rounded-full {live.enabled ? 'bg-patina' : 'bg-dial'}"></span>
        </span>
        Live
      </button>
    </div>

    <p class="readout mt-1.5 text-4xl sm:text-[2.75rem]">
      {parts.head}<span class="text-[0.62em] text-muted">{parts.tail}</span><span
        class="ml-2 font-sans text-base font-medium text-faint">USDT</span>
    </p>

    {#if live.enabled && live.failed}
      <p class="mt-2 text-sm text-rust">Could not reach the node. Showing the last daily snapshot.</p>
    {:else if showingLive}
      <p class="mt-2 text-sm text-patina">{signed(drift, 6)} since the {readAt} UTC reading</p>
    {:else}
      <p class="mt-2 text-sm text-patina">{signed(stats.totalInterest, 4)} earned since you supplied</p>
    {/if}
  </div>

  <div class="grid grid-cols-1 divide-y divide-hairline rounded-xl border border-hairline bg-surface sm:grid-cols-3 sm:divide-x sm:divide-y-0">
    <div class="px-5 py-4">
      <p class="text-sm text-muted">Earned today</p>
      <p class="readout mt-1 text-2xl {stats.todayPartial ? 'text-brass' : 'text-ink'}">
        {fmt(stats.todayInterest + (showingLive ? drift : 0), 4)}
      </p>
      <p class="mt-1 text-xs text-faint">
        {#if showingLive}
          Includes {signed(drift, 4)} read just now
        {:else}
          {stats.todayPartial ? 'Day still running' : 'Day complete'}
        {/if}
      </p>
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
