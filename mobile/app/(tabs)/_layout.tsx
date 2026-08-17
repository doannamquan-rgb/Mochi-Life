import React, { useState } from 'react'
import { Tabs, Redirect } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import {
  LayoutDashboard,
  Wallet,
  Dumbbell,
  BookOpen,
  Sparkles,
  Settings,
} from 'lucide-react-native'
import { useAuth } from '../../src/lib/auth-context'
import { useRealtimeSync } from '../../src/hooks/useRealtimeSync'
import { useAppLifecycleResync } from '../../src/lib/app-lifecycle'
import { useAppUpdates } from '../../src/lib/update-manager'
import { UpdateBanner } from '../../src/components/UpdateBanner'
import { colors } from '../../src/theme/tokens'

export default function TabsLayout() {
  const { user, loading } = useAuth()
  const [bannerDismissed, setBannerDismissed] = useState(false)

  // Realtime & AppState Lifecycle hooks
  useRealtimeSync()
  useAppLifecycleResync()

  // OTA Updates hook
  const { isUpdateDownloaded, reloadAndApplyUpdate } = useAppUpdates()

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.cream,
        }}
      >
        <ActivityIndicator size="large" color={colors.cheese} />
      </View>
    )
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />
  }

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarHideOnKeyboard: true,
          tabBarStyle: {
            backgroundColor: colors.white,
            borderTopColor: colors.chocolateBorder,
            borderTopWidth: 1.5,
            height: 64,
            paddingBottom: 8,
            paddingTop: 6,
          },
          tabBarActiveTintColor: colors.chocolate,
          tabBarInactiveTintColor: colors.chocolateMuted,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '700',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Tổng quan',
            tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="finance"
          options={{
            title: 'Tài chính',
            tabBarIcon: ({ color, size }) => <Wallet size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="fitness"
          options={{
            title: 'Sức khỏe',
            tabBarIcon: ({ color, size }) => <Dumbbell size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="chinese"
          options={{
            title: 'Tiếng Trung',
            tabBarIcon: ({ color, size }) => <BookOpen size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="ai"
          options={{
            title: 'Mochi AI',
            tabBarIcon: ({ color, size }) => <Sparkles size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Cài đặt',
            tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
          }}
        />
      </Tabs>

      {/* In-app floating OTA update notification */}
      <UpdateBanner
        visible={isUpdateDownloaded && !bannerDismissed}
        onRestart={reloadAndApplyUpdate}
        onDismiss={() => setBannerDismissed(true)}
      />
    </View>
  )
}
