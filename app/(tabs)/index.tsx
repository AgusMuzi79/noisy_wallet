import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.balance}>$0,00</Text>
      <Text style={styles.label}>Saldo disponible</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  balance: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
});
