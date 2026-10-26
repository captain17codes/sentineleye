/**
 * Live Sentinel-2 L2A access from the browser for a user-drawn area of interest.
 *
 * 1. Search the public Earth Search STAC catalogue (Element 84 / AWS Open Data) for scenes.
 * 2. Read only the pixels inside the area from the Cloud-Optimised GeoTIFFs (HTTP range requests).
 * 3. Resample every band onto one north-up lng/lat grid and convert to surface reflectance.
 * Nothing is precomputed: every run reads the archive.
 */
import { fromUrl } from 'geotiff';
import type { SpectralBands } from '../scan/surfaceChange';

export type BBox = [number, number, number, number]; // minLng, minLat, maxLng, maxLat

const STAC = 'https://earth-search.aws.element84.com/v1/search';

export interface StacScene {
  id: string;
  datetime: string;
  cloud: number;
  epsg: number;
  assets: Record<string, { href: string; scale: number; offset: number }>;
}

export interface SceneData {
  scene: StacScene;
  bands: SpectralBands & { green: Float32Array };
  scl: Uint8Array;
  /** share of the area hidden by cloud, shadow or no data */
  invalidShare: number;
}

const BANDS = ['blue', 'green', 'red', 'nir', 'swir16', 'scl'] as const;
const BAD_SCL = new Set([0, 1, 3, 6, 8, 9, 10]); // no data, saturated, shadow, water, cloud, cirrus

export async function searchScenes(bbox: BBox, fromIso: string, toIso: string, maxCloud = 40): Promise<StacScene[]> {
  const res = await fetch(STAC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      collections: ['sentinel-2-l2a'],
      bbox,
      datetime: `${fromIso}/${toIso}`,
      limit: 30,
      query: { 'eo:cloud_cover': { lt: maxCloud } },
    }),
  });
  if (!res.ok) throw new Error(`Satellite catalogue returned HTTP ${res.status}`);
  const j = await res.json();
  return (j.features || [])
    .map((f: any) => {
      const assets: StacScene['assets'] = {};
      for (const b of BANDS) {
        const a = f.assets?.[b];
        if (!a) continue;
        const rb = a['raster:bands']?.[0] || {};
        assets[b] = { href: a.href, scale: rb.scale ?? (b === 'scl' ? 1 : 0.0001), offset: rb.offset ?? 0 };
      }
      return {
        id: f.id,
        datetime: f.properties?.datetime,
        cloud: f.properties?.['eo:cloud_cover'] ?? 100,
        epsg: f.properties?.['proj:epsg'] ?? Number(String(f.properties?.['proj:code'] || '').split(':')[1]),
        assets,
      } as StacScene;
    })
    .filter((s: StacScene) => BANDS.every((b) => s.assets[b]) && s.epsg)
    .sort((a: StacScene, b: StacScene) => a.cloud - b.cloud);
}

// ── WGS84 -> UTM (Snyder, transverse Mercator) ─────────────────────────────
function toUtm(lat: number, lng: number, zone: number, south: boolean): [number, number] {
  const a = 6378137;
  const f = 1 / 298.257223563;
  const k0 = 0.9996;
  const e2 = f * (2 - f);
  const ep2 = e2 / (1 - e2);
  const phi = (lat * Math.PI) / 180;
  const lam = (lng * Math.PI) / 180;
  const lam0 = (((zone - 1) * 6 - 180 + 3) * Math.PI) / 180;
  const N = a / Math.sqrt(1 - e2 * Math.sin(phi) ** 2);
  const T = Math.tan(phi) ** 2;
  const C = ep2 * Math.cos(phi) ** 2;
  const A = Math.cos(phi) * (lam - lam0);
  const M =
    a *
    ((1 - e2 / 4 - (3 * e2 ** 2) / 64 - (5 * e2 ** 3) / 256) * phi -
      ((3 * e2) / 8 + (3 * e2 ** 2) / 32 + (45 * e2 ** 3) / 1024) * Math.sin(2 * phi) +
      ((15 * e2 ** 2) / 256 + (45 * e2 ** 3) / 1024) * Math.sin(4 * phi) -
      ((35 * e2 ** 3) / 3072) * Math.sin(6 * phi));
  const x = k0 * N * (A + ((1 - T + C) * A ** 3) / 6 + ((5 - 18 * T + T ** 2 + 72 * C - 58 * ep2) * A ** 5) / 120) + 500000;
  let y =
    k0 *
    (M +
      N * Math.tan(phi) * (A ** 2 / 2 + ((5 - T + 9 * C + 4 * C ** 2) * A ** 4) / 24 + ((61 - 58 * T + T ** 2 + 600 * C - 330 * ep2) * A ** 6) / 720));
  if (south) y += 10000000;
  return [x, y];
}

/** Reads one band inside the area and resamples it (nearest neighbour) onto a size x size lng/lat grid. */
async function readBand(href: string, bbox: BBox, size: number, epsg: number): Promise<Float32Array> {
  const zone = epsg % 100;
  const south = Math.floor(epsg / 100) === 327;
  const tiff = await fromUrl(href, { allowFullFile: false });
  const image = await tiff.getImage();
  const [ox, oy] = image.getOrigin();
  const [rx, ry] = image.getResolution(); // ry < 0
  const W = image.getWidth();
  const H = image.getHeight();

  // grid of target pixel centres in UTM
  const E = new Float64Array(size * size);
  const Nn = new Float64Array(size * size);
  let minE = Infinity, maxE = -Infinity, minN = Infinity, maxN = -Infinity;
  for (let r = 0; r < size; r++) {
    const lat = bbox[3] - ((r + 0.5) / size) * (bbox[3] - bbox[1]);
    for (let c = 0; c < size; c++) {
      const lng = bbox[0] + ((c + 0.5) / size) * (bbox[2] - bbox[0]);
      const [e, n] = toUtm(lat, lng, zone, south);
      const i = r * size + c;
      E[i] = e;
      Nn[i] = n;
      if (e < minE) minE = e;
      if (e > maxE) maxE = e;
      if (n < minN) minN = n;
      if (n > maxN) maxN = n;
    }
  }
  const x0 = Math.max(0, Math.floor((minE - ox) / rx) - 1);
  const x1 = Math.min(W, Math.ceil((maxE - ox) / rx) + 1);
  const y0 = Math.max(0, Math.floor((maxN - oy) / ry) - 1);
  const y1 = Math.min(H, Math.ceil((minN - oy) / ry) + 1);
  const out = new Float32Array(size * size);
  if (x1 <= x0 || y1 <= y0) return out; // area outside this tile
  const win = (await image.readRasters({ window: [x0, y0, x1, y1], samples: [0], interleave: true })) as unknown as ArrayLike<number>;
  const w = x1 - x0;
  const h = y1 - y0;
  for (let i = 0; i < out.length; i++) {
    const px = Math.floor((E[i] - ox) / rx) - x0;
    const py = Math.floor((Nn[i] - oy) / ry) - y0;
    out[i] = px >= 0 && py >= 0 && px < w && py < h ? win[py * w + px] : 0;
  }
  return out;
}

export async function loadScene(scene: StacScene, bbox: BBox, size: number, onBand?: (b: string) => void): Promise<SceneData> {
  const raw: Record<string, Float32Array> = {};
  // SCL first: if the area is cloudy the caller can skip this scene early
  for (const b of ['scl', 'blue', 'green', 'red', 'nir', 'swir16'] as const) {
    onBand?.(b);
    raw[b] = await readBand(scene.assets[b].href, bbox, size, scene.epsg);
  }
  const n = size * size;
  const refl = (b: string) => {
    const { scale, offset } = scene.assets[b];
    const src = raw[b];
    const o = new Float32Array(n);
    for (let i = 0; i < n; i++) o[i] = src[i] === 0 ? 0 : Math.max(1e-4, src[i] * scale + offset);
    return o;
  };
  const scl = Uint8Array.from(raw.scl);
  let bad = 0;
  for (let i = 0; i < n; i++) if (BAD_SCL.has(scl[i])) bad++;
  return {
    scene,
    scl,
    invalidShare: bad / n,
    bands: { red: refl('red'), nir: refl('nir'), blue: refl('blue'), swir16: refl('swir16'), green: refl('green') },
  };
}

/** Quick cloud check on the SCL band only. */
export async function areaCloudShare(scene: StacScene, bbox: BBox, size: number): Promise<number> {
  const s = await readBand(scene.assets.scl.href, bbox, Math.min(size, 96), scene.epsg);
  let bad = 0;
  for (let i = 0; i < s.length; i++) if (BAD_SCL.has(s[i])) bad++;
  return bad / s.length;
}

export function invalidMask(a: Uint8Array, b: Uint8Array): Uint8Array {
  const m = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) if (BAD_SCL.has(a[i]) || BAD_SCL.has(b[i])) m[i] = 1;
  return m;
}

/** True-colour preview (contrast-stretched) as an RGBA buffer. */
export function rgbPreview(b: { red: Float32Array; green: Float32Array; blue: Float32Array }, size: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(size * size * 4);
  const g = (v: number) => Math.max(0, Math.min(255, Math.pow(Math.max(0, v) * 3.2, 0.85) * 255));
  for (let i = 0; i < size * size; i++) {
    out[i * 4] = g(b.red[i]);
    out[i * 4 + 1] = g(b.green[i]);
    out[i * 4 + 2] = g(b.blue[i]);
    out[i * 4 + 3] = 255;
  }
  return out;
}

export function areaSizeM(bbox: BBox): { w: number; h: number } {
  const lat = ((bbox[1] + bbox[3]) / 2) * (Math.PI / 180);
  return { w: (bbox[2] - bbox[0]) * 111320 * Math.cos(lat), h: (bbox[3] - bbox[1]) * 110574 };
}

export const __test = { toUtm };
