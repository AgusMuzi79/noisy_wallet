import React, { useState } from 'react';
import { View, Text, TextInput, Switch, Pressable, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { C, F, fmtARS } from '../../src/theme';

export default function IncomeScreen() {
  const { state, dispatch } = useApp();
  const insets = useSafeAreaInsets();
  const [extraRaw, setExtraRaw] = useState('');
  const [extraNote, setExtraNote] = useState('');

  const monthIncome = state.sources.filter(s => s.active).reduce((a, s) => a + s.amount, 0);
  const extraVal = parseInt(extraRaw || '0', 10);

  const addExtra = () => {
    if (!extraVal) return;
    dispatch({
      type: 'ADD_MOVEMENT',
      payload: {
        id: String(Date.now()),
        type: 'income',
        amount: extraVal,
        author: 'Agus',
        date: 'Hoy',
        note: extraNote.trim() || 'Ingreso extra',
      },
    });
    setExtraRaw('');
    setExtraNote('');
  };

  return (
    <LinearGradient colors={['#1B1726', '#0F0D15']} style={styles.flex}>
      <View style={[styles.flex, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Ingresos</Text>
          <Text style={styles.subtitle}>Las fuentes activas se acreditan solas el 1ro de cada mes.</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Monthly total */}
          <View style={styles.totalCard}>
            <View>
              <Text style={styles.totalKicker}>total mensual</Text>
              <Text style={styles.totalAmount}>${fmtARS(monthIncome)}</Text>
            </View>
            <Feather name="trending-up" size={22} color={C.primary} />
          </View>

          {/* Recurring sources */}
          <Text style={styles.sectionKicker}>fuentes recurrentes</Text>
          <View style={styles.sourcesList}>
            {state.sources.map(s => (
              <View key={s.id} style={[styles.sourceCard, !s.active && styles.sourceInactive]}>
                <View style={styles.sourceNameRow}>
                  <TextInput
                    value={s.name}
                    onChangeText={v => dispatch({ type: 'UPDATE_SOURCE', id: s.id, patch: { name: v } })}
                    style={styles.sourceName}
                    placeholderTextColor={C.textMuted}
                  />
                  <Pressable
                    onPress={() => dispatch({ type: 'REMOVE_SOURCE', id: s.id })}
                    style={styles.trashBtn}
                  >
                    <Feather name="trash-2" size={15} color={C.textSubtle} />
                  </Pressable>
                </View>
                <View style={styles.sourceAmtRow}>
                  <View style={styles.sourceAmtInput}>
                    <Text style={styles.sourceAmtSign}>$</Text>
                    <TextInput
                      value={String(s.amount)}
                      onChangeText={v =>
                        dispatch({ type: 'UPDATE_SOURCE', id: s.id, patch: { amount: parseInt(v.replace(/\D/g, '') || '0', 10) } })
                      }
                      keyboardType="numeric"
                      style={styles.sourceAmtText}
                    />
                  </View>
                  <Switch
                    value={s.active}
                    onValueChange={v => dispatch({ type: 'UPDATE_SOURCE', id: s.id, patch: { active: v } })}
                    trackColor={{ false: C.surface2, true: C.primary }}
                    thumbColor={C.text}
                  />
                </View>
              </View>
            ))}
          </View>

          <Pressable
            onPress={() => dispatch({ type: 'ADD_SOURCE', payload: { id: String(Date.now()), name: 'Nueva fuente', amount: 0, active: true } })}
            style={styles.addSourceBtn}
          >
            <Text style={styles.addSourceText}>+ Agregar fuente</Text>
          </Pressable>

          {/* Extra income */}
          <Text style={[styles.sectionKicker, { marginTop: 28 }]}>ingreso extra puntual</Text>
          <View style={styles.extraCard}>
            <View style={styles.extraAmtRow}>
              <Text style={styles.extraSign}>$</Text>
              <TextInput
                value={extraRaw}
                onChangeText={v => setExtraRaw(v.replace(/\D/g, ''))}
                placeholder="0"
                placeholderTextColor={C.textSubtle}
                keyboardType="numeric"
                style={styles.extraInput}
              />
            </View>
            <TextInput
              value={extraNote}
              onChangeText={setExtraNote}
              placeholder="Nota (venta, laburo suelto…)"
              placeholderTextColor={C.textSubtle}
              style={styles.extraNoteInput}
            />
            <Pressable
              onPress={addExtra}
              style={[styles.extraBtn, !extraVal && styles.extraBtnDisabled]}
              disabled={!extraVal}
            >
              <Text style={styles.extraBtnText}>Sumar al saldo</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingHorizontal: 22, marginTop: 8, marginBottom: 20 },
  title: { fontFamily: F.display, fontSize: 26, color: C.text },
  subtitle: { fontFamily: F.sans, fontSize: 13, color: C.textMuted, marginTop: 4 },
  scroll: { paddingHorizontal: 22, paddingBottom: 110 },

  totalCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, paddingHorizontal: 16, borderRadius: 16, backgroundColor: C.primarySoft, borderWidth: 1.5, borderColor: C.borderViolet, marginBottom: 18 },
  totalKicker: { fontFamily: F.mono, fontSize: 10.5, letterSpacing: 1.8, textTransform: 'uppercase', color: C.textSubtle },
  totalAmount: { fontFamily: F.mono, fontSize: 26, fontWeight: '700', color: C.text, marginTop: 3 },

  sectionKicker: { fontFamily: F.mono, fontSize: 10.5, letterSpacing: 1.8, textTransform: 'uppercase', color: C.textSubtle, marginBottom: 10 },
  sourcesList: { gap: 10 },
  sourceCard: { padding: 14, borderRadius: 15, backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border },
  sourceInactive: { opacity: 0.5 },
  sourceNameRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sourceName: { flex: 1, fontFamily: F.sansSemibold, fontSize: 14.5, color: C.text, backgroundColor: 'transparent' },
  trashBtn: { width: 30, height: 30, borderRadius: 9, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center' },
  sourceAmtRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, gap: 10 },
  sourceAmtInput: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.surfaceInset, borderWidth: 1.5, borderColor: C.border, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 7 },
  sourceAmtSign: { fontFamily: F.mono, fontSize: 14, color: C.textSubtle },
  sourceAmtText: { flex: 1, fontFamily: F.mono, fontSize: 15, fontWeight: '700', color: C.text },

  addSourceBtn: { marginTop: 14, padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, alignItems: 'center' },
  addSourceText: { fontFamily: F.sansMedium, fontSize: 14, color: C.textMuted },

  extraCard: { padding: 16, borderRadius: 16, backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, gap: 10 },
  extraAmtRow: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.surfaceInset, borderWidth: 1.5, borderColor: C.border, borderRadius: 11, paddingHorizontal: 13, paddingVertical: 11 },
  extraSign: { fontFamily: F.mono, fontSize: 18, fontWeight: '700', color: C.accent },
  extraInput: { flex: 1, fontFamily: F.mono, fontSize: 22, fontWeight: '700', color: C.text },
  extraNoteInput: { backgroundColor: C.surfaceInset, borderWidth: 1.5, borderColor: C.border, borderRadius: 11, paddingHorizontal: 13, paddingVertical: 11, fontFamily: F.sans, fontSize: 13.5, color: C.text },
  extraBtn: { backgroundColor: C.accent, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  extraBtnDisabled: { opacity: 0.4 },
  extraBtnText: { fontFamily: F.sansBold, fontSize: 15, color: C.accentContrast },
});
