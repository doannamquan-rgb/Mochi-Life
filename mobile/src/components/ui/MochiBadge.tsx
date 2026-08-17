import React from 'react'
import { View, Text, StyleSheet, ViewStyle } from 'react-native'
import { colors, radius, typography } from '../../theme/tokens'

interface MochiBadgeProps {
  label: string
  color?: string
  backgroundColor?: string
  variant?: 'cheese' | 'peach' | 'mint' | 'lavender' | 'neutral'
  icon?: React.ReactNode
  style?: ViewStyle
}

export function MochiBadge({
  label,
  color,
  backgroundColor,
  variant = 'cheese',
  icon,
  style,
}: MochiBadgeProps) {
  const getColors = () => {
    if (color && backgroundColor) return { text: color, bg: backgroundColor }
    switch (variant) {
      case 'peach': return { text: colors.peachDark, bg: colors.peachLight }
      case 'mint': return { text: colors.mintDark, bg: colors.mintLight }
      case 'lavender': return { text: colors.lavenderDark, bg: colors.lavenderLight }
      case 'neutral': return { text: colors.chocolateLight, bg: colors.chocolateBorder }
      case 'cheese':
      default: return { text: colors.chocolate, bg: colors.cheeseLight }
    }
  }

  const c = getColors()

  return (
    <View style={[styles.badge, { backgroundColor: c.bg }, style]}>
      {icon}
      <Text style={[styles.text, { color: c.text }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.full,
    gap: 4,
    alignSelf: 'flex-start',
  },
  text: {
    ...typography.caption,
    fontWeight: '700',
  },
})
