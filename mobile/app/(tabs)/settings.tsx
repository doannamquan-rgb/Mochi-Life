import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import {
  Trophy,
  LogOut,
  Shield,
  Sparkles,
  ChevronRight,
  RefreshCw,
  Edit3,
} from 'lucide-react-native'
import { useAuth } from '../../src/lib/auth-context'
import { useDashboardData } from '../../src/hooks/useDashboardData'
import { useAppUpdates } from '../../src/lib/update-manager'
import { supabase } from '../../src/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../src/lib/query-keys'
import {
  MochiCard,
  MochiButton,
  MochiInput,
  KeyboardSafeModal,
} from '../../src/components/ui'
import { colors, typography, spacing, radius } from '../../src/theme/tokens'

export default function SettingsScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user, signOut } = useAuth()
  const { profile, levelData, refetch } = useDashboardData()
  const {
    appVersion,
    runtimeVersion,
    channel,
    isChecking,
    isDownloading,
    isUpdateDownloaded,
    isUpdateAvailable,
    lastCheckedAt,
    error: updateError,
    checkForUpdate,
    reloadAndApplyUpdate,
  } = useAppUpdates()

  // Profile Edit Modal State
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false)
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [heightCm, setHeightCm] = useState(profile?.height_cm ? String(profile.height_cm) : '')
  const [savingProfile, setSavingProfile] = useState(false)

  const handleOpenEditProfile = () => {
    setDisplayName(profile?.display_name || '')
    setHeightCm(profile?.height_cm ? String(profile.height_cm) : '')
    setIsEditProfileOpen(true)
  }

  const handleSaveProfile = async () => {
    if (!user?.id) return
    setSavingProfile(true)

    const parsedHeight = parseFloat(heightCm)

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          display_name: displayName.trim() || user.email?.split('@')[0],
          height_cm: parsedHeight > 0 ? parsedHeight : null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)

      if (error) throw error

      queryClient.invalidateQueries({ queryKey: queryKeys.profile(user.id) })
      await refetch()
      setIsEditProfileOpen(false)
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể cập nhật hồ sơ')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleCheckUpdate = async () => {
    const res = await checkForUpdate()
    if (res.downloaded) {
      Alert.alert(
        'Bản cập nhật mới! 🎉',
        'Bản cập nhật OTA đã được tải về thành công. Bạn có muốn khởi động lại ngay?',
        [
          { text: 'Để sau', style: 'cancel' },
          { text: 'Khởi động lại', onPress: reloadAndApplyUpdate },
        ]
      )
    } else if (!res.available && !res.error) {
      Alert.alert('Thông báo', 'Bạn đang sử dụng phiên bản mới nhất của Mochi Life!')
    } else if (res.error) {
      Alert.alert('Thông báo', `Không thể kiểm tra bản cập nhật: ${res.error}`)
    }
  }

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
            queryClient.clear()
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
            <Text style={styles.profileName}>
              {profile?.display_name || user?.email?.split('@')[0] || 'Bạn Mochi'}
            </Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <Text style={styles.profileLevel}>
              Cấp độ {levelData?.level || 1} • {levelData?.totalXP || 0} XP
              {profile?.height_cm ? ` • Cao ${profile.height_cm} cm` : ' • Chưa đặt chiều cao'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={handleOpenEditProfile}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Edit3 size={18} color={colors.chocolate} />
          </TouchableOpacity>
        </MochiCard>

        {/* Functions Navigation */}
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
        </MochiCard>

        {/* Application Update Panel */}
        <Text style={styles.sectionTitle}>Cập nhật ứng dụng 🚀</Text>
        <MochiCard style={styles.updateCard}>
          <View style={styles.updateHeader}>
            <View style={[styles.menuIcon, { backgroundColor: colors.lavenderLight }]}>
              <Sparkles size={18} color={colors.lavenderDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.updateTitle}>Mochi Life OTA Engine</Text>
              <Text style={styles.updateSub}>
                Phiên bản {appVersion} (build 6.3.0.1) • Kênh {channel}
              </Text>
            </View>
            {isChecking && <ActivityIndicator size="small" color={colors.chocolate} />}
          </View>

          <View style={styles.updateDetails}>
            <Text style={styles.updateDetailText}>
              • Runtime Version: <Text style={{ fontWeight: '700' }}>{runtimeVersion}</Text>
            </Text>
            <Text style={styles.updateDetailText}>
              • Bản vá / Build: <Text style={{ fontWeight: '700', color: colors.mintDark }}>v6.3.0.1 (Calorie & Wallet Snapshot)</Text>
            </Text>
            {lastCheckedAt && (
              <Text style={styles.updateDetailText}>
                • Kiểm tra gần nhất: {lastCheckedAt.toLocaleTimeString('vi-VN')}
              </Text>
            )}
            {updateError && (
              <Text style={[styles.updateDetailText, { color: colors.peachDark }]}>
                • {updateError}
              </Text>
            )}
          </View>

          <View style={styles.updateActions}>
            {isUpdateDownloaded ? (
              <MochiButton
                title="Cập nhật & Khởi động lại"
                size="sm"
                icon={<RefreshCw size={14} color={colors.chocolate} />}
                onPress={reloadAndApplyUpdate}
                style={{ flex: 1 }}
              />
            ) : (
              <MochiButton
                title={isChecking ? 'Đang kiểm tra...' : 'Kiểm tra cập nhật'}
                variant="secondary"
                size="sm"
                icon={<RefreshCw size={14} color={colors.chocolate} />}
                loading={isChecking || isDownloading}
                disabled={isChecking || isDownloading}
                onPress={handleCheckUpdate}
                style={{ flex: 1 }}
              />
            )}
          </View>
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
          <Text style={styles.footerText}>🐱 Mochi Life v{appVersion} (build 6.3.0.1) • Made with ❤️</Text>
          <Text style={styles.footerSubtext}>Next.js + Expo Native + Shared Core</Text>
        </View>
      </ScrollView>

      {/* Profile Edit Modal */}
      <KeyboardSafeModal
        visible={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
      >
        <Text style={styles.modalTitle}>Chỉnh sửa hồ sơ 🐱</Text>
        <Text style={styles.modalSub}>
          Cung cấp chiều cao chính xác để tính toán BMI chuẩn xác.
        </Text>

        <MochiInput
          label="Tên hiển thị"
          placeholder="Bạn Mochi"
          value={displayName}
          onChangeText={setDisplayName}
        />

        <MochiInput
          label="Chiều cao (cm)"
          placeholder="170"
          value={heightCm}
          onChangeText={setHeightCm}
          keyboardType="numeric"
        />

        <View style={{ flexDirection: 'row', gap: 12, marginTop: spacing.md }}>
          <MochiButton
            title="Hủy"
            variant="ghost"
            onPress={() => setIsEditProfileOpen(false)}
            style={{ flex: 1 }}
          />
          <MochiButton
            title="Lưu hồ sơ"
            loading={savingProfile}
            disabled={savingProfile}
            onPress={handleSaveProfile}
            style={{ flex: 1.5 }}
          />
        </View>
      </KeyboardSafeModal>
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
    gap: 14,
    marginBottom: spacing.lg,
    backgroundColor: colors.white,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.cheeseLight,
    borderWidth: 1.5,
    borderColor: colors.cheese,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
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
    marginTop: 1,
  },
  profileLevel: {
    ...typography.caption,
    color: colors.chocolateLight,
    fontWeight: '600',
    marginTop: 3,
  },
  editBtn: {
    padding: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.cream,
  },
  sectionTitle: {
    ...typography.titleSmall,
    fontWeight: '800',
    color: colors.chocolate,
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
    padding: spacing.md,
    gap: 12,
  },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.chocolate,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.chocolateBorder,
    marginHorizontal: spacing.md,
  },
  updateCard: {
    padding: spacing.md,
    backgroundColor: colors.white,
    marginBottom: spacing.lg,
  },
  updateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  updateTitle: {
    ...typography.bodyMedium,
    fontWeight: '800',
    color: colors.chocolate,
  },
  updateSub: {
    ...typography.caption,
    color: colors.chocolateMuted,
    marginTop: 1,
  },
  updateDetails: {
    marginVertical: spacing.sm,
    paddingHorizontal: 4,
    gap: 3,
  },
  updateDetailText: {
    ...typography.caption,
    color: colors.chocolateLight,
  },
  updateActions: {
    marginTop: spacing.xs,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: 4,
  },
  footerText: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.chocolateMuted,
  },
  footerSubtext: {
    ...typography.caption,
    color: colors.chocolateMuted,
  },
  modalTitle: {
    ...typography.titleMedium,
    fontWeight: '900',
    color: colors.chocolate,
    marginTop: 4,
    marginBottom: 2,
  },
  modalSub: {
    ...typography.caption,
    color: colors.chocolateMuted,
    marginBottom: spacing.md,
  },
})
