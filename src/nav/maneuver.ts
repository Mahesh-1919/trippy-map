/** Icon codes shared with the display firmware (see docs/ble-protocol.md). */
export const Icon = {
  NONE: 0,
  STRAIGHT: 1,
  SLIGHT_LEFT: 2,
  LEFT: 3,
  SHARP_LEFT: 4,
  SLIGHT_RIGHT: 5,
  RIGHT: 6,
  SHARP_RIGHT: 7,
  UTURN: 8,
  ROUNDABOUT: 9,
  ARRIVE: 10,
  DEPART: 11,
} as const;

/** Map a Valhalla maneuver `type` integer to a display icon. */
export function valhallaIcon(type: number): number {
  switch (type) {
    case 1: case 2: case 3: return Icon.DEPART;
    case 4: case 5: case 6: return Icon.ARRIVE;
    case 9: case 18: case 20: case 23: return Icon.SLIGHT_RIGHT;
    case 10: return Icon.RIGHT;
    case 11: return Icon.SHARP_RIGHT;
    case 12: case 13: return Icon.UTURN;
    case 14: return Icon.SHARP_LEFT;
    case 15: return Icon.LEFT;
    case 16: case 19: case 21: case 24: return Icon.SLIGHT_LEFT;
    case 26: case 27: return Icon.ROUNDABOUT;
    default: return Icon.STRAIGHT; // continue, becomes, merge, ramp straight, ...
  }
}
