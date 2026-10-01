import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Switch, Pressable, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp, RecurringSource } from '../../src/context/AppContext';
import { useSheet } from '../../src/context/SheetContext';
import { C, F, MONTHS_ES, R, fmtARS, fmtMovDate, localMonthPrefix } from '../../src/theme';

// ── Fixed source row with local edit state (persists on onEndEditing) ────────

function SourceRow({
  source,
  onUpdate,
  onRemove,
}: {
  source: RecurringSource;
  onUpdate: (id: string, patch: Partial<Omit<RecurringSource, 'id'>>) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const [name, setName] = useState(source.name);
  const [amtRaw, setAmtRaw] = useState(String(source.amount));
  const [amtFocused, setAmtFocused] = useState(false);

  // Keep in sync when Realtime updates arrive
  useEffect(() => { setName(source.name); }, [source.name]);
  useEffect(() => { setAmtRaw(String(source.amount)); }, [source.amount]);

  const saveName = () => {
    const n = name.trim();
    if (!n) { setName(source.name); return; }
    if (n !== source.name) onUpdate(source.id, { name: n });
  };

  const saveAmount = () => {
    setAmtFocused(false);
    const amount = parseInt(amtRaw || '0', 10);
    // DB check: amount > 0 — revert instead of writing an invalid value
    if (!amount) { setAmtRaw(String(source.amount)); return; }
    if (amount !== source.amount) onUpdate(source.id, { amount });
  };

  return (
    <View style={[styles.sourceRow, !source.active && styles.inactive]}>
      <View style={styles.grow}>
        <TextInput
          value={name}
          onChangeText={setName}
          onEndEditing={saveName}
          accessibilityLabel="Nombre de la fuente"
          style={styles.sourceName}
          placeholderTextColor={C.textSubtle}
        />
        <View style={styles.sourceAmtRow}>
          <Text style={styles.sourceAmtSign}>$</Text>
          <TextInput
            value={amtFocused ? amtRaw : fmtARS(parseInt(amtRaw || '0', 10))}
            onFocus={() => setAmtFocused(true)}
            onChangeText={v => setAmtRaw(v.replace(/\D/g, '').slice(0, 9))}
            onEndEditing={saveAmount}
            keyboardType="numeric"
            accessibilityLabel="Monto mensual"
            style={styles.sourceAmt}
          />
        </View>
      </View>
      <Pressable
        onPress={() => onRemove(source.id)}
        accessibilityRole="button"
        accessibilityLabel="Eliminar fuente"
        style={({ pressed }) => [styles.trashBtn, pressed && { backgroundColor: C.surface }]}
      >
        <Feather name="trash-2" size={17} color={C.textSubtle} />
      </Pressable>
      <Switch
        value={source.active}
        onValueChange={v => onUpdate(source.id, { active: v })}
        trackColor={{ false: C.surface2, true: C.primary }}
        thumbColor={C.text}
        accessibilityLabel="Fuente activa"
      />
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function IncomeScreen() {
  const { state, addSource, updateSource, removeSource } = useApp();
  const { openSheet } = useSheet();
  const insets = useSafeAreaInsets();

  const fixedTotal = state.sources.filter(s => s.active).reduce((a, s) => a + s.amount, 0);
  const monthName = MONTHS_ES[new Date().getMonth()];
  const month = localMonthPrefix();
  const extras = state.movements.filter(m => m.type === 'income' && m.date.startsWith(month));
  const extrasTotal = extras.reduce((a, m) => a + m.amount, 0);

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Ingresos</Text>
        <Text style={styles.subtitle}>Las fuentes fijas se acreditan solas el 1ro de cada mes.</Text>

        {/* Fixed sources */}
        <View style={[styles.sectionHead, { marginTop: 26 }]}>
          <Text style={styles.kicker}>// fijas por mes</Text>
          <Text style={styles.sectionTotal}>${fmtARS(fixedTotal)}</Text>
        </View>
        {state.sources.map(s => (
          <SourceRow key={s.id} source={s} onUpdate={updateSource} onRemove={removeSource} />
        ))}
        <Pressable
          onPress={() => addSource({ name: 'Nueva fuente', amount: 1, active: true })}
          accessibilityRole="button"
          style={styles.addLink}
        >
          <Feather name="plus" size={18} color={C.primary} />
          <Text style={styles.addLinkText}>Agregar fuente fija</Text>
        </Pressable>

        {/* This month's extras */}
        <View style={[styles.sectionHead, { marginTop: 30 }]}>
          <Text style={styles.kicker}>// extras de {monthName}</Text>
          <Text style={[styles.sectionTotal, { color: C.accent }]}>+${fmtARS(extrasTotal)}</Text>
        </View>
        {extras.map(m => (
          <View key={m.id} style={styles.extraRow}>
            <View style={styles.grow}>
              <Text style={styles.extraTitle} numberOfLines={1}>{m.note || 'Ingreso extra'}</Text>
              <Text style={styles.extraSub} numberOfLines={1}>
                {[m.author, fmtMovDate(m.date)].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <Text style={styles.extraAmt}>+${fmtARS(m.amount)}</Text>
          </View>
        ))}

        <Pressable
          onPress={() => openSheet('extra')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryBtnText}>Sumar un ingreso extra</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.bg },
  grow: { flex: 1, minWidth: 0 },
  pressed: { transform: [{ translateY: 1 }] },
  // Bottom padding clears the floating pill nav
  scroll: { paddingHorizontal: 24, paddingTop: 4, paddingBottom: 120 },

  title: { marginTop: 14, fontFamily: F.display, fontSize: 32, letterSpacing: -0.6, color: C.text },
  subtitle: { marginTop: 6, fontFamily: F.sans, fontSize: 13.5, lineHeight: 20, color: C.textMuted },

  sectionHead: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    paddingBottom: 12, borderBottomWidth: 1.5, borderBottomColor: C.border,
  },
  kicker: { fontFamily: F.mono, fontSize: 11, letterSpacing: 2.2, textTransform: 'uppercase', color: C.textSubtle },
  sectionTotal: { fontFamily: F.monoBold, fontSize: 17, color: C.text },

  sourceRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  inactive: { opacity: 0.45 },
  sourceName: { paddingVertical: 2, fontFamily: F.sansSemibold, fontSize: 15, color: C.text },
  sourceAmtRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
  sourceAmtSign: { fontFamily: F.mono, fontSize: 13, color: C.textSubtle },
  sourceAmt: { flex: 1, minWidth: 0, paddingVertical: 2, fontFamily: F.mono, fontSize: 13, color: C.textMuted },
  trashBtn: { width: 40, height: 40, borderRadius: R.seg, alignItems: 'center', justifyContent: 'center' },

  addLink: { marginTop: 6, height: 48, flexDirection: 'row', alignItems: 'center', gap: 10 },
  addLinkText: { fontFamily: F.sansSemibold, fontSize: 14.5, color: C.primary },

  extraRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  extraTitle: { fontFamily: F.sansSemibold, fontSize: 15, color: C.text },
  extraSub: { marginTop: 2, fontFamily: F.sans, fontSize: 12.5, color: C.textSubtle },
  extraAmt: { fontFamily: F.monoBold, fontSize: 15, color: C.accent },

  secondaryBtn: {
    marginTop: 16, height: 52, borderRadius: R.lg, borderWidth: 1.5, borderColor: C.borderStrong,
    alignItems: 'center', justifyContent: 'center',
  },
  secondaryBtnText: { fontFamily: F.sansBold, fontSize: 15.5, color: C.text },
});
