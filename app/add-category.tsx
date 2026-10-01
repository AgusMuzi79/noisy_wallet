import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, Alert, StyleSheet, useWindowDimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CategoryIcon, { CATEGORY_ICONS, CATEGORY_COLORS } from '../src/components/CategoryIcon';
import { useApp } from '../src/context/AppContext';
import { useSheet } from '../src/context/SheetContext';
import { C, F, R, hexAlpha } from '../src/theme';

const ICONS = CATEGORY_ICONS;
const PALETTE = CATEGORY_COLORS;
const GUTTER = 24;
const ICON_GAP = 8;

export default function AddCategoryScreen() {
  const { addCategory } = useApp();
  const { openSheet } = useSheet();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const iconSize = Math.floor((width - GUTTER * 2 - ICON_GAP * 5) / 6);
  // Opened from the entry sheet's "Nueva" tile: leaving (save, back button or
  // hardware back) reopens the sheet with its draft, using the new category.
  const fromSheet = useLocalSearchParams<{ from?: string }>().from === 'sheet';
  const createdId = useRef<string | null>(null);
  const openSheetRef = useRef(openSheet);
  openSheetRef.current = openSheet;
  useEffect(() => () => {
    if (fromSheet) {
      openSheetRef.current('expense', { keepDraft: true, catId: createdId.current ?? undefined });
    }
  }, [fromSheet]);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<string>(ICONS[0]);
  const [color, setColor] = useState(PALETTE[0]);
  const [saving, setSaving] = useState(false);

  const canSave = name.trim().length > 0 && !saving;
  const backLabel = fromSheet ? 'Volver al gasto' : 'Categorías';

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      createdId.current = await addCategory({ name: name.trim(), icon, color });
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo guardar');
      setSaving(false);
    }
  };

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel={backLabel}
              style={({ pressed }) => [styles.backBtn, pressed && { backgroundColor: C.surface }]}
            >
              <Feather name="chevron-left" size={20} color={C.textMuted} />
              <Text style={styles.backText}>{backLabel}</Text>
            </Pressable>
          </View>
          <Text style={styles.title}>Nueva categoría</Text>

          {/* Live preview — same tile as the entry sheet */}
          <View style={styles.previewCard}>
            <View style={[styles.previewTile, { borderColor: color, backgroundColor: hexAlpha(color, 0.14) }]}>
              <CategoryIcon icon={icon} size={21} color={color} />
              <Text style={styles.previewName} numberOfLines={1}>{name.trim() || 'Nombre'}</Text>
            </View>
            <Text style={styles.previewHint}>Así va a aparecer cuando anotes un gasto.</Text>
          </View>

          <Text style={styles.kicker}>// nombre</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ej. Mascotas"
            placeholderTextColor={C.textSubtle}
            maxLength={18}
            style={styles.nameInput}
            autoFocus
          />

          <Text style={styles.kicker}>// ícono</Text>
          <View style={styles.iconGrid}>
            {ICONS.map(ic => {
              const on = icon === ic;
              return (
                <Pressable
                  key={ic}
                  onPress={() => setIcon(ic)}
                  accessibilityRole="button"
                  accessibilityLabel={ic.replace('mci:', '')}
                  accessibilityState={{ selected: on }}
                  style={[
                    styles.iconBtn,
                    { width: iconSize, height: iconSize },
                    on && { borderColor: color, backgroundColor: hexAlpha(color, 0.16) },
                  ]}
                >
                  <CategoryIcon icon={ic} size={20} color={on ? color : C.textMuted} />
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.kicker}>// color</Text>
          <View style={styles.colorRow}>
            {PALETTE.map(col => {
              const on = color === col;
              return (
                <Pressable
                  key={col}
                  onPress={() => setColor(col)}
                  accessibilityRole="button"
                  accessibilityLabel="Color"
                  accessibilityState={{ selected: on }}
                  style={[styles.colorRing, on && { borderColor: col }]}
                >
                  <View style={[styles.colorDot, { backgroundColor: col }]} />
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={save}
            disabled={!canSave}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSave }}
            style={({ pressed }) => [styles.saveBtn, !canSave && styles.saveBtnOff, pressed && styles.pressed]}
          >
            <Text style={styles.saveText}>
              {saving ? 'Guardando…' : fromSheet ? 'Crear y usar' : 'Crear categoría'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.bg },
  pressed: { transform: [{ translateY: 1 }] },
  scroll: { paddingHorizontal: GUTTER, paddingTop: 4, paddingBottom: 40 },

  header: { height: 44, flexDirection: 'row', alignItems: 'center' },
  backBtn: {
    height: 44, marginLeft: -10, paddingHorizontal: 10, borderRadius: R.lg,
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  backText: { fontFamily: F.sans, fontSize: 14.5, color: C.textMuted },
  title: { marginTop: 6, fontFamily: F.display, fontSize: 32, letterSpacing: -0.6, color: C.text },

  previewCard: {
    marginTop: 22, padding: 18, borderRadius: 16, backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border,
    flexDirection: 'row', alignItems: 'center', gap: 18,
  },
  previewTile: {
    width: 74, paddingVertical: 11, paddingHorizontal: 4, borderRadius: R.tile, borderWidth: 1.5,
    alignItems: 'center', gap: 7,
  },
  previewName: { maxWidth: 66, fontFamily: F.sansSemibold, fontSize: 11.5, color: C.text },
  previewHint: { flex: 1, fontFamily: F.sans, fontSize: 13, lineHeight: 19.5, color: C.textMuted },

  kicker: { marginTop: 24, fontFamily: F.mono, fontSize: 11, letterSpacing: 2.2, textTransform: 'uppercase', color: C.textSubtle },
  nameInput: {
    marginTop: 10, height: 50, paddingHorizontal: 14, borderRadius: R.lg,
    backgroundColor: C.surfaceInset, borderWidth: 1.5, borderColor: C.border,
    fontFamily: F.sans, fontSize: 15.5, color: C.text,
  },

  iconGrid: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: ICON_GAP },
  iconBtn: { borderRadius: R.lg, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },

  colorRow: { marginTop: 12, flexDirection: 'row', justifyContent: 'space-between' },
  colorRing: {
    width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: 'transparent',
    alignItems: 'center', justifyContent: 'center',
  },
  colorDot: { width: 28, height: 28, borderRadius: 14 },

  saveBtn: { marginTop: 32, height: 52, borderRadius: R.lg, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  saveBtnOff: { opacity: 0.4 },
  saveText: { fontFamily: F.sansBold, fontSize: 16, color: C.primaryContrast },
});
