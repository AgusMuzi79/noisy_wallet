import { StyleSheet, Text, View } from 'react-native';

export default function AddIncomeModal() {
  return (
    <View style={styles.container}>
      <Text>Nuevo ingreso</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
