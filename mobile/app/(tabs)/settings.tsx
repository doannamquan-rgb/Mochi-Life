import React from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Trophy, LogOut, Shield, Sparkles, ChevronRight } from 'lucide-react-native'
import { useAuth } from '../../src/lib/auth-context'
import { useDashboardData } from '../../src/hooks/useDashboardData'
import { MochiCard } from '../../src/components/ui/MochiCard'
import { colors, typography, spacing, radius } from '../../src/theme/tokens'

export default function SettingsScreen() {
  const router = useRouter()
  const { user, signOut } = useAuth()
  const { profile, levelData } = useDashboardData()

  const handleSignOut = () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất khỏi Mochi Life?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: async () => {
            await signOut()
            router.replace('/(auth)/login')
          },
        },
      ]
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Cài đặt & Tài khoản ⚙️</Text>
        </View>

        {/* Profile Header Card */}
        <MochiCard style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>🐱</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile?.display_name || user?.email?.split('@')[0] || 'Bạn Mochi'}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <Text style={styles.profileLevel}>Cấp độ {levelData?.level || 1} • {levelData?.totalXP || 0} XP</Text>
          </View>
        </MochiCard>

        {/* Navigation List */}
        <Text style={styles.sectionTitle}>Chức năng 🌟</Text>
        <MochiCard style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => router.push('/achievements')}
          >
            <View style={[styles.menuIcon, { backgroundColor: colors.cheeseLight }]}>
              <Trophy size={18} color={colors.chocolate} />
            </View>
            <Text style={styles.menuText}>Thành tích & Huy hiệu</Text>
            <ChevronRight size={18} color={colors.chocolateMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => Alert.alert('Mochi Life', 'Phiên bản 6.0.0 (Native Android & Web Ecosystem)\nCross-Platform Pure Monorepo Engine')}
          >
            <View style={[styles.menuIcon, { backgroundColor: colors.lavenderLight }]}>
              <Sparkles size={18} color={colors.lavenderDark} />
            </View>
            <Text style={styles.menuText}>Thông tin ứng dụng</Text>
            <Text style={styles.versionBadge}>v6.0.0</Text>
            <ChevronRight size={18} color={colors.chocolateMuted} />
          </TouchableOpacity>
        </MochiCard>

        {/* Account Actions */}
        <Text style={styles.sectionTitle}>Tài khoản 🔐</Text>
        <MochiCard style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => router.push('/(auth)/forgot-password')}
          >
            <View style={[styles.menuIcon, { backgroundColor: colors.mintLight }]}>
              <Shield size={18} color={colors.mintDark} />
            </View>
            <Text style={styles.menuText}>Đổi / Khôi phục mật khẩu</Text>
            <ChevronRight size={18} color={colors.chocolateMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={handleSignOut}
          >
            <View style={[styles.menuIcon, { backgroundColor: colors.peachLight }]}>
              <LogOut size={18} color={colors.peachDark} />
            </View>
            <Text style={[styles.menuText, { color: colors.peachDark }]}>Đăng xuất</Text>
            <ChevronRight size={18} color={colors.peachDark} />
          </TouchableOpacity>
        </MochiCard>

        {/* Footer info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>🐱 Mochi Life v6.0.0 • Made with ❤️</Text>
          <Text style={styles.footerSubtext}>Next.js + Expo Native + Shared Core</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  header: {
    marginBottom: spacing.md,
  },
  title: {
    ...typography.titleLarge,
    fontWeight: '900',
    color: colors.chocolate,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: 16,
    marginBottom: spacing.lg,
    backgroundColor: colors.white,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.cheeseLight,
    borderWidth: 2,
    borderColor: colors.cheese,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 32,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...typography.titleSmall,
    fontWeight: '800',
    color: colors.chocolate,
  },
  profileEmail: {
    ...typography.caption,
    color: colors.chocolateMuted,
    marginTop: 2,
  },
  profileLevel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.chocolateLight,
    marginTop: 4,
  },
  sectionTitle: {
    ...typography.titleSmall,
    color: colors.chocolate,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  menuCard: {
    padding: 0,
    backgroundColor: colors.white,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    flex: 1,
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.chocolate,
  },
  divider: {
    height: 1,
    backgroundColor: colors.chocolateBorder,
    marginHorizontal: 16,
  },
  versionBadge: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.lavenderDark,
    backgroundColor: colors.lavenderLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xl,
    gap: 4,
  },
  footerText: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.chocolateMuted,
  },
  footerSubtext: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.chocolateLight,
  },
})
