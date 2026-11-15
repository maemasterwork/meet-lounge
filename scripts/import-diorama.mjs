// Imports a new version of the 3D model (the single-file three.js HTML) into the product:
//   node scripts/import-diorama.mjs path/to/Meet_Lounge_Modern_9.html
// It copies the scene-building code from the HTML into src/scene3d/diorama.ts (between the MODEL BODY markers).
// The camera, controls, views, theme/season/event wiring and cleanup around it are the product's own and stay as they are.
import { readFileSync, writeFileSync } from 'node:fs'

const src = process.argv[2]
if (!src) { console.error('Usage: node scripts/import-diorama.mjs <model.html>'); process.exit(1) }
const target = new URL('../src/scene3d/diorama.ts', import.meta.url)
const lines = readFileSync(src, 'utf8').split('\n')

const start = lines.findIndex((l) => /^\s*scene\.add\(world\);/.test(l))
const end = lines.findIndex((l) => l.includes('/* ---------- camera, controls, views ---------- */'))
if (start < 0 || end < 0 || end <= start) {
  console.error('Could not find the scene section. Expected a line `scene.add(world);` and a comment `/* ---------- camera, controls, views ---------- */` in the HTML.')
  process.exit(1)
}
const body = lines.slice(start + 1, end).map((l) => (l.trim() ? '  ' + l : '')).join('\n').replace(/\n+$/, '')

// names the product's own code (camera loop, controls, settings) relies on
const need = ['nightGoal', 'seasonGoal', 'winterGoal', 'springGoal', 'yaldaGoal', 'xmasGoal', 'nowruzGoal', 'yaldaDecor', 'xmasDecor', 'nowruzDecor',
  'applySeason', 'applyLight', 'applyBuilding', 'refreshMenu', 'curSeason', 'movers', 'steam', 'updateLeaves', 'updateSnow', 'updateSpring', 'updateSanta', 'updateNowruz']
const missing = need.filter((n) => !new RegExp('\\b' + n + '\\b').test(body))
if (missing.length) {
  console.error('The new model no longer defines: ' + missing.join(', ') + '\nNothing was changed. Ask for a matching update of src/scene3d/diorama.ts (the frame loop or the controller uses these names).')
  process.exit(1)
}

const t = readFileSync(target, 'utf8')
const a = t.indexOf('/* >>> MODEL BODY START'), b = t.indexOf('/* <<< MODEL BODY END */')
if (a < 0 || b < 0) { console.error('The MODEL BODY markers are missing in src/scene3d/diorama.ts'); process.exit(1) }
const aEnd = t.indexOf('\n', a) + 1
writeFileSync(target, t.slice(0, aEnd) + body + '\n  ' + t.slice(b))
console.log(`Imported ${end - start - 1} lines from ${src} into src/scene3d/diorama.ts. Now run: npm run verify`)
