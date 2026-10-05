import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Keyboard, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Device } from 'react-native-ble-plx';
import { DirectionsCard, type Field } from './src/components/DirectionsCard';
import { FabButton } from './src/components/FabButton';
import { MapView, type MapViewRef, type RouteViz } from './src/components/MapView';
import { NavBanner } from './src/components/NavBanner';
import { RouteSheet } from './src/components/RouteSheet';
import { SearchBar } from './src/components/SearchBar';
import { shadow, useTheme } from './src/components/theme';
import { fmtTime } from './src/nav/format';
import type { LngLat, Route } from './src/nav/types';
import { useNavigation } from './src/nav/useNavigation';
import { ble, type BleStatus } from './src/services/ble';
import { reverseGeocode, searchPlaces, type Place } from './src/services/geocode';
import { useNav } from './src/store/nav';

export default function App() {
  return (
    <SafeAreaProvider>
      <Main />
    </SafeAreaProvider>
  );
}

/** Two corner points covering every route (enough for the map to frame them). */
function boundsOf(routes: Route[], extra: (LngLat | null)[]): LngLat[] {
  let minX = 180, minY = 90, maxX = -180, maxY = -90;
  const add = (p: LngLat) => {
    minX = Math.min(minX, p[0]);
    maxX = Math.max(maxX, p[0]);
    minY = Math.min(minY, p[1]);
    maxY = Math.max(maxY, p[1]);
  };
  routes.forEach((r) => r.geometry.forEach(add));
  extra.forEach((p) => p && add(p));
  return [[minX, minY], [maxX, maxY]];
}

function Main() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { calcRoutes, start, stop } = useNavigation();
  const {
    position, heading, origin, destination, destinationName, routes, routeIndex, route,
    navigating, nav, error, speedKmh,
  } = useNav();
  const map = useRef<MapViewRef>(null);
  const firstFix = useRef(true);
  const [follow, setFollow] = useState(true);
  const [field, setField] = useState<Field | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [bleOpen, setBleOpen] = useState(false);
  const [bleStatus, setBleStatus] = useState<BleStatus>('idle');
  const [devices, setDevices] = useState<Device[]>([]);
  const [bleError, setBleError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sheetH, setSheetH] = useState(0);

  useEffect(
    () =>
      ble.subscribe((s) => {
        setBleStatus(s);
      }),
    [],
  );

  // closing the keyboard (e.g. Android back) ends search editing
  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidHide', () => {
      setField(null);
      setQuery('');
      setResults([]);
    });
    return () => sub.remove();
  }, []);

  // debounced place search
  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const near = useNav.getState().position;
    const timer = setTimeout(() => searchPlaces(query, ctrl.signal, near).then(setResults).catch(() => {}), 500);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query]);

  // follow the rider; tilt + rotate to heading while navigating
  useEffect(() => {
    if (!follow || !position) return;
    let zoom: number | undefined;
    if (navigating) zoom = 17;
    else if (firstFix.current) zoom = 16;
    firstFix.current = false;
    map.current?.setView(
      position,
      zoom,
      navigating ? { bearing: heading ?? 0, pitch: 50 } : { bearing: 0, pitch: 0 },
    );
  }, [position, heading, follow, navigating]);

  /** Fetch routes (with alternatives) from `o` (null = current location) to `d` and frame them. */
  const plan = async (o: Place | null, d: LngLat) => {
    const from = o ? o.coord : useNav.getState().position;
    if (!from) {
      useNav.getState().setError('Waiting for GPS fix...');
      return;
    }
    setBusy(true);
    const rs = await calcRoutes(from, d);
    setBusy(false);
    if (rs.length) {
      setFollow(false);
      map.current?.fit(boundsOf(rs, [from, d]));
    }
  };

  const dismissSearch = () => {
    setField(null);
    setQuery('');
    setResults([]);
    Keyboard.dismiss();
  };

  const pickPlace = (full: Place) => {
    const s = useNav.getState();
    // fields show a short label ("Charminar, Laad Bazaar"); the result list keeps the full address
    const p: Place = { ...full, name: full.name.split(',').slice(0, 2).join(',').trim() };
    dismissSearch();
    if (field === 'origin') {
      s.setOrigin(p);
      if (s.destination) plan(p, s.destination);
    } else {
      s.setDestination(p.coord, p.name);
      plan(s.origin, p.coord);
    }
  };

  const onLongPress = async (c: LngLat) => {
    const s = useNav.getState();
    if (s.navigating) return;
    s.setDestination(c, 'Dropped pin');
    plan(s.origin, c);
    const name = await reverseGeocode(c);
    const cur = useNav.getState();
    if (cur.destination === c) cur.setDestination(c, name);
  };

  const useMyLocation = () => {
    const s = useNav.getState();
    dismissSearch();
    s.setOrigin(null);
    if (s.destination) plan(null, s.destination);
  };

  const swap = () => {
    const s = useNav.getState();
    if (!s.destination) return;
    const o: Place | null = s.origin ?? (s.position ? { name: 'Your location', coord: s.position } : null);
    if (!o) return;
    const d: Place = { name: s.destinationName, coord: s.destination };
    s.setOrigin(d);
    s.setDestination(o.coord, o.name);
    plan(d, o.coord);
  };

  const clearPlan = () => {
    useNav.getState().clearPlan();
    dismissSearch();
    setSheetH(0);
    setFollow(true);
  };

  const onStart = async () => {
    const s = useNav.getState();
    // Navigation always begins from where you actually are.
    if (s.origin && s.destination && s.position) {
      const idx = s.routeIndex;
      s.setOrigin(null);
      setBusy(true);
      const rs = await calcRoutes(s.position, s.destination);
      setBusy(false);
      if (!rs.length) return;
      useNav.getState().selectRoute(idx);
    }
    setFollow(true);
    start();
  };

  const openBle = async () => {
    setBleOpen(true);
    setDevices([]);
    setBleError(null);
    if (!ble.supported) {
      setBleError('BLE display needs the development build (APK). It is not available in Expo Go.');
      return;
    }
    try {
      await ble.scan((d) => setDevices((prev) => [...prev, d]));
    } catch (e: any) {
      setBleError(e.message);
    }
  };

  const routeViz: RouteViz[] = useMemo(() => {
    const all = routes.map((r, i) => ({ pts: r.geometry, sel: i === routeIndex, label: fmtTime(r.duration) }));
    return navigating ? all.filter((r) => r.sel) : all;
  }, [routes, routeIndex, navigating]);

  const fabBottom = (route ? sheetH : insets.bottom + 8) + 16;
  const bleDot = bleStatus === 'connected' ? '#1e8e3e' : bleStatus === 'idle' ? undefined : '#f9ab00';

  let topCard;
  if (navigating && nav) {
    topCard = <NavBanner nav={nav} speedKmh={speedKmh} />;
  } else if (destination) {
    topCard = (
      <DirectionsCard
        originName={origin?.name ?? 'Your location'}
        originIsCurrent={!origin}
        destName={destinationName}
        field={field}
        query={query}
        results={results}
        onFocusField={(f) => {
          setField(f);
          setQuery('');
        }}
        onQuery={setQuery}
        onPick={pickPlace}
        onUseMyLocation={useMyLocation}
        onSwap={swap}
        onBack={clearPlan}
      />
    );
  } else {
    topCard = <SearchBar query={query} onChange={setQuery} results={results} onPick={pickPlace} />;
  }

  return (
    <View style={styles.flex}>
      <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
      <MapView
        ref={map}
        position={position}
        heading={heading}
        navigating={navigating}
        routes={routeViz}
        origin={origin?.coord ?? null}
        destination={destination}
        theme={t.scheme}
        onLongPress={onLongPress}
        onUserDrag={() => setFollow(false)}
        onSelectRoute={(i) => useNav.getState().selectRoute(i)}
      />

      <View style={[styles.top, { top: insets.top + 10 }]} pointerEvents="box-none">
        {topCard}
        {error && (
          <View style={[styles.errorChip, shadow, { backgroundColor: t.card }]}>
            <Text style={{ color: t.danger }}>{error}</Text>
          </View>
        )}
      </View>

      <View style={[styles.fabs, { bottom: fabBottom }]} pointerEvents="box-none">
        <FabButton icon={bleStatus === 'connected' ? 'bluetooth-connected' : 'bluetooth'} dot={bleDot} onPress={openBle} />
        <FabButton icon="my-location" onPress={() => setFollow(true)} />
      </View>

      {route && (
        <RouteSheet
          routes={routes}
          routeIndex={routeIndex}
          nav={nav}
          navigating={navigating}
          speedKmh={speedKmh}
          busy={busy}
          startLabel={origin ? 'Start from your location' : 'Start'}
          onSelectRoute={(i) => useNav.getState().selectRoute(i)}
          onStart={onStart}
          onStop={stop}
          onHeight={setSheetH}
        />
      )}

      <Modal
        visible={bleOpen}
        animationType="slide"
        onRequestClose={() => {
          ble.stopScan();
          setBleOpen(false);
        }}
      >
        <View style={[styles.modal, { backgroundColor: t.card, paddingTop: insets.top + 16 }]}>
          <Text style={[styles.title, { color: t.text }]}>BLE display</Text>
          <Text style={{ color: t.sub }}>Status: {bleStatus}</Text>
          {bleError && <Text style={{ color: t.danger }}>{bleError}</Text>}
          <FlatList
            data={devices}
            keyExtractor={(d) => d.id}
            ListEmptyComponent={
              <Text style={[styles.muted, { color: t.sub }]}>Scanning for devices advertising service FF00...</Text>
            }
            renderItem={({ item }) => (
              <Pressable
                style={[styles.device, { borderColor: t.border }]}
                onPress={() =>
                  ble
                    .connect(item.id)
                    .then(() => setBleOpen(false))
                    .catch((e) => setBleError(e.message))
                }
              >
                <Text style={{ color: t.text }}>
                  {item.name ?? item.localName ?? 'Unnamed'} ({item.id})
                </Text>
              </Pressable>
            )}
          />
          <View style={styles.row}>
            <Pressable style={[styles.btn, { backgroundColor: t.chip }]} onPress={() => ble.disconnect()}>
              <Text style={{ color: t.primary, fontWeight: '600' }}>Disconnect</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, { backgroundColor: t.primary }]}
              onPress={() => {
                ble.stopScan();
                setBleOpen(false);
              }}
            >
              <Text style={{ color: t.onPrimary, fontWeight: '600' }}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { position: 'absolute', left: 12, right: 12 },
  errorChip: { alignSelf: 'center', marginTop: 10, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18 },
  fabs: { position: 'absolute', right: 16, gap: 12 },
  modal: { flex: 1, padding: 16, gap: 10 },
  title: { fontSize: 22, fontWeight: '700' },
  muted: { marginTop: 12 },
  device: { padding: 14, borderTopWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, padding: 14, borderRadius: 24, alignItems: 'center' },
});
