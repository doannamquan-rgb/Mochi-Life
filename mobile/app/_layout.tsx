import React, { useEffect } from 'react'
import { Stack } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { AuthProvider } from '../src/lib/auth-context'
import { ReactionProvider } from '../src/hooks/useMochiReaction'
import { colors } from '../src/theme/tokens'

// Keep in-memory TanStack Query Client (in-memory only for security)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      retry: 2,
    },
  },
})

// Prevent splash screen from auto hiding
SplashScreen.preventAutoHideAsync().catch(() => {})

export default function RootLayout() {
  useEffect(() => {
    // Hide splash screen once mounted
    SplashScreen.hideAsync().catch(() => {})
  }, [])

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ReactionProvider>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.cream },
                animation: 'slide_from_right',
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen
                name="chinese/flashcard"
                options={{
                  headerShown: true,
                  title: 'Ôn tập thẻ từ 🎴',
                  headerStyle: { backgroundColor: colors.cream },
                  headerTintColor: colors.chocolate,
                }}
              />
              <Stack.Screen
                name="chinese/quiz"
                options={{
                  headerShown: true,
                  title: 'Trắc nghiệm 💯',
                  headerStyle: { backgroundColor: colors.cream },
                  headerTintColor: colors.chocolate,
                }}
              />
              <Stack.Screen
                name="achievements"
                options={{
                  headerShown: true,
                  title: 'Thành tích 🏆',
                  headerStyle: { backgroundColor: colors.cream },
                  headerTintColor: colors.chocolate,
                }}
              />
            </Stack>
          </ReactionProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}
