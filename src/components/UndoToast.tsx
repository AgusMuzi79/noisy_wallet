import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { useSheet } from '../context/SheetContext';
import { C, F, R, useReduceMotion } from '../theme';

// Floats just above the pill nav (nav bottom offset + pill height + gap)
const NAV_CLEARANCE = 16 + 55 + 12;

export default function UndoToast() {
  const { deleteMovement } = useApp();
  const { toast, dismissToast, markAdded } = useSheet();
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!toast) return;
    anim.setValue(reduce ? 1 : 0);
    if (!reduce) Animated.timing(anim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  }, [toast?.key, reduce, anim]);

  if (!toast) return null;

  const undo = async () => {
    const id = toast.movementId;
    dismissToast();
    markAdded(null);
    await deleteMovement(id);
  };

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      style={[
        styles.toast,
        {
          bottom: Math.max(insets.bottom, 8) + NAV_CLEARANCE,
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
        },
      ]}
    >
      <Text style={styles.text} numberOfLines={1}>{toast.text}</Text>
      <Pressable
        onPress={undo}
        accessibilityRole="button"
        style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
      >
        <Text style={styles.btnText}>Deshacer</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    paddingRight: 6,
    paddingLeft: 16,
    borderRadius: R.tile,
    backgroundColor: C.surface2,
    borderWidth: 1.5,
    borderColor: C.borderStrong,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 14,
  },
  text: { flex: 1, minWidth: 0, fontFamily: F.sans, fontSize: 13.5, color: C.text },
  btn: { height: 44, paddingHorizontal: 14, borderRadius: R.seg, alignItems: 'center', justifyContent: 'center' },
  btnPressed: { backgroundColor: C.surface },
  btnText: { fontFamily: F.sansBold, fontSize: 14, color: C.primary },
});
