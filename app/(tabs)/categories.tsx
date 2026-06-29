import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { C, F, fmtARS, hexAlpha } from '../../src/theme';

export default function CategoriesScreen() {
  const { state } = useApp();
  const insets = useSafeAreaInsets();

  const spentByCat: Record<string, number> = {};
  state.movements.forEach(m => {
    if (m.type === 'expense' && m.catKey) {
      spentByCat[m.catKey] = (spentByCat[m.catKey] || 0) + m.amount;
    }
  });

  return (
    <LinearGradient colors={['#1B1726', '#0F0D15']} style={styles.flex}>
      <View style={[styles.flex, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Categorías</Text>
          <Text style={styles.subtitle}>Tocá una para editarla, o creá las tuyas.</Text>
        </View>

        <View style={styles.grid}>
          {state.categories.map(c => (
            <View key={c.key} style={styles.card}>
              <View style={[styles.cardIcon, { backgroundColor: hexAlpha(c.color, 0.15) }]}>
                <Feather name={c.icon as any} size={22} color={c.color} />
              </View>
              <Text style={styles.cardName}>{c.name}</Text>
              <Text style={styles.cardSpent}>
                {spentByCat[c.key] ? `$${fmtARS(spentByCat[c.key])}` : '—'}
              </Text>
            </View>
          ))}

          {/* Add new */}
          <Pressable onPress={() => router.push('/add-category')} style={styles.addCard}>
            <View style={styles.addIcon}>
              <Feather name="plus" size={22} color={C.primary} />
            </View>
            <Text style={styles.addText}>Nueva categoría</Text>
          </Pressable>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingHorizontal: 22, marginTop: 8, marginBottom: 20 },
  title: { fontFamily: F.display, fontSize: 26, color: C.text },
  subtitle: { fontFamily: F.sans, fontSize: 13, color: C.textMuted, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 22, gap: 11 },
  card: { width: '47%', padding: 15, borderRadius: 16, backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border },
  cardIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 11 },
  cardName: { fontFamily: F.sansSemibold, fontSize: 14.5, color: C.text },
  cardSpent: { fontFamily: F.mono, fontSize: 12, color: C.textSubtle, marginTop: 3 },
  addCard: { width: '47%', padding: 15, borderRadius: 16, borderWidth: 1.5, borderColor: C.borderStrong, borderStyle: 'dashed', alignItems: 'flex-start', justifyContent: 'center', gap: 8, minHeight: 108 },
  addIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  addText: { fontFamily: F.sansSemibold, fontSize: 14, color: C.textMuted },
});
