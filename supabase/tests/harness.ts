import { PGlite } from '@electric-sql/pglite'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(__dirname, '..')

/** Minimal stand-in for Supabase's auth schema + roles, so the real migrations run unchanged on plain Postgres. */
const AUTH_STUB = `
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), raw_user_meta_data jsonb default '{}', is_anonymous boolean default false);
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
grant usage on schema auth to anon, authenticated;
`

export async function freshDb() {
  const db = new PGlite()
  await db.exec(AUTH_STUB)
  for (const f of readdirSync(join(root, 'migrations')).sort()) await db.exec(readFileSync(join(root, 'migrations', f), 'utf8'))
  await db.exec(readFileSync(join(root, 'seed.sql'), 'utf8'))
  return db
}

export type Who = { id: string; anon?: boolean } | 'anon' | null

/** Run SQL the way PostgREST would: as role `authenticated`/`anon` with the user's JWT claims. */
export async function as<T = any>(db: PGlite, who: Who, sql: string, params: any[] = []): Promise<T[]> {
  if (who === null) return (await db.query<T>(sql, params)).rows
  const role = who === 'anon' ? 'anon' : 'authenticated'
  const claims = who === 'anon' ? {} : { sub: who.id, role, is_anonymous: !!who.anon }
  await db.exec(`select set_config('request.jwt.claims', '${JSON.stringify(claims)}', false); set role ${role};`)
  try { return (await db.query<T>(sql, params)).rows } finally { await db.exec('reset role; select set_config(\'request.jwt.claims\', \'\', false);') }
}

export async function addUser(db: PGlite, role: 'customer' | 'staff' | 'owner' = 'customer', anon = false) {
  const { rows } = await db.query<{ id: string }>('insert into auth.users (is_anonymous) values ($1) returning id', [anon])
  const id = rows[0].id
  if (role !== 'customer') await db.query('update public.profiles set role = $1 where id = $2', [role, id])
  return { id, anon }
}
