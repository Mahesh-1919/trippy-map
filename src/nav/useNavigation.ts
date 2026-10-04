import * as Location from 'expo-location';
import { useCallback, useEffect, useRef } from 'react';
import { isExpoGo } from '../config/env';
import { setLocationHandler, startLocationUpdates, stopLocationUpdates } from './locationTask';
import { ble } from '../services/ble';
import { fetchRoute } from '../services/valhalla';
import { encodeNavState, encodeStreet } from '../protocol/encode';
import { useNav } from '../store/nav';
import { NavEngine } from './engine';
import type { LngLat } from './types';

/** Owns GPS watching, routing, the nav engine and the 1 Hz BLE sender. Mount once. */
export function useNavigation() {
  const engine = useRef<NavEngine | null>(null);
  const seq = useRef(0);
  const rerouting = useRef(false);

  const calcRoute = useCallback(async (from: LngLat, to: LngLat) => {
    const s = useNav.getState();
    try {
      s.setError(null);
      const route = await fetchRoute(from, to);
      s.setRoute(route);
      engine.current = new NavEngine(route);
      return route;
    } catch (e: any) {
      s.setError(e?.message ?? 'Routing failed');
      return null;
    }
  }, []);

  const start = useCallback(() => {
    const s = useNav.getState();
    if (s.route) {
      engine.current = new NavEngine(s.route);
      s.setNavigating(true);
    }
  }, []);

  const stop = useCallback(() => {
    const s = useNav.getState();
    s.setNavigating(false);
    s.setNav(null);
    // tell the display navigation ended
    ble.sendNavState(
      encodeNavState({
        navigating: false, offRoute: false, arrived: false, icon: 0,
        distToTurn: 0, speedKmh: 0, remainingDist: 0, etaMin: 0, seq: seq.current++,
      }),
    );
  }, []);

  // GPS watcher (runs always so the map shows live location; foreground service keeps it alive in background)
  useEffect(() => {
    let cancelled = false;
    let watcher: Location.LocationSubscription | undefined;
    (async () => {
      const fg = await Location.requestForegroundPermissionsAsync();
      if (fg.status !== 'granted') {
        useNav.getState().setError('Location permission denied');
        return;
      }
      if (cancelled) return;
      const onLocation = (loc: Location.LocationObject) => {
        const st = useNav.getState();
        const pos: LngLat = [loc.coords.longitude, loc.coords.latitude];
        const kmh = Math.max(0, (loc.coords.speed ?? 0) * 3.6);
        st.setPosition(pos, kmh, loc.coords.heading ?? null);

        if (st.navigating && engine.current) {
          const n = engine.current.update(pos);
          st.setNav(n);
          if (n.offRoute && !rerouting.current && st.destination) {
            rerouting.current = true;
            calcRoute(pos, st.destination).finally(() => (rerouting.current = false));
          }
        }
      };
      // Foreground watcher feeds the UI; the task (foreground service) keeps updates flowing with the screen off.
      setLocationHandler(onLocation);
      watcher = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 1 },
        onLocation,
      );
      if (cancelled) watcher.remove();
      // Background permission may show a settings screen and never resolve in-app, so don't block on it.
      if (isExpoGo) return; // background tasks aren't available in Expo Go
      Location.requestBackgroundPermissionsAsync()
        .then((bg) => (bg.status === 'granted' ? startLocationUpdates() : undefined))
        .catch((e) => useNav.getState().setError(String(e?.message ?? e)));
    })();
    return () => {
      cancelled = true;
      watcher?.remove();
      setLocationHandler(null);
      stopLocationUpdates().catch(() => {});
    };
  }, [calcRoute]);

  // 1 Hz BLE sender
  useEffect(() => {
    const t = setInterval(() => {
      const { navigating, nav, speedKmh } = useNav.getState();
      if (!navigating || !nav) return;
      ble.sendNavState(
        encodeNavState({
          navigating: true,
          offRoute: nav.offRoute,
          arrived: nav.arrived,
          icon: nav.icon,
          distToTurn: nav.distToTurn,
          speedKmh,
          remainingDist: nav.remainingDist,
          etaMin: nav.remainingTime / 60,
          seq: seq.current++,
        }),
      );
      ble.sendStreet(encodeStreet(nav.street), nav.street);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  return { calcRoute, start, stop };
}
