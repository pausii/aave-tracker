# Aave V3 USDT Tracker

Tracks the aUSDT balance and daily interest of one or more wallets supplying
USDT to Aave V3 on Ethereum. The data is encrypted (AES-256-GCM, key derived
from a passphrase with PBKDF2) and served as a static GitHub Pages site from a
separate data repository.

Read-only. No wallet connection, no private keys anywhere in the codebase.

## How it works

One snapshot per UTC day. The snapshot dated `D` holds the balance at the **end**
of day `D`:

```
interest(D) = end_balance(D) - end_balance(D-1) - net_flow(D)
```

Net flow is deposits plus incoming transfers, minus withdrawals and outgoing
transfers. Principal amounts come from the Aave Pool's `Supply` and `Withdraw`
events rather than the aToken `Transfer` value, because `Transfer` already
includes interest accrued since the last interaction and would otherwise be
counted as a deposit.

The day in progress is marked `partial` and recomputed on the next run using
that day's final block. Days that were missed — a failed workflow, say — are
refilled automatically from archive data.

## Layout

- `src/update.js` — daily multi-wallet updater
- `src/events.js` — event discovery (`alchemy_getAssetTransfers` plus narrow `eth_getLogs`)
- `src/blocks.js` — block lookup by timestamp
- `src/crypto.js` — encryption (same envelope format as the browser)
- `app/` — dashboard: Svelte 5, TypeScript, Tailwind v4, ECharts
- `app/src/lib/theme.svelte.ts` — light / dark / system theme
- `app/src/app.css` — colour and typography tokens
- `.github/workflows/update.yml` — cron at 01:00 UTC

## Running locally

```bash
npm install && npm --prefix app install

export WALLETS='[{"address":"0xYourWalletAddress","label":"Main"}]'
export PASSPHRASE='...'
export RPC_URL='https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY'
export OUT_DIR="$PWD/local-site"

node src/update.js
npm --prefix app run build && cp -r app/dist/* local-site/
cd local-site && python3 -m http.server 8080
```

Then open <http://127.0.0.1:8080>.

## Setting up production

One repository, two branches. `main` holds the source; `gh-pages` holds the
built dashboard and the encrypted data, and GitHub Pages serves it. Because
both live in the same repository, the workflow pushes with the built-in
`GITHUB_TOKEN` and no personal access token is needed.

`gh-pages` is also the datastore: each run reads the previous
`portfolio.enc.json` from it and writes the new one back, replacing everything
else with the fresh build.

1. Create the repository on GitHub and push both branches:

   ```bash
   git remote add origin git@github.com:YOURNAME/aave-tracker.git
   git push -u origin main
   git push -u origin gh-pages
   ```

2. In **Settings → Pages**, set the source to branch `gh-pages`, folder `/ (root)`.
3. In **Settings → Secrets and variables → Actions**, add the secrets
   `WALLETS`, `RPC_URL` and `PASSPHRASE`.
4. Run the workflow manually (`workflow_dispatch`) to test it.

The site then appears at `https://YOURNAME.github.io/aave-tracker/`.

Example `WALLETS` (around five wallets is the practical ceiling):

```json
[{"address":"0xYourWalletAddress","label":"Main"},
 {"address":"0xAnotherWalletAddress","label":"Wallet 2"}]
```

### If the repository is public

`portfolio.enc.json` is served from a public branch, so anyone can download it.
Its contents, including the wallet addresses and the whole balance history, are
AES-256-GCM encrypted behind a PBKDF2 key at 310,000 iterations. That holds only
as well as the passphrase does: an attacker with the file can guess offline,
without rate limits, for as long as they like. **Use a long random passphrase.**
A short or memorable one belongs in a private repository instead.

## Interface

The design reads as a precision instrument for a slow process, not a SaaS
dashboard.

- **Colour marks state, never decoration**: patina for interest from a day that
  has closed, brass for the day still running, rust for a balance that fell.
  Every text/background pair passes WCAG AA in both themes.
- **Typography**: Newsreader for figures and headings, IBM Plex Sans elsewhere.
  Fonts are bundled with the app rather than fetched from Google Fonts, so
  visits to this private dashboard are not reported to a third party.
- **The login screen** shows the balance as shifting encrypted glyphs that settle
  into the real figure on unlock. The glyph set deliberately contains no digits,
  so a random row can never be mistaken for a real balance.
- **The theme** follows the system by default and can be pinned to light or dark
  from the header. The choice is stored in `localStorage` and applied before
  paint, so the page never flashes the wrong colours.
- `prefers-reduced-motion` is respected: the cipher and reveal animations are
  skipped.
- **On narrow screens the daily history becomes a list rather than a table.**
  Four columns do not fit on a phone, and pushing "Earned" off the edge hid the
  one number the page exists to show.

### Live balance

The stored data is at most a day old, so the dashboard can also read the current
balance straight from a public Ethereum node and refresh it every 15 seconds.
`balanceOf` is a free call needing no API key, and the updater's key never
reaches the browser.

It is **off by default**, because it is the only part of the page that talks to
anything beyond its own origin, and the node it asks learns which wallet is
being queried. Turn it on with the Live switch on the balance card; the choice
is remembered. Polling pauses while the tab is in the background.

### Rate earned

A third chart annualises what each day actually paid, derived from the balances
rather than from any rate Aave advertises. On days when money moved, the
principal that was earning is unknown — we do not know what time the transfer
landed — so midday is assumed and those points are marked as estimates. The day
in progress is left out entirely, since annualising a part-day would read as a
collapse in the rate.

### Time range

A picker above the charts limits them to the last 7, 30 or 90 days, or all of
history; the choice is remembered. The stat cards keep their own fixed windows,
because "earned today" and "last 7 days" answer different questions than the
charts do.

This matters more than it looks: a deposit stays in the history forever, so
without a window the balance chart is permanently dominated by one step and the
daily slope never becomes visible. Options wider than the data on hand are
hidden rather than shown as dead controls, and the caption says "since you
supplied" whenever the window covers everything anyway.

Days when money moved are marked on the balance chart with the amount, so the
step in the line is explained rather than left as an unlabelled cliff.

### Stale data

If the daily update has not run for more than 36 hours, a banner says so and
gives the age. The cron runs once a day, so anything past that means a run was
missed.

## Things worth knowing

- **RPC**: Alchemy is required, or another provider offering
  `getAssetTransfers`. Public RPCs and Alchemy's free tier cap `eth_getLogs` at
  a 10-block range, so history is scanned with `alchemy_getAssetTransfers`.
  Without it the code falls back to a chunked `getLogs` scan, which is only
  practical over short ranges.
- **The passphrase cannot be recovered.** If it is lost, so is the data.
  Changing it means re-encrypting the whole file.
- **Browser sessions last 7 days**, then sign out automatically. Logging out
  erases the key from the device; it is stored as a non-extractable `CryptoKey`
  in IndexedDB, never as the passphrase itself.
- **Negative interest** means the balance fell with no event to explain it, for
  example aUSDT moved out along a path the scan missed. Check the wallet if it
  appears.
- Only USDT on Ethereum is supported today, though the data format allows more.

## Licence

ISC, copyright Ahmad Pausi. See `LICENSE`.

The fonts bundled into the build (IBM Plex Sans and Newsreader) are covered by
the SIL Open Font License 1.1, separately from this code. Because the published
site redistributes those `.woff2` files, OFL requires their licence and copyright
notices to travel with them. Those notices live in `app/public/licenses/` and are
emitted to `dist/licenses/`, so a deployed site serves them at `/licenses/`:

- `/licenses/NOTICE.txt` — what is bundled and under which licence
- `/licenses/IBM-Plex-Sans-OFL.txt`
- `/licenses/Newsreader-OFL.txt`

If you add or swap a font, copy its licence file in beside these and update
`NOTICE.txt`. The licence texts are copied verbatim and must not be edited.
