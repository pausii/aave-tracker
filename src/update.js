// Daily multi-wallet updater for a USDT position in Aave V3 on Ethereum.
//
// Stores one snapshot per UTC day: the snapshot dated D holds the balance at the
// END of day D. Interest for D = end balance D - end balance D-1 - net flow D.
// Days that were missed (a failed workflow, say) are refilled from archive data.
//
// The snapshot for the running day is marked partial:true because the day is not
// over. The next run recomputes it using that day's final block, so the daily
// figures stay comparable.
import { createPublicClient, http, parseAbi, isAddress, getAddress } from 'viem';
import { mainnet } from 'viem/chains';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { encrypt, decrypt } from './crypto.js';
import { lastBlockOfDay } from './blocks.js';
import { discoverEvents, discoverEventsViaLogs, netFlowBetween, supportsAssetTransfers } from './events.js';

const POOL = '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2'; // Aave V3 Pool (Ethereum)
const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const A_USDT = '0x23878914EFE38d27C4D67Ab83ed1b93A74D4086a'; // aEthUSDT (diverifikasi on-chain)
const AAVE_V3_DEPLOY = 16291127n; // Aave V3 Ethereum deployment
const DECIMALS = 6;
const FORMAT_VERSION = 3;

const env = (k, fallback) => {
  const v = process.env[k] || fallback;
  if (v === undefined || v === '') throw new Error(`Env ${k} is required`);
  return v;
};

const PASSPHRASE = env('PASSPHRASE');
const RPC_URL = env('RPC_URL', 'https://ethereum-rpc.publicnode.com');
const OUT_DIR = env('OUT_DIR', process.cwd());
const FILE = join(OUT_DIR, 'portfolio.enc.json');

const client = createPublicClient({ chain: mainnet, transport: http(RPC_URL, { timeout: 60000, retryCount: 3 }) });
const erc20 = parseAbi(['function balanceOf(address) view returns (uint256)']);
const fmt = (raw) => (Number(raw) / 10 ** DECIMALS).toFixed(6);

// WALLETS is a JSON array: [{"address":"0x...","label":"Main"}, ...]
function parseWallets(raw) {
  const list = JSON.parse(raw);
  if (!Array.isArray(list) || list.length === 0) throw new Error('WALLETS must be a non-empty array');
  const seen = new Set();
  return list.map((w) => {
    if (!isAddress(w.address)) throw new Error(`Invalid address: ${w.address}`);
    const address = getAddress(w.address);
    if (seen.has(address)) throw new Error(`Duplicate address: ${address}`);
    seen.add(address);
    return { address, label: String(w.label || address.slice(0, 8)) };
  });
}

// Every date stored in the data is a UTC calendar day.
const dayOf = (sec) => new Date(sec * 1000).toISOString().slice(0, 10);
const addDays = (date, n) => new Date(Date.parse(`${date}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

function loadFile() {
  if (!existsSync(FILE)) return null;
  const envelope = readFileSync(FILE, 'utf8');
  return { salt: JSON.parse(envelope).salt, payload: JSON.parse(decrypt(envelope, PASSPHRASE)) };
}

const balanceAt = (address, blockNumber) =>
  client.readContract({ address: A_USDT, abi: erc20, functionName: 'balanceOf', args: [address], blockNumber });

async function updateWallet(state, latest, today) {
  const cfg = { pool: POOL, underlying: USDT, aToken: A_USDT, wallet: state.address };

  // 1. Find events that appeared since the last scan.
  const scanFrom = state.scannedThrough === null ? AAVE_V3_DEPLOY : BigInt(state.scannedThrough) + 1n;
  if (scanFrom <= latest) {
    const found = supportsAssetTransfers(RPC_URL)
      ? await discoverEvents(client, cfg, scanFrom, latest)
      : await discoverEventsViaLogs(client, cfg, scanFrom, latest);
    const known = new Set(state.events.map((e) => `${e.tx}:${e.logIndex}`));
    for (const e of found) if (!known.has(`${e.tx}:${e.logIndex}`)) state.events.push(e);
    state.events.sort((a, b) => a.block - b.block || a.logIndex - b.logIndex);
  }
  state.scannedThrough = Number(latest);

  if (state.events.length === 0) {
    // This wallet has never held aUSDT, so record a single empty snapshot.
    const balance = await balanceAt(state.address, latest);
    state.snapshots = [{ date: today, block: Number(latest), balance: balance.toString(), netFlow: '0', interest: '0', partial: true }];
    return `${state.label}: no activity yet (balance ${fmt(balance)})`;
  }

  // 2. Work out which days need computing. Today is always recomputed.
  // Partial snapshots are dropped so the finished day gets a full recount.
  const firstEventBlock = state.events[0].block;
  const firstBlockMeta = await client.getBlock({ blockNumber: BigInt(firstEventBlock) });
  const firstDay = dayOf(Number(firstBlockMeta.timestamp));

  const kept = state.snapshots.filter((s) => s.date < today && !s.partial);
  const prev = kept.length
    ? { balance: BigInt(kept[kept.length - 1].balance), block: kept[kept.length - 1].block }
    : { balance: 0n, block: firstEventBlock - 1 };
  let day = kept.length ? addDays(kept[kept.length - 1].date, 1) : firstDay;

  const fresh = [];
  let cursor = prev;
  while (day <= today) {
    const block = day === today
      ? latest
      : await lastBlockOfDay(client, day, BigInt(Math.max(cursor.block, 1)), latest);
    if (block === null) break; // the chain has not reached the end of that day
    const balance = await balanceAt(state.address, block);
    const netFlow = netFlowBetween(state.events, cursor.block, Number(block));
    const interest = balance - cursor.balance - netFlow;
    fresh.push({ date: day, block: Number(block), balance: balance.toString(), netFlow: netFlow.toString(), interest: interest.toString(), partial: day === today });
    cursor = { balance, block: Number(block) };
    day = addDays(day, 1);
  }

  state.snapshots = [...kept, ...fresh];
  const last = state.snapshots[state.snapshots.length - 1];
  const totalInterest = state.snapshots.reduce((a, s) => a + BigInt(s.interest), 0n);
  return `${state.label} (${state.address.slice(0, 8)}…): balance ${fmt(last.balance)} | earned today ${fmt(last.interest)} | earned total ${fmt(totalInterest)} | ${state.snapshots.length} days | ${state.events.length} events`;
}

async function main() {
  const wallets = parseWallets(env('WALLETS'));
  const existing = loadFile();
  const byAddress = new Map((existing?.payload.wallets ?? []).map((w) => [w.address, w]));

  const latest = await client.getBlockNumber();
  const latestBlock = await client.getBlock({ blockNumber: latest });
  const today = dayOf(Number(latestBlock.timestamp));

  const states = wallets.map((cfg) => {
    const prior = byAddress.get(cfg.address);
    if (prior) return { ...prior, label: cfg.label, scannedThrough: prior.scannedThrough ?? null };
    return { address: cfg.address, label: cfg.label, scannedThrough: null, events: [], snapshots: [] };
  });

  for (const state of states) console.log(await updateWallet(state, latest, today));

  // Wallets dropped from the config stop updating, but their data is kept.
  const configured = new Set(wallets.map((w) => w.address));
  for (const [addr, w] of byAddress) if (!configured.has(addr)) states.push(w);

  const payload = { version: FORMAT_VERSION, updatedAt: new Date().toISOString(), wallets: states };
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(FILE, encrypt(JSON.stringify(payload), PASSPHRASE, existing?.salt));
  console.log(`Wrote ${FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
