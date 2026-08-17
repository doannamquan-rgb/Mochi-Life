import React, { useState, useRef, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Sparkles, Send, Lightbulb } from 'lucide-react-native'
import { useAI } from '../../src/hooks/useAI'
import { MochiCard } from '../../src/components/ui/MochiCard'
import { MochiBadge } from '../../src/components/ui/MochiBadge'
import { colors, typography, spacing, radius } from '../../src/theme/tokens'

export default function AIScreen() {
  const { dailyBrief, messages, sendMessage, isReplying } = useAI()
  const [inputText, setInputText] = useState('')
  const scrollViewRef = useRef<ScrollView>(null)

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true })
  }, [messages, isReplying])

  const handleSend = async () => {
    if (!inputText.trim() || isReplying) return
    const msg = inputText.trim()
    setInputText('')
    await sendMessage(msg)
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.mascot}>🐱✨</Text>
            <View>
              <Text style={styles.title}>Mochi AI</Text>
              <Text style={styles.subtitle}>Trợ lý đồng hành Gemini 3.7 Flash</Text>
            </View>
          </View>
        </View>

        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Daily Brief Section */}
          {dailyBrief && (
            <MochiCard style={styles.briefCard} accentColor={colors.cheese}>
              <View style={styles.briefHeader}>
                <Sparkles size={18} color={colors.chocolate} />
                <Text style={styles.briefTitle}>Mochi Daily Brief</Text>
                {dailyBrief.isAiGenerated && (
                  <MochiBadge label="Gemini AI" variant="cheese" style={{ marginLeft: 'auto' }} />
                )}
              </View>

              <Text style={styles.briefSummary}>{dailyBrief.summary}</Text>

              {dailyBrief.highlights && dailyBrief.highlights.length > 0 && (
                <View style={styles.highlightsContainer}>
                  {dailyBrief.highlights.map((h, i) => (
                    <View key={i} style={styles.highlightItem}>
                      <Lightbulb size={14} color={colors.peachDark} />
                      <Text style={styles.highlightText}>
                        <Text style={{ fontWeight: '700' }}>{h.title}: </Text>
                        {h.description}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {dailyBrief.recommendation && (
                <View style={styles.recBox}>
                  <Text style={styles.recText}>💡 {dailyBrief.recommendation}</Text>
                </View>
              )}
            </MochiCard>
          )}

          {/* Chat Messages */}
          <View style={styles.chatSection}>
            {messages.map(m => {
              const isUser = m.role === 'user'
              return (
                <View
                  key={m.id}
                  style={[
                    styles.messageRow,
                    isUser ? styles.messageRowUser : styles.messageRowBot,
                  ]}
                >
                  {!isUser && (
                    <View style={styles.botAvatar}>
                      <Text style={{ fontSize: 16 }}>🐱</Text>
                    </View>
                  )}
                  <View
                    style={[
                      styles.messageBubble,
                      isUser ? styles.bubbleUser : styles.bubbleBot,
                    ]}
                  >
                    <Text
                      style={[
                        styles.messageText,
                        isUser ? styles.messageTextUser : styles.messageTextBot,
                      ]}
                    >
                      {m.content}
                    </Text>
                  </View>
                </View>
              )
            })}

            {isReplying && (
              <View style={[styles.messageRow, styles.messageRowBot]}>
                <View style={styles.botAvatar}>
                  <Text style={{ fontSize: 16 }}>🐱</Text>
                </View>
                <View style={[styles.messageBubble, styles.bubbleBot, { paddingVertical: 12 }]}>
                  <ActivityIndicator size="small" color={colors.chocolate} />
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Chat Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            placeholder="Hỏi Mochi điều gì đó..."
            placeholderTextColor={colors.chocolateMuted}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || isReplying}
          >
            <Send size={18} color={inputText.trim() ? colors.chocolate : colors.chocolateMuted} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.chocolateBorder,
    backgroundColor: colors.white,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mascot: {
    fontSize: 28,
  },
  title: {
    ...typography.titleSmall,
    fontWeight: '900',
    color: colors.chocolate,
  },
  subtitle: {
    ...typography.caption,
    color: colors.chocolateMuted,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 20,
  },
  briefCard: {
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.white,
  },
  briefHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  briefTitle: {
    ...typography.bodyMedium,
    fontWeight: '800',
    color: colors.chocolate,
  },
  briefSummary: {
    ...typography.bodySmall,
    color: colors.chocolateLight,
    lineHeight: 20,
    marginBottom: 10,
  },
  highlightsContainer: {
    gap: 6,
    marginBottom: 10,
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  highlightText: {
    ...typography.caption,
    color: colors.chocolate,
    flex: 1,
    lineHeight: 18,
  },
  recBox: {
    backgroundColor: colors.cheeseLight,
    padding: 10,
    borderRadius: radius.md,
  },
  recText: {
    ...typography.caption,
    color: colors.chocolate,
    fontWeight: '600',
  },
  chatSection: {
    gap: 12,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginVertical: 4,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowBot: {
    justifyContent: 'flex-start',
  },
  botAvatar: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.cheeseLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
  },
  bubbleUser: {
    backgroundColor: colors.cheese,
    borderBottomRightRadius: 2,
  },
  bubbleBot: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.chocolateBorder,
    borderBottomLeftRadius: 2,
  },
  messageText: {
    ...typography.bodyMedium,
    lineHeight: 20,
  },
  messageTextUser: {
    color: colors.chocolate,
    fontWeight: '600',
  },
  messageTextBot: {
    color: colors.chocolate,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1.5,
    borderTopColor: colors.chocolateBorder,
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.cream,
    borderRadius: radius.full,
    paddingHorizontal: 16,
    paddingVertical: 10,
    ...typography.bodyMedium,
    color: colors.chocolate,
  },
  sendBtn: {
    backgroundColor: colors.cheese,
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: colors.chocolateBorder,
  },
})
