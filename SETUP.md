# Connect Meet Lounge to Supabase (about 15 minutes)

Without these steps the app still runs on the built-in demo data. With them, orders, coins and the dashboard are real and live.

## 1. Create the project
1. supabase.com → New project. Pick the region closest to your customers. Save the database password.
2. Wait until the project is ready.

## 2. Create the tables, rules and menu
Easiest: open **SQL Editor** and paste, run, in this order, each file in full:
1. `supabase/migrations/20261113000100_schema.sql`
2. `supabase/migrations/20261113000200_functions.sql`
3. `supabase/migrations/20261113000300_rls.sql`
4. `supabase/migrations/20261113000400_realtime_storage.sql`
4b. `supabase/migrations/20261113000500_admin.sql`
4c. `supabase/migrations/20261113000600_push.sql`
5. `supabase/seed.sql`

(With the Supabase CLI instead: `supabase link --project-ref <ref>`, `supabase db push`, then run `seed.sql` in the SQL editor.)
Do not run a file twice; the migrations are meant for a fresh project. `seed.sql` can be re-run safely.

## 3. Turn on sign-in
**Authentication → Sign In / Providers**
- Email: on. For quick testing turn "Confirm email" off; turn it back on before launch.
- **Allow anonymous sign-ins: on.** Guests order with a phone number and no signup; they can create an account later and keep their coins.

**Authentication → URL Configuration**
- Site URL: where the app lives, e.g. `https://YOUR-NAME.github.io/meet-lounge/` (or `http://localhost:5173/` while developing).
- Add the same address under Redirect URLs. Magic links return here.

## 4. Put the keys in the app
**Project Settings → API**: copy *Project URL* and the **anon / publishable** key.
```
cp .env.example .env.local      # then paste the two values
npm install
npm run dev
```
Never use the `service_role` / secret key anywhere in this project. `npm run check:bundle` fails if one sneaks in.

## 5. Make yourself the owner
1. Open the app, **Me → Coins**, create an account with your email.
2. In the SQL editor, edit the email in `supabase/promote-owner.sql` and run it.
3. Sign out and in. The dashboard (profile menu → Dashboard) now opens. Promote staff the same way with role `staff`.

## 6. Check it works (the walkthrough)
1. In a private window open the app (you are a guest), add a latte, choose pickup, enter a phone number, place the order.
2. In your owner window open the dashboard: the order appears without refreshing. Press Start prep → Ready → Done.
3. Back in the guest window: **Me → Orders** shows each status live; when it reaches Done, **Coins** shows +1.

## 7. Deploy on GitHub Pages
Add the two values as repository **Secrets** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, build with `npm run build`, publish `dist/`. The build uses relative paths, so a `/<repo>/` address works. The anon key is public by design; the rules in `supabase/migrations/…_rls.sql` are what protect the data.

## Dashboard (Phase 4)
Profile menu → Dashboard. Staff see Orders and Stats. The owner also gets Menu (prices, availability, reward items, new items, names, pictures), Coins & rewards (reward rule, customer balances, manual adjustments), Offers, and Brand (names, colors, hero picture, delivery fee, tables, open/closed). Staff who open the owner tabs see them read-only; the database refuses their writes anyway.

Pictures go to the `menu-images` bucket (JPG, PNG, WebP or AVIF, up to 2.5 MB; public to read, owner-only to write). Re-run migration `20261113000500_admin.sql` if you set up Phase 3 earlier: it adds the owner-only customer list.

## Install, offline, table QR codes (Phase 5)
- **Install:** in production the app registers a service worker and a manifest. Chrome/Android show "Install the app" in the settings popup; on iPhone use Share, then Add to Home Screen. It opens the last loaded screen offline; ordering needs a connection.
- **Table QR codes:** Dashboard → Brand → Table QR sheet → Print. Each code opens the shop set to "at the table" for that table.
- **3D models:** see `public/models/README.md`. Drop `latte.glb` there and list it in `index.json`; no code change. Items without a model keep their picture.

## Notifications: what the app does by itself, and what needs the server

Two layers:

1. **By itself (no setup):** while the app is open, in a background tab or just after the customer switched away, the app watches the customer's orders and offers (they update live) and shows a phone or desktop notification when an order becomes Ready, On the way or Done, or when a new offer arrives. If the app is on screen, it shows an in-app message too. **Limit:** a phone freezes web pages a short time after you leave the app or lock the screen, and a frozen page cannot notice anything. So "your order is ready" reaches a locked phone only through the server push (second layer below); the by-itself layer covers the app being open, on screen, or just left. The customer turns it on with the "Offer notifications" switch in the settings popup and allows the browser's permission. The same popup has **Send a test notification**: use it to check this device.
2. **From the server (needs the steps below):** a notification when the app is completely closed. A web page cannot do this alone, because the phone only accepts these messages from a server that holds your private VAPID key. That is why the app cannot do it by itself: the Supabase function `send-push` is the server part.

**Refreshing in the background:** the live connection (Supabase realtime) is paused by phones and background tabs, so the app no longer relies on it alone. Every screen also reloads its data when the app comes back to the front, regains focus or network, and every 20 seconds while the app is open (browsers slow this to about once a minute in a hidden tab, and may stop it after a long time). That is also what lets the app notify "your order is ready" without the server. To change the 20 seconds, edit `createRefresher(browserEnv)` in `src/lib/refresh.ts`; each open screen makes a few small requests per refresh.

If notifications "do not work", check in this order:
- Press **Send a test notification**. If it shows a notification, the device is fine and only the closed-app part (below) is missing. If it says notifications are blocked, allow them in the browser or phone settings for the site.
- iPhone: add the app to the Home Screen first (iOS 16.4+), open it from the icon, then turn the switch on.
- Phone settings: Focus / Do not disturb, and "Notifications" for the browser or the installed app.
- Closed-app messages: all steps below must be done (the VAPID public key in the build, the secrets, `supabase functions deploy send-push`). Without them the app only notifies while it is open.

## Push notifications for a closed app (optional, needs a computer with Node)
1. `npx web-push generate-vapid-keys`. Put the **public** key in `.env.local` / the GitHub secret `VITE_VAPID_PUBLIC_KEY`.
2. `npm i -g supabase`, then `supabase login` and `supabase link --project-ref <ref>`.
3. `supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:you@example.com`
4. `supabase functions deploy send-push`
5. In the app: settings popup → notifications switch → allow. Then in the dashboard send an offer, or advance an order to Ready: the phone shows the message (offers in the customer's language; audience filters apply).

The function checks the caller's role itself (offers: owner only; order updates: staff or owner) and uses the platform-provided service key inside the function only. If you skip these steps everything else works; the in-app offer bell remains.
iPhone: web push works only after the app is added to the Home Screen (iOS 16.4+).

## Tests
`npm run verify` runs: types, 41 front-end tests, 36 database and push-logic tests on a real Postgres engine (RLS, server-side prices equal to the app's, one coin per order, refunds, status rules), the production build, and the secret scan.

## Not covered here
Real delivery of push messages (needs your VAPID keys and the deployed function: step above) was only tested at the logic and service-worker level. Promoting staff is still done in SQL (`promote-owner.sql`, role `staff`). Realtime, email delivery and anonymous sign-in are Supabase services and were not exercised against a live project from this build environment; step 6 is how you confirm them on yours.

## Deposit before preparation (migration 20261113000700)
Customers pay by card-to-card deposit. After checkout they see the cafe's card number and a note that preparation starts after the deposit.
1. Run the new migration (`supabase db push`).
2. Sign in as owner → Dashboard → Brand → "Payment by deposit": enter the 16-digit card number and holder name.
3. Staff press **Deposit received** on a new order; only then can it move to *Preparing*. Orders with nothing to pay (all rewards) start immediately.
4. Switch "Require a deposit" off to go back to cash on delivery/pickup.
Note: the card number is readable by every visitor (it is part of the public `settings` row) — that is intended, it is shown to customers.

## Per-item coins and stock (migration 20261113000800)
Dashboard → Menu now has, for every item: **Stock** (empty = unlimited, 0 = sold out), **Coins earned** (per unit, default 1, paid when the order is done) and **Reward price (coins)** (used when "Reward" is on).
Run the migration after 0700. Existing items get reward price = your current global number; open orders keep the old 1-coin-per-line rule. The global number in Coins & rewards is now only the default for new items.

## Events (migration 20261113000900)
Dashboard → Events (owner): add, edit, hide (unpublish) or delete gatherings; set date, time, place, icon, total seats and "seats you keep" (walk-ins). Customers save a seat on the Events page; the server stops bookings when the event is full or already past (cafe time = Asia/Tehran, change `cafe_today()` if needed). Staff can see each event's guests. `seed.sql` adds four example events relative to today — delete or edit them in the dashboard.


## 3D cafe background and seasons

- Run `npm install` (adds `three-r128`, the pinned three.js r128 the model was built with; it sits next to the three version used by `model-viewer`).
- Run the new migration `supabase/migrations/20261113001000_season.sql` (adds `settings.season`, `summer` or `fall`, default `fall`).
- The 3D scene loads lazily after the first screen. If WebGL is missing, or the visitor has Data Saver on, the flat artwork stays.
- Day/night follows the product's light/dark look. Camera views are in the footer. The owner picks the season in Dashboard > Brand.

### Seasons and special events (update)

- New migration `supabase/migrations/20261113001100_season_event.sql`: seasons are now spring, summer, fall, winter, and `settings.scene_event` is none, yalda, xmas or nowruz.
- Dashboard > Brand has both groups. Nowruz also sets spring; Yalda and Christmas also set winter. Day/night still follows the light/dark look.
- `index.html` now also loads the Unbounded and Manrope fonts, which the 3D sign and menu board use.

## Updating the 3D model yourself (from a new HTML file)

Your 3D cafe lives in `src/scene3d/diorama.ts`. The scene-building code in it is a copy of the code in your single-file HTML model (three.js r128). The camera, orbit controls, views, light/dark, season, special event and cleanup are the product's own code around it. A script copies the new model in without touching the product's part.

### Update steps

1. Save the new HTML anywhere, for example `~/Downloads/Meet_Lounge_Modern_9.html`.
2. In the project folder run:
   ```
   node scripts/import-diorama.mjs ~/Downloads/Meet_Lounge_Modern_9.html
   ```
   It prints `Imported N lines …`. It replaces only the part of `src/scene3d/diorama.ts` between the lines `MODEL BODY START` and `MODEL BODY END`. Do not edit that part by hand: the next import overwrites it.
3. Run `npm run verify` (types, tests, build).
4. Look at it: `npm run dev`, then open the home page. Check:
   - the footer buttons Corner / Front / Street / Inside / Above all move the camera;
   - the light/dark button switches day and night;
   - Dashboard > Brand: each season and each special event looks right.
5. Deploy as usual (commit, push, GitHub Pages).

No database change is needed for a model update. Customers get the new model on their next visit (the app updates itself).

### What the HTML must look like

The script looks for two lines in your HTML and takes everything between them:

- start: the line `scene.add(world);`
- end: the comment `/* ---------- camera, controls, views ---------- */`

So everything the model builds (building, trees, people, textures, `applyLight`, `applySeason` and so on) must sit between them, as it does now. The product replaces what is after the end line (camera, controls, buttons, the animation loop), so changes you make there in the HTML are not imported.

The script checks that these names still exist in the new model, because the product's code uses them: `nightGoal, seasonGoal, winterGoal, springGoal, yaldaGoal, xmasGoal, nowruzGoal, yaldaDecor, xmasDecor, nowruzDecor, applySeason, applyLight, applyBuilding, refreshMenu, curSeason, movers, steam, updateLeaves, updateSnow, updateSpring, updateSanta, updateNowruz`. If one is missing or renamed, it stops and changes nothing, and tells you which.

### What the import does not cover (needs a code change)

| New in the HTML | What to change |
| --- | --- |
| a new camera view (a sixth button) | the `views` object in the lower part of `diorama.ts`; `src/scene3d/views.ts` (`VIEWS`); `view3d.<name>` in `src/i18n/en.json` and `fa.json` |
| a new season | `Season` and `SEASONS` in `src/repos/types.ts`; a `season.<name>` label in both i18n files; the `season` check in a new migration (copy `supabase/migrations/20261113001100_season_event.sql`); `setSeason` in `diorama.ts`; a sky gradient `.stage3d .sky.<name>` in `src/app.css` and a `<div className="sky <name>"/>` in `src/scene3d/Stage3D.tsx` |
| a new special event | `SceneEvent`, `SCENE_EVENTS` and `EVENT_SEASON` in `src/repos/types.ts`; `sceneEvent.<name>` in both i18n files; the `scene_event` check in a new migration; `setEvent` and the frame loop in `diorama.ts` |
| a new font used in a sign or menu board | add it to the Google Fonts link in `index.html` |
| a new file the model loads (image, model file) | put it in `public/` and use a relative path; the model must not depend on a CDN other than the app's own files |

Ask me for any of these and I will make the change.

### Troubleshooting

- **The page stays flat (no 3D):** WebGL is off, Data Saver is on, or the debug switch is set. In the browser console run `localStorage.removeItem('ml-flat')` and reload.
- **Black or empty scene after an update:** open the browser console. A red error usually names a variable from the new model; send it to me.
- **Slow on an old phone:** in `diorama.ts` change `Math.min(window.devicePixelRatio || 1, 1.75)` to `1.25`.
- **A change in the HTML does not show:** you changed something outside the two marker lines (see above), or forgot to rerun the import.
