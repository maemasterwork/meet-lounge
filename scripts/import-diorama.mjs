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
let body = lines.slice(start + 1, end).map((l) => (l.trim() ? '  ' + l : '')).join('\n').replace(/\n+$/, '')
  // the model's own page buttons (logo upload, light/dark panel, ...) are not part of the product: ignore its DOM lookups
  .replace(/document\.getElementById\(/g, 'byId(').replace(/document\.querySelector\(/g, 'query(')

const signStart = body.indexOf('function signTexture() {')
const signEnd = body.indexOf('var MENUS = {', signStart)
if (signStart < 0 || signEnd < 0) {
  console.error('Could not find signTexture() to apply the storefront SVG logo.')
  process.exit(1)
}
let sign = body.slice(signStart, signEnd)
const ringMark = 'ring2d(x, 290, 220, 118, 62, 16);'
const textureCreation = 'var t = new THREE.CanvasTexture(c); t.anisotropy = 4;'
if (sign.indexOf(ringMark) < 0 || sign.indexOf(ringMark, sign.indexOf(ringMark) + ringMark.length) >= 0 ||
    sign.indexOf(textureCreation) < 0 || sign.indexOf(textureCreation, sign.indexOf(textureCreation) + textureCreation.length) >= 0) {
  console.error('Could not uniquely locate the storefront mark and texture creation. Nothing was changed.')
  process.exit(1)
}
sign = sign
  .replace('function signTexture() {', 'function signTexture() {\n      var logo = new Image();')
  .replace(ringMark, 'if (logo.complete && logo.naturalWidth) x.drawImage(logo, 80, 0, 440, 440); else ' + ringMark)
  .replace(textureCreation, textureCreation + `
      logo.onload = function () { draw(); t.needsUpdate = true; };
      logo.onerror = function () { console.error('Unable to load storefront SVG logo:', logo.src); };
      logo.src = import.meta.env.BASE_URL + 'logo/mark.svg';`)
body = body.slice(0, signStart) + sign + body.slice(signEnd)

const wallRings = /torus\(0\.8, 0\.06, neonA, -6\.66, 5\.2, 1\.0, Math\.PI \/ 2\);\s*torus\(0\.8, 0\.06, neonB, -6\.66, 5\.2, 1\.85, Math\.PI \/ 2\);/g
if ((body.match(wallRings) || []).length !== 1) {
  console.error('Could not uniquely locate the left-wall neon rings for the Namvaran logo. Nothing was changed.')
  process.exit(1)
}
body = body.replace(wallRings, 'addNamvaranLogo3D();')

// names the product's own code (camera loop, controls, settings) relies on
const need = ['nightGoal', 'seasonGoal', 'winterGoal', 'springGoal', 'yaldaGoal', 'xmasGoal', 'nowruzGoal', 'annivGoal', 'vdayGoal', 'oilDayGoal', 'yaldaDecor', 'xmasDecor', 'nowruzDecor', 'annivDecor', 'vDecor', 'oilDecor',
  'applySeason', 'applyLight', 'applyBuilding', 'refreshMenu', 'curSeason', 'movers', 'steam', 'updateLeaves', 'updateSnow', 'updateSpring', 'updateSanta', 'updateNowruz', 'updateAnniv', 'updateVday', 'updateOilDay']
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
