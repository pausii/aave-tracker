<script lang="ts">
  // A dashboard that silently shows old numbers is worse than one that admits it.
  import { STALE_AFTER_HOURS } from '../lib/calc';

  let { updatedAt }: { updatedAt: string } = $props();

  // Age has to be recomputed against the clock, not just when the data changes.
  // An installed app can sit open for days on one fetch, and a banner derived
  // only from `updatedAt` would never appear during exactly the stretch it is
  // meant to cover.
  let now = $state(Date.now());

  $effect(() => {
    const tick = () => (now = Date.now());
    const id = setInterval(tick, 5 * 60_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  });

  const hours = $derived((now - Date.parse(updatedAt)) / 3_600_000);
  const stale = $derived(hours > STALE_AFTER_HOURS);
  const age = $derived(hours < 48 ? `${Math.round(hours)} hours` : `${Math.floor(hours / 24)} days`);
</script>

{#if stale}
  <div
    role="status"
    class="flex items-start gap-3 rounded-xl border border-brass/40 bg-brass/5 px-4 py-3 text-sm"
  >
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" class="mt-0.5 shrink-0 text-brass">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.2l3 1.8" />
    </svg>
    <p class="text-ink">
      These figures are {age} old. The daily update has not run since
      {new Date(updatedAt).toLocaleString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })} UTC.
      <span class="text-muted">Check the GitHub Actions run for the tracker.</span>
    </p>
  </div>
{/if}
