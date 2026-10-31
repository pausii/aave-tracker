<script lang="ts">
  import { range, RANGES, type Range } from '../lib/range.svelte';

  // Options wider than the data on hand would be dead controls, so they are
  // only offered once there is something to show in them.
  let { available }: { available: number } = $props();
  const options = $derived(RANGES.filter((r) => r.value === 0 || r.value < available || r.value === range.days));
</script>

{#if options.length > 1}
  <div class="flex items-center gap-1 rounded-lg border border-hairline bg-surface p-0.5" role="group" aria-label="Chart time range">
    {#each options as option (option.value)}
      <button
        onclick={() => range.set(option.value as Range)}
        aria-pressed={range.days === option.value}
        class="rounded-md px-2.5 py-1 text-xs font-medium transition-colors
               {range.days === option.value ? 'bg-sunken text-ink' : 'text-muted hover:text-ink'}"
      >
        {option.label}
      </button>
    {/each}
  </div>
{/if}
