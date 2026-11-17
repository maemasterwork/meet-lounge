// Flat SVG illustrations for the menu items and the cafe scene (v2: shaded, themed through --ml-* variables).
// This file builds SVG strings (the "flat placeholder" that photos or 3D can replace through ItemArt / MeetLounge),
// so it is deliberately loose-typed. Everything that wraps it (ItemArt, Scene) is strictly typed.
// @ts-nocheck
import { esc } from '../lib/format'

const isDrink = (it) => it.cat === 'hot' || it.cat === 'cold' || it.cat === 'tea'

const INK = 'var(--ml-draw)'
const TEAL = 'var(--ml-teal)'
const TINT = [null, '#D8BC93', '#D0B087']
const SYRUP_COLORS = { vanilla: '#E6BD63', caramel: '#C9772B', hazelnut: '#79523D' }
const SYRUP_Y = {
  espresso: 132, americano: 112, cortado: 122, syruplatte: 104, syrupicedlatte: 84,
  hotchoc: 108, mangochoc: 108, berrychoc: 108, latte: 104, cappuccino: 108, mocha: 106,
  icedlatte: 84, iceamer: 78, coldbrew: 74, shake: 92,
  queenberry: 100, appleparadise: 100, vitaminc: 100,
}

const plate = () =>
  `<ellipse cx="130" cy="198" rx="106" ry="17" fill="var(--ml-plate-2)" stroke="${INK}" stroke-width="2.5"/><ellipse cx="130" cy="195" rx="100" ry="14" fill="var(--ml-plate)" stroke="${INK}" stroke-width="2"/><ellipse cx="130" cy="196" rx="68" ry="8" fill="var(--ml-plate-2)" opacity=".7"/><path d="M38 192 Q58 183 88 181" stroke="#fff" stroke-opacity=".6" stroke-width="3" stroke-linecap="round" fill="none"/>`

const steam = (y) =>
  [108, 130, 152]
    .map(
      (x, i) =>
        `<path class="steam s${i}" d="M${x} ${y} q-8 -10 0 -19 q8 -9 0 -19 q-6 -8 0 -15" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" opacity=".3"/>`,
    )
    .join('')

const mangoTop = (y) =>
  [[118, -27, -12], [138, -29, 10], [128, -38, 4]]
    .map((m) => `<g transform="rotate(${m[2]} ${m[0]} ${y + m[1]})"><rect x="${m[0] - 8}" y="${y + m[1] - 8}" width="16" height="16" rx="3" fill="#F6A81C" stroke="${INK}" stroke-width="1.6"/><path d="M${m[0] - 4} ${y + m[1] - 4} h6" stroke="#FFE08A" stroke-width="2.5" stroke-linecap="round"/></g>`)
    .join('')

const berryTop = (cx, ty) =>
  `<path d="M${cx} ${ty + 26} C${cx - 14} ${ty + 16} ${cx - 16} ${ty - 2} ${cx} ${ty} C${cx + 16} ${ty - 2} ${cx + 14} ${ty + 16} ${cx} ${ty + 26}Z" fill="#E0414B" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>` +
  `<path d="M${cx - 9} ${ty + 8} q-1 6 2 10" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="3" stroke-linecap="round"/>` +
  [[-6, 9], [6, 9], [0, 15], [-5, 20], [5, 20]].map((p) => `<circle cx="${cx + p[0]}" cy="${ty + p[1]}" r="1.3" fill="#FFE7A8"/>`).join('') +
  `<path d="M${cx} ${ty + 1} q-10 -9 -16 -2 q8 7 16 2 q10 5 16 -2 q-6 -7 -16 2Z" fill="#6F9A5E" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>`

const heart = (y, s) =>
  `M130 ${y + 4 * s} C${130 - 13 * s} ${y - 2 * s} ${130 - 9 * s} ${y - 9 * s} 130 ${y - 4 * s} C${130 + 9 * s} ${y - 9 * s} ${130 + 13 * s} ${y - 2 * s} 130 ${y + 4 * s}Z`

function cup(c, tint) {
  const hw = c.hw, rimY = c.rimY, h = c.h, x1 = 130 - hw, x2 = 130 + hw, bot = rimY + h, ry = Math.round(hw * 0.16)
  const coffee = tint && c.milky && TINT[tint] ? TINT[tint] : c.coffee
  const hd = `M${x2 - 6} ${rimY + 16} C${x2 + 34} ${rimY + 10} ${x2 + 34} ${rimY + Math.round(h * 0.62)} ${x2 - 14} ${rimY + Math.round(h * 0.66)}`
  const body = `M${x1} ${rimY} H${x2} C${x2} ${rimY + h * 0.8} ${x2 - hw * 0.4} ${bot} 130 ${bot} C${x1 + hw * 0.4} ${bot} ${x1} ${rimY + h * 0.8} ${x1} ${rimY} Z`
  let s = plate()
  s += `<path d="${hd}" fill="none" stroke="${INK}" stroke-width="13" stroke-linecap="round"/><path d="${hd}" fill="none" stroke="var(--ml-cup)" stroke-width="7" stroke-linecap="round"/>`
  s += `<path d="${body}" fill="var(--ml-cup)" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`
  s += `<path d="M${x2 - 7} ${rimY + 10} C${x2 - 6} ${rimY + h * 0.7} ${x2 - hw * 0.4} ${bot - 4} 130 ${bot - 4}" fill="none" stroke="#2A1608" stroke-opacity=".13" stroke-width="7" stroke-linecap="round"/>`
  s += `<path d="M${x1 + 9} ${rimY + 14} C${x1 + 9} ${rimY + h * 0.6} ${x1 + 14} ${bot - 16} ${x1 + 26} ${bot - 10}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="5" stroke-linecap="round"/>`
  s += `<path d="M${x1 + 3} ${rimY + h * 0.42} Q130 ${rimY + h * 0.42 + ry * 1.7} ${x2 - 3} ${rimY + h * 0.42}" fill="none" stroke="var(--ml-accent)" stroke-width="3" opacity=".6"/>`
  s += `<ellipse cx="130" cy="${rimY}" rx="${hw}" ry="${ry + 1}" fill="var(--ml-cup)" stroke="${INK}" stroke-width="2.5"/><ellipse cx="130" cy="${rimY}" rx="${hw - 5}" ry="${ry - 1.5}" fill="${coffee}" stroke="${INK}" stroke-width="2"/>`
  let sy = rimY - 14
  if (c.crema) s += `<ellipse cx="130" cy="${rimY}" rx="${hw - 14}" ry="${ry - 3}" fill="${c.crema}"/><ellipse cx="122" cy="${rimY - 1}" rx="10" ry="2.5" fill="#fff" opacity=".25"/>`
  if (c.ring) s += `<ellipse cx="130" cy="${rimY}" rx="${hw - 10}" ry="${ry - 3}" fill="none" stroke="${c.ring}" stroke-width="3" opacity=".85"/><path d="M${130 - hw * 0.45} ${rimY - 2} q10 -4 22 -2" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="3" stroke-linecap="round"/>`
  if (c.heart) s +=`<path d="${heart(rimY + 1, 0.95)}" fill="#FFF3E0"/><path d="${heart(rimY + 1, 0.6)}" fill="${coffee}" opacity=".6"/><path d="${heart(rimY + 1, 0.3)}" fill="#FFF3E0"/>`
  if (c.drizzle) s += `<path d="M${130 - hw * 0.5} ${rimY - 1} q7 -8 14 0 t14 0 t14 0 t14 0 t14 0" fill="none" stroke="${c.drizzle}" stroke-width="3.2" stroke-linecap="round"/><circle cx="${130 + hw * 0.5 + 6}" cy="${rimY + 3}" r="2.4" fill="${c.drizzle}"/>`
  if (c.marsh) {
    s += [[112, -17, -14, '#FFF6EE'], [133, -19, 10, '#FFD6DE'], [122, -9, 4, '#FFF6EE']]
      .map((m) => `<g transform="rotate(${m[2]} ${m[0] + 10} ${rimY + m[1] + 8})"><rect x="${m[0]}" y="${rimY + m[1]}" width="20" height="16" rx="5" fill="${m[3]}" stroke="${INK}" stroke-width="1.8"/><path d="M${m[0] + 4} ${rimY + m[1] + 5} h6" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".8"/></g>`)
      .join('')
    sy = rimY - 28
  }
  if (c.dome) {
    s += `<path d="M${x1 + 5} ${rimY} C${x1 + 9} ${rimY - 32} ${x2 - 9} ${rimY - 32} ${x2 - 5} ${rimY} A${hw - 5} ${ry - 1} 0 0 1 ${x1 + 5} ${rimY}Z" fill="#FFF3E0" stroke="${INK}" stroke-width="2"/>`
    s += [[118, -17], [132, -22], [146, -16], [126, -9], [141, -9]].map((p) => `<circle cx="${p[0]}" cy="${rimY + p[1]}" r="2.2" fill="#7A4A32"/>`).join('')
    sy = rimY - 40
  }
  if (c.cream) {
    s += [[6, 14, 9], [16, 28, 8], [25, 42, 7]].map((a) => `<ellipse cx="130" cy="${rimY - a[0]}" rx="${hw - a[1]}" ry="${a[2]}" fill="${c.creamFill || '#FFF6E8'}" stroke="${INK}" stroke-width="2"/>`).join('')
    const sauce = c.topping === 'mango' ? '#F6A81C' : c.topping === 'strawberry' ? '#E0414B' : '#5B3322'
    s += `<path d="M${x1 + 22} ${rimY - 14} q12 8 24 0 t24 0 t24 0" fill="none" stroke="${sauce}" stroke-width="3" stroke-linecap="round"/>`
    if (c.topping === 'mango') s += mangoTop(rimY)
    if (c.topping === 'strawberry') s += berryTop(130, rimY - 56)
    sy = rimY - (c.topping ? 52 : 44)
  }
  return s + steam(sy)
}

// ── herbal tea: clear glass mug + tea bag tag + fruit garnish ──
const slice = (cx, cy, r, rind, pith, flesh) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${rind}" stroke="${INK}" stroke-width="1.6"/><circle cx="${cx}" cy="${cy}" r="${r - 2.5}" fill="${pith}"/><circle cx="${cx}" cy="${cy}" r="${r - 4.5}" fill="${flesh}"/>` +
  [0, 60, 120, 180, 240, 300]
    .map((a) => `<path d="M${cx} ${cy} L${(cx + (r - 4.5) * Math.cos((a * Math.PI) / 180)).toFixed(1)} ${(cy + (r - 4.5) * Math.sin((a * Math.PI) / 180)).toFixed(1)}" stroke="${pith}" stroke-width="1.6" stroke-linecap="round"/>`)
    .join('')

const halfSlice = (cx, cy, r, rind, pith, flesh, spokes) =>
  `<path d="M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy}Z" fill="${rind}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M${cx - r + 3} ${cy} A${r - 3} ${r - 3} 0 0 1 ${cx + r - 3} ${cy}Z" fill="${pith}"/><path d="M${cx - r + 6} ${cy} A${r - 6} ${r - 6} 0 0 1 ${cx + r - 6} ${cy}Z" fill="${flesh}"/>` +
  (spokes
    ? [210, 240, 270, 300, 330].map((a) => `<path d="M${cx} ${cy} L${(cx + (r - 6) * Math.cos((a * Math.PI) / 180)).toFixed(1)} ${(cy + (r - 6) * Math.sin((a * Math.PI) / 180)).toFixed(1)}" stroke="${pith}" stroke-width="1.6" stroke-linecap="round"/>`).join('')
    : `<ellipse cx="${cx - 3}" cy="${cy - 7}" rx="1.6" ry="2.6" fill="#5A3524"/><ellipse cx="${cx + 3}" cy="${cy - 7}" rx="1.6" ry="2.6" fill="#5A3524"/>`)

const berry = (cx, cy, r, col, ink) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${col}"${ink ? ` stroke="${INK}" stroke-width="1.8"` : ''}/><circle cx="${cx - r * 0.3}" cy="${cy - r * 0.3}" r="${r * 0.28}" fill="#fff" opacity=".45"/>`

const TEAS = {
  queenberry: {
    tea: '#A81F55', top: '#D4558A',
    mark: `<path d="M80 101 l1.5 -7 l4.5 4 l4.5 -4 l1.5 7Z" fill="#E3A72F" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>`,
    inside: berry(112, 150, 7, '#5B1A44') + berry(134, 162, 7, '#4B2A6B') + berry(120, 174, 6, '#5B1A44') + berry(142, 134, 5, '#C2305F'),
    back: '',
    garnish: berry(156, 84, 8, '#7A1F4B', true) + berry(172, 88, 8, '#C2305F', true) + berry(164, 76, 7, '#4B2A6B', true) + `<path d="M164 69 q-8 -8 -14 -2 q7 6 14 2 q8 4 13 -3 q-6 -6 -13 3Z" fill="#6F9A5E" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>`,
  },
  appleparadise: {
    tea: '#D9922B', top: '#F2BC5C',
    mark: `<path d="M87 94 q-7 3 -5 10 q7 -1 5 -10Z" fill="#6F9A5E" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>`,
    inside: slice(116, 142, 12, '#C93B3B', '#FFF1C4', '#FFF8DC') + slice(142, 160, 11, '#C93B3B', '#FFF1C4', '#FFF8DC'),
    back: `<g transform="rotate(10 112 120)"><rect x="106" y="66" width="10" height="100" rx="5" fill="#A5683A" stroke="${INK}" stroke-width="1.8"/><path d="M109 74 V158" stroke="#C98B55" stroke-width="2.4" stroke-linecap="round"/></g>`,
    garnish: halfSlice(168, 90, 17, '#C93B3B', '#FFF1C4', '#FFF8DC', false),
  },
  vitaminc: {
    tea: '#EE8A1B', top: '#FFB65A',
    mark: `<circle cx="86" cy="99" r="4" fill="#F08A1C" stroke="${INK}" stroke-width="1.2"/><path d="M86 91v3M86 104v3M78 99h3M91 99h3" stroke="${INK}" stroke-width="1.2" stroke-linecap="round"/>`,
    inside: slice(118, 138, 14, '#F7D64B', '#FFF3B0', '#FBE67A') + slice(142, 162, 13, '#F08A1C', '#FFE0A8', '#FFB347'),
    back: '',
    garnish: halfSlice(168, 90, 17, '#F08A1C', '#FFE0A8', '#FFB347', true),
  },
}

function teaGlass(t, u) {
  const gp = 'M92 84 H168 L163 172 Q162 190 146 190 H114 Q98 190 97 172 Z', id = 'tc' + u
  const hd = 'M166 102 C200 98 200 158 162 156'
  let s = plate()
  s += `<path d="${hd}" fill="none" stroke="${INK}" stroke-width="13" stroke-linecap="round"/><path d="${hd}" fill="none" stroke="var(--ml-glass)" stroke-width="7" stroke-linecap="round"/>`
  s += `<path d="${gp}" fill="var(--ml-glass)"/><clipPath id="${id}"><path d="${gp}"/></clipPath>`
  s += `<g clip-path="url(#${id})"><rect x="86" y="100" width="90" height="100" fill="${t.tea}"/><ellipse cx="130" cy="100" rx="37" ry="5" fill="${t.top}" stroke="${INK}" stroke-opacity=".5" stroke-width="1.4"/>${t.inside}<path d="M152 90 L148 190" stroke="#2A1608" stroke-opacity=".16" stroke-width="10"/></g>`
  s += t.back
  s += `<path d="M104 112 L106 168" stroke="#fff" stroke-opacity=".55" stroke-width="5" stroke-linecap="round" fill="none"/>`
  s += `<path d="${gp}" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><ellipse cx="130" cy="84" rx="38" ry="6" fill="none" stroke="${INK}" stroke-width="2.2"/>`
  s += `<path d="M128 104 C128 88 112 80 88 86" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/><g transform="rotate(-12 86 98)"><rect x="78" y="88" width="16" height="20" rx="2" fill="var(--ml-cup)" stroke="${INK}" stroke-width="1.6"/>${t.mark}</g>`
  s += t.garnish
  return s + steam(70)
}

const ice = () =>
  [[102, 92, -8], [126, 104, 14], [110, 130, 6], [138, 122, -12], [122, 152, 10], [106, 166, -6], [140, 160, 8]]
    .map(
      (p) =>
        `<g transform="rotate(${p[2]} ${p[0] + 11} ${p[1] + 11})"><rect x="${p[0]}" y="${p[1]}" width="22" height="22" rx="5" fill="#fff" opacity=".5" stroke="#fff" stroke-opacity=".85"/><path d="M${p[0] + 4} ${p[1] + 6} h6" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".9"/></g>`,
    )
    .join('')

function glass(g, u, tint) {
  const gp = 'M90 50 H170 L160 184 Q159 192 151 192 H109 Q101 192 100 184 Z', id = 'gc' + u
  const layers = g.layers.map((l) => `<rect x="80" y="${l[1]}" width="100" height="${200 - l[1]}" fill="${tint && l[2] && TINT[tint] ? TINT[tint] : l[0]}"/>`).join('')
  let s = `<path d="${gp}" fill="var(--ml-glass)"/><clipPath id="${id}"><path d="${gp}"/></clipPath><g clip-path="url(#${id})">${layers}${g.drip ? `<path d="M80 ${g.drip[1]} q10 8 20 0 t20 0 t20 0 t20 0 t20 0" fill="none" stroke="${g.drip[0]}" stroke-width="4.5" stroke-linecap="round"/>` : ''}${ice()}<path d="M150 60 L142 190" stroke="#2A1608" stroke-opacity=".14" stroke-width="9"/></g>`
  s += `<path d="M98 66 L106 170" stroke="#fff" stroke-opacity=".55" stroke-width="5" stroke-linecap="round" fill="none"/><path d="${gp}" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`
  s += `<g fill="#fff" opacity=".6"><ellipse cx="157" cy="96" rx="2.2" ry="3.2"/><ellipse cx="154" cy="128" rx="1.8" ry="2.6"/><ellipse cx="108" cy="150" rx="2" ry="3"/></g>`
  s += `<path d="M142 8 L124 172" stroke="var(--ml-accent)" stroke-width="8" stroke-linecap="round" fill="none"/><path d="M141 14 L124 168" stroke="#fff" stroke-width="8" stroke-dasharray="7 11" opacity=".6" fill="none"/>`
  if (g.citrus) s += `<circle cx="172" cy="56" r="15" fill="#F2B84B" stroke="${INK}" stroke-width="2.2"/><path d="M172 41v30M157 56h30M161 45l22 22M183 45l-22 22" stroke="#FFE7A8" stroke-width="1.5"/>`
  if (g.cream) {
    s += [[48, 44, 12], [35, 32, 10], [24, 20, 8]].map((a) => `<ellipse cx="130" cy="${a[0]}" rx="${a[1]}" ry="${a[2]}" fill="#FFF6E8" stroke="${INK}" stroke-width="2.2"/>`).join('')
    s += `<path d="M104 44 q8 8 16 0 t16 0 t16 0" fill="none" stroke="#5B3322" stroke-width="3" stroke-linecap="round"/>`
  }
  return `<ellipse cx="130" cy="194" rx="56" ry="8" fill="var(--ml-plate-2)"/>` + s
}

function blockArt(f) {
  return (
    plate() +
    `<polygon points="82,118 172,118 204,98 114,98" fill="${f.top}" stroke="${INK}" stroke-width="2.3" stroke-linejoin="round"/><polygon points="82,118 172,118 204,98 114,98" fill="#fff" opacity=".16"/>` +
    `<polygon points="172,118 204,98 204,160 172,180" fill="${f.side}" stroke="${INK}" stroke-width="2.3" stroke-linejoin="round"/><polygon points="172,118 204,98 204,160 172,180" fill="#2A1608" opacity=".14"/>` +
    f.front.map((b) => `<rect x="82" y="${b[0]}" width="90" height="${b[1]}" fill="${b[2]}"/>`).join('') +
    `<rect x="82" y="118" width="90" height="62" fill="none" stroke="${INK}" stroke-width="2.3" stroke-linejoin="round"/><path d="M90 124 V170" stroke="#fff" stroke-opacity=".3" stroke-width="4" stroke-linecap="round"/>` +
    f.extra
  )
}

const RINGS = (x, y, r, w) =>
  `<circle cx="${x - r * 0.55}" cy="${y}" r="${r}" fill="none" stroke="#E3A72F" stroke-width="${w}"/><circle cx="${x + r * 0.55}" cy="${y}" r="${r}" fill="none" stroke="#8FA68A" stroke-width="${w}"/>`

function goodsBody(k, u) {
  switch (k) {
    case 'mug': {
      const hd = 'M176 112 C214 108 214 168 172 164'
      return `<ellipse cx="130" cy="200" rx="66" ry="8" fill="var(--ml-plate-2)"/><path d="${hd}" fill="none" stroke="${INK}" stroke-width="13" stroke-linecap="round"/><path d="${hd}" fill="none" stroke="var(--ml-cup)" stroke-width="7" stroke-linecap="round"/><path d="M80 96 H180 V160 Q180 196 146 196 H114 Q80 196 80 160 Z" fill="var(--ml-cup)" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><path d="M170 104 V160 Q170 186 146 188" fill="none" stroke="#2A1608" stroke-opacity=".13" stroke-width="7" stroke-linecap="round"/><path d="M89 108 V158" stroke="#fff" stroke-opacity=".55" stroke-width="5" stroke-linecap="round"/><ellipse cx="130" cy="96" rx="50" ry="9" fill="#5A3524" stroke="${INK}" stroke-width="2.2"/>${RINGS(130, 146, 14, 3.4)}<g fill="var(--ml-accent)" opacity=".7"><circle cx="102" cy="120" r="2.6"/><circle cx="158" cy="120" r="2.6"/><circle cx="96" cy="172" r="2.6"/><circle cx="164" cy="172" r="2.6"/></g>`
    }
    case 'tote':
      return `<ellipse cx="130" cy="206" rx="76" ry="8" fill="var(--ml-plate-2)"/><path d="M96 104 C96 50 164 50 164 104" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><path d="M70 100 H190 L198 204 H62 Z" fill="#EAD7B7" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><path d="M70 100 H190 L192 118 H68 Z" fill="#2A1608" opacity=".08"/><path d="M80 120 L74 196" stroke="#fff" stroke-opacity=".5" stroke-width="4" stroke-linecap="round"/>${RINGS(130, 138, 17, 4)}<path d="M104 162 h52 v8 a22 22 0 0 1 -22 22 h-8 a22 22 0 0 1 -22 -22z" fill="var(--ml-accent)" stroke="${INK}" stroke-width="2"/>`
    case 'beans':
      return `<ellipse cx="130" cy="208" rx="62" ry="7" fill="var(--ml-plate-2)"/><path d="M82 74 H178 L186 204 Q186 210 180 210 H80 Q74 210 74 204 Z" fill="#3B2A20" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><path d="M86 84 L82 200" stroke="#fff" stroke-opacity=".22" stroke-width="4" stroke-linecap="round"/><rect x="80" y="62" width="100" height="14" rx="3" fill="#2B1F17" stroke="${INK}" stroke-width="2.2"/><rect x="94" y="102" width="72" height="78" rx="8" fill="var(--ml-cup)"/>${RINGS(130, 128, 10, 3)}<rect x="106" y="152" width="48" height="5" rx="2.5" fill="#3B2A20" opacity=".5"/><rect x="112" y="163" width="36" height="5" rx="2.5" fill="#3B2A20" opacity=".5"/>`
    case 'syrupbottle': {
      // empty glass pump bottle: transparent body, only thin caramel residue left on the glass
      const bp = 'M96 104 Q96 94 106 92 H154 Q164 94 164 104 V190 Q164 200 154 200 H106 Q96 200 96 190 Z', id = 'sb' + u
      return `<ellipse cx="130" cy="206" rx="58" ry="7" fill="var(--ml-plate-2)"/>` +
        `<path d="${bp}" fill="var(--ml-glass)"/><clipPath id="${id}"><path d="${bp}"/></clipPath>` +
        `<g clip-path="url(#${id})"><path d="M150 96 L148 200" stroke="#2A1608" stroke-opacity=".12" stroke-width="10"/>` +
        `<path d="M100 192 q8 -5 16 0 t16 0 t16 0 t16 0" fill="none" stroke="#C9772B" stroke-width="4" stroke-linecap="round" opacity=".85"/>` +
        `<path d="M108 120 V150 M108 150 q0 6 -3 6" fill="none" stroke="#C9772B" stroke-width="3" stroke-linecap="round" opacity=".55"/><circle cx="105" cy="162" r="2.6" fill="#C9772B" opacity=".7"/>` +
        `<path d="M154 128 V142" fill="none" stroke="#C9772B" stroke-width="2.5" stroke-linecap="round" opacity=".45"/></g>` +
        `<path d="M104 112 L106 186" stroke="#fff" stroke-opacity=".6" stroke-width="5" stroke-linecap="round" fill="none"/><path d="${bp}" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>` +
        `<rect x="106" y="128" width="48" height="36" rx="4" fill="var(--ml-cup)" stroke="${INK}" stroke-width="1.8"/>${RINGS(130, 142, 7, 2.4)}<rect x="114" y="154" width="32" height="4" rx="2" fill="${INK}" opacity=".45"/>` +
        `<rect x="104" y="84" width="52" height="12" rx="3" fill="#3B2A20" stroke="${INK}" stroke-width="2.2"/><path d="M110 88 h8" stroke="#fff" stroke-opacity=".3" stroke-width="2.5" stroke-linecap="round"/>` +
        `<rect x="123" y="58" width="14" height="28" rx="3" fill="#2B1F17" stroke="${INK}" stroke-width="2.2"/>` +
        `<path d="M130 60 H166 Q174 60 174 68 V74" fill="none" stroke="${INK}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/><path d="M130 60 H166 Q174 60 174 68 V74" fill="none" stroke="#2B1F17" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`
    }
    case 'note':
      return `<ellipse cx="130" cy="208" rx="70" ry="7" fill="var(--ml-plate-2)"/><g transform="rotate(-8 130 140)"><rect x="82" y="62" width="100" height="144" rx="8" fill="var(--ml-accent)" stroke="${INK}" stroke-width="2.5"/>${[0, 1, 2, 3, 4, 5, 6].map((i) => `<ellipse cx="82" cy="${78 + i * 19}" rx="8" ry="4.5" fill="var(--ml-cup)" stroke="${INK}" stroke-width="1.8"/>`).join('')}<rect x="102" y="92" width="64" height="54" rx="6" fill="var(--ml-cup)"/>${RINGS(134, 118, 11, 3)}<rect x="170" y="62" width="7" height="144" fill="#3B2A20"/><path d="M104 160 h50 M104 172 h36" stroke="#fff" stroke-opacity=".6" stroke-width="3" stroke-linecap="round"/></g>`
  }
  // unknown kind: dashed placeholder so a missing illustration is visible, not blank
  return `<rect x="90" y="110" width="80" height="80" rx="8" fill="none" stroke="${INK}" stroke-width="2.5" stroke-dasharray="6 6"/>`
}

/** `u` must be unique per rendered instance (it namespaces SVG ids such as the glass clipPath). */
export function art(it, o, u) {
  o = o || {}
  const sc = o.scale || 1, tint = o.tint || 0
  const syrupColor = SYRUP_COLORS[o.syrupId]
  let b = ''
  switch (it.art) {
    case 'espresso': b = cup({ hw: 44, rimY: 132, h: 58, coffee: '#3B2013', crema: '#B07A4B' }, 0); break
    case 'americano': b = cup({ hw: 56, rimY: 112, h: 78, coffee: '#2B170C', ring: '#9A6A3E' }, 0); break
    case 'cortado': b = cup({ hw: 50, rimY: 122, h: 66, coffee: '#B88A58', heart: true, milky: true }, tint); break
    case 'syruplatte': b = cup({ hw: 62, rimY: 104, h: 86, coffee: '#CBA074', heart: true, drizzle: syrupColor || '#C9772B', milky: true }, tint); break
    case 'syrupicedlatte': b = glass({ layers: [['#E8D2B2', 80, true], ['#5A3524', 132], [syrupColor || '#C9772B', 170]], drip: [syrupColor || '#C9772B', 84] }, u, tint); break
    case 'hotchoc': b = cup({ hw: 60, rimY: 108, h: 82, coffee: '#4A2415', marsh: true }, 0); break
    case 'mangochoc': b = cup({ hw: 60, rimY: 108, h: 82, coffee: '#4A2415', cream: true, creamFill: '#FFF0C9', topping: 'mango' }, 0); break
    case 'berrychoc': b = cup({ hw: 60, rimY: 108, h: 82, coffee: '#5A2A24', cream: true, creamFill: '#FFE3E8', topping: 'strawberry' }, 0); break
    case 'queenberry': b = teaGlass(TEAS.queenberry, u); break
    case 'appleparadise': b = teaGlass(TEAS.appleparadise, u); break
    case 'vitaminc': b = teaGlass(TEAS.vitaminc, u); break
    case 'latte': b = cup({ hw: 62, rimY: 104, h: 86, coffee: '#CBA074', heart: true, milky: true }, tint); break
    case 'cappuccino': b = cup({ hw: 60, rimY: 108, h: 82, coffee: '#C69A6E', dome: true, milky: true }, tint); break
    case 'mocha': b = cup({ hw: 62, rimY: 106, h: 84, coffee: '#6B3E2A', cream: true }, 0); break
    case 'icedlatte': b = glass({ layers: [['#E8D2B2', 80, true], ['#5A3524', 132]] }, u, tint); break
    case 'iceamer': b = glass({ layers: [['#4B2A1B', 74]] }, u, 0); break
    case 'coldbrew': b = glass({ layers: [['#2E190F', 70]], citrus: true }, u, 0); break
    case 'shake': b = glass({ layers: [['#7A4630', 92], ['#946049', 150]], cream: true }, u, 0); break
    case 'cheesecake':
      b = blockArt({
        top: '#D8654A', side: '#EBCF9C',
        front: [[118, 10, '#C8503C'], [128, 36, '#FBE9C4'], [164, 16, '#A9714B']],
        extra: `<polygon points="172,162 204,142 204,160 172,180" fill="#A9714B" stroke="${INK}" stroke-width="2"/><circle cx="130" cy="108" r="6.5" fill="#4B3F8C" stroke="${INK}" stroke-width="1.6"/><circle cx="152" cy="106" r="6.5" fill="#4B3F8C" stroke="${INK}" stroke-width="1.6"/><circle cx="176" cy="104" r="6.5" fill="#4B3F8C" stroke="${INK}" stroke-width="1.6"/><path d="M138 102c2-8 9-10 12-7-4 1-8 3-12 7Z" fill="#6F9A5E" stroke="${INK}" stroke-width="1.4"/>`,
      })
      break
    case 'brownie':
      b = blockArt({
        top: '#7A4A32', side: '#4A2C1F',
        front: [[118, 62, '#5A3727'], [134, 5, '#6E4632'], [152, 5, '#6E4632']],
        extra: `<path d="M96 108 q10 -7 20 0 t20 0 t20 0 t18 -2" fill="none" stroke="#FFF3E0" stroke-width="3" stroke-linecap="round"/><polygon points="106,103 116,99 120,106 111,110" fill="#C9996B" stroke="${INK}" stroke-width="1.4"/><polygon points="150,106 160,102 165,108 156,112" fill="#C9996B" stroke="${INK}" stroke-width="1.4"/>`,
      })
      break
    case 'croissant':
      b = plate() +
        `<path d="M52 176 C42 126 84 78 130 78 C176 78 218 126 208 176 C198 184 188 176 186 164 C178 134 156 120 130 120 C104 120 82 134 74 164 C72 176 60 184 52 176Z" fill="#E5A24A" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><path d="M74 164 C82 134 104 120 130 120 C156 120 178 134 186 164 C170 150 150 142 130 142 C110 142 90 150 74 164Z" fill="#B9751F" opacity=".4"/><path d="M88 124 C98 112 108 106 118 102M130 98 L130 120M172 124 C162 112 152 106 142 102M64 150 C70 140 76 134 82 130M196 150 C190 140 184 134 178 130" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/><path d="M104 96 C116 88 144 88 156 96" fill="none" stroke="#F6C77A" stroke-width="4" stroke-linecap="round"/><path d="M62 156 C66 140 74 128 86 118" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="4" stroke-linecap="round"/>`
      break
    case 'cookie':
      b = plate() +
        `<ellipse cx="130" cy="150" rx="68" ry="46" fill="#B9834C" stroke="${INK}" stroke-width="2.5"/><ellipse cx="130" cy="140" rx="68" ry="46" fill="#D9A66C" stroke="${INK}" stroke-width="2.5"/><path d="M92 112 C104 102 120 98 134 98" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="4" stroke-linecap="round"/><path d="M110 160 q8 -5 13 2 M146 126 q6 4 12 0" fill="none" stroke="#9A6A38" stroke-width="2" stroke-linecap="round"/>` +
        [[102, 126], [132, 118], [158, 132], [116, 152], [146, 156], [98, 142], [170, 150]]
          .map((p) => `<ellipse cx="${p[0]}" cy="${p[1]}" rx="8" ry="6" fill="#4A2C1D"/><ellipse cx="${p[0] - 2}" cy="${p[1] - 2}" rx="3" ry="1.8" fill="#fff" opacity=".25"/>`)
          .join('')
      break
    default: b = goodsBody(it.art, u)
  }
  if (syrupColor && isDrink(it) && it.art !== 'syruplatte') {
    const y = SYRUP_Y[it.art] || (it.cat === 'tea' ? 100 : it.cat === 'cold' ? 80 : 112)
    b += `<path d="M104 ${y} q8 -6 16 0 t16 0 t16 0 t16 0" fill="none" stroke="${syrupColor}" stroke-width="4" stroke-linecap="round"/><circle cx="170" cy="${y + 3}" r="2.4" fill="${syrupColor}"/>`
  }
  const n = Math.min(o.sugar || 0, 3) // 4+ cubes would leave the 260px viewBox
  const cubes = isDrink(it) && n
    ? Array.from({ length: n }, (_, i) => `<g transform="translate(${204 + i * 16} ${186 - i * 2})"><rect width="16" height="16" rx="3" fill="#fff" stroke="${INK}" stroke-width="1.8"/><path d="M3 4h5" stroke="${INK}" stroke-opacity=".3" stroke-width="1.5"/></g>`).join('')
    : ''
  return `<svg viewBox="0 0 260 230" role="img" aria-label="${esc(it.name)}"><ellipse cx="130" cy="206" rx="98" ry="11" fill="var(--ml-shadow)"/><g transform="translate(130 200) scale(${sc}) translate(-130 -200)">${b}</g>${cubes}</svg>`
}

// ───────────────────────────── cafe scene ─────────────────────────────

function foliage(cx, cy, r, c) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c}" stroke="${INK}" stroke-opacity=".2" stroke-width="1.3"/><circle cx="${cx - r * 0.3}" cy="${cy - r * 0.3}" r="${r * 0.45}" fill="#fff" opacity=".12"/>`
}

/** `uid` namespaces the gradient id so the full and mini scenes can share a page. Defaults to `kind`. */
export function sceneSVG(kind, label, sign, uid) {
  uid = uid || kind
  const hz = 'hz-' + uid
  const vb = kind === 'mini' ? '250 20 900 840' : '0 0 1232 880'
  const stripes = Array.from({ length: 6 }, (_, i) => {
    const tw = (1040 - 850) / 6, bw = (1062 - 826) / 6, tx = 850 + i * tw, bx = 826 + i * bw
    return `<path d="M${tx.toFixed(1)} 640 H${(tx + tw).toFixed(1)} L${(bx + bw).toFixed(1)} 690 a${(bw / 2).toFixed(1)} 13 0 0 1 ${(-bw).toFixed(1)} 0 Z" fill="${i % 2 ? '#FFF8EE' : '#EFB93B'}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`
  }).join('')
  const sm = Array.from({ length: 5 }, (_, i) => {
    const w = 94 / 5, x = 656 + i * w
    return `<path d="M${x.toFixed(1)} 356 h${w.toFixed(1)} v12 a${(w / 2).toFixed(1)} 9 0 0 1 ${(-w).toFixed(1)} 0 Z" fill="${i % 2 ? '#FFF8EE' : 'var(--ml-brick)'}" stroke="${INK}" stroke-width="1.4"/>`
  }).join('')
  const beans = [[300, 200], [390, 330], [250, 500], [1130, 300], [1150, 440], [720, 60], [1000, 70]]
    .map((p) => `<ellipse class="bean" cx="${p[0]}" cy="${p[1]}" rx="6" ry="9" transform="rotate(35 ${p[0]} ${p[1]})" fill="#5A3524" opacity=".5"/>`).join('')
  const flowers = (x, y, n) => Array.from({ length: n }, (_, i) => `<circle cx="${x + i * 9}" cy="${y + (i % 2) * 3}" r="4.2" fill="#D94B3F"/>`).join('')
  // long Persian names must not spill out of the 86px sign board
  const fit = String(sign ?? '').length > 9 ? ' textLength="76" lengthAdjust="spacingAndGlyphs"' : ''
  return `<svg viewBox="${vb}" preserveAspectRatio="${kind === 'mini' ? 'xMinYMax slice' : 'xMaxYMax meet'}" role="img" aria-label="${esc(label)}">
  <defs><radialGradient id="${hz}" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="var(--ml-sky-1)" stop-opacity=".55"/><stop offset="1" stop-color="var(--ml-sky-1)" stop-opacity="0"/></radialGradient></defs>
  <ellipse cx="780" cy="420" rx="420" ry="400" fill="url(#${hz})"/>
  <ellipse cx="640" cy="420" rx="300" ry="330" fill="var(--ml-haze)" opacity=".38"/>
  <g class="sun"><circle cx="1090" cy="120" r="30" fill="#FFD77A" opacity=".9"/><circle cx="1090" cy="120" r="44" fill="#FFD77A" opacity=".18"/></g>
  <g class="moon"><circle cx="1090" cy="122" r="26" fill="#F4EBD0"/><circle cx="1102" cy="114" r="23" fill="var(--ml-sky-1)"/></g>
  <g class="stars" fill="#F4EBD0"><circle cx="300" cy="90" r="2"/><circle cx="420" cy="140" r="1.6"/><circle cx="1000" cy="60" r="2"/><circle cx="1150" cy="200" r="1.7"/><circle cx="200" cy="250" r="1.8"/></g>
  ${beans}
  <polygon points="0,812 700,744 1180,812 640,872" fill="var(--ml-ground-edge)"/>
  <polygon points="0,790 700,722 1180,790 640,852" fill="var(--ml-ground)" stroke="${INK}" stroke-opacity=".25" stroke-width="1.5"/>
  <path d="M60 800 L640 836 L1100 790" fill="none" stroke="var(--ml-wall-2)" stroke-width="10" opacity=".55" stroke-linecap="round"/>
  <ellipse cx="800" cy="806" rx="360" ry="22" fill="var(--ml-shadow)"/>
  <g><path d="M488 560 L486 800 L514 800 L508 560Z" fill="#8B6A4F" stroke="${INK}" stroke-width="2"/><path d="M498 640 L452 590M500 610 L548 560" stroke="#8B6A4F" stroke-width="7" stroke-linecap="round"/>
   ${foliage(505, 470, 78, '#A9C48D')}${foliage(440, 530, 58, '#97B87F')}${foliage(575, 515, 60, '#B6CF9A')}${foliage(478, 402, 52, '#B6CF9A')}${foliage(545, 420, 46, '#A2C086')}${foliage(420, 455, 40, '#C3D8A8')}</g>
  <g><rect x="1086" y="540" width="13" height="250" fill="#8B6A4F" stroke="${INK}" stroke-width="2"/>${foliage(1092, 470, 52, '#A9C48D')}${foliage(1135, 520, 40, '#97B87F')}${foliage(1058, 525, 38, '#B6CF9A')}</g>
  <g><rect x="538" y="540" width="11" height="256" fill="${INK}"/><rect x="530" y="790" width="27" height="8" rx="2" fill="${INK}"/><rect x="528" y="492" width="31" height="44" rx="5" fill="var(--ml-glow)" stroke="${INK}" stroke-width="2.4"/><path d="M522 492 L543 470 L564 492Z" fill="${INK}"/><circle cx="543" cy="466" r="4" fill="${INK}"/></g>
  <rect x="612" y="166" width="336" height="384" fill="var(--ml-wall)" stroke="${INK}" stroke-width="2.4"/>
  <rect x="614" y="168" width="14" height="380" fill="#fff" opacity=".12"/><rect x="930" y="168" width="16" height="380" fill="#2A1608" opacity=".08"/>
  <g fill="var(--ml-wall-2)" opacity=".75"><rect x="626" y="190" width="18" height="9"/><rect x="650" y="196" width="14" height="8"/><rect x="624" y="330" width="16" height="8"/><rect x="926" y="214" width="14" height="8"/><rect x="636" y="450" width="20" height="9"/><rect x="760" y="500" width="16" height="8"/><rect x="842" y="210" width="16" height="8"/></g>
  <rect x="598" y="128" width="364" height="38" rx="3" fill="var(--ml-wall-2)" stroke="${INK}" stroke-width="2.4"/>
  <g stroke="${INK}" stroke-width="2.2" fill="none"><path d="M604 126 V94 H956 V126"/><path d="M604 110 H956"/>${Array.from({ length: 15 }, (_, i) => `<path d="M${616 + i * 24.6} 94 V126"/>`).join('')}</g>
  <path d="M700 44 H864 C864 100 840 120 782 120 C724 120 700 100 700 44Z" fill="var(--ml-accent)" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
  <path d="M712 52 C714 80 728 100 748 108" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="5" stroke-linecap="round"/>
  <path d="M864 56 C908 52 908 106 856 102" fill="none" stroke="${INK}" stroke-width="12" stroke-linecap="round"/><path d="M864 56 C908 52 908 106 856 102" fill="none" stroke="var(--ml-accent)" stroke-width="6" stroke-linecap="round"/>
  <ellipse cx="782" cy="44" rx="82" ry="12" fill="#5A3524" stroke="${INK}" stroke-width="2.4"/>
  ${RINGS(782, 80, 17, 4)}
  <path class="steam" d="M752 30 q-10 -12 0 -24 q10 -10 0 -22" fill="none" stroke="${INK}" stroke-width="3.4" stroke-linecap="round" opacity=".35"/><path class="steam s1" d="M812 30 q-10 -12 0 -24 q10 -10 0 -22" fill="none" stroke="${INK}" stroke-width="3.4" stroke-linecap="round" opacity=".35"/>
  <path d="M690 360 V300 a30 30 0 0 1 60 0 V360Z" fill="var(--ml-glow)" stroke="${INK}" stroke-width="2.4"/><path d="M720 270 V360 M690 316 H750" stroke="${INK}" stroke-width="1.8"/><path d="M698 346 L712 300 M706 354 L724 296" stroke="#fff" stroke-opacity=".4" stroke-width="4" stroke-linecap="round"/>
  ${sm}
  <rect x="660" y="384" width="86" height="22" fill="var(--ml-wall-2)" stroke="${INK}" stroke-width="2"/><g>${flowers(668, 382, 9)}</g><path d="M664 384 q8 -12 16 0 q8 -12 16 0 q8 -12 16 0 q8 -12 16 0 q8 -12 16 0" fill="none" stroke="#5C8A5A" stroke-width="5" stroke-linecap="round"/>
  <path d="M884 540 V318 a34 34 0 0 1 68 0 V540Z" fill="var(--ml-glow)" stroke="${TEAL}" stroke-width="9"/><path d="M918 284 V540 M884 400 H952" stroke="${TEAL}" stroke-width="4"/><path d="M896 520 L912 330 M906 528 L926 320" stroke="#fff" stroke-opacity=".35" stroke-width="6" stroke-linecap="round"/>
  <polygon points="948,380 1010,380 1010,544 948,544" fill="var(--ml-wall-2)" stroke="${INK}" stroke-width="2.2"/>
  <path d="M944 410 H1062 L1074 452 H934Z" fill="#EFB93B" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M964 410 L958 452M990 410 L988 452M1016 410 L1018 452M1040 410 L1048 452" stroke="#FFF8EE" stroke-width="7"/>
  <g stroke="${INK}" stroke-width="2.2" fill="none"><rect x="944" y="524" width="118" height="14" fill="var(--ml-wall-2)"/>${Array.from({ length: 9 }, (_, i) => `<path d="M${952 + i * 13} 484 V524"/>`).join('')}<path d="M944 484 H1062"/></g>
  <g>${flowers(954, 472, 11)}<path d="M950 478 q10 -10 20 0 q10 -10 20 0 q10 -10 20 0 q10 -10 20 0" fill="none" stroke="#5C8A5A" stroke-width="5" stroke-linecap="round"/></g>
  <rect x="606" y="548" width="348" height="58" fill="var(--ml-teal)" stroke="${INK}" stroke-width="2.4"/><g fill="#fff" opacity=".18"><rect x="630" y="560" width="70" height="12" rx="6"/><rect x="800" y="580" width="90" height="10" rx="5"/></g>
  <rect x="608" y="606" width="392" height="189" fill="var(--ml-brick)" stroke="${INK}" stroke-width="2.4"/>
  <rect x="610" y="608" width="12" height="185" fill="#fff" opacity=".1"/>
  <rect x="650" y="640" width="86" height="26" rx="3" fill="#3B2A20" stroke="${INK}" stroke-width="2"/><text x="693" y="659" text-anchor="middle" font-family="Aref Ruqaa,Vazirmatn,sans-serif" font-weight="700" font-size="17" fill="#F6EBDD"${fit}>${esc(sign)}</text>
  <rect x="650" y="670" width="86" height="125" rx="4" fill="var(--ml-teal)" stroke="${INK}" stroke-width="2.4"/><rect x="660" y="680" width="66" height="76" rx="3" fill="var(--ml-glow)" stroke="${INK}" stroke-width="1.8"/><path d="M693 680 V756" stroke="${INK}" stroke-width="1.6"/><path d="M668 748 L684 690 M676 752 L696 688" stroke="#fff" stroke-opacity=".4" stroke-width="4" stroke-linecap="round"/><circle cx="728" cy="740" r="3" fill="${INK}"/>
  <rect x="842" y="700" width="148" height="86" rx="3" fill="var(--ml-glow)" stroke="var(--ml-teal)" stroke-width="7"/><path d="M916 700 V786" stroke="var(--ml-teal)" stroke-width="4"/><path d="M858 776 L880 706 M870 780 L898 704" stroke="#fff" stroke-opacity=".35" stroke-width="5" stroke-linecap="round"/>
  <g fill="#fff" stroke="${INK}" stroke-width="1.6"><rect x="856" y="760" width="14" height="14" rx="3"/><rect x="936" y="760" width="14" height="14" rx="3"/></g><circle cx="868" cy="728" r="9" fill="#5A3524"/><circle cx="952" cy="728" r="9" fill="#5A3524"/>
  ${stripes}
  <g stroke="${INK}" stroke-width="1.6" fill="#fff"><rect x="758" y="660" width="40" height="50" rx="4"/></g>${RINGS(778, 684, 7, 2.4)}<path d="M778 650 V660" stroke="${INK}" stroke-width="2"/>
  <ellipse cx="1000" cy="790" rx="26" ry="7" fill="var(--ml-plate)" stroke="${INK}" stroke-width="2"/><path d="M1000 796 V818M988 818 H1012" stroke="${INK}" stroke-width="2.4"/>
  <ellipse cx="962" cy="806" rx="12" ry="4" fill="var(--ml-accent)" stroke="${INK}" stroke-width="1.8"/><path d="M962 810V826" stroke="${INK}" stroke-width="2"/><ellipse cx="1040" cy="806" rx="12" ry="4" fill="var(--ml-sage)" stroke="${INK}" stroke-width="1.8"/><path d="M1040 810V826" stroke="${INK}" stroke-width="2"/>
  <g stroke="${INK}" stroke-width="1.6" fill="#fff"><rect x="990" y="774" width="9" height="10" rx="2"/><rect x="1004" y="774" width="9" height="10" rx="2"/></g>
  <g stroke="${INK}" stroke-width="2"><rect x="590" y="770" width="24" height="24" fill="var(--ml-accent)"/><ellipse cx="602" cy="762" rx="18" ry="12" fill="#5C8A5A"/></g>
  <g stroke="${INK}" stroke-width="2"><rect x="776" y="772" width="22" height="22" fill="var(--ml-brick)"/><ellipse cx="787" cy="764" rx="16" ry="11" fill="#6E9469"/></g>
  <ellipse cx="1060" cy="770" rx="26" ry="20" fill="#6E9469" stroke="${INK}" stroke-width="2"/>
  <g transform="translate(850 800)"><g class="gift"><rect x="-17" y="-26" width="34" height="28" rx="3" fill="var(--ml-accent)" stroke="${INK}" stroke-width="2.2"/><rect x="-4" y="-26" width="8" height="28" fill="#E3A72F" stroke="${INK}" stroke-width="1.4"/><path d="M0 -26c-9-9-16-2-10 1zM0 -26c9-9 16-2 10 1z" fill="#E3A72F" stroke="${INK}" stroke-width="1.4"/></g></g>
  </svg>`
}
function teal(){return 'var(--ml-teal)';}
