import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../src/context/AppContext';
import { C, F, hexAlpha } from '../src/theme';

const ICONS = [
  'shopping-cart','home','zap','truck','navigation','heart','tag','coffee',
  'gift','send','book','credit-card','star','music','camera','sun',
] as const;

const PALETTE = [
  '#9B7CF0','#9FE870','#2BA597','#E0A52E',
  '#E5604A','#F5D020','#C3B0F7','#8B83A6',
];

export default function AddCategoryScreen() {
  const { dispatch } = useApp();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(ICONS[0]);
  const [color, setColor] = useState(PALETTE[0]);

  const canSave = name.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    dispatch({
      type: 'ADD_CATEGORY',
      payload: { key: `c${Date.now()}`, name: name.trim(), icon, color },
    });
    router.back();
  };

  return (
    <LinearGradient colors={['#1B1726', '#0F0D15']} style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={20} color={C.text} />
        </Pressable>
        <Text style={styles.screenTitle}>nueva categoría</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Preview */}
        <View style={styles.preview}>
          <View style={[styles.previewIcon, { backgroundColor: hexAlpha(color, 0.16) }]}>
            <Feather name={icon as any} size={30} color={color} />
          </View>
          <Text style={styles.previewName}>{name.trim() || 'Sin nombre'}</Text>
        </View>

        {/* Name */}
        <Text style={styles.fieldLabel}>nombre</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ej. Mascotas"
          placeholderTextColor={C.textSubtle}
          style={styles.nameInput}
          autoFocus
        />

        {/* Icon picker */}
        <Text style={styles.fieldLabel}>ícono</Text>
        <View style={styles.iconGrid}>
          {ICONS.map(ic => {
            const on = icon === ic;
            return (
              <Pressable
                key={ic}
                onPress={() => setIcon(ic)}
                style={[styles.iconBtn, on && { backgroundColor: hexAlpha(color, 0.2), borderColor: color }]}
              >
                <Feather name={ic as any} size={21} color={on ? color : C.textMuted} />
              </Pressable>
            );
          })}
        </View>

        {/* Color picker */}
        <Text style={styles.fieldLabel}>color</Text>
        <View style={styles.colorGrid}>
          {PALETTE.map(col => {
            const on = color === col;
            return (
              <Pressable
                key={col}
                onPress={() => setColor(col)}
                style={[styles.colorDot, { backgroundColor: col }, on && { borderWidth: 3, borderColor: C.text }]}
              />
            );
          })}
        </View>

        <Pressable onPress={save} style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]} disabled={!canSave}>
          <Text style={styles.saveBtnText}>Guardar categoría</Text>
        </Pressable>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 22, marginTop: 8, marginBottom: 22 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  screenTitle: { fontFamily: F.mono, fontSize: 12, letterSpacing: 1.8, textTransform: 'uppercase', color: C.textSubtle },

  scroll: { paddingHorizontal: 22, paddingBottom: 40 },

  preview: { alignItems: 'center', gap: 12, marginBottom: 26 },
  previewIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  previewName: { fontFamily: F.display, fontSize: 22, color: C.text },

  fieldLabel: { fontFamily: F.mono, fontSize: 10.5, letterSpacing: 1.8, textTransform: 'uppercase', color: C.textSubtle, marginBottom: 10 },
  nameInput: { backgroundColor: C.surfaceInset, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontFamily: F.sans, fontSize: 15, color: C.text, marginBottom: 24 },

  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 24 },
  iconBtn: { width: 46, height: 46, borderRadius: 13, backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },

  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 11, marginBottom: 30 },
  colorDot: { width: 38, height: 38, borderRadius: 19 },

  saveBtn: { backgroundColor: C.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontFamily: F.sansBold, fontSize: 16, color: C.primaryContrast },
});
