import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import type { Device } from 'react-native-ble-plx';
import { LeafletMap, type LeafletMapRef } from './src/components/LeafletMap';
import { useNavigation } from './src/nav/useNavigation';
import { ble, type BleStatus } from './src/services/ble';
import { searchPlaces, type Place } from './src/services/geocode';
import { useNav } from './src/store/nav';

const fmtDist = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`);
const fmtTime = (s: number) => {
  const m = Math.round(s / 60);
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
};

export default function App() {
  const { calcRoute, start, stop } = useNavigation();
  const { position, destination, route, navigating, nav, error, speedKmh } = useNav();
  const map = useRef<LeafletMapRef>(null);
  const firstFix = useRef(true);
  const [follow, setFollow] = useState(true);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [bleOpen, setBleOpen] = useState(false);
  const [bleStatus, setBleStatus] = useState<BleStatus>('idle');
  const [devices, setDevices] = useState<Device[]>([]);
  const [bleError, setBleError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => ble.subscribe((s) => setBleStatus(s)), []);

  // debounced place search
  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => searchPlaces(query, ctrl.signal).then(setResults).catch(() => {}), 500);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  // follow the rider while navigating / when follow is on
  useEffect(() => {
    if (!follow || !position) return;
    let zoom: number | undefined;
    if (navigating) zoom = 17;
    else if (firstFix.current) zoom = 16;
    firstFix.current = false;
    map.current?.setView(position, zoom);
  }, [position, follow, navigating]);

  const pickDestination = async (coord: [number, number]) => {
    useNav.getState().setDestination(coord);
    setResults([]);
    if (!position) return useNav.getState().setError('Waiting for GPS fix...');
    setBusy(true);
    const r = await calcRoute(position, coord);
    setBusy(false);
    if (r) {
      setFollow(false);
      map.current?.fit(r.geometry);
    }
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

  return (
    <SafeAreaProvider style={styles.flex}>
      <StatusBar style="dark" />
      <LeafletMap
        ref={map}
        position={position}
        route={route?.geometry ?? null}
        destination={destination}
        onLongPress={pickDestination}
        onUserDrag={() => setFollow(false)}
      />

      <SafeAreaView style={styles.top} pointerEvents="box-none">
        {navigating && nav ? (
          <View style={styles.navCard}>
            <Text style={styles.navDist}>{fmtDist(nav.distToTurn)}</Text>
            <Text style={styles.navStreet} numberOfLines={1}>{nav.arrived ? 'You have arrived' : nav.street || 'Continue'}</Text>
            {nav.offRoute && <Text style={styles.warn}>Off route, rerouting...</Text>}
          </View>
        ) : (
          <View style={styles.searchBox}>
            <TextInput
              style={styles.input}
              placeholder="Search destination (or long-press map)"
              value={query}
              onChangeText={setQuery}
            />
            {results.map((p) => (
              <Pressable key={p.name} style={styles.result} onPress={() => { setQuery(''); pickDestination(p.coord); }}>
                <Text numberOfLines={2}>{p.name}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </SafeAreaView>

      <View style={styles.bottom}>
        {error && <Text style={styles.warn}>{error}</Text>}
        {busy && <ActivityIndicator />}
        {route && (
          <Text style={styles.summary}>
            {fmtDist(nav?.remainingDist ?? route.distance)} | {fmtTime(nav?.remainingTime ?? route.duration)}
            {navigating ? `  |  ${Math.round(speedKmh)} km/h` : ''}
          </Text>
        )}
        <View style={styles.row}>
          <Pressable style={[styles.btn, styles.btnAlt]} onPress={openBle}>
            <Text style={styles.btnAltText}>Display: {bleStatus}</Text>
          </Pressable>
          <Pressable style={[styles.btn, styles.btnAlt]} onPress={() => setFollow(true)}>
            <Text style={styles.btnAltText}>Recenter</Text>
          </Pressable>
          {route && (
            <Pressable
              style={[styles.btn, navigating && styles.btnStop]}
              onPress={() => { if (navigating) stop(); else { setFollow(true); start(); } }}
            >
              <Text style={styles.btnText}>{navigating ? 'Stop' : 'Start'}</Text>
            </Pressable>
          )}
        </View>
      </View>

      <Modal visible={bleOpen} animationType="slide" onRequestClose={() => { ble.stopScan(); setBleOpen(false); }}>
        <SafeAreaView style={styles.modal}>
          <Text style={styles.title}>BLE display</Text>
          <Text>Status: {bleStatus}</Text>
          {bleError && <Text style={styles.warn}>{bleError}</Text>}
          <FlatList
            data={devices}
            keyExtractor={(d) => d.id}
            ListEmptyComponent={<Text style={styles.muted}>Scanning for devices advertising service FF00...</Text>}
            renderItem={({ item }) => (
              <Pressable
                style={styles.result}
                onPress={() => ble.connect(item.id).then(() => setBleOpen(false)).catch((e) => setBleError(e.message))}
              >
                <Text>{item.name ?? item.localName ?? 'Unnamed'} ({item.id})</Text>
              </Pressable>
            )}
          />
          <View style={styles.row}>
            <Pressable style={[styles.btn, styles.btnAlt]} onPress={() => { ble.disconnect(); }}>
              <Text style={styles.btnAltText}>Disconnect</Text>
            </Pressable>
            <Pressable style={styles.btn} onPress={() => { ble.stopScan(); setBleOpen(false); }}>
              <Text style={styles.btnText}>Close</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { position: 'absolute', top: 0, left: 0, right: 0, padding: 12 },
  searchBox: { backgroundColor: '#fff', borderRadius: 12, elevation: 4, overflow: 'hidden', marginTop: 24 },
  input: { padding: 14, fontSize: 16 },
  result: { padding: 12, borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#ccc' },
  navCard: { backgroundColor: '#0b57d0', borderRadius: 12, padding: 16, marginTop: 24, elevation: 4 },
  navDist: { color: '#fff', fontSize: 34, fontWeight: '700' },
  navStreet: { color: '#fff', fontSize: 18 },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 16, gap: 10, borderTopLeftRadius: 16, borderTopRightRadius: 16, elevation: 8 },
  summary: { fontSize: 18, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, backgroundColor: '#1a73e8', padding: 14, borderRadius: 10, alignItems: 'center' },
  btnStop: { backgroundColor: '#d93025' },
  btnText: { color: '#fff', fontWeight: '600' },
  btnAlt: { backgroundColor: '#e8f0fe' },
  btnAltText: { color: '#1a73e8', fontWeight: '600' },
  warn: { color: '#d93025' },
  modal: { flex: 1, padding: 16, gap: 10 },
  title: { fontSize: 22, fontWeight: '700' },
  muted: { color: '#666', marginTop: 12 },
});

