import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { useFonts, DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono';
import * as SplashScreen from 'expo-splash-screen';
import { AppProvider, useApp } from '../src/context/AppContext';
import { SheetProvider } from '../src/context/SheetContext';
import EntrySheet from '../src/components/EntrySheet';
import UndoToast from '../src/components/UndoToast';
import { C } from '../src/theme';
import OnboardingScreen from './onboarding';

SplashScreen.preventAutoHideAsync();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { state, loading } = useApp();

  // Hide splash only after Supabase data is ready (avoids a flash of empty content)
  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  if (loading) return null;
  if (!state.user1Name) return <OnboardingScreen />;
  return <>{children}</>;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    DMSerifDisplay_400Regular,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <AppProvider>
      <SheetProvider>
        <StatusBar style="light" />
        <AuthGate>
          <View style={{ flex: 1, backgroundColor: C.bg }}>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="settings" options={{ headerShown: false }} />
              <Stack.Screen name="add-category" options={{ headerShown: false }} />
            </Stack>
            {/* Global "Anotar" sheet + undo toast, opened from any screen via useSheet() */}
            <EntrySheet />
            <UndoToast />
          </View>
        </AuthGate>
      </SheetProvider>
    </AppProvider>
  );
}
