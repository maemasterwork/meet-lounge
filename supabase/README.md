# Meet Lounge database

`migrations/` run in filename order and are safe to run on a fresh project. `seed.sql` is re-runnable.
`tests/` run the real migrations on an in-process Postgres (PGlite) with Supabase's `auth` schema stubbed: `npm run test:db`.

## Who can do what (row level security is on for every table)

| Table | Guest / customer | Staff | Owner |
|---|---|---|---|
| `menu_items` | read (not archived) | read all | read, insert, update, delete |
| `offers` | read active, in date range | read active | read all, insert, update, delete |
| `settings` | read | read | read, update |
| `profiles` | read own; update own name/phone/locale (never `role`) | read all | read all; change roles only through `set_role()` |
| `orders` | read own; **no insert/update**; cancel own `new` order via `cancel_order()` | read all; move status forward via `advance_order()` | same as staff |
| `order_items` | read own | read all | read all |
| `coin_ledger` | read own; **no write** | read own | read all; adjust only through `adjust_coins()` |
| `push_subscriptions` | read and delete own; add only through `register_push()` | same | same |
| Storage `menu-images` | public read | read | upload, replace, delete |

Orders come into existence only through `create_order()`. It runs in Postgres, ignores any price from the browser,
recomputes every price from `menu_items`, `settings` and active `offers`, and spends reward coins in the same transaction.
One coin is added by a trigger when an order reaches `done`; a unique index on `(order_id, reason)` makes that, and refunds, happen once.
