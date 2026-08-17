import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native'
import { colors, radius, typography } from '../../theme/tokens'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: string | React.ReactNode
  badge?: string
  badgeVariant?: 'cheese' | 'peach' | 'mint' | 'lavender'
  onPress?: () => void
  accentColor?: string
  style?: ViewStyle
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  badge,
  badgeVariant = 'cheese',
  onPress,
  accentColor,
  style,
}: StatCardProps) {
  const CardContainer: any = onPress ? TouchableOpacity : View

  return (
    <CardContainer
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.card,
        accentColor ? { borderLeftWidth: 4, borderLeftColor: accentColor } : undefined,
        style,
      ]}
    >
      <View style={styles.topRow}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {typeof icon === 'string' ? (
          <Text style={styles.iconText}>{icon}</Text>
        ) : (
          icon
        )}
      </View>
      <Text style={styles.value} numberOfLines={1}>{value}</Text>
      {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
    </CardContainer>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.chocolateBorder,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  title: {
    ...typography.bodySmall,
    color: colors.chocolateMuted,
    fontWeight: '600',
    flex: 1,
  },
  iconText: {
    fontSize: 18,
  },
  value: {
    ...typography.titleMedium,
    color: colors.chocolate,
    fontWeight: '800',
  },
  subtitle: {
    ...typography.caption,
    color: colors.chocolateLight,
    marginTop: 4,
  },
})
