import React, { useState } from 'react';
import { View, Text, TextInput, Switch, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useApp } from '../src/context/AppContext';
import { C, F } from '../src/theme';

const TIME_OPTS = [
  { label: '20:00', hour: 20 },
  { label: '21:00', hour: 21 },
  { label: '22:00', hour: 22 },
];

const PIN_KEY = 'billetera_pin';

export default function SettingsScreen() {
  const { state, saveSettings, setBio, setUserNames } = useApp();
  const [name1, setName1] = useState(state.user1Name);
  const [name2, setName2] = useState(state.user2Name);

  const handlePinToggle = async (v: boolean) => {
    if (v) {
      router.push('/set-pin');
    } else {
      const SecureStore = await import('expo-secure-store');
      await SecureStore.deleteItemAsync(PIN_KEY);
      setBio(false);
      await saveSettings({ lockPin: false });
    }
  };

  const saveNames = () => {
    const n1 = name1.trim();
    const n2 = name2.trim();
    if (n1 && n2) setUserNames(n1, n2);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={20} color={C.text} />
        </Pressable>
        <Text style={styles.title}>Ajustes</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <Text style={styles.sectionLabel}>personas</Text>
        <View style={styles.card}>
          <View style={styles.nameRow}>
            <Text style={styles.nameLabel}>persona 1</Text>
            <TextInput
              value={name1}
              onChangeText={setName1}
              onEndEditing={saveNames}
              style={styles.nameInput}
              placeholderTextColor={C.textSubtle}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.nameRow}>
            <Text style={styles.nameLabel}>persona 2</Text>
            <TextInput
              value={name2}
              onChangeText={setName2}
              onEndEditing={saveNames}
              style={styles.nameInput}
              placeholderTextColor={C.textSubtle}
              autoCapitalize="words"
              returnKeyType="done"
            />
          </View>
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>recordatorio</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View>
              <Text style={styles.rowTitle}>Aviso diario</Text>
              <Text style={styles.rowDesc}>"¿Registraste los gastos de hoy?"</Text>
            </View>
            <Switch
              value={state.notifEnabled}
              onValueChange={v => saveSettings({ notifEnabled: v })}
              trackColor={{ false: C.surface2, true: C.primary }}
              thumbColor={C.text}
            />
          </View>
          <View style={styles.divider} />
          <View style={[styles.row, !state.notifEnabled && styles.dimmed]}>
            <Text style={styles.rowTitle}>Horario</Text>
            <View style={styles.timeRow}>
              {TIME_OPTS.map(t => (
                <Pressable
                  key={t.hour}
                  onPress={() => saveSettings({ notifHour: t.hour })}
                  style={[styles.pill, state.notifHour === t.hour && styles.pillActive]}
                  disabled={!state.notifEnabled}
                >
                  <Text style={[styles.pillText, state.notifHour === t.hour && styles.pillTextActive]}>
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>seguridad</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowTitle}>Bloqueo con PIN</Text>
            <Switch
              value={state.lockPin}
              onValueChange={handlePinToggle}
              trackColor={{ false: C.surface2, true: C.primary }}
              thumbColor={C.text}
            />
          </View>
          <View style={styles.divider} />
          <View style={[styles.row, !state.lockPin && styles.dimmed]}>
            <Text style={styles.rowTitle}>Huella / Face ID</Text>
            <Switch
              value={state.bio}
              onValueChange={v => setBio(v)}
              trackColor={{ false: C.surface2, true: C.primary }}
              thumbColor={C.text}
              disabled={!state.lockPin}
            />
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 22, paddingTop: 56, paddingBottom: 22 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: F.display, fontSize: 24, color: C.text },
  scroll: { paddingHorizontal: 22, paddingBottom: 40 },

  sectionLabel: { fontFamily: F.mono, fontSize: 10.5, letterSpacing: 1.8, textTransform: 'uppercase', color: C.textSubtle, marginBottom: 10 },
  card: { borderRadius: 16, backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 16 },
  divider: { height: 1.5, backgroundColor: C.border },
  dimmed: { opacity: 0.4 },

  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  nameLabel: { fontFamily: F.mono, fontSize: 10.5, letterSpacing: 1.4, textTransform: 'uppercase', color: C.textSubtle, width: 80 },
  nameInput: { flex: 1, fontFamily: F.sansMedium, fontSize: 15, color: C.text, textAlign: 'right' },

  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  rowTitle: { fontFamily: F.sansSemibold, fontSize: 14.5, color: C.text },
  rowDesc: { fontFamily: F.sans, fontSize: 12.5, color: C.textSubtle, marginTop: 2 },

  timeRow: { flexDirection: 'row', gap: 6 },
  pill: { paddingVertical: 7, paddingHorizontal: 11, borderRadius: 9, borderWidth: 1.5, borderColor: C.border },
  pillActive: { backgroundColor: C.primary, borderColor: C.primary },
  pillText: { fontFamily: F.mono, fontSize: 12, color: C.textMuted },
  pillTextActive: { color: C.primaryContrast },
});
