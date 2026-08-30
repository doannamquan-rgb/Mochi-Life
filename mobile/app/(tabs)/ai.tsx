import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  Sparkles,
  Send,
  Lightbulb,
  RotateCcw,
  Zap,
  Scale,
  Brain,
  AlertCircle,
} from 'lucide-react-native'
import { useAI } from '../../src/hooks/useAI'
import { MochiCard, MochiBadge } from '../../src/components/ui'
import { colors, typography, spacing, radius } from '../../src/theme/tokens'
import { THINKING_MODE_OPTIONS, type ThinkingMode } from '@mochi/shared'

export default function AIScreen() {
  const {
    dailyBrief,
    briefLoading,
    refetchBrief,
    thinkingMode,
    setThinkingMode,
    messages,
    sendMessage,
    retryLastMessage,
    isReplying,
  } = useAI()

  const [inputText, setInputText] = useState('')
  const scrollViewRef = useRef<ScrollView>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true })
    }, 100)
    return () => clearTimeout(timer)
  }, [messages, isReplying])

  const handleSend = async () => {
    if (!inputText.trim() || isReplying) return
    const msg = inputText.trim()
    setInputText('')
    await sendMessage(msg)
  }

  const getModeIcon = (mode: ThinkingMode) => {
    switch (mode) {
      case 'fast':
        return <Zap size={14} color={thinkingMode === 'fast' ? colors.chocolate : colors.chocolateMuted} />
      case 'deep':
        return <Brain size={14} color={thinkingMode === 'deep' ? colors.chocolate : colors.chocolateMuted} />
      case 'balanced':
      default:
        return <Scale size={14} color={thinkingMode === 'balanced' ? colors.chocolate : colors.chocolateMuted} />
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.mascot}>🐱✨</Text>
            <View>
              <Text style={styles.title}>Mochi AI</Text>
              <Text style={styles.subtitle}>Gemini 3.7 Flash Companion</Text>
            </View>
          </View>

          {/* Thinking Mode Pill Selector */}
          <View style={styles.modeSelector}>
            {THINKING_MODE_OPTIONS.map(opt => {
              const isActive = thinkingMode === opt.id
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.modeChip, isActive && styles.modeChipActive]}
                  onPress={() => setThinkingMode(opt.id)}
                  activeOpacity={0.7}
                >
                  {getModeIcon(opt.id)}
                  <Text style={[styles.modeChipText, isActive && styles.modeChipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Chat Scroll View */}
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={briefLoading}
              onRefresh={refetchBrief}
              colors={[colors.cheese]}
            />
          }
        >
          {/* Daily Brief Card */}
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

              {dailyBrief.recommendation ? (
                <View style={styles.recBox}>
                  <Text style={styles.recText}>💡 {dailyBrief.recommendation}</Text>
                </View>
              ) : null}
            </MochiCard>
          )}

          {/* Messages */}
          <View style={styles.chatSection}>
            {messages.map(m => {
              const isUser = m.role === 'user'
              const isError = m.isError

              return (
                <View
                  key={m.id}
                  style={[
                    styles.messageRow,
                    isUser ? styles.messageRowUser : styles.messageRowBot,
                  ]}
                >
                  {!isUser && (
                    <View
                      style={[
                        styles.botAvatar,
                        isError && { backgroundColor: colors.peachLight },
                      ]}
                    >
                      <Text style={{ fontSize: 16 }}>{isError ? '😿' : '🐱'}</Text>
                    </View>
                  )}

                  <View
                    style={[
                      styles.messageBubble,
                      isUser
                        ? styles.bubbleUser
                        : isError
                        ? styles.bubbleError
                        : styles.bubbleBot,
                    ]}
                  >
                    <Text
                      style={[
                        styles.messageText,
                        isUser
                          ? styles.messageTextUser
                          : isError
                          ? styles.messageTextError
                          : styles.messageTextBot,
                      ]}
                    >
                      {m.content}
                    </Text>

                    {/* Retry Button for Errors */}
                    {isError && m.canRetry && (
                      <TouchableOpacity
                        style={styles.retryBtn}
                        onPress={retryLastMessage}
                        activeOpacity={0.8}
                      >
                        <RotateCcw size={14} color={colors.peachDark} />
                        <Text style={styles.retryBtnText}>Thử lại</Text>
                      </TouchableOpacity>
                    )}

                    {/* Mode tag on user message */}
                    {isUser && m.thinkingMode && (
                      <Text style={styles.userModeTag}>
                        {m.thinkingMode === 'fast'
                          ? '⚡ Siêu tốc'
                          : m.thinkingMode === 'deep'
                          ? '🧠 Suy luận sâu'
                          : '⚖️ Cân bằng'}
                      </Text>
                    )}
                  </View>
                </View>
              )
            })}

            {/* AI Typing / Replying Indicator */}
            {isReplying && (
              <View style={[styles.messageRow, styles.messageRowBot]}>
                <View style={styles.botAvatar}>
                  <Text style={{ fontSize: 16 }}>🐱</Text>
                </View>
                <View style={[styles.messageBubble, styles.bubbleBot, styles.loadingBubble]}>
                  <ActivityIndicator size="small" color={colors.chocolate} />
                  <Text style={styles.typingText}>
                    {thinkingMode === 'deep'
                      ? 'Mochi đang suy luận sâu...'
                      : 'Mochi đang soạn câu trả lời...'}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            placeholder="Hỏi Mochi về sức khỏe, tiếng Trung, chi tiêu..."
            placeholderTextColor={colors.chocolateMuted}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            multiline={false}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || isReplying) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || isReplying}
            activeOpacity={0.8}
          >
            <Send
              size={18}
              color={inputText.trim() && !isReplying ? colors.chocolate : colors.chocolateMuted}
            />
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
    borderBottomWidth: 1.5,
    borderBottomColor: colors.chocolateBorder,
    backgroundColor: colors.white,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.xs,
  },
  mascot: {
    fontSize: 26,
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
  modeSelector: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  modeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.chocolateBorder,
    backgroundColor: colors.cream,
  },
  modeChipActive: {
    backgroundColor: colors.cheese,
    borderColor: colors.chocolate,
  },
  modeChipText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: colors.chocolateMuted,
  },
  modeChipTextActive: {
    color: colors.chocolate,
    fontWeight: '800',
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 24,
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
    borderWidth: 1.5,
    borderColor: colors.chocolateBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.lg,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  bubbleUser: {
    backgroundColor: colors.cheese,
    borderBottomRightRadius: radius.xs,
  },
  bubbleBot: {
    backgroundColor: colors.white,
    borderBottomLeftRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.chocolateBorder,
  },
  bubbleError: {
    backgroundColor: colors.peachLight,
    borderBottomLeftRadius: radius.xs,
    borderWidth: 1.5,
    borderColor: colors.peach,
  },
  messageText: {
    ...typography.bodySmall,
    lineHeight: 20,
  },
  messageTextUser: {
    color: colors.chocolate,
    fontWeight: '600',
  },
  messageTextBot: {
    color: colors.chocolate,
  },
  messageTextError: {
    color: colors.peachDark,
    fontWeight: '600',
  },
  userModeTag: {
    ...typography.caption,
    fontSize: 9,
    color: colors.chocolateLight,
    marginTop: 4,
    textAlign: 'right',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.peach,
  },
  retryBtnText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.peachDark,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  typingText: {
    ...typography.caption,
    color: colors.chocolateMuted,
    fontWeight: '600',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderTopWidth: 1.5,
    borderTopColor: colors.chocolateBorder,
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.cream,
    borderWidth: 1.5,
    borderColor: colors.chocolateBorder,
    borderRadius: radius.full,
    paddingHorizontal: 16,
    paddingVertical: 10,
    ...typography.bodySmall,
    color: colors.chocolate,
  },
  sendBtn: {
    backgroundColor: colors.cheese,
    width: 42,
    height: 42,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sendBtnDisabled: {
    backgroundColor: colors.chocolateBorder,
  },
})
