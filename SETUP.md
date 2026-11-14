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

## Push notifications (optional, needs a computer with Node)
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
