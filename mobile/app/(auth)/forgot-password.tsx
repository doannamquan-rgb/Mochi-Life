import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../../src/lib/auth-context'
import { MochiButton } from '../../src/components/ui/MochiButton'
import { MochiInput } from '../../src/components/ui/MochiInput'
import { MochiCard } from '../../src/components/ui/MochiCard'
import { colors, typography, spacing } from '../../src/theme/tokens'

export default function ForgotPasswordScreen() {
  const router = useRouter()
  const { resetPasswordForEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleReset = async () => {
    if (!email) {
      Alert.alert('Thông báo', 'Vui lòng nhập email của bạn')
      return
    }

    setLoading(true)
    const { error } = await resetPasswordForEmail(email.trim())
    setLoading(false)

    if (error) {
      Alert.alert('Lỗi', error.message || 'Không thể gửi email khôi phục')
      return
    }

    setSent(true)
  }

  if (sent) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <MochiCard style={styles.card}>
            <Text style={styles.mascot}>📧✨</Text>
            <Text style={styles.title}>Kiểm tra email nhé!</Text>
            <Text style={styles.subtitle}>
              Mochi đã gửi link đặt lại mật khẩu đến {email}. Vui lòng mở email trên điện thoại để hoàn tất.
            </Text>
            <MochiButton
              title="Quay lại đăng nhập"
              onPress={() => router.push('/(auth)/login')}
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
          <Text style={styles.mascot}>😿🔑</Text>
          <Text style={styles.title}>Quên mật khẩu?</Text>
          <Text style={styles.subtitle}>Nhập email để nhận liên kết khôi phục</Text>
        </View>

        <MochiCard style={styles.card}>
          <MochiInput
            label="Email"
            placeholder="mochi@email.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <MochiButton
            title="Gửi link khôi phục"
            onPress={handleReset}
            loading={loading}
            size="lg"
            style={styles.submitBtn}
          />

          <View style={styles.footerLinks}>
            <MochiButton
              title="← Quay lại đăng nhập"
              variant="ghost"
              size="sm"
              onPress={() => router.back()}
            />
          </View>
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
  footerLinks: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
})
