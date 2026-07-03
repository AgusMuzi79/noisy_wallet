import React from 'react';
import { Text } from 'react-native';
import { Feather } from '@expo/vector-icons';

const FEATHER_RE = /^[a-z][a-z0-9-]+$/;

type Props = { icon: string; size: number; color: string };

export default function CategoryIcon({ icon, size, color }: Props) {
  if (FEATHER_RE.test(icon)) {
    return <Feather name={icon as any} size={size} color={color} />;
  }
  return <Text style={{ fontSize: size * 0.88, lineHeight: size * 1.15, color }}>{icon}</Text>;
}
