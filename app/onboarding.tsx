import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../src/context/AppContext';
import { C, F } from '../src/theme';

export default function OnboardingScreen() {
  const { setUserNames } = useApp();
  const insets = useSafeAreaInsets();
  const [name1, setName1] = useState('');
  const [name2, setName2] = useState('');

  const canConfirm = name1.trim().length > 0 && name2.trim().length > 0;

  const confirm = () => {
    if (!canConfirm) return;
    setUserNames(name1.trim(), name2.trim());
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 32) }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.top}>
        <Text style={styles.title}>NoisyWallet</Text>
        <Text style={styles.sub}>Billetera compartida</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.prompt}>¿Quiénes van a usar la app?</Text>
        <Text style={styles.hint}>Cada celular registra los gastos con el nombre de quien lo usa.</Text>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>persona 1</Text>
          <TextInput
            value={name1}
            onChangeText={setName1}
            placeholder="nombre..."
            placeholderTextColor={C.textSubtle}
            style={styles.input}
            autoCapitalize="words"
            autoFocus
            returnKeyType="next"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>persona 2</Text>
          <TextInput
            value={name2}
            onChangeText={setName2}
            placeholder="nombre..."
            placeholderTextColor={C.textSubtle}
            style={styles.input}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={confirm}
          />
        </View>
      </View>

      <Pressable
        onPress={confirm}
        style={[styles.btn, !canConfirm && styles.btnDisabled]}
        disabled={!canConfirm}
      >
        <Text style={styles.btnText}>Empezar</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
  },
  top: { alignItems: 'center', marginTop: 60 },
  title: { fontFamily: F.display, fontSize: 40, color: C.text },
  sub: { fontFamily: F.mono, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: C.textSubtle, marginTop: 6 },

  form: { gap: 24 },
  prompt: { fontFamily: F.sansSemibold, fontSize: 18, color: C.text, marginBottom: 4 },
  hint: { fontFamily: F.sans, fontSize: 13.5, color: C.textSubtle, lineHeight: 20 },

  field: { gap: 8 },
  fieldLabel: { fontFamily: F.mono, fontSize: 10.5, letterSpacing: 1.8, textTransform: 'uppercase', color: C.textSubtle },
  input: {
    fontFamily: F.sansMedium,
    fontSize: 16,
    color: C.text,
    backgroundColor: C.surface,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },

  btn: {
    backgroundColor: C.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.35 },
  btnText: { fontFamily: F.sansBold, fontSize: 16, color: C.primaryContrast },
});
