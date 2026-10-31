// Live balance, read straight from a public Ethereum node.
//
// Off by default and remembered once turned on. Every other part of this page
// talks only to its own origin; this is the one feature that reaches out, and
// it tells a third party which wallet is being asked about. That is the user's
// call to make, not ours, so it is a deliberate switch rather than a default.
//
// No API key is involved: `balanceOf` is a free read on any public node, and
// the key used by the updater must never reach the browser.
import { A_USDT } from './constants';

const RPC = 'https://ethereum-rpc.publicnode.com';
const KEY = 'aave-tracker:live';
const POLL_MS = 15_000;
const BALANCE_OF = '0x70a08231';

async function balanceOf(address: string, signal: AbortSignal): Promise<bigint> {
  const data = BALANCE_OF + address.slice(2).toLowerCase().padStart(64, '0');
  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to: A_USDT, data }, 'latest'] }),
    signal,
  });
  if (!res.ok) throw new Error(`RPC returned ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message ?? 'RPC error');
  return BigInt(json.result);
}

class LiveStore {
  enabled = $state(false);
  /** Summed balance of the wallets being watched, or null before the first read. */
  value = $state<bigint | null>(null);
  failed = $state(false);

  #addresses: string[] = [];
  #timer: ReturnType<typeof setInterval> | undefined;
  #abort: AbortController | undefined;

  init() {
    this.enabled = localStorage.getItem(KEY) === 'on';
    // Polling a public node while the tab sits in the background is wasteful.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.#stopTimer();
      else if (this.enabled) this.#startTimer();
    });
  }

  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem(KEY, this.enabled ? 'on' : 'off');
    if (this.enabled) {
      this.#startTimer();
    } else {
      this.#stopTimer();
      this.value = null;
      this.failed = false;
    }
  }

  /** Point the poller at a set of wallets. Safe to call whenever the selection changes. */
  watch(addresses: string[]) {
    const changed = addresses.join() !== this.#addresses.join();
    this.#addresses = addresses;
    if (changed) this.value = null;
    if (this.enabled) this.#startTimer();
  }

  stop() {
    this.#stopTimer();
  }

  #startTimer() {
    this.#stopTimer();
    void this.#poll();
    this.#timer = setInterval(() => void this.#poll(), POLL_MS);
  }

  #stopTimer() {
    clearInterval(this.#timer);
    this.#timer = undefined;
    this.#abort?.abort();
    this.#abort = undefined;
  }

  async #poll() {
    if (this.#addresses.length === 0) return;
    this.#abort?.abort();
    const controller = new AbortController();
    this.#abort = controller;
    try {
      const balances = await Promise.all(this.#addresses.map((a) => balanceOf(a, controller.signal)));
      this.value = balances.reduce((sum, b) => sum + b, 0n);
      this.failed = false;
    } catch (e) {
      if (controller.signal.aborted) return;   // superseded by a newer poll
      this.failed = true;
    }
  }
}

export const live = new LiveStore();
