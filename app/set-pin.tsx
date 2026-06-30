import React, { useState, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../src/context/AppContext';
import { PIN_SECURE_KEY } from '../src/components/LockScreen';
import { C, F } from '../src/theme';

const PIN_LEN = 4;
const KEYS = ['1','2','3','4','5','6','7','8','9','','0','del'];

export default function SetPinScreen() {
  const insets = useSafeAreaInsets();
  const { saveSettings } = useApp();
  const [phase, setPhase] = useState<'enter' | 'confirm'>('enter');
  const [firstPin, setFirstPin] = useState('');
  const [digits, setDigits] = useState('');
  const [error, setError] = useState(false);
  const shakeX = useRef(new Animated.Value(0)).current;

  const shake = (onDone?: () => void) => {
    setError(true);
    Animated.sequence([
      Animated.timing(shakeX, { toValue: 12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start(() => {
      setError(false);
      setDigits('');
      onDone?.();
    });
  };

  const press = async (k: string) => {
    if (k === '') return;
    if (k === 'del') { setDigits(d => d.slice(0, -1)); return; }
    if (digits.length >= PIN_LEN) return;
    const next = digits + k;
    setDigits(next);
    if (next.length < PIN_LEN) return;

    if (phase === 'enter') {
      setFirstPin(next);
      setDigits('');
      setPhase('confirm');
    } else {
      if (next === firstPin) {
        await SecureStore.setItemAsync(PIN_SECURE_KEY, next);
        await saveSettings({ lockPin: true });
        router.back();
      } else {
        shake(() => {
          setPhase('enter');
          setFirstPin('');
        });
      }
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 24) }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="x" size={20} color={C.text} />
        </Pressable>
        <Text style={styles.title}>Crear PIN</Text>
      </View>

      <View style={styles.middle}>
        <Text style={styles.prompt}>
          {phase === 'enter' ? 'Elegí tu PIN de 4 dígitos' : 'Confirmá el PIN'}
        </Text>
        <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeX }] }]}>
          {Array.from({ length: PIN_LEN }, (_, i) => (
            <View
              key={i}
              style={[styles.dot, i < digits.length && styles.dotFilled, error && styles.dotError]}
            />
          ))}
        </Animated.View>
        {phase === 'confirm' && !error && (
          <Text style={styles.phaseHint}>PIN ingresado — confirmalo</Text>
        )}
      </View>

      <View style={styles.keypad}>
        {KEYS.map((k, idx) => {
          if (k === '') return <View key={idx} style={styles.keyEmpty} />;
          return (
            <Pressable
              key={idx}
              onPress={() => press(k)}
              style={[styles.key, k === 'del' && styles.keyTransparent]}
            >
              <Text style={[styles.keyText, k === 'del' && styles.keyDelText]}>
                {k === 'del' ? '⌫' : k}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 22,
    marginTop: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.surface,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: F.display, fontSize: 24, color: C.text },

  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28 },
  prompt: { fontFamily: F.sansMedium, fontSize: 16, color: C.textMuted },
  phaseHint: {
    fontFamily: F.mono,
    fontSize: 11,
    letterSpacing: 1.5,
    color: C.primary,
    textTransform: 'uppercase',
  },

  dotsRow: { flexDirection: 'row', gap: 20 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: C.ink600 },
  dotFilled: { backgroundColor: C.primary, borderColor: C.primary },
  dotError: { backgroundColor: C.danger, borderColor: C.danger },

  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 32,
    gap: 12,
    marginBottom: 8,
  },
  key: {
    width: '30%',
    flexGrow: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: C.surface,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyEmpty: { width: '30%', flexGrow: 1 },
  keyTransparent: { backgroundColor: 'transparent', borderColor: 'transparent' },
  keyText: { fontFamily: F.mono, fontSize: 26, fontWeight: '700', color: C.text },
  keyDelText: { color: C.textMuted, fontSize: 22 },
});
