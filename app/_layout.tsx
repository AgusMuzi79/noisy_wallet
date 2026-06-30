import React, { useState, useEffect, useRef } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppState as RNAppState } from 'react-native';
import { useFonts, DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { SpaceMono_400Regular } from '@expo-google-fonts/space-mono';
import * as SplashScreen from 'expo-splash-screen';
import { AppProvider, useApp } from '../src/context/AppContext';
import { LockScreen } from '../src/components/LockScreen';
import OnboardingScreen from './onboarding';

SplashScreen.preventAutoHideAsync();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { state, loading } = useApp();
  const [locked, setLocked] = useState(true);
  const appStateRef = useRef(RNAppState.currentState);

  // Hide splash only after Supabase data is ready (avoids flash of unprotected content)
  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  // Auto-unlock when PIN is disabled (including remote Realtime changes)
  useEffect(() => {
    if (!loading && !state.lockPin) setLocked(false);
  }, [loading, state.lockPin]);

  // Re-lock when app goes to background
  useEffect(() => {
    const sub = RNAppState.addEventListener('change', next => {
      if (appStateRef.current === 'active' && next === 'background') {
        if (state.lockPin) setLocked(true);
      }
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, [state.lockPin]);

  if (loading) return null;
  if (!state.user1Name) return <OnboardingScreen />;
  if (state.lockPin && locked) {
    return <LockScreen bioEnabled={state.bio} onUnlock={() => setLocked(false)} />;
  }
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
  });

  if (!fontsLoaded) return null;

  return (
    <AppProvider>
      <StatusBar style="light" />
      <AuthGate>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#16131D' } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="add-expense" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="settings" options={{ headerShown: false }} />
          <Stack.Screen name="add-category" options={{ headerShown: false }} />
          <Stack.Screen name="set-pin" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        </Stack>
      </AuthGate>
    </AppProvider>
  );
}
