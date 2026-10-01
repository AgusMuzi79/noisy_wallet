import React, { useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { C, F, MONTHS_ES, fmtARS, localMonthPrefix } from '../../src/theme';
import CategoryIcon from '../../src/components/CategoryIcon';

export default function CategoriesScreen() {
  const { state, monthSpent } = useApp();
  const insets = useSafeAreaInsets();
  const monthName = MONTHS_ES[new Date().getMonth()];
  const month = localMonthPrefix();

  // Current-month spend per category, list sorted by it (stable for ties)
  const { rows, maxSpent } = useMemo(() => {
    const spentBy: Record<string, number> = {};
    for (const m of state.movements) {
      if (m.type === 'expense' && m.catId && m.date.startsWith(month)) {
        spentBy[m.catId] = (spentBy[m.catId] || 0) + m.amount;
      }
    }
    const sorted = state.categories
      .map(c => ({ ...c, spent: spentBy[c.id] || 0 }))
      .sort((a, b) => b.spent - a.spent);
    return { rows: sorted, maxSpent: Math.max(1, ...sorted.map(r => r.spent)) };
  }, [state.movements, state.categories, month]);

  const shares = rows.filter(r => r.spent > 0);

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Categorías</Text>
        <Text style={styles.subtitle}>
          En {monthName} se fueron <Text style={styles.subtitleValue}>${fmtARS(monthSpent)}</Text>.
        </Text>

        {/* Stacked share bar */}
        <View style={styles.shareBar}>
          {shares.length === 0
            ? <View style={[styles.share, { flex: 1, backgroundColor: C.surface2 }]} />
            : shares.map(r => <View key={r.id} style={[styles.share, { flex: r.spent, backgroundColor: r.color }]} />)}
        </View>

        <View style={styles.list}>
          {rows.map(r => (
            <Pressable
              key={r.id}
              onPress={() => router.push(`/edit-category?id=${r.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`${r.name}, ${r.spent ? `${fmtARS(r.spent)} pesos` : 'sin gastos'} este mes`}
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: C.surface }]}
            >
              <View style={styles.icon}>
                <CategoryIcon icon={r.icon} size={18} color={r.color} />
              </View>
              <View style={styles.info}>
                <View style={styles.infoHead}>
                  <Text style={styles.name} numberOfLines={1}>{r.name}</Text>
                  <Text style={[styles.amt, { color: r.spent ? C.text : C.textSubtle }]}>
                    {r.spent ? `$${fmtARS(r.spent)}` : '—'}
                  </Text>
                </View>
                <View style={styles.track}>
                  <View style={[styles.fill, { backgroundColor: r.color, width: `${(r.spent / maxSpent) * 100}%` }]} />
                </View>
              </View>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={() => router.push('/add-category')}
          accessibilityRole="button"
          style={styles.addRow}
        >
          <View style={styles.addIcon}>
            <Feather name="plus" size={18} color={C.primary} />
          </View>
          <Text style={styles.addText}>Nueva categoría</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.bg },
  // Bottom padding clears the floating pill nav
  scroll: { paddingHorizontal: 24, paddingTop: 4, paddingBottom: 120 },

  title: { marginTop: 14, fontFamily: F.display, fontSize: 32, letterSpacing: -0.6, color: C.text },
  subtitle: { marginTop: 6, fontFamily: F.sans, fontSize: 13.5, color: C.textMuted },
  subtitleValue: { fontFamily: F.mono, color: C.text },

  shareBar: { marginTop: 18, height: 8, borderRadius: 4, overflow: 'hidden', flexDirection: 'row', gap: 2 },
  share: { height: '100%' },

  list: { marginTop: 14 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  icon: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  info: { flex: 1, minWidth: 0 },
  infoHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 },
  name: { flexShrink: 1, fontFamily: F.sansSemibold, fontSize: 15, color: C.text },
  amt: { fontFamily: F.monoBold, fontSize: 14 },
  track: { marginTop: 7, height: 4, borderRadius: 2, backgroundColor: C.surface2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2 },

  addRow: { marginTop: 6, height: 56, flexDirection: 'row', alignItems: 'center', gap: 14 },
  addIcon: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.borderViolet,
    alignItems: 'center', justifyContent: 'center',
  },
  addText: { fontFamily: F.sansSemibold, fontSize: 15, color: C.primary },
});
