import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { shadow, useTheme } from './theme';

interface Props {
  icon: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
  /** small status dot, e.g. BLE connected */
  dot?: string;
}

export function FabButton({ icon, onPress, dot }: Props) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.fab, shadow, { backgroundColor: t.card }]}>
      <MaterialIcons name={icon} size={26} color={t.primary} />
      {dot && <View style={[styles.dot, { backgroundColor: dot, borderColor: t.card }]} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: 6, right: 6, width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
});
