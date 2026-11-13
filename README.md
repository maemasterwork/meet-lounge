# Meet Lounge: customer app (Phase 2)

React 18 + TypeScript + Vite. Persian and English, runs on mock data behind repository interfaces so Phase 3 can swap in Supabase.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 27 unit tests (pricing, coins, cart, mock repositories)
npm run build      # type-check + production build into dist/
npx vite preview --port 4173 &  &&  node e2e/smoke.mjs   # browser smoke test (needs: npm i -D playwright)
```

The build uses relative asset paths (`base: './'`) and hash routes (`#home`, `#menu`, `#shop`, `#story`, `#gallery`, `#events`, `#bag`, `#me`, `#admin`), so it deploys to GitHub Pages with no server rewrites.

Table QR codes open the app as `https://your-site/?table=7`; that switches the bag to "at the table" and picks table 7.

## Layout of the code

| Path | Role |
|---|---|
| `src/theme.css` | Design tokens from Phase 1 (`--ml-*`), light and dark. Change the brand here. |
| `src/app.css` | Layout of the one-screen frame. Uses tokens only. |
| `src/i18n/fa.json`, `en.json` | Copy deck (same keys). Add a language by adding a file and an entry in `i18n/index.tsx`. |
| `src/data/catalog.ts` | Menu items, sizes, milks, events. The only place prices live in the mock. |
| `src/lib/pricing.ts`, `coins.ts` | Pure business rules, fully tested. Phase 3 re-implements them in Postgres. |
| `src/repos/types.ts` | `MenuRepo`, `OrderRepo`, `CoinRepo`, `OfferRepo`, `SettingsRepo`. Pages call only these. |
| `src/repos/mock.ts` | In-memory implementations. `src/repos/index.ts` chooses which one is used. |
| `src/store/` | Zustand stores: cart (persisted), UI preferences (persisted), toasts. |
| `src/art/` | Flat SVG illustrations (`art.ts`) and the components that draw them (`ItemArt.tsx`). |
| `src/pages/`, `src/components/` | Screens and shared pieces. |
| `src/admin/` | Lazy-loaded chunk. Phase 2 has only the live order board; Phase 4 builds the dashboard. |

## Photos and 3D

Every picture goes through `ItemArt`. Use the global API (also `import { ml } from './lib/meetlounge'`):

```js
MeetLounge.setItemImage('latte', '/photos/latte.webp')   // replaces the picture everywhere (null removes it)
MeetLounge.setHero('/photos/cafe.webp')                  // replaces the cafe scene
MeetLounge.setItemRenderer((el, item, state) => {        // mount a 3D / 360 viewer on the product stage
  const viewer = mountViewer(el, item.id, state.size)    // state = { size, milk, sugar }
  return () => viewer.dispose()                          // optional cleanup
})
MeetLounge.setHeroRenderer((el, { time }) => { /* three.js canvas in the hero slot */ })
```

Order of resolution for a picture: image URL, then renderer (stage and hero only), then the flat SVG. If a renderer throws, it is logged and the stage stays empty for that item, so test a renderer with the SVG fallback in mind.

## Decisions

- **Frame is physical, text is directional.** Blocks sit in the same place in both languages (as in the reference screenshots); only the text inside follows `fa` (RTL) or `en` (LTR). This differs from "mirror the whole layout", because the reference positions are fixed.
- **Rewards are spent at checkout**, not when added to the bag. A reward line costs N coins when the order is placed; cancelling refunds them. This removes the add-then-remove refund path.
- **Prices are computed by `OrderRepo.place`**, never sent by the client, so the same shape works with Supabase in Phase 3.
- `src/art/art.ts` is `@ts-nocheck` (ported drawing code that builds SVG strings). Everything around it is strict.

## Known gaps (planned)

- Orders, coins and favorites reset when the page reloads (mock data); cart and preferences persist in the browser.
- Offer composer, menu editor, coin rules and stats are Phase 4; login is Phase 3; push, PWA manifest and offline are Phase 5.
- Fonts load from Google Fonts. Self-host them for fully offline use.


## Phase 3: Supabase
Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (see `.env.example`) and the app uses Supabase; without them it runs the in-memory demo. Setup steps: `SETUP.md`. Database rules table: `supabase/README.md`. `npm run verify` runs everything.
