import { ml } from '../lib/meetlounge'

/**
 * Looks for ./models/index.json, a map of item id to file name, e.g. {"latte":"latte.glb"}.
 * Drop GLB files into public/models/ (see public/models/README.md) and list them there; no code change needed.
 */
export async function loadModelManifest() {
  try {
    const r = await fetch('./models/index.json', { cache: 'no-cache' })
    if (!r.ok) return
    const map = (await r.json()) as Record<string, unknown>
    for (const [id, file] of Object.entries(map)) {
      if (typeof file === 'string' && /^[\w-]+\.glb$/.test(file) && /^[\w-]+$/.test(id)) ml.setItemModel(id, `./models/${file}`)
    }
  } catch { /* no models: the flat pictures stay */ }
}
