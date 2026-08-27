# Trench Terminal, Setup Notes

Perps DEX frontend scaffold built on Orderly Network's official Next.js SDK template
(https://github.com/OrderlyNetwork/orderly-js-sdk-nextjs-template), configured for
Orderly TESTNET with the public demo broker id. Local scaffold only, not deployed.

## Stack and packages

- Next.js 15.4.8 (App Router, turbopack dev), React 18, TypeScript 5
- Orderly SDK packages, all pinned at 2.8.14 (perp math pkg is 4.8.14):
  - @orderly.network/react-app (OrderlyAppProvider, global config)
  - @orderly.network/wallet-connector (EVM + Solana wallet connect, built in)
  - @orderly.network/trading (full trading page: chart, orderbook, order entry, positions)
  - @orderly.network/markets, portfolio, trading-leaderboard, trading-rewards, affiliate
  - @orderly.network/ui, ui-scaffold (layout: top nav, footer), hooks, types, utils, i18n
- Node v24 works. `npm install`, 2105 packages.

## Where the broker id lives (swap after graduation)

Single source of truth: `src/config/app.ts`

- `brokerId`: env `NEXT_PUBLIC_ORDERLY_BROKER_ID`, fallback `"orderly"` (Orderly's
  public demo broker id, works on testnet with no signup or keys)
- `brokerName`: env `NEXT_PUBLIC_ORDERLY_BROKER_NAME`, fallback `"Trench Terminal"`
- `networkId`: env `NEXT_PUBLIC_ORDERLY_NETWORK`, fallback `"testnet"`

Consumed only in `src/components/orderlyProvider/index.tsx` (OrderlyAppProvider).
After graduation via Orderly One: set the three env vars (or edit fallbacks),
switch network to `mainnet`. Nothing else in the codebase hardcodes the broker.

## Where the theme lives (skin swap later)

- `src/styles/theme.css`: all colors as `--oui-*` CSS variables (primary, success,
  danger, base grays, gradients) plus font family. This is the whole skin; edit
  RGB triplets here to rebrand. Currently the default Orderly purple theme.
- `src/styles/fonts.css`: font faces.
- Logos and icons: `public/images/` (orderly-logo.svg etc.) and
  `src/components/icons/orderly.tsx`. Nav/branding config (logo, links, footer
  socials, referral slogan) in `src/hooks/useOrderlyConfig.tsx`, still Orderly
  branded, swap when theming.
- Page title/description set to Trench Terminal in `src/app/layout.tsx`.

## Routes

- `/` redirects to `/en/perp/PERP_ETH_USDC` (trading page: markets selector,
  TradingView chart, orderbook, order entry, positions/orders tabs)
- `/en/markets`, `/en/portfolio/*`, `/en/leaderboard`, `/en/rewards/*`
- i18n middleware prefixes locale; locale files in `public/locales/`.

## Run

- Dev: `npm run dev` (turbopack, port 3000)
- Build: `npm run build` (passes; type checking and linting are skipped by the
  template's next.config, note below)
- Prod: `npm run start` (or `PORT=xxxx npm run start`)

## Verification done (2026-08-27)

- `npm run build`: PASS, all 14 routes compiled.
- `npm run start` on port 3177: `/` 307-redirects to `/en/perp/PERP_ETH_USDC`,
  perp page and markets page both return HTTP 200, SSR HTML contains the
  Trench Terminal title, no runtime errors in server logs.

## Gotchas / open items

- No keys or signup needed for this scaffold: demo broker id `orderly` on testnet
  is public. A real broker id requires the Orderly One graduation flow.
- Template's `next.config.ts` skips TS type validation and ESLint during build
  (`ignoreBuildErrors`), so build passing does not prove type cleanliness.
- Benign build warning: `bigint: Failed to load bindings, pure JS will be used`.
- Build takes ~2.5 min (SDK bundles are heavy, perp page first-load JS ~1.4 MB).
- Wallet connect (EVM and Solana) is bundled via @orderly.network/wallet-connector;
  actual wallet flows need a browser, only SSR render was verified headlessly.
- Testnet USDC faucet is available in-app once a wallet is connected (Orderly
  testnet standard flow).
