import { MaterialIcons } from '@expo/vector-icons';
import { Icon } from '../nav/maneuver';

type Name = keyof typeof MaterialIcons.glyphMap;

const NAMES: Record<number, Name> = {
  [Icon.STRAIGHT]: 'straight',
  [Icon.SLIGHT_LEFT]: 'turn-slight-left',
  [Icon.LEFT]: 'turn-left',
  [Icon.SHARP_LEFT]: 'turn-sharp-left',
  [Icon.SLIGHT_RIGHT]: 'turn-slight-right',
  [Icon.RIGHT]: 'turn-right',
  [Icon.SHARP_RIGHT]: 'turn-sharp-right',
  [Icon.UTURN]: 'u-turn-left',
  [Icon.ROUNDABOUT]: 'roundabout-left',
  [Icon.ARRIVE]: 'flag',
  [Icon.DEPART]: 'navigation',
};

/** Maneuver glyph for a display icon code (see nav/maneuver.ts). */
export function TurnIcon({ icon, size = 28, color }: { icon: number; size?: number; color: string }) {
  return <MaterialIcons name={NAMES[icon] ?? 'straight'} size={size} color={color} />;
}
