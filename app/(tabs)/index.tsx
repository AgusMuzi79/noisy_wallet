import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Animated, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp, Movement } from '../../src/context/AppContext';
import { C, F, fmtARS, fmtMovDate, hexAlpha } from '../../src/theme';

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const now = new Date();
const MONTH = `${MONTHS_ES[now.getMonth()]} ${now.getFullYear()}`;


function MovRow({ m, categories }: { m: Movement; categories: any[] }) {
  const cat = categories.find(c => c.id === m.catId);
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
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: hexAlpha(color, 0.15) }]}>
        <Feather name={icon as any} size={20} color={color} />
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      <Text style={[styles.rowAmt, { color: amtColor }]}>{sign}${fmtARS(m.amount)}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const { state } = useApp();
  const insets = useSafeAreaInsets();
  const balAnim = useRef(new Animated.Value(state.balance)).current;
  const [displayBal, setDisplayBal] = useState(state.balance);
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const flashY = useRef(new Animated.Value(0)).current;
  const [flash, setFlash] = useState<{ text: string; color: string } | null>(null);
  const prevBalance = useRef(state.balance);

  useEffect(() => {
    const id = balAnim.addListener(({ value }) => setDisplayBal(value));
    return () => balAnim.removeListener(id);
  }, []);

  useEffect(() => {
    if (state.balance === prevBalance.current) return;
    const delta = state.balance - prevBalance.current;
    prevBalance.current = state.balance;

    setFlash({
      text: `${delta > 0 ? '+' : '−'}$${fmtARS(delta)}`,
      color: delta > 0 ? C.accent : C.danger,
    });
    flashOpacity.setValue(0);
    flashY.setValue(6);

    Animated.parallel([
      Animated.sequence([
        Animated.timing(flashOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.delay(1000),
        Animated.timing(flashOpacity, { toValue: 0, duration: 540, useNativeDriver: true }),
      ]),
      Animated.timing(flashY, { toValue: -28, duration: 1800, useNativeDriver: true }),
    ]).start(() => setFlash(null));

    Animated.timing(balAnim, {
      toValue: state.balance,
      duration: 1050,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [state.balance]);

  const monthIncome = state.sources.filter(s => s.active).reduce((a, s) => a + s.amount, 0);
  const ratio = monthIncome > 0 ? Math.max(0, displayBal / monthIncome) : 0;
  const ratioClamped = Math.max(0, Math.min(1, ratio));
  const ratioPct = Math.round(ratioClamped * 100);
  const gaugeColor = ratio > 0.5 ? C.accent : ratio > 0.22 ? C.primary : C.danger;

  return (
    <LinearGradient colors={['#1B1726', '#0F0D15']} style={styles.flex}>
      <View style={[styles.flex, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>// NoisyWallet</Text>
            <Text style={styles.month}>{MONTH}</Text>
          </View>
          <Pressable onPress={() => router.push('/settings')} style={styles.iconBtn}>
            <Feather name="settings" size={19} color={C.textMuted} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Balance hero */}
          <View style={styles.heroContainer}>
            <View>
              <Text style={styles.labKicker}>saldo disponible</Text>
              <View style={styles.labBalRow}>
                <Text style={[styles.labCurrency, { color: gaugeColor }]}>$</Text>
                <Text style={[styles.labBalance, { color: gaugeColor }]}>
                  {fmtARS(displayBal)}
                </Text>
              </View>
              <Text style={styles.incomeHint}>de ${fmtARS(monthIncome)} de ingresos este mes</Text>
              <View style={styles.gaugeHeader}>
                <Text style={styles.gaugeLabel}>saldo restante</Text>
                <Text style={[styles.gaugePct, { color: gaugeColor }]}>{ratioPct}%</Text>
              </View>
              <View style={styles.segments}>
                {Array.from({ length: 24 }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.seg,
                      { backgroundColor: i < ratioClamped * 24 ? gaugeColor : C.surface2 },
                    ]}
                  />
                ))}
              </View>
            </View>

            {flash && (
              <Animated.View style={[styles.flash, { opacity: flashOpacity, transform: [{ translateY: flashY }] }]}>
                <Text style={[styles.flashText, { color: flash.color }]}>{flash.text}</Text>
              </Animated.View>
            )}
          </View>

          {/* Reminder card */}
          {state.notifEnabled && (
            <Pressable onPress={() => router.push('/add-expense')} style={styles.reminderCard}>
              <View style={styles.reminderIcon}>
                <Feather name="bell" size={19} color={C.accent} />
              </View>
              <View style={styles.reminderText}>
                <Text style={styles.reminderTitle}>¿Anotaste lo de hoy?</Text>
                <Text style={styles.reminderSub}>Tocá para sumar un gasto en 5 segundos</Text>
              </View>
              <Feather name="chevron-right" size={18} color={C.accent} />
            </Pressable>
          )}

          {/* Recent movements */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionKicker}>// movimientos</Text>
            <Pressable onPress={() => router.push('/history')}>
              <Text style={styles.seeAll}>ver todo →</Text>
            </Pressable>
          </View>
          <View style={styles.rows}>
            {state.movements.slice(0, 4).map(m => (
              <MovRow key={m.id} m={m} categories={state.categories} />
            ))}
          </View>
        </ScrollView>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, marginTop: 8, marginBottom: 4 },
  kicker: { fontFamily: F.mono, fontSize: 11, letterSpacing: 2.2, textTransform: 'uppercase', color: C.textSubtle },
  month: { fontFamily: F.sans, fontSize: 15, color: C.textMuted, marginTop: 3 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 22, paddingBottom: 110 },

  styleRow: { alignItems: 'flex-end', marginBottom: 20 },
  stylePills: { flexDirection: 'row', backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, borderRadius: 999, padding: 3, gap: 2 },
  pill: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 999 },
  pillActive: { backgroundColor: C.primary },
  pillText: { fontFamily: F.mono, fontSize: 12, letterSpacing: 1, color: C.textMuted },
  pillTextActive: { color: C.primaryContrast },

  heroContainer: { position: 'relative', marginBottom: 24 },
  flash: { position: 'absolute', top: 30, right: 0 },
  flashText: { fontFamily: F.mono, fontSize: 18, fontWeight: '700' },

  labKicker: { fontFamily: F.mono, fontSize: 11, letterSpacing: 2.2, textTransform: 'uppercase', color: C.textSubtle, marginBottom: 6 },
  labBalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  labCurrency: { fontFamily: F.mono, fontSize: 26, fontWeight: '700' },
  labBalance: { fontFamily: F.mono, fontSize: 48, fontWeight: '700', letterSpacing: -1, lineHeight: 52 },
  labCursor: { fontFamily: F.mono, fontSize: 40, fontWeight: '700' },
  incomeHint: { fontFamily: F.sans, fontSize: 13, color: C.textSubtle, marginTop: 8 },
  gaugeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginBottom: 8 },
  gaugeLabel: { fontFamily: F.mono, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: C.textSubtle },
  gaugePct: { fontFamily: F.mono, fontSize: 11, letterSpacing: 1.2 },
  segments: { flexDirection: 'row', gap: 3, height: 14 },
  seg: { flex: 1, borderRadius: 2 },

  calmLabel: { fontFamily: F.sansSemibold, fontSize: 13, letterSpacing: 0.4, color: C.textMuted, marginBottom: 4 },
  calmBalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  calmCurrency: { fontFamily: F.display, fontSize: 34 },
  calmBalance: { fontFamily: F.display, fontSize: 64, letterSpacing: -0.5, lineHeight: 62 },
  calmIncomeHint: { fontFamily: F.sans, fontSize: 14, color: C.textSubtle, marginTop: 10 },
  calmGaugeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 9 },
  calmGaugeLabel: { fontFamily: F.sans, fontSize: 13, color: C.textMuted },
  calmGaugePct: { fontFamily: F.sansBold, fontSize: 13 },
  progressTrack: { height: 12, borderRadius: 999, backgroundColor: C.surface2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999 },

  reminderCard: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 15, paddingHorizontal: 16, borderRadius: 16, backgroundColor: C.accentSoft, borderWidth: 1.5, borderColor: 'rgba(159,232,112,0.28)', marginBottom: 24 },
  reminderIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: 'rgba(159,232,112,0.16)', alignItems: 'center', justifyContent: 'center' },
  reminderText: { flex: 1 },
  reminderTitle: { fontFamily: F.sansSemibold, fontSize: 14, color: C.text },
  reminderSub: { fontFamily: F.sans, fontSize: 12.5, color: C.textMuted },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionKicker: { fontFamily: F.mono, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: C.textSubtle },
  seeAll: { fontFamily: F.mono, fontSize: 11, letterSpacing: 1, color: C.primary },
  rows: { gap: 9 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 13, paddingHorizontal: 14, borderRadius: 15, backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border },
  rowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowInfo: { flex: 1, minWidth: 0 },
  rowTitle: { fontFamily: F.sansSemibold, fontSize: 14.5, color: C.text },
  rowSub: { fontFamily: F.sans, fontSize: 12, color: C.textSubtle, marginTop: 2 },
  rowAmt: { fontFamily: F.mono, fontSize: 14.5, fontWeight: '700' },
});
