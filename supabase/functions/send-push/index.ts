// Supabase Edge Function: sends web push for offers (owner) and order progress (staff/owner).
// The service-role key exists only here, as an Edge Function secret the platform provides. It is never sent to the browser.
// Secrets to set: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:you@example.com).
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'
import { asLang, matchesAudience, offerMessage, orderMessage, type Audience, type Msg } from './logic.ts'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method' }, 405)
  const url = Deno.env.get('SUPABASE_URL')!
  const authz = req.headers.get('Authorization') ?? ''
  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authz } } })
  const { data: u } = await asUser.auth.getUser()
  if (!u.user) return json({ error: 'not-authenticated' }, 401)
  const role = (await asUser.from('profiles').select('role').eq('id', u.user.id).maybeSingle()).data?.role
  if (role !== 'staff' && role !== 'owner') return json({ error: 'not-allowed' }, 403)

  let body: { kind?: string; offerId?: number; orderId?: string }
  try { body = await req.json() } catch { return json({ error: 'bad-request' }, 400) }

  const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT')!, Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!)

  const targets: { customer: string; sub: { endpoint: string; p256dh: string; auth: string }; msg: Msg }[] = []
  const subsOf = async (ids?: string[]) => {
    let q = db.from('push_subscriptions').select('customer_id, endpoint, p256dh, auth, profiles(locale)').limit(5000)
    if (ids) q = q.in('customer_id', ids)
    return (await q).data ?? []
  }

  if (body.kind === 'offer') {
    if (role !== 'owner') return json({ error: 'not-allowed' }, 403)
    const { data: o } = await db.from('offers').select('*').eq('id', body.offerId ?? -1).maybeSingle()
    if (!o || !o.active) return json({ error: 'not-found' }, 404)
    const rows = await subsOf()
    const ids = [...new Set(rows.map((r) => r.customer_id))]
    const every = (await db.from('settings').select('reward_every').eq('id', 1).single()).data?.reward_every ?? 6
    const bal = new Map<string, number>(), cnt = new Map<string, number>()
    if (o.audience !== 'all' && ids.length) {
      for (const l of (await db.from('coin_ledger').select('customer_id, delta').in('customer_id', ids)).data ?? []) bal.set(l.customer_id, (bal.get(l.customer_id) ?? 0) + l.delta)
      for (const x of (await db.from('orders').select('customer_id').in('customer_id', ids).neq('status', 'cancelled')).data ?? []) cnt.set(x.customer_id, (cnt.get(x.customer_id) ?? 0) + 1)
    }
    for (const r of rows) {
      if (!matchesAudience(o.audience as Audience, bal.get(r.customer_id) ?? 0, cnt.get(r.customer_id) ?? 0, every)) continue
      // deno-lint-ignore no-explicit-any
      targets.push({ customer: r.customer_id, sub: r, msg: offerMessage(o, asLang((r as any).profiles?.locale)) })
    }
  } else if (body.kind === 'order') {
    const { data: o } = await db.from('orders').select('number, status, customer_id').eq('id', body.orderId ?? '').maybeSingle()
    if (!o) return json({ error: 'not-found' }, 404)
    for (const r of await subsOf([o.customer_id])) {
      // deno-lint-ignore no-explicit-any
      const m = orderMessage(o.status, o.number, asLang((r as any).profiles?.locale))
      if (m) targets.push({ customer: r.customer_id, sub: r, msg: m })
    }
  } else return json({ error: 'bad-request' }, 400)

  let sent = 0, gone = 0
  await Promise.all(targets.map(async (t) => {
    try { await webpush.sendNotification({ endpoint: t.sub.endpoint, keys: { p256dh: t.sub.p256dh, auth: t.sub.auth } }, JSON.stringify(t.msg), { TTL: 3600 }); sent++ }
    catch (e) {
      // 404/410 mean the browser removed the subscription: delete it so we stop trying.
      const code = (e as { statusCode?: number }).statusCode
      if (code === 404 || code === 410) { gone++; await db.from('push_subscriptions').delete().eq('endpoint', t.sub.endpoint) }
    }
  }))
  return json({ sent, removed: gone, recipients: targets.length })
})
