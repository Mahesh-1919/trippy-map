import { ARRIVE_METERS, OFF_ROUTE_FIXES, OFF_ROUTE_METERS } from '../config';
import { haversine, projectOnSegment } from './geo';
import { Icon } from './maneuver';
import type { LngLat, Route } from './types';

export interface NavState {
  icon: number;
  distToTurn: number; // m
  street: string;
  remainingDist: number; // m
  remainingTime: number; // s
  offRoute: boolean;
  arrived: boolean;
  stepIndex: number;
  snapped: LngLat;
}

export class NavEngine {
  private seg = 0;
  private offCount = 0;
  constructor(public readonly route: Route) {}

  /** Feed a GPS fix; returns the current navigation state. */
  update(pos: LngLat): NavState {
    const { geometry, cumDist, steps } = this.route;
    // search a window around the last segment to keep snapping monotonic and cheap
    const lo = Math.max(0, this.seg - 5);
    const hi = Math.min(geometry.length - 1, this.seg + 200);
    let bestDist = Infinity;
    let bestSeg = this.seg;
    let bestPoint: LngLat = geometry[this.seg];
    for (let i = lo; i < hi; i++) {
      const pr = projectOnSegment(pos, geometry[i], geometry[i + 1]);
      if (pr.dist < bestDist) {
        bestDist = pr.dist;
        bestSeg = i;
        bestPoint = pr.point;
      }
    }
    if (bestDist > OFF_ROUTE_METERS) this.offCount++;
    else {
      this.offCount = 0;
      this.seg = bestSeg;
    }

    const total = cumDist[cumDist.length - 1];
    const along = cumDist[bestSeg] + haversine(geometry[bestSeg], bestPoint);
    const remainingDist = Math.max(0, total - along);

    // next step = first step (after the initial 'depart') whose maneuver lies ahead of us
    let idx = steps.findIndex((s, i) => i > 0 && s.startDist > along + 1);
    if (idx < 0) idx = steps.length - 1;
    const step = steps[idx];
    const arrived = remainingDist <= ARRIVE_METERS;
    const frac = total > 0 ? remainingDist / total : 0;

    return {
      icon: arrived ? Icon.ARRIVE : step.icon,
      distToTurn: arrived ? 0 : Math.max(0, step.startDist - along),
      street: step.name,
      remainingDist,
      remainingTime: this.route.duration * frac,
      offRoute: this.offCount >= OFF_ROUTE_FIXES,
      arrived,
      stepIndex: idx,
      snapped: bestPoint,
    };
  }
}
