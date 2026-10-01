import React from 'react';
import { Text } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { C } from '../theme';

const ICON_RE = /^[a-z][a-z0-9-]+$/;
const MCI_PREFIX = 'mci:';

// v2 category icon set, in picker order. Values are stored as-is in the DB:
// plain names are Feather icons, `mci:` names are MaterialCommunityIcons.
export const CATEGORY_ICONS = [
  'mci:paw', 'mci:cart', 'home', 'zap', 'mci:silverware-fork-knife', 'mci:bus',
  'heart', 'mci:ticket', 'coffee', 'gift', 'mci:airplane', 'book',
  'mci:tshirt-crew', 'mci:dumbbell', 'mci:gauge', 'mci:wallet-outline', 'trending-up', 'list',
] as const;

// v2 category colour palette, in picker order
export const CATEGORY_COLORS: string[] = [
  C.primary, C.primaryHover, C.accent, C.teal,
  C.hazard, C.mustard, C.danger, C.ink400,
];

type Props = { icon: string; size: number; color: string };

export default function CategoryIcon({ icon, size, color }: Props) {
  if (icon.startsWith(MCI_PREFIX)) {
    const name = icon.slice(MCI_PREFIX.length);
    if (ICON_RE.test(name)) {
      return <MaterialCommunityIcons name={name as any} size={size} color={color} />;
    }
  }
  if (ICON_RE.test(icon)) {
    return <Feather name={icon as any} size={size} color={color} />;
  }
  // Legacy rows stored an emoji instead of an icon name
  return <Text style={{ fontSize: size * 0.88, lineHeight: size * 1.15, color }}>{icon}</Text>;
}
