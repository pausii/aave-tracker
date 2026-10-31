<script lang="ts">
  import { theme } from '../lib/theme.svelte';

  const label = $derived(
    theme.preference === 'system' ? 'Theme: follows your system'
    : theme.preference === 'light' ? 'Theme: light'
    : 'Theme: dark',
  );
</script>

<button
  onclick={() => theme.cycle()}
  title={label}
  aria-label={label}
  class="grid h-9 w-9 place-items-center rounded-full border border-hairline text-muted transition-colors hover:text-ink"
>
  {#if theme.preference === 'light'}
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
    </svg>
  {:else if theme.preference === 'dark'}
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2z" />
    </svg>
  {:else}
    <!-- Following the system: a half-filled circle -->
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
      <circle cx="12" cy="12" r="8.2" />
      <path d="M12 3.8a8.2 8.2 0 0 1 0 16.4z" fill="currentColor" stroke="none" />
    </svg>
  {/if}
</button>
