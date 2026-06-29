import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{ title: 'Inicio', tabBarLabel: 'Inicio' }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Configuración', tabBarLabel: 'Config' }}
      />
    </Tabs>
  );
}
