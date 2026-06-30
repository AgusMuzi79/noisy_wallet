import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F } from '../theme';

export const PIN_SECURE_KEY = '@billetera:pin';
const PIN_LEN = 4;
const KEYS = ['1','2','3','4','5','6','7','8','9','bio','0','del'] as const;
type Key = typeof KEYS[number];

interface Props {
  bioEnabled: boolean;
  onUnlock: () => void;
}

export function LockScreen({ bioEnabled, onUnlock }: Props) {
  const insets = useSafeAreaInsets();
  const [digits, setDigits] = useState('');
  const [error, setError] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const shakeX = useRef(new Animated.Value(0)).current;

  const triggerBio = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Desbloquear Billetera',
      fallbackLabel: 'Usar PIN',
      cancelLabel: 'Cancelar',
    });
    if (result.success) onUnlock();
  };

  useEffect(() => {
    if (!bioEnabled) return;
    (async () => {
      const hw = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (hw && enrolled) {
        setBioAvailable(true);
        triggerBio();
      }
    })();
  }, []);

  const shake = () => {
    setError(true);
    Animated.sequence([
      Animated.timing(shakeX, { toValue: 12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start(() => {
      setDigits('');
      setError(false);
    });
  };

  const press = async (k: Key) => {
    if (k === 'bio') { triggerBio(); return; }
    if (k === 'del') { setDigits(d => d.slice(0, -1)); return; }
    if (digits.length >= PIN_LEN) return;
    const next = digits + k;
    setDigits(next);
    if (next.length === PIN_LEN) {
      const stored = await SecureStore.getItemAsync(PIN_SECURE_KEY);
      if (next === stored) {
        onUnlock();
      } else {
        shake();
      }
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 24) }]}>
      <View style={styles.top}>
        <Text style={styles.appName}>NoisyWallet</Text>
      </View>

      <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeX }] }]}>
        {Array.from({ length: PIN_LEN }, (_, i) => (
          <View
            key={i}
            style={[styles.dot, i < digits.length && styles.dotFilled, error && styles.dotError]}
          />
        ))}
      </Animated.View>

      <View style={styles.keypad}>
        {KEYS.map(k => {
          if (k === 'bio') {
            return bioAvailable ? (
              <Pressable key="bio" onPress={() => press('bio')} style={styles.key}>
                <MaterialCommunityIcons name="fingerprint" size={30} color={C.primary} />
              </Pressable>
            ) : (
              <View key="bio" style={styles.keyEmpty} />
            );
          }
          return (
            <Pressable
              key={k}
              onPress={() => press(k as Key)}
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
  container: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  top: { alignItems: 'center', marginTop: 64 },
  appName: { fontFamily: F.display, fontSize: 38, color: C.text },

  dotsRow: { flexDirection: 'row', gap: 20 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: C.ink600 },
  dotFilled: { backgroundColor: C.primary, borderColor: C.primary },
  dotError: { backgroundColor: C.danger, borderColor: C.danger },

  keypad: {
    width: '100%',
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
  keyEmpty: { width: '30%', flexGrow: 1, paddingVertical: 16 },
  keyTransparent: { backgroundColor: 'transparent', borderColor: 'transparent' },
  keyText: { fontFamily: F.mono, fontSize: 26, fontWeight: '700', color: C.text },
  keyDelText: { color: C.textMuted, fontSize: 22 },
});
