<script lang="ts">
  // A dashboard that silently shows old numbers is worse than one that admits it.
  import { hoursSince, STALE_AFTER_HOURS } from '../lib/calc';

  let { updatedAt }: { updatedAt: string } = $props();

  const hours = $derived(hoursSince(updatedAt));
  const stale = $derived(hours > STALE_AFTER_HOURS);
  const age = $derived(
    hours < 48 ? `${Math.round(hours)} hours` : `${Math.floor(hours / 24)} days`,
  );
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
