import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { useSheet } from '../../src/context/SheetContext';
import { C, F, M, R, fmtARS, useReduceMotion } from '../../src/theme';
import Odometer from '../../src/components/Odometer';
import MovementRow from '../../src/components/MovementRow';
import { BlinkCursor, levelColor } from '../../src/components/EntrySheet';

const MONTHS_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const GHOST_HOLD_MS = 650;
const RECENT_COUNT = 5;

export default function HomeScreen() {
  const { state, monthIncome, monthSpent, displayMovements } = useApp();
  const { openSheet, lastAdded } = useSheet();
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();

  // Hero balance is all-time; the gauge compares it with this month's income
  const balance = state.balance;
  const ratio = monthIncome > 0 ? Math.max(0, Math.min(1, balance / monthIncome)) : 0;
  const ratioColor = levelColor(ratio);

  // ── Gauge: fill follows the ratio; a red "ghost" holds the previous ratio for
  // a beat after it drops, then shrinks to show the bite ──────────────────────
  const fill = useRef(new Animated.Value(ratio)).current;
  const ghost = useRef(new Animated.Value(ratio)).current;
  const prevRatio = useRef(ratio);
  useEffect(() => {
    const prev = prevRatio.current;
    prevRatio.current = ratio;
    if (prev === ratio) return;
    if (reduce) { fill.setValue(ratio); ghost.setValue(ratio); return; }
    Animated.timing(fill, { toValue: ratio, duration: 350, easing: M.easeOut, useNativeDriver: false }).start();
    if (ratio < prev) {
      ghost.setValue(prev);
      const bite = Animated.sequence([
        Animated.delay(GHOST_HOLD_MS),
        Animated.timing(ghost, { toValue: ratio, duration: 1000, easing: M.easeInOut, useNativeDriver: false }),
      ]);
      bite.start();
      return () => bite.stop();
    }
    ghost.setValue(ratio);
  }, [ratio, reduce, fill, ghost]);

  // ── Floating "−$X" / "+$X" next to the balance when it changes ─────────────
  const flashAnim = useRef(new Animated.Value(0)).current;
  const [flash, setFlash] = useState<{ text: string; color: string } | null>(null);
  const prevBalance = useRef(balance);
  useEffect(() => {
    const delta = balance - prevBalance.current;
    prevBalance.current = balance;
    if (delta === 0 || reduce) return;
    setFlash({ text: `${delta > 0 ? '+' : '−'}$${fmtARS(delta)}`, color: delta > 0 ? C.accent : C.danger });
    flashAnim.setValue(0);
    Animated.timing(flashAnim, { toValue: 1, duration: 1900, useNativeDriver: true }).start(() => setFlash(null));
  }, [balance, reduce, flashAnim]);

  const now = new Date();
  const monthName = MONTHS_ES[now.getMonth()];
  const today = now.toISOString().slice(0, 10); // same convention as new entries
  const todayExpenses = state.movements.filter(m => m.type === 'expense' && m.date === today);
  const todaySpent = todayExpenses.reduce((a, m) => a + m.amount, 0);
  const recent = displayMovements.slice(0, RECENT_COUNT);
  const pct = Math.round(ratio * 100);
  const widthOf = (v: Animated.Value) => v.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brand}>
            <Text style={styles.wordmark}>noisy</Text>
            <View style={styles.row}>
              <Text style={styles.wordmarkMono}>wallet</Text>
              <BlinkCursor style={styles.wordmarkMono} />
            </View>
          </View>
          <Pressable
            onPress={() => router.push('/settings')}
            accessibilityLabel="Ajustes"
            style={({ pressed }) => [styles.gear, pressed && { backgroundColor: C.surface }]}
          >
            <Feather name="settings" size={20} color={C.textMuted} />
          </Pressable>
        </View>

        {/* Balance */}
        <Text style={styles.kicker}>// te quedan · {monthName}</Text>
        <View style={styles.balanceWrap}>
          <Odometer
            value={balance}
            color={ratioColor}
            accessibilityLabel={`Te quedan ${balance < 0 ? 'menos ' : ''}${fmtARS(balance)} pesos, ${pct} por ciento de lo que entró`}
          />
          {flash && (
            <Animated.Text
              style={[
                styles.flash,
                {
                  color: flash.color,
                  opacity: flashAnim.interpolate({ inputRange: [0, 0.12, 0.75, 1], outputRange: [0, 1, 1, 0] }),
                  transform: [{ translateY: flashAnim.interpolate({ inputRange: [0, 0.12, 1], outputRange: [8, 0, -26] }) }],
                },
              ]}
            >
              {flash.text}
            </Animated.Text>
          )}
        </View>
        <Text style={styles.incomeHint}>
          de <Text style={styles.incomeValue}>${fmtARS(monthIncome)}</Text> que entraron este mes
        </Text>

        {/* Gauge */}
        <View style={styles.bar}>
          <Animated.View style={[styles.barFill, { backgroundColor: C.danger, width: widthOf(ghost) }]} />
          <Animated.View style={[styles.barFill, { backgroundColor: ratioColor, width: widthOf(fill) }]} />
        </View>
        <View style={styles.barFoot}>
          <Text style={styles.barText}><Text style={{ color: ratioColor }}>{pct}%</Text> disponible</Text>
          <Text style={styles.barText}>gastado ${fmtARS(monthSpent)}</Text>
        </View>

        {/* Today strip — always visible */}
        <View style={styles.today}>
          {todayExpenses.length === 0 ? (
            <>
              <Text style={styles.todayChevron}>›</Text>
              <View style={styles.grow}>
                <View style={styles.row}>
                  <Text style={[styles.todayTitle, styles.shrink]}>Hoy todavía no anotaste nada</Text>
                  <BlinkCursor style={[styles.todayTitle, { color: C.accent }]} />
                </View>
                <Text style={styles.todaySub}>Un café también cuenta.</Text>
              </View>
              <Pressable
                onPress={() => openSheet('expense')}
                accessibilityRole="button"
                style={({ pressed }) => [styles.todayBtn, pressed && styles.pressed]}
              >
                <Text style={styles.todayBtnText}>Anotar</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Feather name="check" size={18} color={C.accent} />
              <Text style={[styles.grow, styles.todayDone]}>
                Hoy: <Text style={styles.todayStrong}>
                  {todayExpenses.length === 1 ? '1 gasto' : `${todayExpenses.length} gastos`}
                </Text> · <Text style={styles.todayMono}>${fmtARS(todaySpent)}</Text>
              </Text>
              <Pressable
                onPress={() => openSheet('expense')}
                accessibilityRole="button"
                style={({ pressed }) => [styles.todayGhostBtn, pressed && styles.pressed]}
              >
                <Text style={styles.todayGhostText}>+ Otro</Text>
              </Pressable>
            </>
          )}
        </View>

        {/* Recent */}
        <View style={styles.sectionHeader}>
          <Text style={styles.kickerFlat}>// últimos</Text>
          <Pressable onPress={() => router.navigate('/history')} hitSlop={8}>
            <Text style={styles.seeAll}>ver todos →</Text>
          </Pressable>
        </View>
        <View>
          {recent.map((m, i) => (
            <MovementRow
              key={m.id}
              m={m}
              categories={state.categories}
              divider={i > 0}
              flash={!!lastAdded && m.ids.includes(lastAdded.id)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.bg },
  grow: { flex: 1, minWidth: 0 },
  shrink: { flexShrink: 1 },
  row: { flexDirection: 'row', alignItems: 'baseline' },
  // Bottom padding clears the floating pill nav
  scroll: { paddingHorizontal: 24, paddingTop: 4, paddingBottom: 120 },
  pressed: { transform: [{ translateY: 1 }] },

  header: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  wordmark: { fontFamily: F.display, fontSize: 21, letterSpacing: -0.2, color: C.text },
  wordmarkMono: { fontFamily: F.mono, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: C.accent },
  gear: { width: 44, height: 44, marginRight: -10, borderRadius: R.lg, alignItems: 'center', justifyContent: 'center' },

  kicker: { marginTop: 30, fontFamily: F.mono, fontSize: 11, letterSpacing: 2.2, textTransform: 'uppercase', color: C.textSubtle },
  balanceWrap: { marginTop: 12, position: 'relative' },
  flash: { position: 'absolute', right: 0, top: -16, fontFamily: F.monoBold, fontSize: 17 },
  incomeHint: { marginTop: 12, fontFamily: F.sans, fontSize: 14, color: C.textMuted },
  incomeValue: { fontFamily: F.mono, color: C.text },

  bar: { marginTop: 26, height: 14, borderRadius: 4, backgroundColor: C.surface2, overflow: 'hidden' },
  barFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 4 },
  barFoot: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between' },
  barText: { fontFamily: F.mono, fontSize: 11.5, color: C.textSubtle },

  today: {
    marginTop: 28, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
    borderTopWidth: 1.5, borderBottomWidth: 1.5, borderColor: C.border,
  },
  todayChevron: { fontFamily: F.monoBold, fontSize: 16, color: C.accent },
  todayTitle: { fontFamily: F.sansSemibold, fontSize: 14.5, color: C.text },
  todaySub: { fontFamily: F.sans, fontSize: 12.5, color: C.textSubtle, marginTop: 2 },
  todayBtn: { height: 40, paddingHorizontal: 16, borderRadius: R.seg, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  todayBtnText: { fontFamily: F.sansBold, fontSize: 14, color: C.accentContrast },
  todayDone: { fontFamily: F.sans, fontSize: 14, color: C.textMuted },
  todayStrong: { fontFamily: F.sansSemibold, color: C.text },
  todayMono: { fontFamily: F.mono, color: C.text },
  todayGhostBtn: {
    height: 40, paddingHorizontal: 14, borderRadius: R.seg, borderWidth: 1.5, borderColor: C.borderStrong,
    alignItems: 'center', justifyContent: 'center',
  },
  todayGhostText: { fontFamily: F.sansSemibold, fontSize: 13.5, color: C.text },

  sectionHeader: { marginTop: 28, marginBottom: 4, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kickerFlat: { fontFamily: F.mono, fontSize: 11, letterSpacing: 2.2, textTransform: 'uppercase', color: C.textSubtle },
  seeAll: { fontFamily: F.mono, fontSize: 12.5, color: C.primary },
});
