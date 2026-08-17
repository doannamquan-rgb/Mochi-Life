import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../../src/lib/auth-context'
import { MochiButton } from '../../src/components/ui/MochiButton'
import { MochiInput } from '../../src/components/ui/MochiInput'
import { MochiCard } from '../../src/components/ui/MochiCard'
import { colors, typography, spacing } from '../../src/theme/tokens'

export default function RegisterScreen() {
  const router = useRouter()
  const { signUp } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async () => {
    if (!email || !password) {
      Alert.alert('Thông báo', 'Vui lòng nhập email và mật khẩu')
      return
    }

    if (password.length < 6) {
      Alert.alert('Thông báo', 'Mật khẩu phải có ít nhất 6 ký tự')
      return
    }

    setLoading(true)
    const { error } = await signUp(email.trim(), password, displayName.trim())
    setLoading(false)

    if (error) {
      Alert.alert('Đăng ký thất bại', error.message)
      return
    }

    Alert.alert(
      'Đăng ký thành công! 🐱🎉',
      'Chào mừng bạn đến với Mochi Life!',
      [{ text: 'Bắt đầu ngay', onPress: () => router.replace('/(tabs)') }]
    )
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.mascot}>🌸🐱</Text>
          <Text style={styles.title}>Tạo tài khoản</Text>
          <Text style={styles.subtitle}>Bắt đầu hành trình cùng Mochi Life</Text>
        </View>

        <MochiCard style={styles.card}>
          <MochiInput
            label="Tên hiển thị"
            placeholder="Bạn Mochi"
            value={displayName}
            onChangeText={setDisplayName}
          />

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
            placeholder="Ít nhất 6 ký tự"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <MochiButton
            title="Đăng ký tài khoản"
            onPress={handleRegister}
            loading={loading}
            size="lg"
            style={styles.submitBtn}
          />

          <View style={styles.footerLinks}>
            <MochiButton
              title="Đã có tài khoản? Đăng nhập"
              variant="ghost"
              size="sm"
              onPress={() => router.push('/(auth)/login')}
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
  },
})
