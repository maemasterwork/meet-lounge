// Writes a small valid GLB (a colored cube) for testing the 3D stage:  node scripts/make-test-glb.mjs out.glb
import { writeFileSync } from 'node:fs'
const P = [[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1],[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1]]
const I = [0,1,2,0,2,3, 1,5,6,1,6,2, 5,4,7,5,7,6, 4,0,3,4,3,7, 3,2,6,3,6,7, 4,5,1,4,1,0]
const pos = Buffer.from(new Float32Array(P.flat()).buffer), idx = Buffer.from(new Uint16Array(I).buffer)
const bin = Buffer.concat([pos, idx, Buffer.alloc((4 - ((pos.length + idx.length) % 4)) % 4)])
const gltf = { asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, scale: [0.4, 0.4, 0.4] }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1, material: 0 }] }],
  materials: [{ pbrMetallicRoughness: { baseColorFactor: [0.66, 0.28, 0.12, 1], metallicFactor: 0, roughnessFactor: 0.6 } }],
  buffers: [{ byteLength: bin.length }], bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: pos.length, target: 34962 }, { buffer: 0, byteOffset: pos.length, byteLength: idx.length, target: 34963 }],
  accessors: [{ bufferView: 0, componentType: 5126, count: 8, type: 'VEC3', min: [-1,-1,-1], max: [1,1,1] }, { bufferView: 1, componentType: 5123, count: 36, type: 'SCALAR' }] }
let j = Buffer.from(JSON.stringify(gltf)); j = Buffer.concat([j, Buffer.alloc((4 - (j.length % 4)) % 4, 0x20)])
const h = Buffer.alloc(12); h.writeUInt32LE(0x46546c67, 0); h.writeUInt32LE(2, 4); h.writeUInt32LE(12 + 8 + j.length + 8 + bin.length, 8)
const c = (type, d) => { const x = Buffer.alloc(8); x.writeUInt32LE(d.length, 0); x.writeUInt32LE(type, 4); return Buffer.concat([x, d]) }
writeFileSync(process.argv[2] ?? 'cube.glb', Buffer.concat([h, c(0x4e4f534a, j), c(0x004e4942, bin)]))
