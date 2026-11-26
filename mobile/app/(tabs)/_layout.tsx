import React, { useEffect, useState } from 'react'
import { Tabs, Redirect } from 'expo-router'
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native'
import type { ComponentProps } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  LayoutDashboard,
  Wallet,
  Dumbbell,
  BookOpen,
  LayoutGrid,
} from 'lucide-react-native'
import { useAuth } from '../../src/lib/auth-context'
import { useRealtimeSync } from '../../src/hooks/useRealtimeSync'
import { useAppLifecycleResync } from '../../src/lib/app-lifecycle'
import { useAppUpdates } from '../../src/lib/update-manager'
import { UpdateBanner } from '../../src/components/UpdateBanner'
import { HEALTH_NAV_LABEL } from '@mochi/shared'
import { colors, radius } from '../../src/theme/tokens'

const VISIBLE_TABS = [
  { name: 'index', label: 'Tổng quan', Icon: LayoutDashboard },
  { name: 'finance', label: 'Tài chính', Icon: Wallet },
  { name: 'fitness', label: HEALTH_NAV_LABEL, Icon: Dumbbell },
  { name: 'chinese', label: 'Tiếng Trung', Icon: BookOpen },
  { name: 'more', label: 'Thêm', Icon: LayoutGrid },
] as const

const MORE_CHILD_ROUTES = new Set(['ai', 'settings'])

type MochiTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0]

function MochiTabBar({ state, descriptors, navigation }: MochiTabBarProps) {
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const [keyboardVisible, setKeyboardVisible] = useState(false)

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
    const subShow = Keyboard.addListener(showEvent, () => setKeyboardVisible(true))
    const subHide = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false))
    return () => {
      subShow.remove()
      subHide.remove()
    }
  }, [])

  if (keyboardVisible) {
    return null
  }

  const currentRouteName = state.routes[state.index]?.name ?? 'index'
  const isNarrow = width < 360
  const bottomPadding = Math.max(insets.bottom, 8)

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.tabBar,
        {
          paddingBottom: bottomPadding,
        },
      ]}
    >
      {VISIBLE_TABS.map((tab, idx) => {
        const route = state.routes.find(r => r.name === tab.name)
        if (!route) return null

        const isFocused =
          currentRouteName === tab.name ||
          (tab.name === 'more' && MORE_CHILD_ROUTES.has(currentRouteName))

        const { options } = descriptors[route.key]
        const iconColor = isFocused ? colors.chocolate : colors.chocolateLight
        const IconComponent = tab.Icon

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          })

          if (!event.defaultPrevented) {
            navigation.navigate(route.name)
          }
        }

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          })
        }

        return (
          <TouchableOpacity
            key={tab.name}
            accessibilityRole="tab"
            accessibilityState={{ selected: isFocused }}
            accessibilityLabel={
              options.tabBarAccessibilityLabel ||
              `${tab.label}, tab ${idx + 1} trên ${VISIBLE_TABS.length}${isFocused ? ', đang chọn' : ''}`
            }
            testID={`tab-${tab.name}`}
            activeOpacity={0.75}
            onPress={onPress}
            onLongPress={onLongPress}
            style={[
              styles.tabItem,
              isFocused && styles.tabItemActive,
            ]}
          >
            <View style={[styles.activeIndicator, isFocused && styles.activeIndicatorVisible]} />
            <IconComponent
              size={isNarrow ? 20 : 22}
              color={iconColor}
              strokeWidth={isFocused ? 2.5 : 2}
            />
            <Text
              allowFontScaling
              maxFontSizeMultiplier={1.35}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.78}
              style={[
                styles.tabLabel,
                isNarrow && styles.tabLabelNarrow,
                isFocused && styles.tabLabelActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

export default function TabsLayout() {
  const { user, loading } = useAuth()
  const [bannerDismissed, setBannerDismissed] = useState(false)

  // Realtime & AppState Lifecycle hooks
  useRealtimeSync()
  useAppLifecycleResync()

  // OTA Updates hook
  const { isUpdateDownloaded, isReloading, reloadAndApplyUpdate } = useAppUpdates()

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
        tabBar={props => <MochiTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarHideOnKeyboard: true,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Tổng quan',
            tabBarAccessibilityLabel: 'Tổng quan, màn hình chính',
          }}
        />
        <Tabs.Screen
          name="finance"
          options={{
            title: 'Tài chính',
            tabBarAccessibilityLabel: 'Tài chính và chi tiêu',
          }}
        />
        <Tabs.Screen
          name="fitness"
          options={{
            title: HEALTH_NAV_LABEL,
            tabBarAccessibilityLabel: 'Sức khỏe và vận động',
          }}
        />
        <Tabs.Screen
          name="chinese"
          options={{
            title: 'Tiếng Trung',
            tabBarAccessibilityLabel: 'Học tiếng Trung',
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: 'Thêm',
            tabBarAccessibilityLabel: 'Thêm chức năng: Mochi AI, Thành tích, Cài đặt',
          }}
        />
        {/* Keep existing deep-linkable routes inside (tabs) without cluttering the tab bar */}
        <Tabs.Screen
          name="ai"
          options={{
            href: null,
            title: 'Mochi AI',
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            href: null,
            title: 'Cài đặt',
          }}
        />
      </Tabs>

      {/* In-app floating OTA update notification */}
      <UpdateBanner
        visible={isUpdateDownloaded && !bannerDismissed}
        isReloading={isReloading}
        onRestart={reloadAndApplyUpdate}
        onDismiss={() => setBannerDismissed(true)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopColor: colors.chocolateBorder,
    borderTopWidth: 1.5,
    paddingTop: 6,
    paddingHorizontal: 4,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 6,
  },
  tabItem: {
    flex: 1,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    paddingVertical: 5,
    borderRadius: radius.md,
    gap: 3,
    position: 'relative',
  },
  tabItemActive: {
    backgroundColor: colors.cheeseLight,
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    width: 24,
    height: 3,
    borderRadius: radius.full,
    backgroundColor: 'transparent',
  },
  activeIndicatorVisible: {
    backgroundColor: colors.cheese,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.chocolateLight,
    textAlign: 'center',
    lineHeight: 13,
  },
  tabLabelNarrow: {
    fontSize: 10,
    lineHeight: 12,
  },
  tabLabelActive: {
    fontWeight: '800',
    color: colors.chocolate,
  },
})
