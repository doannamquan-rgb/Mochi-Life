import React, { useEffect, useState } from 'react'
import { Animated, StyleProp, ViewStyle } from 'react-native'
import { colors, radius } from '../../theme/tokens'

interface MochiSkeletonProps {
  width?: number | `${number}%`
  height: number
  borderRadius?: number
  style?: StyleProp<ViewStyle>
}

export function MochiSkeleton({
  width = '100%',
  height,
  borderRadius = radius.md,
  style,
}: MochiSkeletonProps) {
  const [opacity] = useState(() => new Animated.Value(0.45))

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    )
    anim.start()
    return () => anim.stop()
  }, [opacity])

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.chocolateBorder,
          opacity,
        },
        style,
      ]}
    />
  )
}
