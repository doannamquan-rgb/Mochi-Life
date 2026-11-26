import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { MochiCard } from './MochiCard'
import { MochiButton } from './MochiButton'
import { colors, radius, spacing, typography } from '../../theme/tokens'

interface MochiErrorStateProps {
  title?: string
  message: string
  onRetry: () => void
  retrying?: boolean
}

export function MochiErrorState({
  title = 'Không thể tải dữ liệu',
  message,
  onRetry,
  retrying = false,
}: MochiErrorStateProps) {
  return (
    <MochiCard style={styles.card}>
      <Text style={styles.mascot}>😿</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      <MochiButton
        title="Thử lại"
        onPress={onRetry}
        loading={retrying}
        disabled={retrying}
        size="sm"
        style={styles.retryBtn}
      />
    </MochiCard>
  )
}

interface MochiErrorBannerProps {
  message: string
  onRetry: () => void
  retrying?: boolean
}

export function MochiErrorBanner({
  message,
  onRetry,
  retrying = false,
}: MochiErrorBannerProps) {
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Text style={styles.bannerText}>⚠️ {message}</Text>
      <MochiButton
        title="Thử lại"
        variant="secondary"
        size="sm"
        onPress={onRetry}
        loading={retrying}
        disabled={retrying}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.white,
    borderColor: colors.peachLight,
    gap: spacing.sm,
  },
  mascot: {
    fontSize: 40,
  },
  title: {
    ...typography.titleSmall,
    fontWeight: '800',
    color: colors.chocolate,
    textAlign: 'center',
  },
  message: {
    ...typography.bodySmall,
    color: colors.chocolateLight,
    textAlign: 'center',
    lineHeight: 18,
  },
  retryBtn: {
    marginTop: spacing.xs,
    minWidth: 120,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: colors.peachLight,
    borderWidth: 1.5,
    borderColor: colors.peach,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  bannerText: {
    ...typography.caption,
    color: colors.chocolate,
    fontWeight: '700',
    flex: 1,
  },
})
