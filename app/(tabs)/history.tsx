import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { C, F, fmtARS, fmtMovDate, hexAlpha } from '../../src/theme';

type Filter = 'all' | 'exp' | 'inc';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'TODOS' },
  { id: 'exp', label: 'GASTOS' },
  { id: 'inc', label: 'INGRESOS' },
];

export default function HistoryScreen() {
  const { state, deleteMovement } = useApp();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = state.movements.filter(m => {
    if (filter === 'exp') return m.type === 'expense';
    if (filter === 'inc') return m.type !== 'expense';
    return true;
  });

  return (
    <LinearGradient colors={['#1B1726', '#0F0D15']} style={styles.flex}>
      <View style={[styles.flex, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Historial</Text>
        </View>

        <View style={styles.filters}>
          {FILTERS.map(f => (
            <Pressable
              key={f.id}
              onPress={() => setFilter(f.id)}
              style={[styles.filterChip, filter === f.id && styles.filterActive]}
            >
              <Text style={[styles.filterText, filter === f.id && styles.filterTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {filtered.map(m => {
            const cat = state.categories.find(c => c.id === m.catId);
            let title = '', icon = 'credit-card', color: string = C.textMuted, amtColor: string = C.danger, sign = '−';
            if (m.type === 'recurring_credit') {
              title = 'Acreditación mensual'; icon = 'trending-up'; color = C.primary; amtColor = C.accent; sign = '+';
            } else if (m.type === 'income') {
              title = m.note || 'Ingreso extra'; icon = 'trending-up'; color = C.accent; amtColor = C.accent; sign = '+';
            } else {
              title = cat?.name ?? 'Otros'; icon = cat?.icon ?? 'credit-card'; color = cat?.color ?? C.textMuted; amtColor = C.danger; sign = '−';
            }
            const who = m.author ? `${m.author} · ` : '';
            const dateLabel = fmtMovDate(m.date);
            const sub = m.note && m.type !== 'income' ? `${who}${m.note} · ${dateLabel}` : `${who}${dateLabel}`;
            const confirmDelete = () => Alert.alert(
              'Eliminar movimiento',
              `${sign}$${fmtARS(m.amount)} · ${title}`,
              [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Eliminar', style: 'destructive', onPress: () => deleteMovement(m.id) },
              ],
            );
            return (
              <Pressable key={m.id} style={styles.row} onLongPress={confirmDelete} delayLongPress={400}>
                <View style={[styles.rowIcon, { backgroundColor: hexAlpha(color, 0.15) }]}>
                  <Feather name={icon as any} size={20} color={color} />
                </View>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowTitle}>{title}</Text>
                  <Text style={styles.rowSub}>{sub}</Text>
                </View>
                <Text style={[styles.rowAmt, { color: amtColor }]}>{sign}${fmtARS(m.amount)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingHorizontal: 22, marginTop: 8, marginBottom: 18 },
  title: { fontFamily: F.display, fontSize: 26, color: C.text },
  filters: { flexDirection: 'row', gap: 7, paddingHorizontal: 22, marginBottom: 16 },
  filterChip: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 11, borderWidth: 1.5, borderColor: C.border },
  filterActive: { backgroundColor: C.primary, borderColor: C.primary },
  filterText: { fontFamily: F.mono, fontSize: 11.5, letterSpacing: 0.6, color: C.textMuted },
  filterTextActive: { color: C.primaryContrast },
  list: { paddingHorizontal: 22, paddingBottom: 110, gap: 9 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 13, paddingHorizontal: 14, borderRadius: 15, backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border },
  rowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowInfo: { flex: 1 },
  rowTitle: { fontFamily: F.sansSemibold, fontSize: 14.5, color: C.text },
  rowSub: { fontFamily: F.sans, fontSize: 12, color: C.textSubtle, marginTop: 2 },
  rowAmt: { fontFamily: F.mono, fontSize: 14.5, fontWeight: '700' },
});
