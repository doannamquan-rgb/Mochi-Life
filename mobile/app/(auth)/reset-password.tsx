import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { supabase } from '../../src/lib/supabase'
import { useAuth } from '../../src/lib/auth-context'
import { MochiButton } from '../../src/components/ui/MochiButton'
import { MochiInput } from '../../src/components/ui/MochiInput'
import { MochiCard } from '../../src/components/ui/MochiCard'
import { colors, typography, spacing } from '../../src/theme/tokens'

export default function ResetPasswordScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ code?: string }>()
  const { updatePassword } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [exchangingCode, setExchangingCode] = useState(true)
  const [codeValid, setCodeValid] = useState(false)

  useEffect(() => {
    async function exchangeAuthCode() {
      const code = params.code
      if (code) {
        try {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (!error) {
            setCodeValid(true)
          } else {
            setCodeValid(false)
          }
        } catch {
          setCodeValid(false)
        }
      } else {
        // Check if session is already active
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setCodeValid(true)
        } else {
          setCodeValid(false)
        }
      }
      setExchangingCode(false)
    }

    exchangeAuthCode()
  }, [params.code])

  const handleUpdate = async () => {
    if (!password || password.length < 6) {
      Alert.alert('Thông báo', 'Mật khẩu mới phải có ít nhất 6 ký tự')
      return
    }

    if (password !== confirmPassword) {
      Alert.alert('Thông báo', 'Mật khẩu xác nhận không khớp')
      return
    }

    setLoading(true)
    const { error } = await updatePassword(password)
    setLoading(false)

    if (error) {
      Alert.alert('Lỗi cập nhật', error.message || 'Không thể đặt lại mật khẩu')
      return
    }

    Alert.alert(
      'Thành công! 🐱🎉',
      'Mật khẩu của bạn đã được cập nhật thành công!',
      [{ text: 'Vào ứng dụng', onPress: () => router.replace('/(tabs)') }]
    )
  }

  if (exchangingCode) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.cheese} />
        <Text style={styles.loadingText}>Đang xác thực liên kết khôi phục...</Text>
      </View>
    )
  }

  if (!codeValid) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <MochiCard style={styles.card}>
            <Text style={styles.mascot}>😿⚠️</Text>
            <Text style={styles.title}>Liên kết hết hạn</Text>
            <Text style={styles.subtitle}>
              Liên kết khôi phục mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu lại nhé.
            </Text>
            <MochiButton
              title="Yêu cầu link mới"
              onPress={() => router.replace('/(auth)/forgot-password')}
              style={{ marginTop: spacing.xl }}
            />
          </MochiCard>
        </ScrollView>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.mascot}>🔐✨</Text>
          <Text style={styles.title}>Đặt lại mật khẩu</Text>
          <Text style={styles.subtitle}>Nhập mật khẩu mới cho tài khoản của bạn</Text>
        </View>

        <MochiCard style={styles.card}>
          <MochiInput
            label="Mật khẩu mới"
            placeholder="Ít nhất 6 ký tự"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <MochiInput
            label="Xác nhận mật khẩu"
            placeholder="Nhập lại mật khẩu"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          <MochiButton
            title="Lưu mật khẩu mới"
            onPress={handleUpdate}
            loading={loading}
            size="lg"
            style={styles.submitBtn}
          />
        </MochiCard>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.bodyMedium,
    color: colors.chocolateLight,
    marginTop: spacing.md,
  },
  scrollContent: {
    padding: spacing.xl,
    justifyContent: 'center',
    minHeight: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  mascot: {
    fontSize: 56,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  title: {
    ...typography.titleLarge,
    color: colors.chocolate,
    fontWeight: '900',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.chocolateLight,
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    padding: spacing.xl,
  },
  submitBtn: {
    marginTop: spacing.md,
  },
})
