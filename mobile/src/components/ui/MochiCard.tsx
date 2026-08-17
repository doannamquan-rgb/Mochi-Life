import React from 'react'
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native'
import { colors, radius } from '../../theme/tokens'

interface MochiCardProps {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  variant?: 'elevated' | 'flat' | 'outline'
  accentColor?: string
}

export function MochiCard({
  children,
  style,
  variant = 'elevated',
  accentColor,
}: MochiCardProps) {
  return (
    <View
      style={[
        styles.card,
        variant === 'elevated' && styles.elevated,
        variant === 'outline' && styles.outline,
        variant === 'flat' && styles.flat,
        accentColor ? { borderLeftWidth: 4, borderLeftColor: accentColor } : undefined,
        style,
      ]}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: 16,
    borderWidth: 1.5,
    borderColor: colors.chocolateBorder,
  },
  elevated: {
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.chocolateBorder,
  },
  flat: {
    backgroundColor: colors.chocolateSubtle,
    borderWidth: 0,
  },
})
