import { create } from 'zustand';
import type { NavState } from '../nav/engine';
import type { LngLat, Route } from '../nav/types';

interface NavStore {
  position: LngLat | null;
  speedKmh: number;
  heading: number | null;
  destination: LngLat | null;
  route: Route | null;
  navigating: boolean;
  nav: NavState | null;
  error: string | null;
  setPosition: (p: LngLat, speedKmh: number, heading: number | null) => void;
  setDestination: (d: LngLat | null) => void;
  setRoute: (r: Route | null) => void;
  setNavigating: (n: boolean) => void;
  setNav: (n: NavState | null) => void;
  setError: (e: string | null) => void;
}

export const useNav = create<NavStore>((set) => ({
  position: null,
  speedKmh: 0,
  heading: null,
  destination: null,
  route: null,
  navigating: false,
  nav: null,
  error: null,
  setPosition: (position, speedKmh, heading) => set({ position, speedKmh, heading }),
  setDestination: (destination) => set({ destination }),
  setRoute: (route) => set({ route }),
  setNavigating: (navigating) => set({ navigating }),
  setNav: (nav) => set({ nav }),
  setError: (error) => set({ error }),
}));
