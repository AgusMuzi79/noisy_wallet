import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Category, DisplayMovement } from '../context/AppContext';
import { C, F, fmtARS, fmtMovDate, useReduceMotion } from '../theme';
import CategoryIcon from './CategoryIcon';

type Props = {
  m: DisplayMovement;
  categories: Category[];
  flash?: boolean;        // highlight as just added (red expense / green income)
  divider?: boolean;      // 1px top divider (all rows but the first)
  showDate?: boolean;     // append the date label to the subtitle
  onLongPress?: () => void;
};

const FLASH_MS = 2600;

// Flat ledger row: circle icon, title + subtitle, amount + running balance.
// Shared by Home (recent) and Movimientos.
export default function MovementRow({ m, categories, flash = false, divider = false, showDate = true, onLongPress }: Props) {
  const reduce = useReduceMotion();
  const enter = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!flash || reduce) return;
    enter.setValue(0);
    glow.setValue(1);
    const anim = Animated.parallel([
      Animated.timing(enter, { toValue: 1, duration: FLASH_MS * 0.25, useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0, duration: FLASH_MS, useNativeDriver: true }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [flash, reduce, enter, glow]);

  const isExpense = m.type === 'expense';
  const cat = isExpense ? categories.find(c => c.id === m.catId) : undefined;
  const title = isExpense ? (cat?.name ?? 'Otros') : (m.note || 'Ingreso extra');
  const icon = isExpense ? (cat?.icon ?? 'credit-card') : 'trending-up';
  const iconColor = isExpense ? (cat?.color ?? C.textMuted) : C.accent;
  const amtColor = isExpense ? C.text : C.accent;
  const sign = isExpense ? '−' : '+';

  const who = m.type === 'recurring_credit' ? 'Automático' : m.author;
  const note = isExpense ? m.note : '';
  const sub = [who, note, showDate ? fmtMovDate(m.date) : ''].filter(Boolean).join(' · ');
  const run = m.balanceAfter;

  return (
    <Pressable
      onLongPress={onLongPress}
      disabled={!onLongPress}
      style={[styles.row, divider && styles.divider]}
    >
      <Animated.View
        pointerEvents="none"
        style={[styles.glow, { backgroundColor: isExpense ? C.dangerSoft : C.accentSoft, opacity: glow }]}
      />
      <Animated.View
        style={[
          styles.inner,
          { opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }] },
        ]}
      >
        <View style={styles.icon}>
          <CategoryIcon icon={icon} size={18} color={iconColor} />
        </View>
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {!!sub && <Text style={styles.sub} numberOfLines={1}>{sub}</Text>}
        </View>
        <View style={styles.amounts}>
          <Text style={[styles.amt, { color: amtColor }]}>{sign}${fmtARS(m.amount)}</Text>
          <Text style={styles.run}>= {run < 0 ? '−' : ''}${fmtARS(run)}</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { marginHorizontal: -8, borderRadius: 10, overflow: 'hidden' },
  divider: { borderTopWidth: 1, borderTopColor: C.border, borderRadius: 0 },
  glow: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  inner: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13, paddingHorizontal: 8 },
  icon: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  info: { flex: 1, minWidth: 0 },
  title: { fontFamily: F.sansSemibold, fontSize: 15, color: C.text },
  sub: { fontFamily: F.sans, fontSize: 12.5, color: C.textSubtle, marginTop: 2 },
  amounts: { alignItems: 'flex-end' },
  amt: { fontFamily: F.monoBold, fontSize: 15 },
  run: { fontFamily: F.mono, fontSize: 11, color: C.textSubtle, marginTop: 3 },
});
