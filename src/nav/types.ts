export type LngLat = [number, number];

export interface Step {
  /** index into Route.geometry where this step's maneuver happens */
  maneuverIndex: number;
  /** display icon code (see maneuver.ts) */
  icon: number;
  name: string;
  distance: number;
  /** cumulative route distance (m) at the maneuver point */
  startDist: number;
}

export interface Route {
  geometry: LngLat[];
  /** cumulative distance (m) along geometry, same length as geometry */
  cumDist: number[];
  steps: Step[];
  distance: number;
  duration: number;
}
