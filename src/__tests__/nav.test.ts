import { NavEngine } from '../nav/engine';
import { Icon, valhallaIcon } from '../nav/maneuver';
import { decodePolyline6, parseValhallaTrip } from '../services/valhalla';
import { encodeNavState, encodeStreet } from '../protocol/encode';
import type { LngLat } from '../nav/types';

function encodePolyline6(pts: LngLat[]): string {
  let out = '';
  let pLat = 0, pLng = 0;
  const enc = (v: number) => {
    let n = v < 0 ? ~(v << 1) : v << 1;
    let s = '';
    while (n >= 0x20) {
      s += String.fromCharCode((0x20 | (n & 0x1f)) + 63);
      n >>= 5;
    }
    return s + String.fromCharCode(n + 63);
  };
  for (const [lng, lat] of pts) {
    const la = Math.round(lat * 1e6), lo = Math.round(lng * 1e6);
    out += enc(la - pLat) + enc(lo - pLng);
    pLat = la;
    pLng = lo;
  }
  return out;
}

// ~1.1 km east, then ~1.1 km north (turn left at the corner)
const pts: LngLat[] = [[0, 0], [0.005, 0], [0.01, 0], [0.01, 0.005], [0.01, 0.01]];
const trip = {
  summary: { length: 2.224, time: 400 },
  legs: [
    {
      shape: encodePolyline6(pts),
      maneuvers: [
        { type: 1, begin_shape_index: 0, length: 1.112, street_names: ['Main St'] },
        { type: 15, begin_shape_index: 2, length: 1.112, street_names: ['North Ave'] },
        { type: 4, begin_shape_index: 4, length: 0 },
      ],
    },
  ],
};

describe('polyline6', () => {
  it('round-trips', () => {
    const d = decodePolyline6(encodePolyline6(pts));
    expect(d).toHaveLength(pts.length);
    d.forEach((p, i) => {
      expect(p[0]).toBeCloseTo(pts[i][0], 6);
      expect(p[1]).toBeCloseTo(pts[i][1], 6);
    });
  });
});

describe('valhallaIcon', () => {
  it('maps maneuver types', () => {
    expect(valhallaIcon(15)).toBe(Icon.LEFT);
    expect(valhallaIcon(11)).toBe(Icon.SHARP_RIGHT);
    expect(valhallaIcon(26)).toBe(Icon.ROUNDABOUT);
    expect(valhallaIcon(4)).toBe(Icon.ARRIVE);
    expect(valhallaIcon(8)).toBe(Icon.STRAIGHT);
  });
});

describe('NavEngine', () => {
  const route = parseValhallaTrip(trip);

  it('parses steps onto geometry', () => {
    expect(route.steps.map((s) => s.maneuverIndex)).toEqual([0, 2, 4]);
    expect(route.distance).toBeCloseTo(2224, 0);
  });

  it('reports the upcoming turn and distance', () => {
    const s = new NavEngine(route).update([0.005, 0]);
    expect(s.icon).toBe(Icon.LEFT);
    expect(s.street).toBe('North Ave');
    expect(s.distToTurn).toBeGreaterThan(540);
    expect(s.distToTurn).toBeLessThan(570);
    expect(s.offRoute).toBe(false);
  });

  it('advances to arrive after the turn', () => {
    const e = new NavEngine(route);
    e.update([0.005, 0]);
    const s = e.update([0.01, 0.006]);
    expect(s.icon).toBe(Icon.ARRIVE);
    expect(s.arrived).toBe(false);
    expect(e.update([0.01, 0.0099]).arrived).toBe(true);
  });

  it('flags off-route after repeated far fixes', () => {
    const e = new NavEngine(route);
    let s = e.update([0.005, 0.01]);
    s = e.update([0.005, 0.01]);
    expect(s.offRoute).toBe(false);
    s = e.update([0.005, 0.01]);
    expect(s.offRoute).toBe(true);
  });
});

describe('protocol', () => {
  it('encodes NAV_STATE little-endian with checksum', () => {
    const b = encodeNavState({
      navigating: true, offRoute: false, arrived: false, icon: Icon.RIGHT,
      distToTurn: 300, speedKmh: 25.5, remainingDist: 12340, etaMin: 17, seq: 258,
    });
    expect(b.length).toBe(13);
    expect(Array.from(b.slice(0, 3))).toEqual([1, 1, Icon.RIGHT]);
    expect(b[3] | (b[4] << 8)).toBe(300);
    expect(b[5] | (b[6] << 8)).toBe(255);
    expect(b[7] | (b[8] << 8)).toBe(1234);
    expect(b[9] | (b[10] << 8)).toBe(17);
    expect(b[11]).toBe(2);
    expect(b.slice(0, 12).reduce((x, y) => x ^ y, 0)).toBe(b[12]);
  });

  it('truncates street names on code point boundaries', () => {
    expect(encodeStreet('abcdefghijklmnopqrstuvwxyz').length).toBe(20);
    const b = encodeStreet('ééééééééééééé'); // 2 bytes each
    expect(b.length).toBe(20);
    expect(new TextDecoder().decode(b)).toBe('é'.repeat(10));
  });
});
