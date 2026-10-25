/**
 * Connected-Component Vectorization of raster change mask to GeoJSON Polygons.
 * Uses 4-connectivity flood fill and convex/concave boundary tracing.
 */

import { SCENE, THRESHOLDS } from '../config';
import { Geotransform } from './scene';

export interface VectorBlob {
  id: number;
  pixelCount: number;
  areaM2: number;
  centroid: [number, number]; // [lng, lat]
  coordinates: [number, number][]; // GeoJSON polygon ring [[lng, lat], ...]
  meanNdviDiff: number;
  meanSarDiff: number;
  maxSarDiff?: number;
  meanConfidence: number;
}

export function vectorizeChangeMask(
  changeMask: Uint8Array,
  dNDVI: Float32Array,
  dSAR: Float32Array,
  confidenceMap: Float32Array,
  geotransform: Geotransform,
  size = SCENE.SIZE
): VectorBlob[] {
  const visited = new Uint8Array(size * size);
  const blobs: VectorBlob[] = [];
  let blobId = 1;

  const metersPerPixelArea = SCENE.METERS_PER_PIXEL * SCENE.METERS_PER_PIXEL; // 100 m² per pixel

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const startIdx = y * size + x;
      if (changeMask[startIdx] === 1 && visited[startIdx] === 0) {
        // Flood fill component
        const queue: [number, number][] = [[x, y]];
        visited[startIdx] = 1;

        const pixels: [number, number][] = [];
        let sumNdvi = 0;
        let sumSar = 0;
        let sumConf = 0;
        let maxSar = -999;

        let minX = x, maxX = x, minY = y, maxY = y;

        while (queue.length > 0) {
          const [cx, cy] = queue.pop()!;
          pixels.push([cx, cy]);
          const idx = cy * size + cx;

          sumNdvi += dNDVI[idx];
          sumSar += dSAR[idx];
          sumConf += confidenceMap[idx];
          if (dSAR[idx] > maxSar) maxSar = dSAR[idx];

          if (cx < minX) minX = cx;
          if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy;
          if (cy > maxY) maxY = cy;

          // 4 neighbors
          const neighbors = [
            [cx + 1, cy],
            [cx - 1, cy],
            [cx, cy + 1],
            [cx, cy - 1],
          ];

          for (const [nx, ny] of neighbors) {
            if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
              const nIdx = ny * size + nx;
              if (changeMask[nIdx] === 1 && visited[nIdx] === 0) {
                visited[nIdx] = 1;
                queue.push([nx, ny]);
              }
            }
          }
        }

        const pixelCount = pixels.length;
        const areaM2 = pixelCount * metersPerPixelArea;

        // Filter out tiny noise blobs
        if (areaM2 >= THRESHOLDS.MIN_AREA_M2) {
          // Compute bounding polygon ring from outline/boundary points
          // To ensure clean valid GeoJSON polygon ring, we sample the convex-hull / perimeter boundary
          const boundaryPixels: [number, number][] = [];
          for (const [px, py] of pixels) {
            // Check if boundary pixel (has any 4-neighbor that is 0 or edge)
            const isEdge =
              px === 0 || px === size - 1 || py === 0 || py === size - 1 ||
              changeMask[py * size + (px + 1)] === 0 ||
              changeMask[py * size + (px - 1)] === 0 ||
              changeMask[(py + 1) * size + px] === 0 ||
              changeMask[(py - 1) * size + px] === 0;

            if (isEdge) {
              boundaryPixels.push([px, py]);
            }
          }

          // Sort boundary pixels by angle from centroid to form a valid counter-clockwise polygon ring
          const centerX = (minX + maxX) / 2;
          const centerY = (minY + maxY) / 2;

          boundaryPixels.sort((a, b) => {
            const angleA = Math.atan2(a[1] - centerY, a[0] - centerX);
            const angleB = Math.atan2(b[1] - centerY, b[0] - centerX);
            return angleA - angleB;
          });

          // Decimate points so polygon is clean (e.g. max 16 vertices)
          const ringCoords: [number, number][] = [];
          const step = Math.max(1, Math.floor(boundaryPixels.length / 16));
          for (let p = 0; p < boundaryPixels.length; p += step) {
            ringCoords.push(geotransform.pixelToLatLng(boundaryPixels[p][0], boundaryPixels[p][1]));
          }
          // Close the ring
          if (ringCoords.length > 2) {
            ringCoords.push([ringCoords[0][0], ringCoords[0][1]]);
          }

          const centroid = geotransform.pixelToLatLng(centerX, centerY);

          blobs.push({
            id: blobId++,
            pixelCount,
            areaM2,
            centroid,
            coordinates: ringCoords,
            meanNdviDiff: sumNdvi / pixelCount,
            meanSarDiff: sumSar / pixelCount,
            maxSarDiff: maxSar,
            meanConfidence: sumConf / pixelCount,
          });
        }
      }
    }
  }

  return blobs;
}
