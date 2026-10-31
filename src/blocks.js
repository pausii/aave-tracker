// Block lookup by timestamp. Results are cached to keep RPC calls down.
const cache = new Map();

async function getTs(client, n) {
  if (cache.has(n)) return cache.get(n);
  const b = await client.getBlock({ blockNumber: n });
  const ts = Number(b.timestamp);
  cache.set(n, ts);
  return ts;
}

// First block whose timestamp is >= targetSec, searched within [lo, hi].
export async function blockAtOrAfter(client, targetSec, lo, hi) {
  let loB = BigInt(lo), hiB = BigInt(hi);
  if (await getTs(client, hiB) < targetSec) return null; // target is in the future
  if (await getTs(client, loB) >= targetSec) return loB;

  // Start from a 12-seconds-per-block estimate, then narrow the window.
  const loTs = await getTs(client, loB);
  let guess = loB + BigInt(Math.floor((targetSec - loTs) / 12));
  if (guess > hiB) guess = hiB;
  if (guess < loB) guess = loB;
  const guessTs = await getTs(client, guess);
  const window = 5000n;
  if (guessTs < targetSec) { loB = guess; if (guess + window < hiB) hiB = guess + window; }
  else { hiB = guess; if (guess - window > loB) loB = guess - window; }
  // Make sure the bounds still bracket the target after narrowing.
  if (await getTs(client, hiB) < targetSec) hiB = BigInt(hi);
  if (await getTs(client, loB) >= targetSec) loB = BigInt(lo);

  while (loB < hiB) {
    const mid = (loB + hiB) / 2n;
    if (await getTs(client, mid) >= targetSec) hiB = mid;
    else loB = mid + 1n;
  }
  return loB;
}

// Last block of a given UTC day (date = 'YYYY-MM-DD').
export async function lastBlockOfDay(client, date, lo, hi) {
  const nextMidnight = Date.parse(`${date}T00:00:00Z`) / 1000 + 86400;
  const first = await blockAtOrAfter(client, nextMidnight, lo, hi);
  if (first === null) return null; // the day has not finished yet
  return first - 1n;
}
