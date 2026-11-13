// Fails if a service-role key or secret could be in the shipped bundle or in source.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
const bad = []
const walk = (d, f) => { for (const n of readdirSync(d)) { if (n === 'node_modules' || n === '.git') continue; const p = join(d, n); statSync(p).isDirectory() ? walk(p, f) : f(p) } }
const jwtRole = (s) => { // any JWT-looking token whose payload says service_role
  for (const m of s.matchAll(/eyJ[\w-]+\.(eyJ[\w-]+)\.[\w-]+/g)) { try { if (JSON.parse(Buffer.from(m[1], 'base64url').toString()).role === 'service_role') return true } catch { /* not a jwt */ } }
  return false
}
for (const dir of ['dist', 'src']) { try { walk(dir, (p) => { const s = readFileSync(p, 'utf8'); if (/service_role|SERVICE_ROLE/.test(s) && !p.endsWith('check-bundle.mjs')) bad.push(`${p}: mentions service_role`); if (jwtRole(s)) bad.push(`${p}: contains a service_role JWT`) }) } catch { /* dir missing */ } }
for (const f of ['.env', '.env.local', '.env.production']) { try { const s = readFileSync(f, 'utf8'); if (/VITE_[A-Z_]*SERVICE/i.test(s) || jwtRole(s)) bad.push(`${f}: service key exposed through VITE_`) } catch { /* no file */ } }
if (bad.length) { console.error('FAIL\n' + bad.join('\n')); process.exit(1) }
console.log('OK: no service_role key in dist/, src/ or .env files')
