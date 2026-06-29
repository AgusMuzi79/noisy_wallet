import React from 'react';
import { View, Text, Switch, Pressable, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../src/context/AppContext';
import { C, F } from '../src/theme';

const TIME_OPTS = [
  { label: '20:00', hour: 20 },
  { label: '21:00', hour: 21 },
  { label: '22:00', hour: 22 },
];

export default function SettingsScreen() {
  const { state, dispatch } = useApp();
  const insets = useSafeAreaInsets();

  const set = (patch: any) => dispatch({ type: 'SET_SETTINGS', patch });

  return (
    <LinearGradient colors={['#1B1726', '#0F0D15']} style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={20} color={C.text} />
        </Pressable>
        <Text style={styles.title}>Ajustes</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Notification */}
        <Text style={styles.sectionLabel}>recordatorio</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingTitle}>Aviso diario</Text>
              <Text style={styles.settingDesc}>"¿Registraste los gastos de hoy?"</Text>
            </View>
            <Switch
              value={state.notifEnabled}
              onValueChange={v => set({ notifEnabled: v })}
              trackColor={{ false: C.surface2, true: C.primary }}
              thumbColor={C.text}
            />
          </View>

          <View style={styles.divider} />

          <View style={[styles.settingRow, !state.notifEnabled && styles.dimmed]}>
            <Text style={styles.settingTitle}>Horario</Text>
            <View style={styles.timeRow}>
              {TIME_OPTS.map(t => (
                <Pressable
                  key={t.hour}
                  onPress={() => set({ notifHour: t.hour })}
                  style={[styles.timePill, state.notifHour === t.hour && styles.timePillActive]}
                  disabled={!state.notifEnabled}
                >
                  <Text style={[styles.timePillText, state.notifHour === t.hour && styles.timePillTextActive]}>
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* Security */}
        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>seguridad</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingIconRow}>
              <Feather name="lock" size={19} color={C.textMuted} />
              <Text style={styles.settingTitle}>Bloqueo con PIN</Text>
            </View>
            <Switch
              value={state.lockPin}
              onValueChange={v => set({ lockPin: v })}
              trackColor={{ false: C.surface2, true: C.primary }}
              thumbColor={C.text}
            />
          </View>

          <View style={styles.divider} />

          <View style={[styles.settingRow, !state.lockPin && styles.dimmed]}>
            <Text style={styles.settingTitle}>Huella / Face ID</Text>
            <Switch
              value={state.bio}
              onValueChange={v => set({ bio: v })}
              trackColor={{ false: C.surface2, true: C.primary }}
              thumbColor={C.text}
              disabled={!state.lockPin}
            />
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 22, marginTop: 8, marginBottom: 22 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: F.display, fontSize: 24, color: C.text },
  scroll: { paddingHorizontal: 22, paddingBottom: 40 },

  sectionLabel: { fontFamily: F.mono, fontSize: 10.5, letterSpacing: 1.8, textTransform: 'uppercase', color: C.textSubtle, marginBottom: 10 },
  card: { borderRadius: 16, backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 16 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  settingIconRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  settingTitle: { fontFamily: F.sansSemibold, fontSize: 14.5, color: C.text },
  settingDesc: { fontFamily: F.sans, fontSize: 12.5, color: C.textSubtle, marginTop: 2 },
  divider: { height: 1.5, backgroundColor: C.border },
  dimmed: { opacity: 0.4 },

  timeRow: { flexDirection: 'row', gap: 6 },
  timePill: { paddingVertical: 7, paddingHorizontal: 11, borderRadius: 9, borderWidth: 1.5, borderColor: C.border },
  timePillActive: { backgroundColor: C.primary, borderColor: C.primary },
  timePillText: { fontFamily: F.mono, fontSize: 12, color: C.textMuted },
  timePillTextActive: { color: C.primaryContrast },
});
