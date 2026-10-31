// Discovers every aUSDT movement for a wallet.
//
// Alchemy's free tier caps eth_getLogs at a 10-block range, so scanning
// thousands of blocks with getLogs is not possible. Hence two stages:
//   1. alchemy_getAssetTransfers (wide range, cheap) to find the blocks that
//      contain aUSDT transfers.
//   2. eth_getLogs on each of those single blocks to read the exact amounts
//      from the Aave Pool's Supply/Withdraw events.
//
// Why amounts come from Supply/Withdraw rather than Transfer: Aave emits
// Transfer for (principal + interest just accrued), while Supply/Withdraw carry
// the principal alone. Using the Transfer value would count interest as a deposit.
import { parseAbiItem } from 'viem';

const ZERO = '0x0000000000000000000000000000000000000000';

const supplyEvent = parseAbiItem('event Supply(address indexed reserve, address user, address indexed onBehalfOf, uint256 amount, uint16 indexed referralCode)');
const withdrawEvent = parseAbiItem('event Withdraw(address indexed reserve, address indexed user, address indexed to, uint256 amount)');

async function assetTransfers(client, params) {
  const out = [];
  let pageKey;
  do {
    const res = await client.request({
      method: 'alchemy_getAssetTransfers',
      params: [{ ...params, category: ['erc20'], withMetadata: true, maxCount: '0x3e8', ...(pageKey ? { pageKey } : {}) }],
    });
    out.push(...res.transfers);
    pageKey = res.pageKey;
  } while (pageKey);
  return out;
}

export function supportsAssetTransfers(rpcUrl) {
  return /alchemy\.com/i.test(rpcUrl);
}

// Returns events shaped { type, block, tx, logIndex, amount } for a block range.
export async function discoverEvents(client, cfg, fromBlock, toBlock) {
  const { pool, underlying, aToken, wallet } = cfg;
  const range = { fromBlock: `0x${BigInt(fromBlock).toString(16)}`, toBlock: `0x${BigInt(toBlock).toString(16)}` };
  const [incoming, outgoing] = await Promise.all([
    assetTransfers(client, { ...range, toAddress: wallet, contractAddresses: [aToken] }),
    assetTransfers(client, { ...range, fromAddress: wallet, contractAddresses: [aToken] }),
  ]);

  const events = [];
  const mintBurnBlocks = new Set();
  for (const t of [...incoming, ...outgoing]) {
    const block = BigInt(t.blockNum);
    const isMint = t.from.toLowerCase() === ZERO;
    const isBurn = t.to.toLowerCase() === ZERO;
    if (isMint || isBurn) {
      mintBurnBlocks.add(block.toString());
    } else {
      // An aToken transfer between wallets is not interest, so it counts as flow.
      const raw = BigInt(t.rawContract.value);
      const toUs = t.to.toLowerCase() === wallet.toLowerCase();
      events.push({ type: toUs ? 'transfer_in' : 'transfer_out', block: Number(block), tx: t.hash, logIndex: -1, amount: raw.toString() });
    }
  }

  // Read the exact principal from the Pool events, one block per request.
  for (const b of mintBurnBlocks) {
    const bn = BigInt(b);
    const [supplies, withdraws] = await Promise.all([
      client.getLogs({ address: pool, event: supplyEvent, args: { reserve: underlying, onBehalfOf: wallet }, fromBlock: bn, toBlock: bn }),
      client.getLogs({ address: pool, event: withdrawEvent, args: { reserve: underlying, user: wallet }, fromBlock: bn, toBlock: bn }),
    ]);
    for (const l of supplies) events.push({ type: 'deposit', block: Number(l.blockNumber), tx: l.transactionHash, logIndex: l.logIndex, amount: l.args.amount.toString() });
    for (const l of withdraws) events.push({ type: 'withdraw', block: Number(l.blockNumber), tx: l.transactionHash, logIndex: l.logIndex, amount: l.args.amount.toString() });
  }

  events.sort((a, b) => a.block - b.block || a.logIndex - b.logIndex);
  return events;
}

// Net flow (in - out) across events in the block range (afterBlock, throughBlock].
export function netFlowBetween(events, afterBlock, throughBlock) {
  let net = 0n;
  for (const e of events) {
    if (e.block <= afterBlock || e.block > throughBlock) continue;
    const sign = e.type === 'deposit' || e.type === 'transfer_in' ? 1n : -1n;
    net += sign * BigInt(e.amount);
  }
  return net;
}

// Fallback for RPCs without alchemy_getAssetTransfers: scan getLogs in chunks.
// Only practical over short ranges, since public RPCs usually reject old blocks.
export async function discoverEventsViaLogs(client, cfg, fromBlock, toBlock, chunk = 5000n) {
  const { pool, underlying, wallet } = cfg;
  const events = [];
  for (let start = BigInt(fromBlock); start <= BigInt(toBlock); start += chunk) {
    const end = start + chunk - 1n > BigInt(toBlock) ? BigInt(toBlock) : start + chunk - 1n;
    const [supplies, withdraws] = await Promise.all([
      client.getLogs({ address: pool, event: supplyEvent, args: { reserve: underlying, onBehalfOf: wallet }, fromBlock: start, toBlock: end }),
      client.getLogs({ address: pool, event: withdrawEvent, args: { reserve: underlying, user: wallet }, fromBlock: start, toBlock: end }),
    ]);
    for (const l of supplies) events.push({ type: 'deposit', block: Number(l.blockNumber), tx: l.transactionHash, logIndex: l.logIndex, amount: l.args.amount.toString() });
    for (const l of withdraws) events.push({ type: 'withdraw', block: Number(l.blockNumber), tx: l.transactionHash, logIndex: l.logIndex, amount: l.args.amount.toString() });
  }
  events.sort((a, b) => a.block - b.block || a.logIndex - b.logIndex);
  return events;
}
