import React, { useEffect, useRef, useState } from 'react';
import {
  Alert, Animated, Dimensions, KeyboardAvoidingView, Modal, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { SheetMode, useSheet } from '../context/SheetContext';
import { C, F, M, R, fmtARS, hexAlpha, useReduceMotion } from '../theme';
import CategoryIcon from './CategoryIcon';

const KEYPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', 'del'];
const MAX_DIGITS = 8;
const SHEET_MS = 380;

// Same thresholds as the Home gauge
export const levelColor = (r: number) => (r > 0.5 ? C.accent : r > 0.22 ? C.primary : C.danger);

// Retro "_" cursor that blinks with a hard step (no fade)
export function BlinkCursor({ style }: { style?: any }) {
  const reduce = useReduceMotion();
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduce) { opacity.setValue(1); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 0, useNativeDriver: true }),
      Animated.delay(550),
      Animated.timing(opacity, { toValue: 0, duration: 0, useNativeDriver: true }),
      Animated.delay(550),
    ]));
    loop.start();
    return () => loop.stop();
  }, [reduce, opacity]);
  return <Animated.Text style={[style, { opacity }]}>_</Animated.Text>;
}

function pressKey(raw: string, k: string): string {
  let r = raw;
  if (k === 'del') r = r.slice(0, -1);
  else if (k === '000') r = r ? r + '000' : r;
  else r = r + k;
  return r.replace(/^0+/, '').slice(0, MAX_DIGITS);
}

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function EntrySheet() {
  const { state, monthIncome, addMovement } = useApp();
  const { mode, draft, setDraft, resetDraft, closeSheet, showUndo, markAdded } = useSheet();
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();

  // Keep rendering the last mode while the close animation plays
  const [visible, setVisible] = useState(false);
  const [shownMode, setShownMode] = useState<SheetMode>('expense');
  const [saving, setSaving] = useState(false);
  const offY = Dimensions.get('window').height;
  const translateY = useRef(new Animated.Value(offY)).current;
  const scrim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (mode) {
      setShownMode(mode);
      setVisible(true);
      translateY.setValue(offY);
      scrim.setValue(0);
      Animated.parallel([
        Animated.timing(translateY, { toValue: 0, duration: reduce ? 0 : SHEET_MS, easing: M.easeOut, useNativeDriver: true }),
        Animated.timing(scrim, { toValue: 1, duration: reduce ? 0 : 280, useNativeDriver: true }),
      ]).start();
    } else if (visible) {
      Animated.parallel([
        Animated.timing(translateY, { toValue: offY, duration: reduce ? 0 : 280, easing: M.easeInOut, useNativeDriver: true }),
        Animated.timing(scrim, { toValue: 0, duration: reduce ? 0 : 240, useNativeDriver: true }),
      ]).start(() => setVisible(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const isExp = shownMode === 'expense';
  const amt = parseInt(draft.raw || '0', 10);
  const selCat = draft.selCat && state.categories.some(c => c.id === draft.selCat) ? draft.selCat : null;
  const names = [state.user1Name, state.user2Name].filter(Boolean);
  const author = draft.author && names.includes(draft.author) ? draft.author : state.user1Name;

  // Projection — same base as the Home gauge: all-time balance vs this month's income
  const bal = state.balance;
  const inc = monthIncome;
  const ratio = inc > 0 ? Math.max(0, Math.min(1, bal / inc)) : 0;
  const projInc = isExp ? inc : inc + amt;
  const projBal = isExp ? bal - amt : bal + amt;
  const projRatio = projInc > 0 ? Math.max(0, Math.min(1, projBal / projInc)) : 0;
  const projColor = levelColor(projRatio);
  const projBase = isExp ? projRatio : (projInc > 0 ? ratio * (inc / projInc) : 0);
  const chunkEnd = isExp ? ratio : projRatio;
  const chunkColor = isExp ? C.danger : C.accent;

  const canConfirm = amt > 0 && (!isExp || selCat !== null) && !saving;
  let confirmLabel: string;
  if (saving) confirmLabel = 'Guardando…';
  else if (!amt) confirmLabel = 'Ingresá un monto';
  else if (isExp && !selCat) confirmLabel = 'Elegí una categoría';
  else confirmLabel = `${isExp ? 'Anotar −$' : 'Sumar +$'}${fmtARS(amt)}`;

  const confirm = async () => {
    if (!canConfirm) return;
    setSaving(true);
    try {
      const note = draft.note.trim();
      const id = await addMovement(isExp
        ? { type: 'expense', catId: selCat!, amount: amt, author, date: todayISO(), note }
        : { type: 'income', amount: amt, author, date: todayISO(), note: note || 'Ingreso extra' });
      const label = isExp ? (state.categories.find(c => c.id === selCat)?.name ?? 'Otros') : 'ingreso extra';
      closeSheet();
      resetDraft();
      router.navigate('/');
      markAdded({ id, type: isExp ? 'expense' : 'income' });
      showUndo(id, `${isExp ? 'Anotado −$' : 'Sumado +$'}${fmtARS(amt)} · ${label}`);
    } catch (e: any) {
      Alert.alert('Error al guardar', e?.message ?? 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const newCategory = () => {
    // The draft lives in SheetContext; add-category reopens the sheet on exit
    closeSheet();
    router.push('/add-category?from=sheet');
  };

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={closeSheet}>
      <Animated.View style={[styles.scrim, { opacity: scrim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} accessibilityLabel="Cerrar" />
      </Animated.View>

      <KeyboardAvoidingView
        style={styles.anchor}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        pointerEvents="box-none"
      >
        <Animated.View
          accessibilityViewIsModal
          accessibilityLabel={isExp ? 'Nuevo gasto' : 'Ingreso extra'}
          style={[styles.sheet, { paddingBottom: 30 + insets.bottom, transform: [{ translateY }] }]}
        >
          <View style={styles.handle} />
          <View style={styles.head}>
            <Text style={styles.kicker}>{isExp ? '// nuevo gasto' : '// ingreso extra'}</Text>
            <Pressable onPress={closeSheet} accessibilityLabel="Cerrar" hitSlop={6} style={styles.closeBtn}>
              <Feather name="x" size={20} color={C.textMuted} />
            </Pressable>
          </View>

          {/* Amount */}
          <View style={styles.amountRow} accessibilityLabel={`Monto ${fmtARS(amt)} pesos`}>
            <Text style={styles.amountSign}>{isExp ? '−' : '+'}$</Text>
            <Text style={[styles.amount, { color: amt ? C.text : C.textSubtle }]}>{amt ? fmtARS(amt) : '0'}</Text>
            <BlinkCursor style={styles.cursor} />
          </View>

          {/* Projection */}
          <View style={styles.proj}>
            <View style={styles.projHead}>
              <Text style={styles.projLabel}>Te quedaría</Text>
              <Text style={[styles.projValue, { color: projColor }]}>
                {projBal < 0 ? '−$' : '$'}{fmtARS(projBal)}
                <Text style={styles.projPct}> · {Math.round(projRatio * 100)}%</Text>
              </Text>
            </View>
            <View style={styles.projTrack}>
              <View style={[styles.projFill, { backgroundColor: chunkColor, width: `${chunkEnd * 100}%` }]} />
              <View style={[styles.projFill, { backgroundColor: projColor, width: `${projBase * 100}%` }]} />
            </View>
          </View>

          {/* Category tiles (expense only) */}
          {isExp && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              style={styles.tilesScroll}
              contentContainerStyle={styles.tiles}
            >
              {state.categories.map(c => {
                const on = selCat === c.id;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => setDraft({ selCat: c.id })}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    style={[styles.tile, on && { borderColor: c.color, backgroundColor: hexAlpha(c.color, 0.14) }]}
                  >
                    <CategoryIcon icon={c.icon} size={21} color={c.color} />
                    <Text style={[styles.tileName, { color: on ? C.text : C.textMuted }]} numberOfLines={1}>{c.name}</Text>
                  </Pressable>
                );
              })}
              <Pressable onPress={newCategory} accessibilityRole="button" style={[styles.tile, styles.tileNew]}>
                <Feather name="plus" size={18} color={C.primary} />
                <Text style={[styles.tileName, { color: C.primary }]}>Nueva</Text>
              </Pressable>
            </ScrollView>
          )}

          {/* Author + note */}
          <View style={styles.metaRow}>
            {names.length > 1 && (
              <View style={styles.seg}>
                {names.map(n => {
                  const on = author === n;
                  return (
                    <Pressable
                      key={n}
                      onPress={() => setDraft({ author: n })}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      style={[styles.segBtn, on && styles.segBtnOn]}
                    >
                      <Text style={[styles.segText, on && styles.segTextOn]} numberOfLines={1}>{n}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            <TextInput
              value={draft.note}
              onChangeText={note => setDraft({ note })}
              placeholder={isExp ? 'Nota: Coto, SUBE…' : 'Nota: venta, laburo…'}
              placeholderTextColor={C.textSubtle}
              accessibilityLabel="Nota"
              style={styles.note}
            />
          </View>

          {/* Keypad */}
          <View style={styles.keypad}>
            {KEYPAD.map(k => (
              <Pressable
                key={k}
                onPress={() => setDraft({ raw: pressKey(draft.raw, k) })}
                accessibilityLabel={k === 'del' ? 'Borrar' : k}
                style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
              >
                <Text style={[styles.keyText, (k === 'del' || k === '000') && { color: C.textMuted }]}>
                  {k === 'del' ? '←' : k}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={confirm}
            disabled={!canConfirm}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canConfirm }}
            style={({ pressed }) => [styles.confirm, !canConfirm && styles.confirmOff, pressed && styles.confirmPressed]}
          >
            <Text style={styles.confirmText}>{confirmLabel}</Text>
          </Pressable>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: C.scrim },
  anchor: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: C.bgElev,
    borderTopWidth: 1.5,
    borderColor: C.border,
    borderTopLeftRadius: R.sheet,
    borderTopRightRadius: R.sheet,
    paddingTop: 10,
    paddingHorizontal: 20,
  },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: C.borderStrong, alignSelf: 'center', marginBottom: 6 },
  head: { height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kicker: { fontFamily: F.mono, fontSize: 11, letterSpacing: 2.2, textTransform: 'uppercase', color: C.textSubtle },
  closeBtn: { width: 44, height: 44, marginRight: -10, borderRadius: R.lg, alignItems: 'center', justifyContent: 'center' },

  amountRow: { height: 60, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 6 },
  amountSign: { fontFamily: F.monoBold, fontSize: 24, color: C.textSubtle, paddingBottom: 8 },
  amount: { fontFamily: F.monoBold, fontSize: 52, lineHeight: 60 },
  cursor: { fontFamily: F.monoBold, fontSize: 44, lineHeight: 52, color: C.accent, paddingBottom: 3 },

  proj: { marginTop: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: R.lg, backgroundColor: C.surfaceInset, borderWidth: 1.5, borderColor: C.border },
  projHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  projLabel: { fontFamily: F.sans, fontSize: 12.5, color: C.textMuted },
  projValue: { fontFamily: F.monoBold, fontSize: 14 },
  projPct: { fontFamily: F.mono, color: C.textSubtle },
  projTrack: { marginTop: 9, height: 6, borderRadius: 3, backgroundColor: C.surface2, overflow: 'hidden' },
  projFill: { position: 'absolute', top: 0, bottom: 0, left: 0 },

  tilesScroll: { marginTop: 14, marginHorizontal: -20, flexGrow: 0 },
  tiles: { paddingHorizontal: 20, gap: 8 },
  tile: {
    width: 74, paddingVertical: 11, paddingHorizontal: 4, borderRadius: R.tile,
    borderWidth: 1.5, borderColor: C.border, alignItems: 'center', gap: 7,
  },
  tileNew: { borderStyle: 'dashed', borderColor: C.borderViolet },
  tileName: { fontFamily: F.sansSemibold, fontSize: 11.5, maxWidth: 64 },

  metaRow: { marginTop: 12, flexDirection: 'row', gap: 8 },
  seg: { flexDirection: 'row', padding: 3, borderRadius: 11, backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border },
  segBtn: { height: 36, paddingHorizontal: 14, borderRadius: R.md, alignItems: 'center', justifyContent: 'center', maxWidth: 110 },
  segBtnOn: { backgroundColor: C.primary },
  segText: { fontFamily: F.sansSemibold, fontSize: 13, color: C.textMuted },
  segTextOn: { color: C.primaryContrast },
  note: {
    flex: 1, minWidth: 0, height: 44, paddingHorizontal: 12, borderRadius: 11,
    backgroundColor: C.surfaceInset, borderWidth: 1.5, borderColor: C.border,
    fontFamily: F.sans, fontSize: 14, color: C.text,
  },

  keypad: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', rowGap: 2 },
  key: { width: '33.333%', height: 50, borderRadius: R.lg, alignItems: 'center', justifyContent: 'center' },
  keyPressed: { backgroundColor: C.surface2 },
  keyText: { fontFamily: F.monoBold, fontSize: 23, color: C.text },

  confirm: { marginTop: 10, height: 52, borderRadius: R.lg, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  confirmOff: { opacity: 0.4 },
  confirmPressed: { transform: [{ translateY: 1 }] },
  confirmText: { fontFamily: F.sansBold, fontSize: 16, color: C.accentContrast },
});
