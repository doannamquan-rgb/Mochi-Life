import React from 'react'
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native'
import { colors, radius, typography } from '../../theme/tokens'

interface MochiButtonProps {
  title: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  icon?: React.ReactNode
  style?: ViewStyle
  textStyle?: TextStyle
}

export function MochiButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
}: MochiButtonProps) {
  const getBackgroundColor = () => {
    if (disabled) return colors.chocolateBorder
    switch (variant) {
      case 'primary': return colors.cheese
      case 'secondary': return colors.cheeseLight
      case 'outline': return 'transparent'
      case 'danger': return colors.peach
      case 'ghost': return 'transparent'
      default: return colors.cheese
    }
  }

  const getTextColor = () => {
    if (disabled) return colors.chocolateMuted
    switch (variant) {
      case 'primary': return colors.chocolate
      case 'secondary': return colors.chocolate
      case 'outline': return colors.chocolate
      case 'danger': return colors.white
      case 'ghost': return colors.chocolateLight
      default: return colors.chocolate
    }
  }

  const getPadding = () => {
    switch (size) {
      case 'sm': return { paddingVertical: 8, paddingHorizontal: 14 }
      case 'lg': return { paddingVertical: 16, paddingHorizontal: 24 }
      case 'md':
      default: return { paddingVertical: 12, paddingHorizontal: 18 }
    }
  }

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        getPadding(),
        {
          backgroundColor: getBackgroundColor(),
          borderWidth: variant === 'outline' ? 1.5 : 0,
          borderColor: colors.chocolateBorder,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              { color: getTextColor() },
              size === 'sm' && styles.textSm,
              size === 'lg' && styles.textLg,
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  text: {
    ...typography.bodyMedium,
    fontWeight: '700',
  },
  textSm: {
    ...typography.bodySmall,
    fontWeight: '700',
  },
  textLg: {
    ...typography.titleSmall,
    fontWeight: '800',
  },
})
