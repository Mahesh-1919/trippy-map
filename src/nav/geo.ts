import type { LngLat } from './types';

const R = 6371008.8;
const rad = (d: number) => (d * Math.PI) / 180;

export function haversine(a: LngLat, b: LngLat): number {
  const dLat = rad(b[1] - a[1]);
  const dLng = rad(b[0] - a[0]);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Project p onto segment a-b (local equirectangular approx). Returns t in [0,1], the point and distance in meters. */
export function projectOnSegment(p: LngLat, a: LngLat, b: LngLat) {
  const k = Math.cos(rad(a[1]));
  const ax = a[0] * k, ay = a[1], bx = b[0] * k, by = b[1], px = p[0] * k, py = p[1];
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const q: LngLat = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  return { t, point: q, dist: haversine(p, q) };
}

export function cumulativeDistances(line: LngLat[]): number[] {
  const out = [0];
  for (let i = 1; i < line.length; i++) out.push(out[i - 1] + haversine(line[i - 1], line[i]));
  return out;
}
