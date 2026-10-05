import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Place } from '../services/geocode';
import { shadow, useTheme } from './theme';

interface Props {
  query: string;
  onChange: (q: string) => void;
  results: Place[];
  onPick: (p: Place) => void;
}

export function ResultRow({ place, onPress }: { place: Place; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable style={[styles.result, { borderColor: t.border }]} onPress={onPress}>
      <MaterialIcons name="place" size={22} color={t.sub} style={styles.resultIcon} />
      <Text style={[styles.resultText, { color: t.text }]} numberOfLines={2}>
        {place.name}
      </Text>
    </Pressable>
  );
}

/** Idle-state floating search pill. Picking a result opens the directions card. */
export function SearchBar({ query, onChange, results, onPick }: Props) {
  const t = useTheme();
  return (
    <View style={[styles.wrap, shadow, { backgroundColor: t.card }]}>
      <View style={styles.row}>
        <MaterialIcons name="search" size={24} color={t.sub} style={styles.icon} />
        <TextInput
          style={[styles.input, { color: t.text }]}
          placeholder="Search here, or long-press the map"
          placeholderTextColor={t.sub}
          value={query}
          onChangeText={onChange}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable hitSlop={12} onPress={() => onChange('')}>
            <MaterialIcons name="close" size={22} color={t.sub} />
          </Pressable>
        )}
      </View>
      {results.map((p) => (
        <ResultRow key={`${p.coord[0]},${p.coord[1]}`} place={p} onPress={() => onPick(p)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 28, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  icon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, paddingVertical: 14 },
  result: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
  resultIcon: { marginRight: 12 },
  resultText: { flex: 1, fontSize: 14 },
});
