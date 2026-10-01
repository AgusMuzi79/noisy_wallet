import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { C, R } from '../theme';

// Props expo-router's <Tabs> passes to a custom tab bar (avoids a direct
// dependency on @react-navigation/bottom-tabs types)
type TabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

const TABS = [
  { route: 'index', icon: 'home' as const, label: 'Inicio' },
  { route: 'history', icon: 'list' as const, label: 'Movimientos' },
  { route: 'income', icon: 'trending-up' as const, label: 'Ingresos' },
  { route: 'categories', icon: 'grid' as const, label: 'Categorías' },
];

// Floating pill nav: four icon tabs around a centre accent FAB
export default function BottomNav({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 8) + 16;
  const activeRoute = state.routes[state.index]?.name;

  const renderTab = (tab: typeof TABS[number]) => {
    const isActive = activeRoute === tab.route;
    return (
      <Pressable
        key={tab.route}
        onPress={() => { if (!isActive) navigation.navigate(tab.route); }}
        accessibilityRole="tab"
        accessibilityLabel={tab.label}
        accessibilityState={{ selected: isActive }}
        style={[styles.tab, isActive && styles.tabActive]}
      >
        <Feather name={tab.icon} size={21} color={isActive ? C.text : C.textSubtle} />
      </Pressable>
    );
  };

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom }]}>
      <View style={styles.pill} accessibilityRole="tablist">
        {TABS.slice(0, 2).map(renderTab)}

        <Pressable
          onPress={() => router.push('/add-expense')}
          accessibilityRole="button"
          accessibilityLabel="Anotar gasto"
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        >
          <Feather name="plus" size={24} color={C.accentContrast} />
        </Pressable>

        {TABS.slice(2).map(renderTab)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    padding: 4,
    borderRadius: R.pill,
    backgroundColor: C.surface2,
    borderWidth: 1.5,
    borderColor: C.borderStrong,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.75,
    shadowRadius: 18,
    elevation: 12,
  },
  tab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: C.bg,
  },
  fab: {
    width: 48,
    height: 44,
    marginHorizontal: 4,
    borderRadius: R.pill,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabPressed: {
    transform: [{ translateY: 1 }],
  },
});
