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

### THEME: Trench Terminal brutalist skin (applied 2026-08-27)

Theme spec: `THEME-SPEC.md` (cream #F3EFE5 canvas, #F6F1E7 panels, 4px black
borders, 7px 8px 0 #000 hard shadows, radius 0, orange #FF3D0A accent, LONG
#3FA462, positive #19833B, black #030303 modules, Anton + Barlow Condensed +
IBM Plex Mono uppercase, tabular-nums).

Files changed for the skin:

- `src/styles/theme.css`: all `--oui-*` variables remapped to the brutalist
  palette (light-inverted base scale, orange primary/danger, green success,
  gradients flattened to solid fills, every `--oui-rounded-*` set to 0).
- `src/styles/brutalist.css` (NEW): the override layer for deep SDK internals.
  Global radius kill, panel borders + hard shadows on `.oui-box.oui-rounded-*`
  and `.oui-card-root` and table roots, black table headers, tab/button/input
  restyles, chart svg text fill fix (was white on cream), sidebar
  `oui-break-all` wrap fix, fixed-status-bar bottom padding, trophy-image
  grayscale flatten, `.tt-logo`/`.tt-tagline` branding classes.
- `src/styles/fonts.css`: Manrope replaced with Google Fonts import of Anton,
  Barlow Condensed, IBM Plex Mono.
- `src/app/globals.css`: imports brutalist.css last.
- `src/hooks/useOrderlyConfig.tsx`: logo swapped to "TRENCH TERMINAL" text
  brand with orange square dot + "PERPS. NO KYC. PURE EDGE." tagline block;
  PnL share slogan set to the tagline.

Verified 2026-08-27: `npm run build` passes; screenshots in `screenshots/`
(trading, portfolio, markets, leaderboard, 1440px).

Known styling gaps:

- TradingView chart is the unlicensed placeholder, so candle colors
  (#111/#FF3D0A) are unverified; needs a TV license + customCssUrl pass.
- Leaderboard container sits slightly right of center (SDK layout, not
  restyled); trophy images are grayscale-flattened, not replaced with flat
  brutalist badges.
- Header nav truncates the REWARDS item at ~1440px when wallet totals show;
  tagline hides below 1180px but the brand block is still wide.
- Risk-rate meter (top right of trading page) keeps its pastel gradient bar.
- Some SDK micro-controls (sliders, toggles, checkboxes) keep default styling;
  bordered but not fully brutalist.
- Selected markets row does not use the mockup's orange-fill treatment.


- `src/styles/theme.css`: superseded by the THEME section above; edit the
  `--oui-*` triplets there to re-skin.
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

## DEPLOY (2026-08-27, Render)

- Live URL: https://trench-terminal.onrender.com (/ 307-redirects to /en/perp/PERP_ETH_USDC)
- Render service id: srv-da8ea30ae00c73cme410 (web service, Docker runtime, free plan, Oregon, Rasta's Render account "Jermain's workspace")
- Dashboard: https://dashboard.render.com/web/srv-da8ea30ae00c73cme410
- GitHub repo: https://github.com/bentoetf/trench-terminal (branch master, autodeploy on push, bentoetf account)
- Env vars set on service: NEXT_PUBLIC_ORDERLY_BROKER_ID=orderly, NEXT_PUBLIC_ORDERLY_BROKER_NAME=Trench Terminal, NEXT_PUBLIC_ORDERLY_NETWORK=testnet
- Caveats: free tier spins down when idle, first hit after sleep takes ~30-60s cold start; Docker build ~5 min per deploy.
