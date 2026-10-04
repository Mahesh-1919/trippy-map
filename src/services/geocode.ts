import { NOMINATIM_URL, USER_AGENT } from '../config';
import type { LngLat } from '../nav/types';

export interface Place {
  name: string;
  coord: LngLat;
}

export async function searchPlaces(q: string, signal?: AbortSignal): Promise<Place[]> {
  const url = `${NOMINATIM_URL}/search?format=jsonv2&limit=6&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { signal, headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
  const arr = await res.json();
  return arr.map((p: any) => ({
    name: p.display_name as string,
    coord: [parseFloat(p.lon), parseFloat(p.lat)] as LngLat,
  }));
}
