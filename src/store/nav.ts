import { create } from 'zustand';
import type { NavState } from '../nav/engine';
import type { LngLat, Route } from '../nav/types';
import type { Place } from '../services/geocode';

interface NavStore {
  position: LngLat | null;
  speedKmh: number;
  heading: number | null;
  /** null = start from the current location */
  origin: Place | null;
  destination: LngLat | null;
  destinationName: string;
  routes: Route[];
  routeIndex: number;
  /** the selected route (routes[routeIndex]) */
  route: Route | null;
  navigating: boolean;
  nav: NavState | null;
  error: string | null;
  setPosition: (p: LngLat, speedKmh: number, heading: number | null) => void;
  setOrigin: (o: Place | null) => void;
  setDestination: (d: LngLat | null, name?: string) => void;
  setRoutes: (r: Route[], index?: number) => void;
  selectRoute: (i: number) => void;
  setNavigating: (n: boolean) => void;
  setNav: (n: NavState | null) => void;
  setError: (e: string | null) => void;
  clearPlan: () => void;
}

export const useNav = create<NavStore>((set) => ({
  position: null,
  speedKmh: 0,
  heading: null,
  origin: null,
  destination: null,
  destinationName: '',
  routes: [],
  routeIndex: 0,
  route: null,
  navigating: false,
  nav: null,
  error: null,
  setPosition: (position, speedKmh, heading) =>
    set((s) => ({ position, speedKmh, heading: heading ?? s.heading })),
  setOrigin: (origin) => set({ origin }),
  setDestination: (destination, name) =>
    set((s) => ({ destination, destinationName: name ?? (destination ? s.destinationName : '') })),
  setRoutes: (routes, index = 0) => {
    const i = Math.max(0, Math.min(index, routes.length - 1));
    set({ routes, routeIndex: i, route: routes[i] ?? null });
  },
  selectRoute: (i) => set((s) => (s.routes[i] ? { routeIndex: i, route: s.routes[i] } : s)),
  setNavigating: (navigating) => set({ navigating }),
  setNav: (nav) => set({ nav }),
  setError: (error) => set({ error }),
  clearPlan: () =>
    set({ origin: null, destination: null, destinationName: '', routes: [], routeIndex: 0, route: null, nav: null, error: null }),
}));
