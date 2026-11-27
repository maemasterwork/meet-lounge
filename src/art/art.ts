// Flat SVG illustrations for the menu items and the cafe scene (v2: shaded, themed through --ml-* variables).
// This file builds SVG strings (the "flat placeholder" that photos or 3D can replace through ItemArt / MeetLounge),
// so it is deliberately loose-typed. Everything that wraps it (ItemArt, Scene) is strictly typed.
// @ts-nocheck
import { esc } from '../lib/format'

const isDrink = (it) => it.cat === 'hot' || it.cat === 'cold' || it.cat === 'tea'

const INK = 'var(--ml-draw)'
const TEAL = 'var(--ml-teal)'
const TINT = [null, '#D8BC93', '#D0B087']
const SYRUP_COLORS = { vanilla: '#E6BD63', caramel: '#C9772B', hazelnut: '#79523D', chocolate: '#5B3322', strawberry: '#E0414B', mango: '#F6A81C', pistachio: '#8DB255' }
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
  if (c.heart) s +=`<path d="${heart(rimY + 1, 0.95)}" fill="${c.heartFill || '#FFF3E0'}"/><path d="${heart(rimY + 1, 0.6)}" fill="${coffee}" opacity=".6"/><path d="${heart(rimY + 1, 0.3)}" fill="${c.heartFill || '#FFF3E0'}"/>`
  if (c.drizzle) s += `<path d="M${130 - hw * 0.5} ${rimY - 1} q7 -8 14 0 t14 0 t14 0 t14 0 t14 0" fill="none" stroke="${c.drizzle}" stroke-width="3.2" stroke-linecap="round"/><circle cx="${130 + hw * 0.5 + 6}" cy="${rimY + 3}" r="2.4" fill="${c.drizzle}"/>`
  if (c.pistachio) {
    // crushed pistachio on the foam + whole shells on the plate
    s += [[104, -1, 0], [111, 4, 30], [120, 7, -20], [141, 6, 15], [150, 2, -35], [157, -2, 10], [96, 3, 40], [164, 3, -10]]
      .map((p) => `<ellipse cx="${p[0]}" cy="${rimY + p[1]}" rx="2.8" ry="1.8" transform="rotate(${p[2]} ${p[0]} ${rimY + p[1]})" fill="#8DB255"/>`)
      .join('')
    s += dots([[108, rimY + 1], [135, rimY + 8], [153, rimY + 5], [100, rimY + 5]], 1.5, '#C5DE8C')
    s += [[58, 196, -20], [76, 203, 15], [204, 199, 25]]
      .map((p) => `<g transform="rotate(${p[2]} ${p[0]} ${p[1]})"><ellipse cx="${p[0]}" cy="${p[1]}" rx="9" ry="5.6" fill="#E9D9AE" stroke="${INK}" stroke-width="1.6"/><path d="M${p[0] - 6} ${p[1]} Q${p[0]} ${p[1] - 3} ${p[0] + 6} ${p[1]}" fill="#9CC25F" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/></g>`)
      .join('')
  }
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

// ── croissant: five overlapping dough bands (tips, shoulders, centre), long axis across the crescent ──
function croissant() {
  const seg = (cx, cy, rx, ry, rot) =>
    `<g transform="rotate(${rot} ${cx} ${cy})"><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#E5A24A" stroke="${INK}" stroke-width="2.5"/>` +
    `<path d="M${cx - rx * 0.75} ${cy + ry * 0.4} Q${cx} ${cy + ry * 1.2} ${cx + rx * 0.75} ${cy + ry * 0.4}" fill="none" stroke="#B9751F" stroke-width="5" stroke-linecap="round" opacity=".4"/>` +
    `<path d="M${cx - rx * 0.6} ${cy - ry * 0.6} Q${cx - rx * 0.1} ${cy - ry * 0.95} ${cx + rx * 0.4} ${cy - ry * 0.75}" fill="none" stroke="#F6C77A" stroke-width="4" stroke-linecap="round"/>` +
    `<path d="M${cx - rx * 0.35} ${cy - ry * 0.75} Q${cx - rx * 0.1} ${cy} ${cx - rx * 0.35} ${cy + ry * 0.75} M${cx + rx * 0.35} ${cy - ry * 0.7} Q${cx + rx * 0.6} ${cy} ${cx + rx * 0.35} ${cy + ry * 0.75}" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round" opacity=".7"/></g>`
  return (
    plate() +
    `<ellipse cx="130" cy="192" rx="84" ry="7" fill="#2A1608" opacity=".15"/>` +
    `<g transform="translate(0 8)">` +
    seg(60, 172, 15, 22, -55) + seg(200, 172, 15, 22, 55) +
    seg(90, 146, 22, 30, -25) + seg(170, 146, 22, 30, 25) +
    seg(130, 138, 34, 30, 0) +
    `<ellipse cx="116" cy="122" rx="12" ry="4.5" transform="rotate(-20 116 122)" fill="#fff" opacity=".32"/>` +
    `<path d="M104 152 Q130 160 156 152" fill="none" stroke="#B9751F" stroke-width="3" stroke-linecap="round" opacity=".35"/>` +
    `</g>` +
    dots([[56, 193], [196, 195], [90, 200], [170, 201], [212, 190]], 1.6, '#E5A24A') +
    dots([[64, 198], [150, 203]], 1.2, '#F6C77A')
  )
}

// ── brownie / carrot cake (isometric blocks) and muffins ──
const nut = (x, y, r = 0) =>
  `<g transform="rotate(${r} ${x} ${y})"><path d="M${x} ${y} q6 -6 12 -1 q3 6 -3 9 q-8 2 -12 -2z" fill="#C9996B" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/><path d="M${x + 3} ${y + 1} q4 -2 6 1" fill="none" stroke="#8F6638" stroke-width="1.2" stroke-linecap="round"/></g>`

function brownie() {
  return blockArt({
    top: '#6B3A24', side: '#3F2216',
    front: [[118, 62, '#4E2B1C'], [130, 5, '#6A3B27'], [146, 4, '#6A3B27'], [160, 5, '#6A3B27']],
    extra:
      `<path d="M100 112 l12 -6 l6 -5 M128 114 l8 -7 l10 2 M150 108 l10 -6 M178 112 l10 -8" fill="none" stroke="#33170D" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" opacity=".8"/>` +
      `<path d="M96 114 L112 104 M142 102 L156 100" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="4" stroke-linecap="round"/>` +
      nut(112, 108, -10) + nut(148, 112, 15) + nut(170, 104, -5) +
      [[96, 136], [126, 152], [150, 134], [110, 166], [160, 164]]
        .map((p) => `<rect x="${p[0]}" y="${p[1]}" width="8" height="6" rx="1.5" fill="#2B140C"/><rect x="${p[0] + 1}" y="${p[1] + 1}" width="3" height="1.6" rx=".8" fill="#fff" opacity=".25"/>`)
        .join('') +
      dots([[104, 150], [138, 158], [164, 146], [120, 134]], 1.6, '#33170D', 0.7),
  })
}

function carrotCake() {
  const sideLayer = (a, b) => `<polygon points="172,${a} 204,${a - 20} 204,${b - 20} 172,${b}" fill="#FFF3DA"/><polygon points="172,${a} 204,${a - 20} 204,${b - 20} 172,${b}" fill="#2A1608" opacity=".14"/>`
  return blockArt({
    top: '#FFF1D6', side: '#C98544',
    front: [[118, 10, '#FFF3DA'], [128, 14, '#C98544'], [142, 8, '#FFF3DA'], [150, 14, '#C98544'], [164, 6, '#FFF3DA'], [170, 10, '#C98544']],
    extra:
      sideLayer(118, 128) + sideLayer(142, 150) + sideLayer(164, 170) +
      `<path d="M204 98 V160" stroke="${INK}" stroke-width="2.3" fill="none"/>` +
      `<path d="M82 118 H172 V124 q-7 9 -14 0 q-6 7 -12 0 q-8 11 -16 0 q-6 6 -12 0 q-8 10 -16 0 q-5 5 -8 0 L82 124Z" fill="#FFF3DA" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>` +
      [[94, 134], [118, 136], [146, 134], [104, 158], [130, 156], [156, 158], [112, 174], [150, 175]].map((p) => `<path d="M${p[0]} ${p[1]} l4 -1" stroke="#E8782A" stroke-width="2.4" stroke-linecap="round"/>`).join('') +
      dots([[102, 135], [134, 134], [96, 157], [142, 157], [122, 174], [160, 174]], 1.8, '#7A4A2A') +
      `<path d="M104 110 q10 -6 20 -2 M168 110 q10 -5 18 -1" fill="none" stroke="#E8D2A8" stroke-width="2" stroke-linecap="round"/>` +
      nut(112, 104, -10) + nut(176, 104, 12) +
      `<path d="M132 108 Q150 96 164 100 Q164 110 150 111 Q140 112 132 108Z" fill="#F08A2C" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/><path d="M146 102 l-2 7 M154 100 l-2 8" stroke="#C45F14" stroke-width="1.4" stroke-linecap="round"/><path d="M164 100 q8 -9 14 -7 M164 101 q9 -1 14 3 M164 100 q4 -11 9 -12" fill="none" stroke="#6F9A5E" stroke-width="3" stroke-linecap="round"/>`,
  })
}

function muffinOne(x, y, kind) {
  const pos = kind === 'chip' ? [[-16, -52], [8, -62], [18, -46], [-4, -42], [-26, -38], [24, -36]] : [[-14, -54], [10, -60], [20, -44], [-2, -44], [-26, -40], [26, -38]]
  const top =
    kind === 'chip'
      ? pos.map((p) => `<ellipse cx="${p[0]}" cy="${p[1]}" rx="3.2" ry="2.5" fill="#3B1E12"/><ellipse cx="${p[0] - 1}" cy="${p[1] - 1}" rx="1.2" ry=".8" fill="#fff" opacity=".3"/>`).join('')
      : pos.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="4.2" fill="#4B3F8C" stroke="${INK}" stroke-width="1.2"/><circle cx="${p[0]}" cy="${p[1]}" r="1.3" fill="#2E2860"/><circle cx="${p[0] - 1.5}" cy="${p[1] - 1.8}" r="1" fill="#8E82D6"/>`).join('') + dots([[-8, -48], [14, -52], [-20, -46]], 1.8, '#6C5BB0', 0.7)
  return (
    `<g transform="translate(${x} ${y}) scale(1.05)">` +
    `<ellipse cx="0" cy="3" rx="31" ry="5" fill="#2A1608" opacity=".15"/>` +
    `<path d="M-23 0 L-30 -34 H30 L23 0 Q0 5 -23 0Z" fill="#EAD3A8" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>` +
    `<path d="M-23 0 L-30 -34 M-12 2 L-14 -34 M0 3 V-34 M12 2 L14 -34 M23 0 L30 -34" stroke="${INK}" stroke-width="1.4" opacity=".45" fill="none"/>` +
    `<path d="M-24 -8 H24" stroke="var(--ml-accent)" stroke-width="4" opacity=".75"/>` +
    `<path d="M-34 -30 C-42 -52 -22 -72 0 -72 C22 -72 42 -52 34 -30 Q0 -22 -34 -30Z" fill="#D8964A" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>` +
    `<path d="M-30 -30 Q0 -22 30 -30" fill="none" stroke="#B9751F" stroke-width="4" stroke-linecap="round" opacity=".5"/>` +
    `<path d="M-24 -50 Q-18 -62 -6 -65" fill="none" stroke="#F6C77A" stroke-width="4" stroke-linecap="round"/>` +
    `<path d="M-4 -70 q-3 8 2 15 q-1 5 3 8" fill="none" stroke="#B9751F" stroke-width="1.8" stroke-linecap="round"/>` +
    top +
    `</g>`
  )
}

function muffins() {
  return plate() + muffinOne(164, 188, 'blueberry') + muffinOne(96, 196, 'chip')
}

// ── affogato: short glass with espresso at the bottom, two vanilla scoops, espresso poured over, wafer stick ──
function affogato(u) {
  const gp = 'M80 116 H180 L166 180 Q164 190 152 190 H108 Q96 190 94 180 Z', id = 'af' + u
  const scoop = (cx, cy) =>
    `<ellipse cx="${cx}" cy="${cy + 17}" rx="21" ry="6.5" fill="#F2E2BF" stroke="${INK}" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="24" fill="#FFF3D6" stroke="${INK}" stroke-width="2.2"/>` +
    `<path d="M${cx - 15} ${cy - 11} Q${cx - 9} ${cy - 19} ${cx} ${cy - 18}" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="3.4" stroke-linecap="round"/>` +
    dots([[cx - 9, cy + 4], [cx + 6, cy + 8], [cx + 12, cy - 2], [cx - 2, cy - 6]], 1.1, '#C9A86B', 0.8)
  return (
    plate() +
    `<path d="${gp}" fill="var(--ml-glass)"/>` +
    `<clipPath id="${id}"><path d="${gp}"/></clipPath>` +
    `<g clip-path="url(#${id})"><rect x="70" y="130" width="120" height="72" fill="#3B2013"/><ellipse cx="130" cy="130" rx="52" ry="4.5" fill="#B07A4B"/><path d="M70 158 Q130 166 190 158" fill="none" stroke="var(--ml-accent)" stroke-width="2.6" opacity=".55"/><path d="M164 130 L154 190" stroke="#2A1608" stroke-opacity=".2" stroke-width="9"/></g>` +
    `<path d="M80 116 A50 7 0 0 1 180 116" fill="none" stroke="${INK}" stroke-width="2.2"/>` +
    scoop(116, 104) + scoop(148, 100) +
    `<path d="M172 52 L150 106" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M172 52 L150 106" stroke="#E0B878" stroke-width="5.4" stroke-linecap="round"/><path d="M172 52 L150 106" stroke="#B98440" stroke-width="5.4" stroke-dasharray="2 4" opacity=".55"/>` +
    // espresso poured over the scoops
    `<ellipse cx="148" cy="80" rx="14" ry="5.5" fill="#3B2013"/><ellipse cx="116" cy="86" rx="11" ry="4.5" fill="#3B2013"/>` +
    `<path d="M138 84 Q142 100 135 114 M158 82 Q166 98 159 110 M112 88 Q108 100 113 112" fill="none" stroke="#3B2013" stroke-width="5.4" stroke-linecap="round"/>` +
    `<path d="M139 88 Q141 98 138 106 M112 92 Q110 98 112 104" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="1.8" stroke-linecap="round"/>` +
    dots([[132, 96], [160, 114], [124, 100]], 1.8, '#7A4A2A', 0.6) +
    `<path d="M80 116 A50 7 0 0 0 180 116" fill="none" stroke="${INK}" stroke-width="2.2"/>` +
    `<path d="M88 124 L98 176" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="5" stroke-linecap="round"/>` +
    `<path d="${gp}" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`
  )
}

// ── toast sandwich: two toast slices (cut faces toward us) around peanut butter + banana, same plate/paper-wrap look as the other sandwiches ──
function toast(f) {
  const topP = 'M50 124 V106 Q50 90 68 90 H192 Q210 90 210 106 V124Z'
  const topIn = 'M56 124 V107 Q56 96 69 96 H191 Q204 96 204 107 V124Z'
  const botP = 'M50 148 V164 Q50 176 64 176 H196 Q210 176 210 164 V148Z'
  const botIn = 'M56 148 V163 Q56 170 66 170 H194 Q204 170 204 163 V148Z'
  let zig = 'M108 156'
  for (let i = 0; i < 13; i++) zig += ' l4 -5 l4 5'
  const paper = `<path d="${zig} V182 Q212 186 196 186 H124 Q108 186 108 176Z" fill="var(--ml-cup)" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/><path d="M108 170 H212" stroke="var(--ml-accent)" stroke-width="4" opacity=".8"/><path d="M115 160 V178" stroke="#fff" stroke-opacity=".5" stroke-width="3.5" stroke-linecap="round"/><path d="M206 158 V182" stroke="#2A1608" stroke-opacity=".12" stroke-width="6" stroke-linecap="round"/>`
  const bananas = [[64, 0], [86, 2], [108, -1], [130, 2], [152, -1], [174, 2], [196, 0]]
    .map((p) => `<ellipse cx="${p[0]}" cy="${134 + p[1]}" rx="12.5" ry="11" fill="#F7DE80" stroke="${INK}" stroke-width="1.8"/><ellipse cx="${p[0]}" cy="${134 + p[1]}" rx="8.5" ry="6.5" fill="#FBEBB0"/>${dots([[p[0] - 2, 134 + p[1]], [p[0] + 2, 135 + p[1]]], 0.9, '#6B4A22')}`)
    .join('')
  const fallen = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="10" ry="5" fill="#EFC94C" stroke="${INK}" stroke-width="1.6"/><ellipse cx="${x}" cy="${y}" rx="6.4" ry="3" fill="#FBEBB0"/>`
  const peanut = (x, y, r) => `<ellipse cx="${x}" cy="${y}" rx="6" ry="3.8" transform="rotate(${r} ${x} ${y})" fill="#D9A55E" stroke="${INK}" stroke-width="1.4"/>`
  const top2 = f.spread2 || f.spread
  // zigzag sauce over the filling + a drip at each side
  const drizzle = (c) => {
    let z = 'M58 130'
    for (let i = 0; i < 9; i++) z += ' l8 9 l8 -9'
    return `<path d="${z}" fill="none" stroke="${c}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M52 136 q-3 10 0 16" fill="none" stroke="${c}" stroke-width="3.4" stroke-linecap="round"/><path d="M208 136 q3 10 0 18" fill="none" stroke="${c}" stroke-width="3.4" stroke-linecap="round"/>`
  }
  return (
    plate() +
    `<ellipse cx="130" cy="190" rx="88" ry="6" fill="#2A1608" opacity=".15"/>` +
    `<g transform="translate(0 8)">` +
    // bottom slice + its peanut butter layer
    `<path d="${botP}" fill="#B8742E" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><path d="${botIn}" fill="${f.crumb}"/><path d="M56 148 V163 Q56 170 66 170 H194 Q204 170 204 163 V148" fill="none" stroke="#D9A24F" stroke-width="5" opacity=".5"/>` +
    dots([[72, 160], [110, 164], [150, 160], [186, 164], [130, 167], [92, 153]], 1.3, '#CE9A52', 0.7) +
    (f.spread ? `<path d="M50 148 H210 V141 q-9 -8 -18 0 q-9 -7 -18 0 q-9 -8 -18 0 q-9 -7 -18 0 q-9 -8 -18 0 q-9 -7 -18 0 q-9 -8 -18 0 q-9 -7 -16 0 L50 141Z" fill="${f.spread}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>` : '') +
    (f.mid ? f.mid() : bananas) +
    (f.drizzle ? drizzle(f.drizzle) : '') +
    // peanut butter squeezed out of the sides
    (f.spread ? `<ellipse cx="48" cy="135" rx="6" ry="10" fill="${f.spread}" stroke="${INK}" stroke-width="1.6"/><ellipse cx="212" cy="137" rx="6" ry="10" fill="${top2}" stroke="${INK}" stroke-width="1.6"/>` : '') +
    // top peanut butter layer hanging from the top slice (the whole top half is lifted 8px like the other sandwiches)
    `<g transform="translate(0 -8)">` +
    (f.spread ? `<path d="M50 124 H210 V130 q-8 8 -16 0 q-8 10 -18 0 q-8 7 -16 0 q-8 9 -18 0 q-8 8 -18 0 q-8 10 -18 0 q-8 6 -18 0 q-8 9 -16 0 L50 130Z" fill="${top2}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/><path d="M62 128 q10 -3 22 0 M120 127 q10 -3 20 0" fill="none" stroke="${f.spreadHi}" stroke-width="2.4" stroke-linecap="round"/>` : '') +
    // top slice
    `<path d="${topP}" fill="#B8742E" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><path d="${topIn}" fill="${f.crumb}"/><path d="M56 124 V107 Q56 96 69 96 H191 Q204 96 204 107 V124" fill="none" stroke="#D9A24F" stroke-width="5" opacity=".5"/>` +
    dots([[70, 102], [100, 106], [140, 102], [180, 108], [120, 112], [160, 114], [84, 116]], 1.3, '#CE9A52', 0.7) +
    `<path d="M62 100 Q64 93 82 92" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="4" stroke-linecap="round"/>` +
    `</g>` +
    paper +
    `</g>` +
    (f.fallen ? f.fallen() : fallen(54, 200) + fallen(74, 206) + peanut(94, 208, 20) + peanut(40, 194, -15))
  )
}

const TOASTS = {
  pbbananatoast: { crumb: '#E8BF76', spread: '#B8793F', spreadHi: '#E0A767' },
  pbchocbanana: { crumb: '#E8BF76', spread: '#B8793F', spreadHi: '#E0A767', drizzle: '#4A2C1D' },
  pbcaramelbanana: { crumb: '#E8BF76', spread: '#B8793F', spreadHi: '#E0A767', drizzle: '#D98A2B' },
  // peanut butter below, strawberry jam above (jam squeezes out on the right)
  pbjamtoast: {
    crumb: '#E8BF76', spread: '#B8793F', spread2: '#B3263A', spreadHi: '#E0A767',
    mid: () => '',
    fallen: () => `<circle cx="58" cy="202" r="7" fill="#B3263A" stroke="${INK}" stroke-width="1.6"/><circle cx="55" cy="199" r="2" fill="#fff" opacity=".5"/><ellipse cx="82" cy="208" rx="6" ry="3.8" transform="rotate(20 82 208)" fill="#D9A55E" stroke="${INK}" stroke-width="1.4"/><ellipse cx="42" cy="194" rx="6" ry="3.8" transform="rotate(-15 42 194)" fill="#D9A55E" stroke="${INK}" stroke-width="1.4"/>`,
  },
  // fried egg between two toast slices
  eggtoast: {
    crumb: '#E8BF76', spread: null, spreadHi: '#E0A767',
    mid: () =>
      `<path d="M52 140 Q50 128 66 127 Q80 120 100 127 Q120 121 140 127 Q166 120 182 128 Q208 126 208 140 Q210 148 196 148 H66 Q52 148 52 140Z" fill="#FFFDF4" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/><path d="M60 144 H196" stroke="#D9B15A" stroke-width="2" stroke-linecap="round" opacity=".6"/>` +
      `<ellipse cx="130" cy="135" rx="22" ry="13" fill="#F2B52A" stroke="${INK}" stroke-width="1.8"/><ellipse cx="122" cy="130" rx="6" ry="3" fill="#fff" opacity=".6"/>` +
      dots([[76, 138], [96, 142], [164, 140], [186, 137], [150, 144]], 1.1, '#3A3430'),
    fallen: () => parsley(60, 204) + parsley(80, 208) + dots([[100, 207], [106, 203], [46, 196]], 1.4, '#3A3430'),
  },
}

// ── sandwiches: split roll + filling + paper wrap on the right half ──
const frill = (x0, x1, y, col, amp = 7) => {
  const n = Math.round((x1 - x0) / 14), st = (x1 - x0) / n
  let d = `M${x0} ${y + 6}`
  for (let i = 0; i < n; i++) d += ` q${st / 2} ${-2 * amp} ${st} 0`
  return `<path d="${d} L${x1} ${y + 14} L${x0} ${y + 14}Z" fill="${col}" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>`
}
const dots = (pts, r, col, op = 1) => pts.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="${r}" fill="${col}" opacity="${op}"/>`).join('')
const tomato = (cx, cy) =>
  `<circle cx="${cx}" cy="${cy}" r="8.5" fill="#D9453A" stroke="${INK}" stroke-width="1.8"/><circle cx="${cx}" cy="${cy}" r="5.5" fill="#EE6F5E"/>${dots([[cx - 2, cy - 1], [cx + 2, cy + 1], [cx, cy - 3]], 0.9, '#FFE7A8')}`
const fry = (x1, y1, x2, y2) =>
  `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M${x1} ${y1} L${x2} ${y2}" stroke="#F2C94C" stroke-width="4.5" stroke-linecap="round"/>`

const SAND = {
  kookoosandwich: {
    bun: '#E4AC62',
    deco: `<path d="M88 96 l10 14 M118 92 l10 18 M148 96 l10 14" fill="none" stroke="#B7721F" stroke-width="3" stroke-linecap="round" opacity=".7"/>`,
    fill:
      frill(40, 220, 142, '#8DBE63') +
      [[58, 124, -4], [104, 122, 3], [150, 124, -3]]
        .map((s) => `<g transform="rotate(${s[2]} ${s[0] + 22} ${s[1] + 12})"><rect x="${s[0]}" y="${s[1]}" width="44" height="24" rx="6" fill="#4F7A33" stroke="${INK}" stroke-width="2"/>${dots([[s[0] + 8, s[1] + 7], [s[0] + 20, s[1] + 15], [s[0] + 33, s[1] + 8], [s[0] + 14, s[1] + 18], [s[0] + 37, s[1] + 17]], 2.2, '#9CC05A')}${dots([[s[0] + 12, s[1] + 10], [s[0] + 28, s[1] + 6], [s[0] + 26, s[1] + 18]], 1.6, '#EBD36B')}</g>`)
        .join('') +
      tomato(90, 141) + tomato(176, 141),
  },
  schnitzelsandwich: {
    bun: '#E8B36A',
    deco: dots([[80, 100], [100, 94], [124, 98], [146, 93], [168, 100], [112, 108], [140, 108], [90, 112], [160, 112], [184, 108]], 2.4, '#FFF3D6'),
    fill:
      frill(40, 220, 142, '#8DBE63') +
      `<path d="M38 140 Q34 126 52 124 H196 Q222 124 214 142 Q208 152 190 150 H56 Q40 152 38 140Z" fill="#DB9A3F" stroke="${INK}" stroke-width="2.3" stroke-linejoin="round"/>` +
      `<path d="M46 130 Q60 126 90 126" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="3.5" stroke-linecap="round"/>` +
      dots([[62, 134], [84, 142], [108, 132], [132, 140], [152, 131], [176, 140], [198, 133], [120, 146], [70, 146]], 2, '#B7721F', 0.8) +
      dots([[76, 130], [98, 138], [144, 136], [166, 130], [188, 142]], 1.8, '#F2C46B') +
      `<path d="M60 128 q8 -6 16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0" fill="none" stroke="#FFF1C4" stroke-width="3.2" stroke-linecap="round"/><path d="M92 134 q8 -6 16 0 t16 0 t16 0 t16 0" fill="none" stroke="#D9453A" stroke-width="3" stroke-linecap="round"/>` +
      [[84, 148], [128, 150], [172, 148]].map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="6.5" fill="#9DB35A" stroke="${INK}" stroke-width="1.6"/><circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="#C9D88A"/>`).join(''),
  },
  cutletsandwich: {
    bun: '#E2A95E',
    deco: `<path d="M84 98 q10 -6 20 0 M124 94 q10 -6 20 0 M156 100 q10 -6 20 0" fill="none" stroke="#B7721F" stroke-width="2.6" stroke-linecap="round" opacity=".6"/>`,
    fill:
      frill(40, 220, 142, '#8DBE63') +
      [[82, 136, -4], [156, 135, 3]]
        .map((c) => `<g transform="rotate(${c[2]} ${c[0]} ${c[1]})"><ellipse cx="${c[0]}" cy="${c[1]}" rx="38" ry="14" fill="#8F5429" stroke="${INK}" stroke-width="2.2"/><ellipse cx="${c[0]}" cy="${c[1] - 2}" rx="31" ry="9.5" fill="#B97A43"/><path d="M${c[0] - 26} ${c[1] - 6} Q${c[0] - 12} ${c[1] - 11} ${c[0] + 4} ${c[1] - 10}" fill="none" stroke="#E0A66E" stroke-width="3" stroke-linecap="round" opacity=".8"/>${dots([[c[0] - 16, c[1] + 1], [c[0] + 2, c[1] - 3], [c[0] + 16, c[1] + 2], [c[0] - 4, c[1] + 6], [c[0] + 24, c[1] - 2]], 2, '#6B3A1B', 0.8)}${dots([[c[0] - 8, c[1] - 5], [c[0] + 10, c[1] - 5], [c[0] + 20, c[1] + 5]], 1.4, '#D8A56B')}</g>`)
        .join('') +
      tomato(120, 145) + tomato(203, 140) +
      `<path d="M58 127 q8 -6 16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0" fill="none" stroke="#D9453A" stroke-width="3" stroke-linecap="round"/><path d="M70 131 q8 -5 16 0 t16 0 t16 0 t16 0 t16 0" fill="none" stroke="#FFF1C4" stroke-width="2.6" stroke-linecap="round"/>` +
      [[58, 148], [140, 151], [182, 149]].map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="6.5" fill="#9DB35A" stroke="${INK}" stroke-width="1.6"/><circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="#C9D88A"/>`).join(''),
  },
  simitsandwich: {
    bun: '#C77A2B',
    // simit: dark golden ring bread crusted with sesame
    deco:
      `<path d="M60 112 Q62 96 92 92 M180 94 Q204 100 208 114" fill="none" stroke="#8F4F14" stroke-width="3" stroke-linecap="round" opacity=".45"/>` +
      dots([[78, 104], [92, 98], [108, 94], [126, 92], [144, 93], [162, 96], [180, 100], [194, 108], [100, 106], [120, 102], [140, 104], [158, 106], [176, 110], [86, 112], [110, 114], [132, 112], [154, 114], [70, 114]], 2, '#FFF3D6') +
      dots([[104, 100], [136, 98], [168, 104]], 1.4, '#E8C98B'),
    fill:
      `<path d="M46 134 Q70 128 100 133 T160 133 T214 133 V145 H46Z" fill="#FFF6E0" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>` +
      dots([[70, 139], [118, 140], [170, 139]], 1.2, '#E8D9B0') +
      [[104, 134], [142, 136]].map((p) => `<ellipse cx="${p[0]}" cy="${p[1]}" rx="15" ry="9" fill="#8DBE63" stroke="${INK}" stroke-width="1.8"/><ellipse cx="${p[0]}" cy="${p[1]}" rx="10" ry="5.5" fill="#D8EAB0"/>${dots([[p[0] - 4, p[1]], [p[0], p[1] - 1], [p[0] + 4, p[1] + 1]], 1, '#8DBE63')}`).join('') +
      tomato(66, 138) + tomato(186, 138) +
      nut(38, 128, -10) + nut(84, 126, 8) + nut(168, 127, -6) + nut(208, 128, 14),
  },
  olivesandwich: {
    bun: '#E6B068',
    // an olive on a toothpick stuck in the roll
    deco:
      `<path d="M126 106 L152 64" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><path d="M126 106 L152 64" stroke="#E8C98B" stroke-width="2.6" stroke-linecap="round"/>` +
      `<ellipse cx="156" cy="60" rx="9" ry="7" transform="rotate(-25 156 60)" fill="#8E9A3A" stroke="${INK}" stroke-width="1.8"/><circle cx="159" cy="58" r="2.6" fill="#D9453A"/><path d="M149 57 q3 -3 6 -3" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="2" stroke-linecap="round"/>` +
      dots([[78, 104], [100, 98], [172, 100], [192, 108]], 2.2, '#FFF3D6'),
    fill:
      frill(40, 220, 142, '#8DBE63') +
      `<path d="M46 134 Q70 126 100 132 T160 132 T214 132 V144 H46Z" fill="#FFF6E0" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>` +
      [[66, 130, '#8E9A3A'], [92, 134, '#3A3430'], [120, 130, '#8E9A3A'], [148, 134, '#3A3430'], [176, 130, '#8E9A3A'], [200, 134, '#3A3430']]
        .map((o) => `<circle cx="${o[0]}" cy="${o[1]}" r="9" fill="${o[2]}" stroke="${INK}" stroke-width="1.6"/><circle cx="${o[0]}" cy="${o[1]}" r="4" fill="#FFF6E0" stroke="${INK}" stroke-width="1.2"/><path d="M${o[0] - 6} ${o[1] - 3} q2 -4 6 -5" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.6" stroke-linecap="round"/>`)
        .join('') +
      tomato(80, 146) + tomato(171, 147),
  },
  falafelsandwich: {
    bun: '#E6B068',
    deco:
      `<path d="M92 96 l9 13 M128 92 l9 17 M162 97 l9 12" fill="none" stroke="#B7721F" stroke-width="2.8" stroke-linecap="round" opacity=".6"/>` +
      dots([[108, 98], [144, 96], [178, 104], [78, 106]], 2.2, '#FFF3D6'),
    fill: (() => {
      // whole balls are crisp brown; cut balls show the green herb interior
      const ball = (x, y, cut) =>
        cut
          ? `<circle cx="${x}" cy="${y}" r="13" fill="#A8631F" stroke="${INK}" stroke-width="2"/><circle cx="${x}" cy="${y}" r="9.5" fill="#B9C86E"/>${dots([[x - 3, y - 2], [x + 3, y + 2], [x - 1, y + 4], [x + 4, y - 3], [x - 5, y + 3]], 1.2, '#6E8A3A')}${dots([[x + 1, y - 1], [x - 4, y - 5]], 1, '#E9E0A8')}`
          : `<circle cx="${x}" cy="${y}" r="13" fill="#A8631F" stroke="${INK}" stroke-width="2"/><path d="M${x - 8} ${y - 5} Q${x - 4} ${y - 10} ${x + 2} ${y - 10}" fill="none" stroke="#D49A52" stroke-width="2.6" stroke-linecap="round"/>${dots([[x + 3, y + 2], [x - 4, y + 4], [x + 6, y - 3], [x, y + 7], [x - 7, y]], 1.3, '#6B3A1B', 0.85)}`
      return (
        frill(40, 220, 142, '#8DBE63') +
        ball(66, 135, false) + ball(96, 133, true) + ball(126, 136, false) + ball(156, 133, true) + ball(186, 136, false) +
        tomato(80, 146) + tomato(171, 147) +
        [[112, 151], [200, 150]].map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="6.5" fill="#9DB35A" stroke="${INK}" stroke-width="1.6"/><circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="#C9D88A"/>`).join('') +
        `<path d="M56 124 q8 -6 16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0" fill="none" stroke="#FFF1C4" stroke-width="3.2" stroke-linecap="round"/>` +
        `<path d="M80 129 q8 -5 16 0 t16 0 t16 0 t16 0 t16 0" fill="none" stroke="#D9453A" stroke-width="2.8" stroke-linecap="round"/>`
      )
    })(),
  },
  bandarisandwich: {
    bun: '#E0A55A',
    deco: `<path d="M92 100 Q130 90 168 100" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="4" stroke-linecap="round"/>`,
    fill:
      frill(40, 220, 144, '#D9E6B0') +
      dots([[60, 148], [90, 150], [120, 148], [150, 150], [180, 148], [205, 149]], 2.4, '#A56AA0') +
      fry(188, 134, 228, 112) + fry(196, 138, 234, 124) + fry(180, 132, 220, 102) +
      [[68, 134], [100, 138], [132, 134], [164, 138], [196, 134]].map((p) => `<ellipse cx="${p[0]}" cy="${p[1]}" rx="14" ry="10" fill="#C9603F" stroke="${INK}" stroke-width="1.8"/><ellipse cx="${p[0]}" cy="${p[1]}" rx="8" ry="5.5" fill="#E58B6A"/>`).join('') +
      `<path d="M48 124 Q70 118 96 126 T150 125 T206 125 L210 131 Q150 136 90 132 T48 131Z" fill="#C42B22" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>` +
      `<path d="M84 131 v10 q0 4 4 4 q4 0 4 -4 v-10Z M148 132 v14 q0 4 4 4 q4 0 4 -4 v-14Z M190 131 v8 q0 4 4 4 q4 0 4 -4 v-8Z" fill="#C42B22" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>` +
      dots([[70, 126], [112, 128], [168, 127], [128, 129], [198, 128]], 1.4, '#7A140F') +
      `<path d="M58 122 Q72 119 88 123" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2.5" stroke-linecap="round"/>`,
  },
}

function sandwich(f) {
  const topP = 'M46 124 Q40 88 92 84 H168 Q220 88 214 124Z'
  const botP = 'M48 148 H212 Q220 150 216 162 Q210 178 190 179 H70 Q50 178 44 162 Q40 150 48 148Z'
  let zig = 'M112 156'
  for (let i = 0; i < 13; i++) zig += ' l4 -5 l4 5'
  const paper = `<path d="${zig} V182 Q216 186 200 186 H128 Q112 186 112 176Z" fill="var(--ml-cup)" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/><path d="M112 170 H216" stroke="var(--ml-accent)" stroke-width="4" opacity=".8"/><path d="M119 160 V178" stroke="#fff" stroke-opacity=".5" stroke-width="3.5" stroke-linecap="round"/><path d="M210 158 V182" stroke="#2A1608" stroke-opacity=".12" stroke-width="6" stroke-linecap="round"/>`
  return (
    plate() +
    `<ellipse cx="130" cy="190" rx="86" ry="6" fill="#2A1608" opacity=".15"/>` +
    `<g transform="translate(0 8)">` +
    `<path d="${botP}" fill="#D99E4C" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><path d="M60 170 Q100 176 150 174" fill="none" stroke="#2A1608" stroke-opacity=".12" stroke-width="6" stroke-linecap="round"/>` +
    f.fill +
    `<path d="${topP}" fill="${f.bun || '#E6B068'}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><path d="M47 116 H213 L214 124 H46Z" fill="#B7721F" opacity=".3"/><path d="M62 108 Q64 94 92 90" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="5" stroke-linecap="round"/>` +
    f.deco +
    paper +
    `</g>`
  )
}

// ── "meal" items: a kraft-paper takeaway bowl with the food mounded above the rim ──
const KRAFT = '#C9A271'
const rnd = (i, m, k = 9301) => (((i * k + 49297) % 233280) / 233280) * m

function kraftBowl(f) {
  const t = f.top
  const mound = `M56 96 C56 ${t + 8} 100 ${t} 130 ${t} C160 ${t} 204 ${t + 8} 204 96 A74 14 0 0 1 56 96Z`
  const body = 'M56 96 A74 14 0 0 0 204 96 L186 178 Q184 190 170 190 H90 Q76 190 74 178 Z'
  return (
    `<ellipse cx="130" cy="192" rx="78" ry="7" fill="#2A1608" opacity=".15"/>` +
    `<ellipse cx="130" cy="96" rx="76" ry="15" fill="#D8B484" stroke="${INK}" stroke-width="2.5"/><ellipse cx="130" cy="96" rx="68" ry="11" fill="#6E5230"/>` +
    `<path d="${mound}" fill="${f.color}" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>` +
    f.deco +
    `<path d="${body}" fill="${KRAFT}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>` +
    `<path d="M190 104 L180 172 Q178 184 168 186" fill="none" stroke="#6B4A22" stroke-width="9" stroke-linecap="round" opacity=".22"/>` +
    `<path d="M66 108 L80 170" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="5" stroke-linecap="round"/>` +
    `<path d="M56 96 A74 14 0 0 0 204 96" fill="none" stroke="#E4C99B" stroke-width="5"/><path d="M56 96 A74 14 0 0 0 204 96" fill="none" stroke="${INK}" stroke-width="2.5"/>` +
    `<path d="M60 104 A70 13 0 0 0 200 104" fill="none" stroke="#A98355" stroke-width="3" opacity=".6"/>` +
    dots([[88, 128], [112, 168], [150, 172], [170, 138], [96, 150], [140, 122], [176, 160]], 1.4, '#A98355', 0.7) +
    `<rect x="98" y="132" width="64" height="38" rx="6" fill="var(--ml-cup)" stroke="${INK}" stroke-width="1.8"/>${RINGS(130, 150, 8, 2.4)}<rect x="108" y="160" width="44" height="4" rx="2" fill="${INK}" opacity=".4"/>` +
    (f.steam ? steam(f.steam) : '')
  )
}

const parsley = (x, y) => `<path d="M${x} ${y} q-6 -8 -12 -4 q4 8 12 4 q2 -8 10 -8 q-2 8 -10 8Z" fill="#6F9A5E" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>`

const MEALS = {
  mealcutlet: {
    top: 70, color: '#FFF3D6',
    deco:
      Array.from({ length: 34 }, (_, i) => `<path d="M${72 + ((i * 47) % 116)} ${76 + ((i * 29) % 18)} l5 -2" stroke="#E6D3A4" stroke-width="1.6" stroke-linecap="round"/>`).join('') +
      [[88, 82, -15, 9], [172, 80, 10, 10], [146, 87, 0, 7]].map((p) => `<ellipse cx="${p[0]}" cy="${p[1]}" rx="${p[3]}" ry="4" transform="rotate(${p[2]} ${p[0]} ${p[1]})" fill="#F2C94C" opacity=".85"/>`).join('') +
      [[108, 66, -12], [152, 62, 10]]
        .map((c) => `<g transform="rotate(${c[2]} ${c[0]} ${c[1]})"><ellipse cx="${c[0]}" cy="${c[1]}" rx="27" ry="12" fill="#8F5429" stroke="${INK}" stroke-width="2"/><ellipse cx="${c[0]}" cy="${c[1] - 2}" rx="21" ry="7.5" fill="#B97A43"/><path d="M${c[0] - 18} ${c[1] - 5} Q${c[0] - 8} ${c[1] - 9} ${c[0]} ${c[1] - 8}" fill="none" stroke="#E0A66E" stroke-width="2.6" stroke-linecap="round" opacity=".8"/>${dots([[c[0] - 11, c[1] + 1], [c[0] + 2, c[1] - 2], [c[0] + 12, c[1] + 2], [c[0] - 3, c[1] + 4]], 1.8, '#6B3A1B', 0.8)}</g>`)
        .join('') +
      tomato(178, 85) + parsley(84, 72),
  },
  mealpotatokookoo: {
    // potato kookoo (Persian potato frittata): two golden slices on herbs, with a yogurt dollop, tomato and pickle
    top: 74, color: '#8DBE63',
    deco:
      `<path d="M62 90 q10 -10 20 0 t20 0 t20 0 t20 0 t20 0 t20 0" fill="none" stroke="#6F9A5E" stroke-width="3" stroke-linecap="round" opacity=".8"/>` +
      [[104, 70, -8], [152, 68, 8]]
        .map((c) => `<g transform="rotate(${c[2]} ${c[0]} ${c[1]})"><ellipse cx="${c[0]}" cy="${c[1] + 7}" rx="29" ry="12" fill="#B97A2A" stroke="${INK}" stroke-width="2"/><ellipse cx="${c[0]}" cy="${c[1]}" rx="29" ry="12" fill="#E8B84A" stroke="${INK}" stroke-width="2"/><ellipse cx="${c[0]}" cy="${c[1]}" rx="22" ry="8" fill="#F0CB6A"/>${[[-18, -2], [-8, 2], [2, -4], [12, 1], [-12, 5], [6, 5], [16, -3], [-2, -6]].map((k) => `<path d="M${c[0] + k[0]} ${c[1] + k[1]} l5 -1.4" stroke="#C98A2A" stroke-width="1.5" stroke-linecap="round"/>`).join('')}${dots([[c[0] - 14, c[1] + 1], [c[0] + 4, c[1] + 2], [c[0] + 18, c[1] - 1]], 1.3, '#FBE9A8')}<path d="M${c[0] - 22} ${c[1] - 5} Q${c[0] - 10} ${c[1] - 10} ${c[0]} ${c[1] - 9}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2.4" stroke-linecap="round"/></g>`)
        .join('') +
      `<ellipse cx="130" cy="86" rx="11" ry="5.5" fill="#FFF6E0" stroke="${INK}" stroke-width="1.6"/>${dots([[126, 85], [131, 84], [135, 86]], 1, '#4F7F3A')}` +
      tomato(178, 86) + `<circle cx="84" cy="85" r="6.5" fill="#9DB35A" stroke="${INK}" stroke-width="1.6"/><circle cx="84" cy="85" r="3.5" fill="#C9D88A"/>`,
  },
  mealbeans: {
    // stewed beans in tomato sauce
    top: 82, color: '#B5472A', steam: 78,
    deco:
      `<path d="M78 90 Q96 82 118 88 M122 84 Q144 78 166 86 M96 94 Q130 88 170 94" fill="none" stroke="#E0714A" stroke-width="2.2" stroke-linecap="round" opacity=".8"/>` +
      Array.from({ length: 38 }, (_, i) => {
        const x = 70 + ((i * 53) % 122), y = 82 + ((i * 31) % 12), r = (i * 47) % 180
        return `<g transform="rotate(${r} ${x} ${y})"><ellipse cx="${x}" cy="${y}" rx="5.4" ry="3.4" fill="#EBD3A2" stroke="#8F4A2A" stroke-width=".9"/><ellipse cx="${x - 1}" cy="${y - 1}" rx="2.6" ry="1.3" fill="#fff" opacity=".45"/><circle cx="${x + 2}" cy="${y + 1}" r=".9" fill="#A64A2C"/></g>`
      }).join('') +
      dots([[96, 84], [128, 80], [152, 90], [112, 92], [176, 88], [84, 92]], 1.8, '#4F7F3A') +
      parsley(138, 82),
  },
  meallentils: {
    top: 84, color: '#8A6A2E', steam: 80,
    deco:
      Array.from({ length: 70 }, (_, i) => `<circle cx="${68 + ((i * 53) % 124)}" cy="${84 + ((i * 31) % 12)}" r="2.4" fill="${['#B5893A', '#6B7A2E', '#8F5A2B'][i % 3]}"/>`).join('') +
      `<path d="M92 88 q10 -9 20 0 M122 86 q10 -9 20 0 M150 90 q10 -9 20 0 M106 94 q8 -6 16 0 M138 94 q8 -6 16 0" fill="none" stroke="#D79A2B" stroke-width="3.4" stroke-linecap="round"/>` +
      `<path d="M94 86 q8 -6 14 -1 M124 84 q8 -6 14 -1 M152 88 q8 -6 14 -1" fill="none" stroke="#F2C96B" stroke-width="1.2" stroke-linecap="round"/>` +
      parsley(120, 82) +
      `<path d="M172 99 A11 11 0 0 1 194 99Z" fill="#F2D24B" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/><path d="M183 99 L183 90 M183 99 L176 92 M183 99 L190 92" stroke="#FFF3B0" stroke-width="1.4" stroke-linecap="round"/>`,
  },
  mealashreshteh: {
    top: 84, color: '#6B8A30', steam: 80,
    deco:
      `<path d="M72 92 q8 -8 16 0 t16 0 t16 0 t16 0 t16 0 M80 86 q8 -7 16 0 t16 0 t16 0 t16 0" fill="none" stroke="#F1DCA0" stroke-width="2.4" stroke-linecap="round"/>` +
      [[92, 90], [126, 88], [158, 90], [112, 94], [176, 92]].map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="3.3" fill="#D8B070" stroke="#8A6A2E" stroke-width=".8"/>`).join('') +
      [[104, 86], [140, 92], [166, 86], [84, 93]].map((p) => `<ellipse cx="${p[0]}" cy="${p[1]}" rx="3.4" ry="2.4" fill="#8E2F2A"/>`).join('') +
      `<path d="M84 88 q10 -9 20 0 t20 0 t20 0 t20 0 t20 0" fill="none" stroke="#FFF6E0" stroke-width="3.6" stroke-linecap="round"/>` +
      [[100, 84], [132, 82], [152, 86], [120, 92], [174, 90]].map((p) => `<ellipse cx="${p[0]}" cy="${p[1]}" rx="4" ry="2" fill="#D79A2B"/>`).join('') +
      dots([[96, 80], [122, 78], [146, 80], [170, 82], [110, 90]], 2, '#2E5B22') + dots([[134, 90], [160, 94], [90, 94]], 1.6, '#C8601E'),
  },
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

// ── canned soda: generic can + PET bottle pair (own colour code, no brand marks) ──
// SODA entries call helpers (slice, halfSlice) at load, so keep this block below them.
const SODA = {
  cola: {
    can: '#6B2D1E', band: '#F4E3C4', liquid: '#3A1A10', top: '#7A4A32',
    mark: `<circle cx="80" cy="147" r="6" fill="none" stroke="#6B2D1E" stroke-width="2.6"/><circle cx="92" cy="138" r="4" fill="none" stroke="#6B2D1E" stroke-width="2.4"/><circle cx="84" cy="128" r="2.6" fill="none" stroke="#6B2D1E" stroke-width="2.2"/>`,
  },
  colazero: {
    can: '#2E2A2B', band: '#E9E4D6', liquid: '#2A140C', top: '#6A4030',
    mark: `<ellipse cx="86" cy="139" rx="8" ry="13" fill="none" stroke="#2E2A2B" stroke-width="4.5"/><path d="M99 124 l2 4 l4 2 l-4 2 l-2 4 l-2 -4 l-4 -2 l4 -2Z" fill="#2E2A2B"/>`,
  },
  lemondelster: {
    can: '#C4D43A', band: '#FFF6D6', liquid: '#F1E27A', top: '#FAF0A8',
    mark: slice(86, 139, 14, '#F7D64B', '#FFF3B0', '#FBE67A'),
  },
  tropicaldelster: {
    can: '#E9731F', band: '#FFF0C9', liquid: '#F6B73C', top: '#FFD27A',
    mark: `<path d="M86 131 q-5 -9 -10 -8 q4 6 7 9 q-6 -5 -10 -2 q6 3 11 4 M86 131 q5 -9 10 -8 q-4 6 -7 9 q6 -5 10 -2 q-6 3 -11 4" fill="#6F9A5E" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"/><ellipse cx="86" cy="148" rx="9" ry="12" fill="#F2B84B" stroke="${INK}" stroke-width="1.8"/><path d="M80 141 l12 14 M92 141 l-12 14 M78 149 h16" stroke="#C9822B" stroke-width="1.3" stroke-linecap="round"/>`,
  },
}

function sodaCan(f, cid) {
  const bp = 'M64 92 Q64 84 72 82 H100 Q108 84 108 92 V188 Q108 195 100 195 H72 Q64 195 64 188 Z'
  let s = ''
  s += `<path d="${bp}" fill="${f.can}"/><clipPath id="${cid}"><path d="${bp}"/></clipPath><g clip-path="url(#${cid})"><rect x="60" y="114" width="52" height="50" fill="${f.band}"/><path d="M60 114H112M60 164H112" stroke="${INK}" stroke-width="2"/>${f.mark}<path d="M102 88 V192" stroke="#2A1608" stroke-opacity=".13" stroke-width="7"/></g>`
  s += `<path d="M72 98 V108 M72 170 V186" stroke="#fff" stroke-opacity=".5" stroke-width="5" stroke-linecap="round" fill="none"/><path d="${bp}" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`
  s += `<ellipse cx="86" cy="83" rx="19" ry="4.5" fill="#D8D4CC" stroke="${INK}" stroke-width="2"/><ellipse cx="89" cy="83" rx="7" ry="2.2" fill="none" stroke="${INK}" stroke-width="1.6"/><path d="M74 82 q6 -2 12 -2" stroke="#fff" stroke-opacity=".7" stroke-width="2" stroke-linecap="round" fill="none"/>`
  return s
}

// soda set: can + PET bottle side by side (original shapes and colours, no brand marks)
function sodaPair(f, u) {
  const cid = 'sc' + u, bid = 'sb' + u
  const bp = 'M148 66 H168 V76 C168 88 188 94 188 112 V184 Q188 194 178 194 H138 Q128 194 128 184 V112 C128 94 148 88 148 76 Z'
  let s = `<ellipse cx="86" cy="197" rx="30" ry="5" fill="var(--ml-plate-2)"/><ellipse cx="158" cy="197" rx="36" ry="6" fill="var(--ml-plate-2)"/>`
  s += sodaCan(f, cid)
  s += `<path d="${bp}" fill="var(--ml-glass)"/><clipPath id="${bid}"><path d="${bp}"/></clipPath><g clip-path="url(#${bid})"><rect x="120" y="82" width="76" height="118" fill="${f.liquid}"/><rect x="120" y="82" width="76" height="5" fill="${f.top}"/>`
  s += `<rect x="120" y="110" width="76" height="46" fill="${f.band}"/><g transform="translate(72 -7)">${f.mark}</g><path d="M120 110H196M120 156H196" stroke="${INK}" stroke-width="2"/>`
  s += `<path d="M181 90 V190" stroke="#2A1608" stroke-opacity=".16" stroke-width="8"/>`
  s += [[142, 168, 3], [162, 176, 2.2], [150, 100, 2], [172, 164, 1.8]].map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="${p[2]}" fill="#fff" opacity=".35"/>`).join('')
  s += `</g><path d="M136 118 V102 M136 162 V184" stroke="#fff" stroke-opacity=".55" stroke-width="5" stroke-linecap="round" fill="none"/>`
  s += `<path d="M137 190 q4 6 10 0 M149 192 q4 5 9 0 M160 192 q4 5 9 0 M171 190 q4 5 10 0" fill="none" stroke="${INK}" stroke-opacity=".5" stroke-width="1.6" stroke-linecap="round"/>`
  s += `<path d="${bp}" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><rect x="144" y="70" width="28" height="4" rx="2" fill="var(--ml-cup)" stroke="${INK}" stroke-width="1.8"/>`
  s += `<rect x="146" y="52" width="24" height="15" rx="3.5" fill="${f.can}" stroke="${INK}" stroke-width="2.2"/><path d="M152 55 V64 M158 55 V64 M164 55 V64" stroke="#fff" stroke-opacity=".35" stroke-width="2" stroke-linecap="round"/>`
  return s
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

const SACHET = {
  mango: { body: '#F3DFB8', blob: '#E8CFA2', fruit: `<path d="M134 122 q4 -14 20 -14 q-2 14 -20 14Z" fill="#6F9A5E" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/><path d="M130 124 C152 120 160 148 150 164 C142 178 118 178 111 160 C103 142 110 126 130 124Z" fill="#F6A81C" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M118 136 q-3 9 0 18" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="3" stroke-linecap="round"/>` },
  strawberry: {
    body: '#F8E0D6', blob: '#EDC4BC',
    fruit: `<path d="M130 122 C142 122 154 124 154 136 C154 150 140 176 130 178 C120 176 106 150 106 136 C106 124 118 122 130 122Z" fill="#E0414B" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M116 134 q-2 8 1 16" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="3" stroke-linecap="round"/>${[[122, 136], [136, 134], [129, 144], [118, 146], [141, 146]].map((p) => `<ellipse cx="${p[0]}" cy="${p[1]}" rx="1.3" ry="2" fill="#FFE7A8"/>`).join('')}<path d="M130 126 q-10 -9 -17 -2 q8 7 17 2 q10 5 17 -2 q-7 -7 -17 2Z" fill="#6F9A5E" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/><path d="M130 124 v-6" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`,
  },
}

// flat powder sachet: crimped top/bottom, Meet Lounge rings, fruit with a chocolate drip (original design)
function sachet(f, u) {
  const zig = (y0, x0, n, st, dir) => Array.from({ length: n + 1 }, (_, i) => `L${x0 + i * st * dir} ${y0 + (i % 2 ? 0 : 6)}`).join(' ')
  const bp = `M84 52 ${zig(52, 84, 23, 4, 1)} V192 ${zig(192, 176, 23, 4, -1)} Z`
  const id = 'sa' + u
  return `<ellipse cx="130" cy="205" rx="62" ry="7" fill="var(--ml-plate-2)"/><g transform="rotate(-4 130 130)"><path d="${bp}" fill="${f.body}"/><clipPath id="${id}"><path d="${bp}"/></clipPath><g clip-path="url(#${id})"><rect x="80" y="44" width="100" height="18" fill="#2A1608" opacity=".12"/><rect x="80" y="184" width="100" height="18" fill="#2A1608" opacity=".12"/><ellipse cx="94" cy="118" rx="14" ry="9" fill="${f.blob}" opacity=".7"/><ellipse cx="170" cy="168" rx="12" ry="8" fill="${f.blob}" opacity=".7"/>${RINGS(130, 82, 10, 2.8)}<path d="M112 100 h36" stroke="${INK}" stroke-opacity=".55" stroke-width="2" stroke-linecap="round"/><path d="M118 107 h24" stroke="${INK}" stroke-opacity=".3" stroke-width="1.6" stroke-linecap="round"/>${f.fruit}<path d="M104 152 Q114 146 128 152 T154 152 V162 Q154 170 149 170 Q144 170 144 162 Q144 158 140 158 Q136 158 136 166 Q136 176 130 176 Q124 176 124 166 Q124 160 120 160 Q116 160 116 166 Q116 172 110 172 Q104 172 104 164 Z" fill="#4A2C1D" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/><path d="M110 156 q8 -3 16 0" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2" stroke-linecap="round"/><path d="M170 60 V186" stroke="#2A1608" stroke-opacity=".13" stroke-width="7" stroke-linecap="round"/><path d="M92 68 V110" stroke="#fff" stroke-opacity=".5" stroke-width="5" stroke-linecap="round"/></g><path d="${bp}" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/></g>`
}

function goodsBody(k, u) {
  switch (k) {
    case 'mug': {
      const hd = 'M176 112 C214 108 214 168 172 164'
      return `<ellipse cx="130" cy="200" rx="66" ry="8" fill="var(--ml-plate-2)"/><path d="${hd}" fill="none" stroke="${INK}" stroke-width="13" stroke-linecap="round"/><path d="${hd}" fill="none" stroke="var(--ml-cup)" stroke-width="7" stroke-linecap="round"/><path d="M80 96 H180 V160 Q180 196 146 196 H114 Q80 196 80 160 Z" fill="var(--ml-cup)" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><path d="M170 104 V160 Q170 186 146 188" fill="none" stroke="#2A1608" stroke-opacity=".13" stroke-width="7" stroke-linecap="round"/><path d="M89 108 V158" stroke="#fff" stroke-opacity=".55" stroke-width="5" stroke-linecap="round"/><ellipse cx="130" cy="96" rx="50" ry="9" fill="#5A3524" stroke="${INK}" stroke-width="2.2"/>${RINGS(130, 146, 14, 3.4)}<g fill="var(--ml-accent)" opacity=".7"><circle cx="102" cy="120" r="2.6"/><circle cx="158" cy="120" r="2.6"/><circle cx="96" cy="172" r="2.6"/><circle cx="164" cy="172" r="2.6"/></g>`
    }
    case 'mangochocsachet': return sachet(SACHET.mango, u)
    case 'strawberrychocsachet': return sachet(SACHET.strawberry, u)
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
export const ARTWORK_IDS = [
  'affogato',
  'espresso', 'americano', 'cortado', 'syruplatte', 'syrupicedlatte',
  'hotchoc', 'mangochoc', 'berrychoc', 'pbbananatoast',
  'olivesandwich', 'falafelsandwich', 'cutletsandwich', 'kookoosandwich', 'schnitzelsandwich', 'bandarisandwich',
  'mealcutlet', 'mealpotatokookoo', 'mealbeans', 'meallentils', 'mealashreshteh',
  'queenberry', 'appleparadise', 'vitaminc', 'pistachiolatte',
  'latte', 'cappuccino', 'mocha', 'icedlatte', 'iceamer', 'coldbrew', 'shake',
  'cheesecake', 'brownie', 'croissant', 'carrotcake', 'muffin', 'cookie',
  'mug', 'tote', 'beans', 'syrupbottle', 'note', 'pbchocbanana',
  'pbcaramelbanana', 'pbjamtoast', 'eggtoast', 'simitsandwich', 
  'mangochocsachet', 'strawberrychocsachet', 'cola', 'colazero', 'lemondelster', 'tropicaldelster',
] as const

export function art(it, o, u) {
  o = o || {}
  const sc = o.scale || 1, tint = o.tint || 0
  const syrupColor = SYRUP_COLORS[o.syrupId]
  let b = ''
  switch (it.art) {
    case 'espresso': b = cup({ hw: 44, rimY: 132, h: 58, coffee: '#3B2013', crema: '#B07A4B' }, 0); break
    case 'americano': b = cup({ hw: 56, rimY: 112, h: 78, coffee: '#2B170C', ring: '#9A6A3E' }, 0); break
    case 'cortado': b = cup({ hw: 50, rimY: 122, h: 66, coffee: '#B88A58', heart: true, milky: true }, tint); break
    case 'syruplatte': b = cup({ hw: 62, rimY: 104, h: 86, coffee: '#CBA074', heart: true, ...(syrupColor ? { drizzle: syrupColor } : {}), milky: true }, tint); break
    case 'syrupicedlatte': b = syrupColor
      ? glass({ layers: [['#E8D2B2', 80, true], ['#5A3524', 132], [syrupColor, 170]], drip: [syrupColor, 84] }, u, tint)
      : glass({ layers: [['#E8D2B2', 80, true], ['#5A3524', 132]] }, u, tint)
      ; break
    case 'hotchoc': b = cup({ hw: 60, rimY: 108, h: 82, coffee: '#4A2415', marsh: true }, 0); break
    case 'mangochoc': b = cup({ hw: 60, rimY: 108, h: 82, coffee: '#4A2415', cream: true, creamFill: '#FFF0C9', topping: 'mango' }, 0); break
    case 'berrychoc': b = cup({ hw: 60, rimY: 108, h: 82, coffee: '#5A2A24', cream: true, creamFill: '#FFE3E8', topping: 'strawberry' }, 0); break
    case 'pbbananatoast': b = toast(TOASTS.pbbananatoast); break
    case 'pbchocbanana': b = toast(TOASTS.pbchocbanana); break
    case 'pbcaramelbanana': b = toast(TOASTS.pbcaramelbanana); break
    case 'pbjamtoast': b = toast(TOASTS.pbjamtoast); break
    case 'eggtoast': b = toast(TOASTS.eggtoast); break
    case 'simitsandwich': b = sandwich(SAND.simitsandwich); break
    case 'affogato': b = affogato(u); break
    case 'olivesandwich': b = sandwich(SAND.olivesandwich); break
    case 'mealcutlet': b = kraftBowl(MEALS.mealcutlet); break
    case 'mealpotatokookoo': b = kraftBowl(MEALS.mealpotatokookoo); break
    case 'mealbeans': b = kraftBowl(MEALS.mealbeans); break
    case 'meallentils': b = kraftBowl(MEALS.meallentils); break
    case 'mealashreshteh': b = kraftBowl(MEALS.mealashreshteh); break
    case 'falafelsandwich': b = sandwich(SAND.falafelsandwich); break
    case 'cutletsandwich': b = sandwich(SAND.cutletsandwich); break
    case 'kookoosandwich': b = sandwich(SAND.kookoosandwich); break
    case 'schnitzelsandwich': b = sandwich(SAND.schnitzelsandwich); break
    case 'bandarisandwich': b = sandwich(SAND.bandarisandwich); break
    case 'queenberry': b = teaGlass(TEAS.queenberry, u); break
    case 'appleparadise': b = teaGlass(TEAS.appleparadise, u); break
    case 'vitaminc': b = teaGlass(TEAS.vitaminc, u); break
    case 'pistachiolatte': b = cup({ hw: 62, rimY: 104, h: 86, coffee: '#BDB67E', heart: true, heartFill: '#F4F1D0', drizzle: '#8DB255', pistachio: true }, 0); break
    case 'latte': b = cup({ hw: 62, rimY: 104, h: 86, coffee: '#CBA074', heart: true, milky: true }, tint); break
    case 'cappuccino': b = cup({ hw: 60, rimY: 108, h: 82, coffee: '#C69A6E', dome: true, milky: true }, tint); break
    case 'mocha': b = cup({ hw: 62, rimY: 106, h: 84, coffee: '#6B3E2A', cream: true }, 0); break
    case 'icedlatte': b = glass({ layers: [['#E8D2B2', 80, true], ['#5A3524', 132]] }, u, tint); break
    case 'iceamer': b = glass({ layers: [['#4B2A1B', 74]] }, u, 0); break
    case 'coldbrew': b = glass({ layers: [['#2E190F', 70]], citrus: true }, u, 0); break
    case 'cola': b = sodaPair(SODA.cola, u); break
    case 'colazero': b = sodaPair(SODA.colazero, u); break
    case 'lemondelster': b = sodaPair(SODA.lemondelster, u); break
    case 'tropicaldelster': b = sodaPair(SODA.tropicaldelster, u); break
    case 'shake': b = glass({ layers: [['#7A4630', 92], ['#946049', 150]], cream: true }, u, 0); break
    case 'cheesecake':
      b = blockArt({
        top: '#D8654A', side: '#EBCF9C',
        front: [[118, 10, '#C8503C'], [128, 36, '#FBE9C4'], [164, 16, '#A9714B']],
        extra: `<polygon points="172,162 204,142 204,160 172,180" fill="#A9714B" stroke="${INK}" stroke-width="2"/><circle cx="130" cy="108" r="6.5" fill="#4B3F8C" stroke="${INK}" stroke-width="1.6"/><circle cx="152" cy="106" r="6.5" fill="#4B3F8C" stroke="${INK}" stroke-width="1.6"/><circle cx="176" cy="104" r="6.5" fill="#4B3F8C" stroke="${INK}" stroke-width="1.6"/><path d="M138 102c2-8 9-10 12-7-4 1-8 3-12 7Z" fill="#6F9A5E" stroke="${INK}" stroke-width="1.4"/>`,
      })
      break
    case 'brownie': b = brownie(); break
    case 'croissant': b = croissant(); break
    case 'carrotcake': b = carrotCake(); break
    case 'muffin': b = muffins(); break
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
