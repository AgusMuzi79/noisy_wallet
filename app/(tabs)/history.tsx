import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DisplayMovement, groupRecurringCredits, useApp } from '../../src/context/AppContext';
import { C, F, R, fmtARS, fmtMovDate } from '../../src/theme';
import MovementRow from '../../src/components/MovementRow';

type TypeFilter = 'all' | 'exp' | 'inc';
type WhoFilter = 'all' | 'u1' | 'u2';

interface DayGroup {
  date: string;
  rows: DisplayMovement[];
  net: number;
}

function Segmented<T extends string>({ options, value, onChange }: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.seg}>
      {options.map(o => {
        const on = value === o.id;
        return (
          <Pressable
            key={o.id}
            onPress={() => onChange(o.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={[styles.segBtn, on && styles.segBtnOn]}
          >
            <Text style={[styles.segText, on && styles.segTextOn]} numberOfLines={1}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function HistoryScreen() {
  const { state, monthIncome, monthSpent, runningBalance, deleteMovement } = useApp();
  const insets = useSafeAreaInsets();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [whoFilter, setWhoFilter] = useState<WhoFilter>('all');

  const { user1Name, user2Name } = state;
  const showWho = !!user2Name;
  // Author filter matches the current names; credits (no author) only show under "Ambos"
  const whoName = !showWho || whoFilter === 'all' ? null : whoFilter === 'u1' ? user1Name : user2Name;

  const groups = useMemo(() => {
    const filtered = state.movements.filter(m => {
      if (typeFilter === 'exp' && m.type !== 'expense') return false;
      if (typeFilter === 'inc' && m.type === 'expense') return false;
      if (whoName !== null && m.author !== whoName) return false;
      return true;
    });
    const out: DayGroup[] = [];
    for (const m of groupRecurringCredits(filtered, runningBalance)) {
      let g = out[out.length - 1];
      if (!g || g.date !== m.date) { g = { date: m.date, rows: [], net: 0 }; out.push(g); }
      g.rows.push(m);
      g.net += m.type === 'expense' ? -m.amount : m.amount;
    }
    return out;
  }, [state.movements, runningBalance, typeFilter, whoName]);

  const confirmDelete = (m: DisplayMovement) => {
    const isExpense = m.type === 'expense';
    const title = isExpense
      ? (state.categories.find(c => c.id === m.catId)?.name ?? 'Otros')
      : (m.note || 'Ingreso extra');
    const many = m.ids.length > 1;
    Alert.alert(
      many ? `Eliminar ${m.ids.length} acreditaciones` : 'Eliminar movimiento',
      `${isExpense ? '−' : '+'}$${fmtARS(m.amount)} · ${title}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive',
          onPress: () => {
            Promise.all(m.ids.map(id => deleteMovement(id)))
              .catch((e: any) => Alert.alert('Error al eliminar', e?.message ?? 'No se pudo eliminar'));
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Movimientos</Text>
        <Text style={styles.subtitle}>
          Entró <Text style={[styles.mono, { color: C.accent }]}>${fmtARS(monthIncome)}</Text>
          {' · '}salió <Text style={[styles.mono, { color: C.text }]}>${fmtARS(monthSpent)}</Text>
        </Text>

        <View style={styles.filters}>
          <Segmented
            value={typeFilter}
            onChange={setTypeFilter}
            options={[
              { id: 'all', label: 'Todo' },
              { id: 'exp', label: 'Gastos' },
              { id: 'inc', label: 'Ingresos' },
            ]}
          />
          {showWho && (
            <Segmented
              value={whoFilter}
              onChange={setWhoFilter}
              options={[
                { id: 'all', label: 'Ambos' },
                { id: 'u1', label: user1Name },
                { id: 'u2', label: user2Name },
              ]}
            />
          )}
        </View>

        {groups.map(g => (
          <View key={g.date} style={styles.group}>
            <View style={styles.groupHead}>
              <Text style={styles.groupText}>{fmtMovDate(g.date)}</Text>
              <Text style={styles.groupText}>{g.net < 0 ? '−' : '+'}${fmtARS(g.net)}</Text>
            </View>
            {g.rows.map((m, i) => (
              <MovementRow
                key={m.id}
                m={m}
                categories={state.categories}
                showDate={false}
                divider={i > 0}
                onLongPress={() => confirmDelete(m)}
              />
            ))}
          </View>
        ))}

        {groups.length === 0 && (
          <Text style={styles.empty}>// nada por acá con esos filtros</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.bg },
  // Bottom padding clears the floating pill nav
  scroll: { paddingHorizontal: 24, paddingTop: 4, paddingBottom: 120 },
  mono: { fontFamily: F.mono },

  title: { marginTop: 14, fontFamily: F.display, fontSize: 32, letterSpacing: -0.6, color: C.text },
  subtitle: { marginTop: 6, fontFamily: F.sans, fontSize: 13.5, color: C.textMuted },

  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 20, marginBottom: 6 },
  seg: { flexDirection: 'row', padding: 3, borderRadius: 11, backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border },
  segBtn: { height: 40, paddingHorizontal: 12, borderRadius: R.md, alignItems: 'center', justifyContent: 'center', maxWidth: 110 },
  segBtnOn: { backgroundColor: C.primary },
  segText: { fontFamily: F.sansSemibold, fontSize: 13, color: C.textMuted },
  segTextOn: { color: C.primaryContrast },

  group: { marginTop: 18 },
  groupHead: {
    flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 8,
    borderBottomWidth: 1.5, borderBottomColor: C.border,
  },
  groupText: { fontFamily: F.mono, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: C.textSubtle },

  empty: { paddingVertical: 48, textAlign: 'center', fontFamily: F.mono, fontSize: 12.5, color: C.textSubtle },
});
