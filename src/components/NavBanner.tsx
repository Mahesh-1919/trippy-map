import { StyleSheet, Text, View } from 'react-native';
import type { NavState } from '../nav/engine';
import { fmtDist } from '../nav/format';
import { shadow, useTheme } from './theme';
import { TurnIcon } from './TurnIcon';

export function NavBanner({ nav, speedKmh }: { nav: NavState; speedKmh: number }) {
  const t = useTheme();
  return (
    <View style={[styles.card, shadow, { backgroundColor: t.banner }]}>
      <View style={styles.arrow}>
        <TurnIcon icon={nav.icon} size={56} color="#fff" />
      </View>
      <View style={styles.mid}>
        <Text style={styles.dist}>{nav.arrived ? 'Arrived' : fmtDist(nav.distToTurn)}</Text>
        <Text style={styles.street} numberOfLines={1}>
          {nav.arrived ? 'You have reached your destination' : nav.street || 'Continue'}
        </Text>
        {nav.offRoute && <Text style={styles.warn}>Off route, rerouting...</Text>}
      </View>
      <View style={[styles.speed, { backgroundColor: t.card }]}>
        <Text style={[styles.speedNum, { color: t.text }]}>{Math.round(speedKmh)}</Text>
        <Text style={[styles.speedUnit, { color: t.sub }]}>km/h</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, padding: 14 },
  arrow: { width: 72, alignItems: 'center' },
  mid: { flex: 1, paddingHorizontal: 8 },
  dist: { color: '#fff', fontSize: 32, fontWeight: '700' },
  street: { color: '#fff', fontSize: 16 },
  warn: { color: '#ffd6d2', fontSize: 13, marginTop: 2 },
  speed: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  speedNum: { fontSize: 20, fontWeight: '700', lineHeight: 22 },
  speedUnit: { fontSize: 10 },
});
