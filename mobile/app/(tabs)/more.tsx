import React from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import {
  Sparkles,
  Trophy,
  Settings,
  Layers,
  HelpCircle,
  ChevronRight,
} from 'lucide-react-native'
import { useDashboardData } from '../../src/hooks/useDashboardData'
import { useAI } from '../../src/hooks/useAI'
import { MochiCard, MochiBadge } from '../../src/components/ui'
import { colors, radius, spacing, typography } from '../../src/theme/tokens'

export default function MoreScreen() {
  const router = useRouter()
  const { profile, levelData, streak } = useDashboardData()
  const { dailyBrief } = useAI()

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Thêm & Tiện ích 🌟</Text>
          <Text style={styles.subtitle}>
            {profile?.display_name || 'Bạn Mochi'} · Cấp {levelData?.level || 1} · Chuỗi {streak} ngày 🔥
          </Text>
        </View>

        {/* Mochi AI Primary Card */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/(tabs)/ai')}
          accessibilityRole="button"
          accessibilityLabel="Mở Mochi AI Coach"
        >
          <MochiCard style={styles.aiCard} accentColor={colors.cheese}>
            <View style={styles.aiHeader}>
              <View style={[styles.iconBox, { backgroundColor: colors.cheeseLight }]}>
                <Sparkles size={22} color={colors.chocolate} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.aiTitleRow}>
                  <Text style={styles.aiTitle}>Mochi AI Coach</Text>
                  <MochiBadge label="Trợ lý AI" variant="cheese" />
                </View>
                <Text style={styles.aiSub} numberOfLines={2}>
                  {dailyBrief?.recommendation ||
                    'Hỏi đáp về sức khỏe, tiếng Trung, chi tiêu và xem Daily Brief hôm nay.'}
                </Text>
              </View>
              <ChevronRight size={20} color={colors.chocolate} />
            </View>
          </MochiCard>
        </TouchableOpacity>

        {/* Core Secondary Destinations */}
        <Text style={styles.sectionTitle}>Hồ sơ & Tiện ích</Text>
        <MochiCard style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.75}
            onPress={() => router.push('/achievements')}
            accessibilityRole="button"
            accessibilityLabel="Thành tích và huy hiệu"
          >
            <View style={[styles.iconBox, { backgroundColor: colors.cheeseLight }]}>
              <Trophy size={20} color={colors.chocolate} />
            </View>
            <View style={styles.menuInfo}>
              <Text style={styles.menuTitle}>Thành tích & Huy hiệu</Text>
              <Text style={styles.menuDesc}>Xem cấp độ, XP và bộ sưu tập huy hiệu</Text>
            </View>
            <ChevronRight size={18} color={colors.chocolateLight} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.75}
            onPress={() => router.push('/(tabs)/settings')}
            accessibilityRole="button"
            accessibilityLabel="Cài đặt và tài khoản"
          >
            <View style={[styles.iconBox, { backgroundColor: colors.mintLight }]}>
              <Settings size={20} color={colors.mintDark} />
            </View>
            <View style={styles.menuInfo}>
              <Text style={styles.menuTitle}>Cài đặt & Tài khoản</Text>
              <Text style={styles.menuDesc}>Hồ sơ cá nhân, chiều cao BMI, mật khẩu & cập nhật</Text>
            </View>
            <ChevronRight size={18} color={colors.chocolateLight} />
          </TouchableOpacity>
        </MochiCard>

        {/* Quick Study Shortcuts */}
        <Text style={styles.sectionTitle}>Lối tắt ôn tập tiếng Trung</Text>
        <MochiCard style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.75}
            onPress={() => router.push('/chinese/flashcard')}
            accessibilityRole="button"
            accessibilityLabel="Ôn tập Flashcard SM-2"
          >
            <View style={[styles.iconBox, { backgroundColor: colors.lavenderLight }]}>
              <Layers size={20} color={colors.lavenderDark} />
            </View>
            <View style={styles.menuInfo}>
              <Text style={styles.menuTitle}>Flashcard SM-2</Text>
              <Text style={styles.menuDesc}>Ôn thẻ từ đến hạn theo lịch ghi nhớ</Text>
            </View>
            <ChevronRight size={18} color={colors.chocolateLight} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.75}
            onPress={() => router.push('/chinese/quiz')}
            accessibilityRole="button"
            accessibilityLabel="Trắc nghiệm từ vựng"
          >
            <View style={[styles.iconBox, { backgroundColor: colors.peachLight }]}>
              <HelpCircle size={20} color={colors.peachDark} />
            </View>
            <View style={styles.menuInfo}>
              <Text style={styles.menuTitle}>Trắc nghiệm từ vựng</Text>
              <Text style={styles.menuDesc}>Kiểm tra nhanh 4 đáp án</Text>
            </View>
            <ChevronRight size={18} color={colors.chocolateLight} />
          </TouchableOpacity>
        </MochiCard>
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
    paddingBottom: 32,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.titleLarge,
    fontWeight: '900',
    color: colors.chocolate,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.chocolateLight,
    fontWeight: '600',
    marginTop: 4,
  },
  aiCard: {
    padding: spacing.md,
    marginBottom: spacing.lg,
    backgroundColor: colors.white,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aiTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  aiTitle: {
    ...typography.titleSmall,
    fontWeight: '800',
    color: colors.chocolate,
  },
  aiSub: {
    ...typography.bodySmall,
    color: colors.chocolateLight,
    lineHeight: 18,
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
    minHeight: 62,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuInfo: {
    flex: 1,
  },
  menuTitle: {
    ...typography.bodyMedium,
    fontWeight: '800',
    color: colors.chocolate,
  },
  menuDesc: {
    ...typography.caption,
    color: colors.chocolateLight,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.chocolateBorder,
    marginHorizontal: spacing.md,
  },
})
