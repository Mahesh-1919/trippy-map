import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { LngLat } from '../nav/types';
import { LEAFLET_HTML } from './leafletHtml';
import { vectorHtml } from './mapHtml';

export interface MapViewRef {
  /** Move the camera; bearing/pitch only apply on the vector map. */
  setView(center: LngLat, zoom?: number, opts?: { bearing?: number; pitch?: number }): void;
  /** Frame all given points (leaves room for the top/bottom panels). */
  fit(points: LngLat[]): void;
}

export interface RouteViz {
  pts: LngLat[];
  sel: boolean;
  label: string;
}

interface Props {
  position: LngLat | null;
  heading: number | null;
  navigating: boolean;
  routes: RouteViz[];
  origin: LngLat | null;
  destination: LngLat | null;
  theme: 'light' | 'dark';
  onLongPress: (c: LngLat) => void;
  onUserDrag: () => void;
  onSelectRoute: (i: number) => void;
}

const toLatLng = (pts: LngLat[]) => pts.map((p) => [p[1], p[0]]);

export const MapView = forwardRef<MapViewRef, Props>(function MapView(p, ref) {
  const { position, heading, navigating, routes, origin, destination, theme } = p;
  const web = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const [noWebGl, setNoWebGl] = useState(false);
  // The initial theme is baked into the page; later changes go through the `theme` command.
  const initialTheme = useRef(theme).current;
  const html = useMemo(() => (noWebGl ? LEAFLET_HTML : vectorHtml(initialTheme)), [noWebGl, initialTheme]);

  const readyRef = useRef(false);
  // Camera moves requested before the page finished loading; only the latest one matters.
  const pendingCamera = useRef<object | null>(null);

  const send = useCallback((cmd: object) => {
    web.current?.injectJavaScript(`window.cmd&&window.cmd(${JSON.stringify(cmd)});true;`);
  }, []);

  const camera = useCallback(
    (cmd: object) => {
      if (readyRef.current) send(cmd);
      else pendingCamera.current = cmd;
    },
    [send],
  );

  useImperativeHandle(
    ref,
    () => ({
      setView: (c, zoom, opts) => camera({ k: 'view', lat: c[1], lng: c[0], zoom, ...opts }),
      fit: (pts) => camera({ k: 'fit', pts: toLatLng(pts) }),
    }),
    [camera],
  );

  useEffect(() => {
    if (ready && position) send({ k: 'pos', lat: position[1], lng: position[0], heading });
  }, [ready, position, heading, send]);

  useEffect(() => {
    if (ready) send({ k: 'mode', nav: navigating });
  }, [ready, navigating, send]);

  useEffect(() => {
    if (!ready) return;
    send({ k: 'routes', routes: routes.map((r) => ({ pts: toLatLng(r.pts), sel: r.sel, label: r.label })) });
  }, [ready, routes, send]);

  useEffect(() => {
    if (ready) send(destination ? { k: 'dest', lat: destination[1], lng: destination[0] } : { k: 'dest' });
  }, [ready, destination, send]);

  useEffect(() => {
    if (ready) send(origin ? { k: 'origin', lat: origin[1], lng: origin[0] } : { k: 'origin' });
  }, [ready, origin, send]);

  useEffect(() => {
    if (ready) send({ k: 'theme', v: theme });
  }, [ready, theme, send]);

  const onMessage = (e: WebViewMessageEvent) => {
    const m = JSON.parse(e.nativeEvent.data);
    if (m.t === 'ready') {
      readyRef.current = true;
      setReady(true);
      if (pendingCamera.current) {
        send(pendingCamera.current);
        pendingCamera.current = null;
      }
    } else if (m.t === 'longpress') p.onLongPress([m.lng, m.lat]);
    else if (m.t === 'drag') p.onUserDrag();
    else if (m.t === 'selectroute') p.onSelectRoute(m.idx);
    else if (m.t === 'err') console.warn('[map]', m.m);
    else if (m.t === 'nowebgl') {
      readyRef.current = false;
      setReady(false);
      setNoWebGl(true);
    }
  };

  return (
    <WebView
      key={noWebGl ? 'raster' : 'vector'}
      ref={web}
      style={styles.web}
      originWhitelist={['*']}
      source={{ html, baseUrl: 'https://localhost/' }}
      onMessage={onMessage}
      javaScriptEnabled
      domStorageEnabled
      setSupportMultipleWindows={false}
      overScrollMode="never"
    />
  );
});

const styles = StyleSheet.create({ web: { flex: 1 } });
