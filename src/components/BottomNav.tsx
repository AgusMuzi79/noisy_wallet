import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { C, F } from '../theme';

const TABS = [
  { route: 'index', icon: 'home' as const, label: 'inicio' },
  { route: 'history', icon: 'list' as const, label: 'historial' },
  { route: 'income', icon: 'trending-up' as const, label: 'ingresos' },
  { route: 'categories', icon: 'grid' as const, label: 'categorías' },
];

export default function BottomNav({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const pb = Math.max(insets.bottom, 10);

  const goTab = (routeName: string) => {
    navigation.navigate(routeName);
  };

  const renderTab = (tab: typeof TABS[number], index: number) => {
    const isActive = state.index === index;
    const color = isActive ? C.text : C.textSubtle;
    return (
      <Pressable key={tab.route} onPress={() => goTab(tab.route)} style={styles.tab}>
        <Feather name={tab.icon} size={21} color={color} />
        <Text style={[styles.label, { color, fontFamily: F.mono }]}>{tab.label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: pb }]}>
      {renderTab(TABS[0], 0)}
      {renderTab(TABS[1], 1)}

      {/* Centre FAB */}
      <View style={styles.fabZone}>
        <Pressable
          onPress={() => router.push('/add-expense')}
          style={styles.fab}
        >
          <Feather name="plus" size={26} color={C.accentContrast} />
        </Pressable>
      </View>

      {renderTab(TABS[2], 2)}
      {renderTab(TABS[3], 3)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: C.bgElev,
    borderTopWidth: 1.5,
    borderTopColor: C.border,
    paddingTop: 10,
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingTop: 2,
  },
  label: {
    fontSize: 9.5,
    letterSpacing: 0.8,
  },
  fabZone: {
    flex: 1,
    alignItems: 'center',
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 20,
    marginTop: -20,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
});
