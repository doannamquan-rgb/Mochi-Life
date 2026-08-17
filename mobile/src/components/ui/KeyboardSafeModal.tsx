import React from 'react'
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  ViewStyle,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, radius, spacing } from '../../theme/tokens'

interface KeyboardSafeModalProps {
  visible: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  contentStyle?: ViewStyle
  maxHeightRatio?: number
}

/**
 * Keyboard-safe bottom sheet modal component.
 * - Prevents keyboard from obscuring inputs and buttons on Android & iOS.
 * - Tap backdrop dismisses modal.
 * - Scrollable form with keyboardShouldPersistTaps="handled".
 * - Safe area padding at bottom.
 */
export function KeyboardSafeModal({
  visible,
  onClose,
  children,
  contentStyle,
  maxHeightRatio = 0.88,
}: KeyboardSafeModalProps) {
  const insets = useSafeAreaInsets()

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        {/* Backdrop dismiss touch */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => {
            Keyboard.dismiss()
            onClose()
          }}
        />

        {/* Modal Card Sheet */}
        <View
          style={[
            styles.cardSheet,
            { paddingBottom: Math.max(insets.bottom, 20) },
            contentStyle,
          ]}
        >
          {/* Top Grab Handle */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View>{children}</View>
            </TouchableWithoutFeedback>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(61, 43, 31, 0.45)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    maxHeight: '90%',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.chocolateBorder,
  },
  scrollContent: {
    paddingBottom: spacing.lg,
  },
})
