import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NavState } from '../nav/engine';
import { fmtArrival, fmtDist, fmtTime } from '../nav/format';
import type { Route } from '../nav/types';
import { routeVia } from '../services/valhalla';
import { shadow, useTheme } from './theme';
import { TurnIcon } from './TurnIcon';

const STEPS_H = 280; // extra height revealed when the sheet is expanded

interface Props {
  routes: Route[];
  routeIndex: number;
  nav: NavState | null;
  navigating: boolean;
  speedKmh: number;
  busy: boolean;
  startLabel: string;
  onSelectRoute: (i: number) => void;
  onStart: () => void;
  onStop: () => void;
  /** visible (collapsed) height, so floating buttons can sit above it */
  onHeight: (h: number) => void;
}

export function RouteSheet(p: Readonly<Props>) {
  const { routes, routeIndex, nav, navigating, speedKmh, busy } = p;
  const route = routes[routeIndex];
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const y = useRef(new Animated.Value(STEPS_H)).current; // STEPS_H = collapsed, 0 = expanded
  const startY = useRef(STEPS_H);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => y.stopAnimation((v) => (startY.current = v)),
      onPanResponderMove: (_, g) => y.setValue(Math.max(0, Math.min(STEPS_H, startY.current + g.dy))),
      onPanResponderRelease: (_, g) => {
        const pos = startY.current + g.dy;
        const expand = g.vy < -0.4 || (g.vy < 0.4 && pos < STEPS_H / 2);
        Animated.spring(y, { toValue: expand ? 0 : STEPS_H, useNativeDriver: true, bounciness: 0 }).start();
      },
    }),
  ).current;

  useEffect(() => {
    if (navigating) Animated.timing(y, { toValue: STEPS_H, duration: 200, useNativeDriver: true }).start();
  }, [navigating, y]);

  if (!route) return null;
  const remDist = nav?.remainingDist ?? route.distance;
  const remTime = nav?.remainingTime ?? route.duration;
  const fastest = routes.reduce((best, r, i) => (r.duration < routes[best].duration ? i : best), 0);

  return (
    <Animated.View
      style={[styles.sheet, shadow, { backgroundColor: t.card, transform: [{ translateY: y }] }]}
    >
      <View onLayout={(e) => p.onHeight(e.nativeEvent.layout.height)} style={{ paddingBottom: 12 + insets.bottom }}>
        <View {...(navigating ? {} : pan.panHandlers)} style={styles.handleArea}>
          <View style={[styles.handle, { backgroundColor: t.border }]} />
        </View>

        {!navigating && routes.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {routes.map((r, i) => {
              const sel = i === routeIndex;
              const via = routeVia(r);
              return (
                <Pressable
                  key={i}
                  onPress={() => p.onSelectRoute(i)}
                  style={[
                    styles.chip,
                    { borderColor: sel ? t.primary : t.border, backgroundColor: sel ? t.chip : 'transparent' },
                  ]}
                >
                  <Text style={[styles.chipTime, { color: sel ? t.primary : t.text }]}>{fmtTime(r.duration)}</Text>
                  <Text style={[styles.chipSub, { color: t.sub }]} numberOfLines={1}>
                    {fmtDist(r.distance)}
                    {via ? ` · via ${via}` : ''}
                  </Text>
                  {i === fastest && <Text style={[styles.tag, { color: t.primary }]}>Fastest</Text>}
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <View style={styles.summaryRow}>
          <View style={styles.flex}>
            <Text style={[styles.eta, { color: t.text }]}>
              {fmtTime(remTime)} <Text style={[styles.etaSub, { color: t.sub }]}>({fmtDist(remDist)})</Text>
            </Text>
            <Text style={[styles.sub, { color: t.sub }]}>
              Arrive {fmtArrival(remTime)}
              {navigating ? `  ·  ${Math.round(speedKmh)} km/h` : ''}
            </Text>
          </View>
        </View>
        <Pressable
          disabled={busy}
          onPress={navigating ? p.onStop : p.onStart}
          style={[styles.cta, { backgroundColor: navigating ? t.danger : t.primary, opacity: busy ? 0.6 : 1 }]}
        >
          <MaterialIcons
            name={navigating ? 'close' : 'navigation'}
            size={22}
            color={navigating ? t.onDanger : t.onPrimary}
          />
          <Text style={[styles.ctaText, { color: navigating ? t.onDanger : t.onPrimary }]}>
            {navigating ? 'Stop navigation' : p.startLabel}
          </Text>
        </Pressable>
      </View>

      <ScrollView style={{ height: STEPS_H }} contentContainerStyle={styles.steps}>
        {route.steps.map((s, i) => (
          <View key={`${i}-${s.maneuverIndex}`} style={[styles.step, { borderColor: t.border }]}>
            <View style={styles.stepIcon}>
              <TurnIcon icon={s.icon} size={26} color={t.primary} />
            </View>
            <Text style={[styles.stepName, { color: t.text }]} numberOfLines={2}>
              {s.name || 'Continue'}
            </Text>
            <Text style={[styles.stepDist, { color: t.sub }]}>{fmtDist(s.distance)}</Text>
          </View>
        ))}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  handleArea: { alignItems: 'center', paddingVertical: 10 },
  handle: { width: 40, height: 5, borderRadius: 3 },
  chips: { paddingHorizontal: 16, gap: 10, paddingBottom: 12 },
  chip: { width: 168, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  chipTime: { fontSize: 18, fontWeight: '700' },
  chipSub: { fontSize: 12, marginTop: 1 },
  tag: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  eta: { fontSize: 26, fontWeight: '700' },
  etaSub: { fontSize: 18, fontWeight: '400' },
  sub: { fontSize: 14, marginTop: 2 },
  cta: { flexDirection: 'row', gap: 8, marginHorizontal: 20, marginTop: 14, borderRadius: 26, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: 17, fontWeight: '700' },
  steps: { paddingHorizontal: 20, paddingBottom: 24 },
  step: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
  stepIcon: { width: 40 },
  stepName: { flex: 1, fontSize: 15 },
  stepDist: { fontSize: 13, marginLeft: 8 },
});
