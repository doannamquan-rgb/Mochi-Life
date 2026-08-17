import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../../src/lib/auth-context'
import { MochiButton } from '../../src/components/ui/MochiButton'
import { MochiInput } from '../../src/components/ui/MochiInput'
import { MochiCard } from '../../src/components/ui/MochiCard'
import { colors, typography, spacing } from '../../src/theme/tokens'

export default function LoginScreen() {
  const router = useRouter()
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ email và mật khẩu')
      return
    }

    setLoading(true)
    const { error } = await signIn(email.trim(), password)
    setLoading(false)

    if (error) {
      Alert.alert('Đăng nhập thất bại', error.message || 'Email hoặc mật khẩu không chính xác')
      return
    }

    router.replace('/(tabs)')
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.mascot}>🐱✨</Text>
          <Text style={styles.title}>Mochi Life</Text>
          <Text style={styles.subtitle}>Đăng nhập để đồng bộ dữ liệu của bạn</Text>
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

          <MochiInput
            label="Mật khẩu"
            placeholder="Nhập mật khẩu"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <MochiButton
            title="Đăng nhập ngay"
            onPress={handleLogin}
            loading={loading}
            size="lg"
            style={styles.submitBtn}
          />

          <View style={styles.footerLinks}>
            <MochiButton
              title="Quên mật khẩu?"
              variant="ghost"
              size="sm"
              onPress={() => router.push('/(auth)/forgot-password')}
            />

            <MochiButton
              title="Chưa có tài khoản? Đăng ký"
              variant="ghost"
              size="sm"
              onPress={() => router.push('/(auth)/register')}
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
  },
  title: {
    ...typography.titleLarge,
    color: colors.chocolate,
    fontWeight: '900',
    marginBottom: 4,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.chocolateLight,
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
    gap: 8,
  },
})
