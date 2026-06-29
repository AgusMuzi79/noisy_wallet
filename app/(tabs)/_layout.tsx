import { Tabs } from 'expo-router';
import BottomNav from '../../src/components/BottomNav';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={props => <BottomNav {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="income" />
      <Tabs.Screen name="categories" />
    </Tabs>
  );
}
