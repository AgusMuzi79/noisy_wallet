import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../src/context/AppContext';
import { C, F, fmtARS, hexAlpha } from '../src/theme';

const KEYPAD = ['1','2','3','4','5','6','7','8','9','000','0','del'];
export default function AddExpenseScreen() {
  const { state, addMovement } = useApp();
  const insets = useSafeAreaInsets();
  const [amountRaw, setAmountRaw] = useState('');
  const [selCat, setSelCat] = useState<string | null>(null);  // category UUID
  const [author, setAuthor] = useState(state.user1Name);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const press = (k: string) => {
    setAmountRaw(prev => {
      if (k === 'del') return prev.slice(0, -1);
      if (k === '000') return prev === '' ? '' : prev + '000';
      const next = prev + k;
      return next.replace(/^0+/, '').slice(0, 9);
    });
  };

  const amtVal = parseInt(amountRaw || '0', 10);
  const canConfirm = amtVal > 0 && selCat !== null && !saving;

  const confirm = async () => {
    if (!canConfirm) return;
    setSaving(true);
    try {
      await addMovement({
        type: 'expense',
        catId: selCat!,
        amount: amtVal,
        author,
        date: new Date().toISOString().slice(0, 10),
        note: note.trim(),
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Error al guardar', e?.message ?? 'No se pudo guardar el gasto');
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={20} color={C.text} />
        </Pressable>
        <Text style={styles.screenTitle}>nuevo gasto</Text>
      </View>

      {/* Amount display */}
      <View style={styles.amountArea}>
        <Text style={[styles.currencySign, { color: amtVal ? C.text : C.textSubtle }]}>$</Text>
        <Text style={[styles.amountDisplay, { color: amtVal ? C.text : C.textSubtle }]}>
          {amtVal ? fmtARS(amtVal) : '0'}
        </Text>
      </View>

      <ScrollView style={styles.fields} showsVerticalScrollIndicator={false}>
        {/* Categories */}
        <Text style={styles.fieldLabel}>categoría</Text>
        <View style={styles.chips}>
          {state.categories.map(c => {
            const on = selCat === c.id;
            return (
              <Pressable
                key={c.id}
                onPress={() => setSelCat(c.id)}
                style={[styles.chip, on && { backgroundColor: hexAlpha(c.color, 0.18), borderColor: c.color }]}
              >
                <Feather name={c.icon as any} size={17} color={on ? c.color : C.textMuted} />
                <Text style={[styles.chipText, { color: on ? C.text : C.textMuted }]}>{c.name}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Author */}
        <Text style={[styles.fieldLabel, { marginTop: 20 }]}>quién</Text>
        <View style={styles.authorRow}>
          {[state.user1Name, state.user2Name].map(a => (
            <Pressable
              key={a}
              onPress={() => setAuthor(a)}
              style={[styles.authorBtn, author === a && styles.authorBtnActive]}
            >
              <Text style={[styles.authorText, author === a && styles.authorTextActive]}>{a}</Text>
            </Pressable>
          ))}
        </View>

        {/* Note */}
        <Text style={[styles.fieldLabel, { marginTop: 20 }]}>nota (opcional)</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Coto, Pedidos Ya, SUBE…"
          placeholderTextColor={C.textSubtle}
          style={styles.noteInput}
        />
      </ScrollView>

      {/* Keypad */}
      <View style={styles.keypad}>
        <View style={styles.keypadGrid}>
          {KEYPAD.map(k => (
            <Pressable key={k} onPress={() => press(k)} style={styles.key}>
              <Text style={[styles.keyText, k === 'del' && styles.keyDel]}>
                {k === 'del' ? '⌫' : k}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          onPress={confirm}
          style={[styles.confirmBtn, !canConfirm && styles.confirmDisabled]}
          disabled={!canConfirm}
        >
          <Text style={styles.confirmText}>
            {saving ? 'Guardando…' : canConfirm ? `Confirmar −$${fmtARS(amtVal)}` : 'Cargar gasto'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 22, paddingTop: 16, paddingBottom: 0 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  screenTitle: { fontFamily: F.mono, fontSize: 12, letterSpacing: 1.8, textTransform: 'uppercase', color: C.textSubtle },

  amountArea: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 4, paddingVertical: 18, paddingHorizontal: 22 },
  currencySign: { fontFamily: F.mono, fontSize: 24, fontWeight: '700' },
  amountDisplay: { fontFamily: F.mono, fontSize: 52, fontWeight: '700', letterSpacing: -1, lineHeight: 56 },

  fields: { flex: 1, paddingHorizontal: 22 },
  fieldLabel: { fontFamily: F.mono, fontSize: 10.5, letterSpacing: 1.8, textTransform: 'uppercase', color: C.textSubtle, marginBottom: 10 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 9, paddingHorizontal: 13, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border },
  chipText: { fontFamily: F.sansSemibold, fontSize: 13.5 },

  authorRow: { flexDirection: 'row', backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, padding: 3, gap: 2 },
  authorBtn: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  authorBtnActive: { backgroundColor: C.primary },
  authorText: { fontFamily: F.sansSemibold, fontSize: 13.5, color: C.textMuted },
  authorTextActive: { color: C.primaryContrast },

  noteInput: { backgroundColor: C.surfaceInset, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, padding: 13, paddingHorizontal: 14, fontFamily: F.sans, fontSize: 14, color: C.text, marginBottom: 16 },

  keypad: { backgroundColor: C.bgElev, borderTopWidth: 1.5, borderTopColor: C.border, padding: 12, paddingHorizontal: 16, gap: 10 },
  keypadGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  key: { width: '30%', flexGrow: 1, paddingVertical: 15, borderRadius: 13, backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  keyText: { fontFamily: F.mono, fontSize: 22, fontWeight: '700', color: C.text },
  keyDel: { color: C.textMuted, fontSize: 20 },

  confirmBtn: { backgroundColor: C.accent, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  confirmDisabled: { opacity: 0.4 },
  confirmText: { fontFamily: F.sansBold, fontSize: 16, color: C.accentContrast },
});
