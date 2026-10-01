import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { C, F, fmtARS, useReduceMotion } from '../theme';

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const ROLL = Easing.bezier(0.16, 1, 0.3, 1);

type Props = {
  value: number;
  color: string;
  fontSize?: number;
  accessibilityLabel?: string;
};

// Rolling-digit balance: one column per visible digit, each a 0–9 strip that
// slides with translateY. Columns are keyed by position from the right so a
// value change rolls the existing columns; lower digits settle first.
export default function Odometer({ value, color, fontSize = 58, accessibilityLabel }: Props) {
  const reduce = useReduceMotion();
  const lh = Math.round(fontSize * 1.12);
  const colW = fontSize * 0.62;
  const cols = useRef(new Map<number, Animated.Value>()).current;
  const mounted = useRef(false);

  const text = fmtARS(value);            // e.g. "1.234.567"
  const digitCount = text.replace(/\./g, '').length;

  // Lazily create a column value; new columns after mount start at 0 and roll
  const colValue = (pos: number, digit: number) => {
    let v = cols.get(pos);
    if (!v) {
      v = new Animated.Value(mounted.current ? 0 : -digit * lh);
      cols.set(pos, v);
    }
    return v;
  };

  useEffect(() => {
    const digits = text.replace(/\./g, '');
    const anims: Animated.CompositeAnimation[] = [];
    for (let i = 0; i < digits.length; i++) {
      const pos = digits.length - 1 - i;
      const target = -Number(digits[i]) * lh;
      const v = colValue(pos, Number(digits[i]));
      if (reduce) { v.setValue(target); continue; }
      anims.push(Animated.timing(v, {
        toValue: target,
        duration: 700 + pos * 70,
        easing: ROLL,
        useNativeDriver: true,
      }));
    }
    mounted.current = true;
    const all = Animated.parallel(anims);
    all.start();
    return () => all.stop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, lh, reduce]);

  let digitIdx = 0;
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
      style={styles.row}
    >
      {value < 0 && (
        <Text style={[styles.minus, { color, fontSize: fontSize * 0.69, lineHeight: lh }]}>−</Text>
      )}
      <Text style={[styles.currency, { fontSize: fontSize * 0.45, paddingBottom: fontSize * 0.12 }]}>$</Text>
      {text.split('').map((ch, i) => {
        if (ch === '.') {
          return (
            <Text
              key={`dot-${digitCount - digitIdx}`}
              style={[styles.glyph, { color, fontSize, lineHeight: lh, width: fontSize * 0.36 }]}
            >.</Text>
          );
        }
        const pos = digitCount - 1 - digitIdx++;
        const v = colValue(pos, Number(ch));
        return (
          <View key={`d-${pos}`} style={{ width: colW, height: lh, overflow: 'hidden' }}>
            <Animated.View style={{ transform: [{ translateY: v }] }}>
              {DIGITS.map(d => (
                <Text key={d} style={[styles.glyph, { color, fontSize, lineHeight: lh, height: lh, width: colW }]}>{d}</Text>
              ))}
            </Animated.View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  minus: { fontFamily: F.monoBold, marginRight: 2 },
  currency: { fontFamily: F.monoBold, color: C.textSubtle, marginRight: 6 },
  glyph: { fontFamily: F.monoBold, textAlign: 'center', includeFontPadding: false },
});
