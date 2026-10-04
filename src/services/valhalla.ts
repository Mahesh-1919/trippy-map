import { USER_AGENT, VALHALLA_COSTING, VALHALLA_URL } from '../config';
import { cumulativeDistances } from '../nav/geo';
import { valhallaIcon } from '../nav/maneuver';
import type { LngLat, Route, Step } from '../nav/types';

/** Decode a Valhalla polyline6 string into [lng, lat] pairs. */
export function decodePolyline6(str: string): LngLat[] {
  const out: LngLat[] = [];
  let i = 0, lat = 0, lng = 0;
  while (i < str.length) {
    for (const axis of [0, 1]) {
      let shift = 0, result = 0, b: number;
      do {
        b = str.charCodeAt(i++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === 0) lat += delta;
      else lng += delta;
    }
    out.push([lng / 1e6, lat / 1e6]);
  }
  return out;
}

export async function fetchRoute(from: LngLat, to: LngLat, signal?: AbortSignal): Promise<Route> {
  const res = await fetch(`${VALHALLA_URL}/route`, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', 'User-Agent': USER_AGENT },
    body: JSON.stringify({
      locations: [
        { lat: from[1], lon: from[0] },
        { lat: to[1], lon: to[0] },
      ],
      costing: VALHALLA_COSTING,
      directions_options: { units: 'kilometers' },
    }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.trip) {
    throw new Error(json?.error ?? `Valhalla HTTP ${res.status}`);
  }
  return parseValhallaTrip(json.trip);
}

export function parseValhallaTrip(trip: any): Route {
  const geometry: LngLat[] = [];
  const rawSteps: { idx: number; icon: number; name: string; km: number }[] = [];
  for (const leg of trip.legs) {
    const offset = geometry.length ? geometry.length - 1 : 0; // legs share their joint point
    const pts = decodePolyline6(leg.shape);
    geometry.push(...(geometry.length ? pts.slice(1) : pts));
    for (const m of leg.maneuvers) {
      rawSteps.push({
        idx: m.begin_shape_index + offset,
        icon: valhallaIcon(m.type),
        name: (m.street_names?.[0] as string | undefined) ?? '',
        km: m.length,
      });
    }
  }
  const cumDist = cumulativeDistances(geometry);
  const steps: Step[] = rawSteps.map((s) => ({
    maneuverIndex: s.idx,
    icon: s.icon,
    name: s.name,
    distance: s.km * 1000,
    startDist: cumDist[Math.min(s.idx, cumDist.length - 1)],
  }));
  return {
    geometry,
    cumDist,
    steps,
    distance: trip.summary.length * 1000,
    duration: trip.summary.time,
  };
}
