import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Place } from '../services/geocode';
import { ResultRow } from './SearchBar';
import { shadow, useTheme } from './theme';

export type Field = 'origin' | 'dest';

interface Props {
  originName: string;
  /** true while the start point is the live GPS location */
  originIsCurrent: boolean;
  destName: string;
  field: Field | null;
  query: string;
  results: Place[];
  onFocusField: (f: Field) => void;
  onQuery: (q: string) => void;
  onPick: (p: Place) => void;
  onUseMyLocation: () => void;
  onSwap: () => void;
  onBack: () => void;
}

/** Google-Maps-style two-field card: start (defaults to your location) and destination. */
export function DirectionsCard(p: Props) {
  const t = useTheme();
  const inputStyle = [styles.input, { color: t.text, backgroundColor: t.chip }];

  return (
    <View style={[styles.wrap, shadow, { backgroundColor: t.card }]}>
      <View style={styles.main}>
        <Pressable hitSlop={10} onPress={p.onBack} style={styles.back}>
          <MaterialIcons name="arrow-back" size={24} color={t.text} />
        </Pressable>

        <View style={styles.rail}>
          <MaterialIcons name="trip-origin" size={18} color={t.primary} />
          <MaterialIcons name="more-vert" size={18} color={t.sub} style={styles.railDots} />
          <MaterialIcons name="place" size={22} color={t.danger} />
        </View>

        <View style={styles.fields}>
          <TextInput
            style={[inputStyle, p.originIsCurrent && p.field !== 'origin' && { color: t.primary }]}
            value={p.field === 'origin' ? p.query : p.originName}
            placeholder={p.originName}
            placeholderTextColor={t.sub}
            selectTextOnFocus
            numberOfLines={1}
            onFocus={() => p.onFocusField('origin')}
            onChangeText={p.onQuery}
          />
          <TextInput
            style={inputStyle}
            value={p.field === 'dest' ? p.query : p.destName}
            placeholder={p.destName || 'Choose destination'}
            placeholderTextColor={t.sub}
            selectTextOnFocus
            numberOfLines={1}
            onFocus={() => p.onFocusField('dest')}
            onChangeText={p.onQuery}
          />
        </View>

        <Pressable hitSlop={10} onPress={p.onSwap} style={styles.swap}>
          <MaterialIcons name="swap-vert" size={26} color={t.sub} />
        </Pressable>
      </View>

      {p.field === 'origin' && (
        <Pressable style={[styles.myLoc, { borderColor: t.border }]} onPress={p.onUseMyLocation}>
          <MaterialIcons name="my-location" size={22} color={t.primary} style={styles.myLocIcon} />
          <Text style={[styles.myLocText, { color: t.primary }]}>Your location</Text>
        </Pressable>
      )}
      {p.field !== null &&
        p.results.map((r) => <ResultRow key={`${r.coord[0]},${r.coord[1]}`} place={r} onPress={() => p.onPick(r)} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 20, overflow: 'hidden' },
  main: { flexDirection: 'row', alignItems: 'center', padding: 10 },
  back: { width: 34, alignItems: 'center' },
  rail: { width: 26, alignItems: 'center', marginRight: 6 },
  railDots: { marginVertical: -2 },
  fields: { flex: 1, gap: 8 },
  input: { fontSize: 15, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  swap: { width: 40, alignItems: 'center' },
  myLoc: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
  myLocIcon: { marginRight: 12 },
  myLocText: { fontSize: 15, fontWeight: '600' },
});
