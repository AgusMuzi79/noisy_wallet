import React, { useState } from 'react';
import { View, Text, TextInput, Switch, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../src/context/AppContext';
import { C, F, R } from '../src/theme';

const TIME_OPTS = [
  { label: '20:00', hour: 20 },
  { label: '21:00', hour: 21 },
  { label: '22:00', hour: 22 },
];

const initial = (name: string) => (name.trim()[0] || '?').toUpperCase();

function Toggle({ value, onValueChange, label }: {
  value: boolean;
  onValueChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      accessibilityLabel={label}
      trackColor={{ false: C.surface2, true: C.primary }}
      thumbColor={C.text}
    />
  );
}

export default function SettingsScreen() {
  const { state, saveSettings, setUserNames } = useApp();
  const insets = useSafeAreaInsets();
  const [name1, setName1] = useState(state.user1Name);
  const [name2, setName2] = useState(state.user2Name);

  const saveNames = () => {
    const n1 = name1.trim();
    const n2 = name2.trim();
    if (n1 && n2) setUserNames(n1, n2);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Inicio"
            style={({ pressed }) => [styles.backBtn, pressed && { backgroundColor: C.surface }]}
          >
            <Feather name="chevron-left" size={20} color={C.textMuted} />
            <Text style={styles.backText}>Inicio</Text>
          </Pressable>
        </View>
        <Text style={styles.title}>Ajustes</Text>

        {/* Reminder */}
        <Text style={[styles.kicker, { marginTop: 26 }]}>// recordatorio</Text>
        <View style={[styles.row, styles.rowTall]}>
          <View style={styles.grow}>
            <Text style={styles.rowTitle}>Aviso diario</Text>
            <Text style={styles.rowDesc}>"¿Anotaste los gastos de hoy?"</Text>
          </View>
          <Toggle
            value={state.notifEnabled}
            onValueChange={v => saveSettings({ notifEnabled: v })}
            label="Aviso diario"
          />
        </View>
        <View style={[styles.row, !state.notifEnabled && styles.dimmed]}>
          <Text style={[styles.rowTitle, styles.grow]}>Hora</Text>
          <View style={styles.seg}>
            {TIME_OPTS.map(t => {
              const on = state.notifHour === t.hour;
              return (
                <Pressable
                  key={t.hour}
                  onPress={() => saveSettings({ notifHour: t.hour })}
                  disabled={!state.notifEnabled}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on, disabled: !state.notifEnabled }}
                  style={[styles.segBtn, on && styles.segBtnOn]}
                >
                  <Text style={[styles.segText, on && styles.segTextOn]}>{t.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* People */}
        <Text style={[styles.kicker, { marginTop: 30 }]}>// quiénes usan la billetera</Text>
        <View style={styles.row}>
          <View style={[styles.avatar, { backgroundColor: C.primarySoft }]}>
            <Text style={[styles.avatarText, { color: C.primary }]}>{initial(name1)}</Text>
          </View>
          <TextInput
            value={name1}
            onChangeText={setName1}
            onEndEditing={saveNames}
            accessibilityLabel="Persona 1"
            style={styles.nameInput}
            placeholderTextColor={C.textSubtle}
            autoCapitalize="words"
            returnKeyType="next"
          />
        </View>
        <View style={styles.row}>
          <View style={[styles.avatar, { backgroundColor: C.accentSoft }]}>
            <Text style={[styles.avatarText, { color: C.accent }]}>{initial(name2)}</Text>
          </View>
          <TextInput
            value={name2}
            onChangeText={setName2}
            onEndEditing={saveNames}
            accessibilityLabel="Persona 2"
            style={styles.nameInput}
            placeholderTextColor={C.textSubtle}
            autoCapitalize="words"
            returnKeyType="done"
          />
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  grow: { flex: 1, minWidth: 0 },
  scroll: { paddingHorizontal: 24, paddingTop: 4, paddingBottom: 40 },

  header: { height: 44, flexDirection: 'row', alignItems: 'center' },
  backBtn: {
    height: 44, marginLeft: -10, paddingHorizontal: 10, borderRadius: R.lg,
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  backText: { fontFamily: F.sans, fontSize: 14.5, color: C.textMuted },
  title: { marginTop: 6, fontFamily: F.display, fontSize: 32, letterSpacing: -0.6, color: C.text },

  kicker: { paddingBottom: 4, fontFamily: F.mono, fontSize: 11, letterSpacing: 2.2, textTransform: 'uppercase', color: C.textSubtle },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  rowTall: { paddingVertical: 14 },
  dimmed: { opacity: 0.4 },
  rowTitle: { fontFamily: F.sansSemibold, fontSize: 15, color: C.text },
  rowDesc: { marginTop: 2, fontFamily: F.sans, fontSize: 12.5, color: C.textSubtle },

  seg: { flexDirection: 'row', padding: 3, borderRadius: 11, backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border },
  segBtn: { height: 40, paddingHorizontal: 10, borderRadius: R.md, alignItems: 'center', justifyContent: 'center' },
  segBtnOn: { backgroundColor: C.primary },
  segText: { fontFamily: F.mono, fontSize: 12, color: C.textMuted },
  segTextOn: { color: C.primaryContrast },

  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: F.monoBold, fontSize: 13 },
  nameInput: { flex: 1, minWidth: 0, paddingVertical: 4, fontFamily: F.sansSemibold, fontSize: 15, color: C.text },
});
