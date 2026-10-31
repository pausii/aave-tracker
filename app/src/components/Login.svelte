<script lang="ts">
  import Logo from './Logo.svelte';
  import ThemeToggle from './ThemeToggle.svelte';
  import CipherReadout from './CipherReadout.svelte';

  let { onUnlock, onEnter, error = '', busy = false, revealed = null }: {
    onUnlock: (passphrase: string) => void;
    onEnter: () => void;
    error?: string;
    busy?: boolean;
    revealed?: string | null;
  } = $props();

  let passphrase = $state('');

  function submit(e: SubmitEvent) {
    e.preventDefault();
    if (passphrase && !busy) onUnlock(passphrase);
  }
</script>

<!-- Ledger paper: fine rules that fade out towards the edges. -->
<div class="relative min-h-screen overflow-hidden">
  <div
    aria-hidden="true"
    class="pointer-events-none absolute inset-0 opacity-[0.55]"
    style="
      background-image:
        repeating-linear-gradient(to right, var(--c-hairline) 0 1px, transparent 1px 72px),
        repeating-linear-gradient(to bottom, var(--c-hairline) 0 1px, transparent 1px 72px);
      mask-image: radial-gradient(ellipse 70% 60% at 50% 42%, #000 20%, transparent 78%);
    "
  ></div>

  <div class="absolute right-4 top-4 z-10">
    <ThemeToggle />
  </div>

  <div class="relative mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-14">
    <div class="flex items-center gap-2.5 text-patina">
      <Logo size={26} />
      <span class="font-display text-[1.35rem] font-medium tracking-tight text-ink">Aave Tracker</span>
    </div>

    <div class="mt-12">
      <CipherReadout target={revealed} onSettled={onEnter} />
      <p class="mt-5 text-sm text-muted">
        {#if revealed}
          Unlocked. Opening your dashboard.
        {:else}
          Your balance is encrypted on this page. Only your passphrase can read it.
        {/if}
      </p>
    </div>

    <form onsubmit={submit} class="mt-11 space-y-3" class:opacity-40={!!revealed}>
      <div class="flex gap-2">
        <input
          type="password"
          autocomplete="current-password"
          placeholder="Passphrase"
          disabled={!!revealed}
          bind:value={passphrase}
          class="min-w-0 flex-1 rounded-lg border border-hairline bg-surface px-3.5 py-2.5 text-ink placeholder:text-faint focus:border-patina"
        />
        <button
          type="submit"
          disabled={busy || !passphrase || !!revealed}
          class="shrink-0 rounded-lg bg-patina px-5 py-2.5 font-medium text-surface transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? 'Unlocking' : 'Unlock'}
        </button>
      </div>

      {#if error}
        <p class="text-sm text-rust" role="alert">{error}</p>
      {:else}
        <p class="text-sm text-faint">Stays unlocked on this device for 7 days.</p>
      {/if}
    </form>
  </div>
</div>
