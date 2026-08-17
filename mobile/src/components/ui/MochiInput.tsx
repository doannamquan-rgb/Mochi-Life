import React from 'react'
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native'
import { colors, radius, typography } from '../../theme/tokens'

interface MochiInputProps extends TextInputProps {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: React.ReactNode
}

export function MochiInput({
  label,
  error,
  helperText,
  leftIcon,
  style,
  ...props
}: MochiInputProps) {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputWrapper,
          error ? styles.inputWrapperError : undefined,
        ]}
      >
        {leftIcon && <View style={styles.iconContainer}>{leftIcon}</View>}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={colors.chocolateMuted}
          {...props}
        />
      </View>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  label: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.chocolateLight,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.chocolateBorder,
    borderRadius: radius.md,
    paddingHorizontal: 14,
  },
  inputWrapperError: {
    borderColor: colors.peach,
    backgroundColor: colors.peachLight,
  },
  iconContainer: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    ...typography.bodyMedium,
    color: colors.chocolate,
  },
  errorText: {
    ...typography.caption,
    color: colors.peachDark,
    marginTop: 4,
    fontWeight: '600',
  },
  helperText: {
    ...typography.caption,
    color: colors.chocolateMuted,
    marginTop: 4,
  },
})
