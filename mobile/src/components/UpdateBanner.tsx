import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Sparkles, RefreshCw, X } from 'lucide-react-native'
import { colors, radius, typography, spacing } from '../theme/tokens'

interface UpdateBannerProps {
  visible: boolean
  onRestart: () => void
  onDismiss: () => void
}

export function UpdateBanner({ visible, onRestart, onDismiss }: UpdateBannerProps) {
  if (!visible) return null

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Sparkles size={18} color={colors.chocolate} />
          <Text style={styles.title}>Mochi Life có bản cập nhật mới! ✨</Text>
          <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={16} color={colors.chocolateMuted} />
          </TouchableOpacity>
        </View>

        <Text style={styles.desc}>
          Bản cập nhật đã được tải về. Khởi động lại ứng dụng để áp dụng ngay các tính năng mới nhé!
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss}>
            <Text style={styles.dismissText}>Để sau</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.restartBtn} onPress={onRestart}>
            <RefreshCw size={14} color={colors.chocolate} />
            <Text style={styles.restartText}>Cập nhật & Khởi động lại</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 74,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 999,
    elevation: 10,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.cheese,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  title: {
    ...typography.bodyMedium,
    fontWeight: '800',
    color: colors.chocolate,
    flex: 1,
    marginLeft: 6,
  },
  desc: {
    ...typography.bodySmall,
    color: colors.chocolateLight,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  dismissBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  dismissText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.chocolateMuted,
  },
  restartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.cheese,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.md,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  restartText: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.chocolate,
  },
})
