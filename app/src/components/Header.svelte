<script lang="ts">
  import type { Wallet } from '../lib/types';
  import Logo from './Logo.svelte';
  import ThemeToggle from './ThemeToggle.svelte';

  let { wallets, selected = $bindable(), updatedAt, onLogout }: {
    wallets: Wallet[];
    selected: string;
    updatedAt: string;
    onLogout: () => void;
  } = $props();

  const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
  const stamp = $derived(
    new Date(updatedAt).toLocaleString('en-US', {
      timeZone: 'UTC', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
    }),
  );
</script>

<header class="sticky top-0 z-10 border-b border-hairline bg-canvas/85 backdrop-blur">
  <div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3">
    <div class="flex items-center gap-2.5">
      <span class="text-patina"><Logo size={24} /></span>
      <div>
        <h1 class="font-display text-lg font-medium leading-tight tracking-tight">Aave Tracker</h1>
        <p class="text-xs text-faint">Aave V3 on Ethereum, read {stamp} UTC</p>
      </div>
    </div>

    <div class="flex w-full items-center gap-2 sm:w-auto">
      <select
        bind:value={selected}
        aria-label="Select wallet"
        class="min-w-0 flex-1 rounded-lg border border-hairline bg-surface px-3 py-2 text-sm text-ink sm:flex-none"
      >
        {#if wallets.length > 1}
          <option value="all">All wallets ({wallets.length})</option>
        {/if}
        {#each wallets as w (w.address)}
          <option value={w.address}>{w.label} — {short(w.address)}</option>
        {/each}
      </select>
      <ThemeToggle />
      <button
        onclick={onLogout}
        class="shrink-0 rounded-lg border border-hairline px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-ink"
      >
        Log out
      </button>
    </div>
  </div>
</header>
