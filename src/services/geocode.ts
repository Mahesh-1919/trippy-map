import { NOMINATIM_URL, USER_AGENT } from '../config';
import type { LngLat } from '../nav/types';

export interface Place {
  name: string;
  coord: LngLat;
}

/** Short human name for a coordinate (used for long-press destinations). */
export async function reverseGeocode(c: LngLat): Promise<string> {
  try {
    const res = await fetch(`${NOMINATIM_URL}/reverse?format=jsonv2&zoom=17&lat=${c[1]}&lon=${c[0]}`, {
      headers: { 'User-Agent': USER_AGENT },
    });
    const j = await res.json();
    const parts = String(j.display_name ?? '').split(',');
    return (j.name as string) || parts.slice(0, 2).join(',').trim() || 'Dropped pin';
  } catch {
    return 'Dropped pin';
  }
}

/** `near` biases (does not restrict) results towards a ~110 km box around that point. */
export async function searchPlaces(q: string, signal?: AbortSignal, near?: LngLat | null): Promise<Place[]> {
  const bias = near ? `&viewbox=${near[0] - 1},${near[1] + 1},${near[0] + 1},${near[1] - 1}` : '';
  const url = `${NOMINATIM_URL}/search?format=jsonv2&limit=6&q=${encodeURIComponent(q)}${bias}`;
  const res = await fetch(url, { signal, headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
  const arr = await res.json();
  return arr.map((p: any) => ({
    name: p.display_name as string,
    coord: [parseFloat(p.lon), parseFloat(p.lat)] as LngLat,
  }));
}
