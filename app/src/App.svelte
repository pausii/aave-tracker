<script lang="ts">
  import { onMount } from 'svelte';
  import type { Portfolio } from './lib/types';
  import { seriesFor, statsFor, rateSeries } from './lib/calc';
  import { unlockWithPassphrase, restoreSession, logout } from './lib/session';
  import { theme } from './lib/theme.svelte';
  import { live } from './lib/live.svelte';
  import Login from './components/Login.svelte';
  import Header from './components/Header.svelte';
  import StatCards from './components/StatCards.svelte';
  import StaleBanner from './components/StaleBanner.svelte';
  import RateChart from './components/RateChart.svelte';
  import Charts from './components/Charts.svelte';
  import HistoryTable from './components/HistoryTable.svelte';

  type View = 'loading' | 'locked' | 'ready';

  let view = $state<View>('loading');
  let portfolio = $state<Portfolio | null>(null);
  let selected = $state('all');
  let error = $state('');
  let busy = $state(false);
  let revealed = $state<string | null>(null);

  const wallets = $derived(portfolio?.wallets ?? []);
  const points = $derived(portfolio ? seriesFor(portfolio, selected) : []);
  const stats = $derived(statsFor(points));
  const rates = $derived(rateSeries(points));
  const snapshotBalance = $derived(points.length ? points[points.length - 1].balance : 0n);
  const watched = $derived(
    selected === 'all' ? wallets.map((w) => w.address) : [selected],
  );

  function load(p: Portfolio) {
    portfolio = p;
    // One wallet selects itself; several start on the combined view.
    selected = p.wallets.length === 1 ? p.wallets[0].address : 'all';
  }

  onMount(async () => {
    theme.init();
    live.init();
    try {
      const p = await restoreSession();
      if (p) {
        load(p);
        view = 'ready'; // a stored session skips the unlock animation
      } else {
        view = 'locked';
      }
    } catch {
      view = 'locked';
    }
  });

  async function unlock(passphrase: string) {
    busy = true;
    error = '';
    try {
      const p = await unlockWithPassphrase(passphrase);
      load(p);
      // Show the real balance on the login screen first, then enter the dashboard.
      revealed = statsFor(seriesFor(p, p.wallets.length === 1 ? p.wallets[0].address : 'all'))
        .balance.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    } catch (e) {
      error = e instanceof Error ? e.message : 'Unlock failed.';
    } finally {
      busy = false;
    }
  }

  // Keep the live poller pointed at whichever wallets are on screen.
  $effect(() => {
    if (view === 'ready' && watched.length > 0) live.watch(watched);
    else live.stop();
  });

  async function doLogout() {
    live.stop();
    await logout();
    portfolio = null;
    revealed = null;
    selected = 'all';
    view = 'locked';
  }
</script>

{#if view === 'loading'}
  <div class="flex min-h-screen items-center justify-center text-sm text-muted">Loading</div>
{:else if view === 'locked'}
  <Login onUnlock={unlock} onEnter={() => (view = 'ready')} {error} {busy} {revealed} />
{:else if portfolio}
  <div class="min-h-screen">
    <Header {wallets} bind:selected updatedAt={portfolio.updatedAt} onLogout={doLogout} />
    <main class="mx-auto max-w-6xl space-y-5 px-4 py-7">
      <StaleBanner updatedAt={portfolio.updatedAt} />
      <StatCards {stats} snapshotBalanceRaw={snapshotBalance} updatedAt={portfolio.updatedAt} />
      <Charts {points} />
      <RateChart {rates} />
      <HistoryTable {points} />
      <footer class="pt-1 text-center text-xs text-faint">
        Interest is derived from on-chain balances, not from Aave's displayed rate.
      </footer>
    </main>
  </div>
{/if}
