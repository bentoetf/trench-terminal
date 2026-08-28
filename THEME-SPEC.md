# Trench Terminal, brutalist theme spec (from approved mockup, 2026-08-27)

Mockup: media/inbound image approved by Rasta. Brutalist high-contrast terminal: cream paper canvas, heavy black type and borders, hard offset shadows (no blur), orange accent, sparse green positives. Square corners everywhere.

## Colors
- Page background: #F3EFE5
- Panel background: #F6F1E7 (rows #F7F3EA, alt #F2EEE5, muted fill #E6E0D5)
- Black modules (stat bar, ticker, active tabs): #030303 / #000000
- Primary border: #000000 (panels 4px, secondary 2px, controls 1.5px)
- Table grid lines: #8C887E; chart grid: #CFC8BC (1px dashed)
- Accent orange (active nav, selected market row, SHORT, negatives, liquidations, price tag): #FF3D0A
- Positive green: #19833B (text #117A35, funding #39A664)
- LONG button fill: #3FA462
- Text: #000 on cream, #FFF on black; muted labels #171717
- Candles/volume: bullish #111111, bearish #FF3D0A

## Shadows (hard, black, no blur, no radius)
- Panels: box-shadow: 7px 8px 0 #000
- Small controls: 4px 4px 0 #000
- Connect wallet: 7px 7px 0 #000
- border-radius: 0 everywhere

## Typography (all uppercase for nav/labels/headers/buttons)
- Display: "Anton", "Impact", "Arial Black" (weight 900, tight tracking -0.035em to -0.055em, line-height ~0.85-0.9)
- Condensed body/tables: "Barlow Condensed", "Roboto Condensed" (700-800)
- Numbers: "Roboto Mono"/"IBM Plex Mono" 700, font-variant-numeric: tabular-nums
- Logo "TRENCH TERMINAL": display 900, clamp(72px,6.3vw,132px), lh .82
- Section headings (MARKETS, ORDER TICKET, TRENCH LEADERBOARD): display 48-58px
- Nav items 28-34px/900; active nav = orange #FF3D0A fill, black text, rect, padding 18px 26px
- Stat labels 15-16px/800 white; stat values 28-31px/900
- Buttons LONG/SHORT: display 900, huge (70-86px in mockup scale), letter-spacing -0.05em

## Layout
- Header row: giant logo left, nav (TRADE active / PORTFOLIO / REFERRALS / LEADERBOARD / DOCS), CONNECT WALLET → orange button (border 3px black, shadow 7px 7px)
- Second row: left tagline card "PERPS. NO KYC. PURE EDGE." with 26px orange square + black diagonal hazard stripes right (repeating-linear-gradient(125deg, #000 0 18px, transparent 18px 34px)); center black stat bar (TOTAL VOLUME 24H, OPEN INTEREST, 24H LIQUIDATIONS in orange, FUNDING RATE in green), 1px #6E6A64 dividers; right black ticker strip (pair white 32px, price white 39px, change orange)
- Main body 3 cols: markets ~24%, chart ~51%, order ticket ~24%, gap 14-16px
- Markets panel: heading, tabs (ALL active black/white; MAJORS/AI/L1/MEME cream w/ 1px #8C887E border), table PAIR/PRICE/24H %/VOL(24H), selected row = orange bg white text, row height 44-48px, separators 1px #8C887E, monochrome token icons, "VIEW ALL MARKETS →" full-width outline button (2px black border)
- Chart panel: pair title display 34-38px, timeframe buttons (active black), OHLC mono 14px, candles per colors above, dotted orange current-price line + orange price tag
- Order ticket: MARKET/LIMIT/STOP tabs (active black), size input (bordered 1.5px, mono 32px), percent slider, leverage stepper (minus / value / plus, bordered), MAX POSITION SIZE label, LONG button (#3FA462 fill, black border+text, ↗), SHORT button (#FF3D0A fill, black border+text, ↙), expected liq price small mono under each
- Leaderboard full-width panel: heading "TRENCH LEADERBOARD", "VIEW FULL LEADERBOARD →" outline button right, black header row white text (RANK/TRADER/EQUITY/PNL 7D/PNL %/VOLUME 7D/WIN RATE), rank as huge display numbers in bordered cells, pixel-art avatars + orange level badges next to trader names, PnL greens #117A35, win-rate horizontal black bar meters
