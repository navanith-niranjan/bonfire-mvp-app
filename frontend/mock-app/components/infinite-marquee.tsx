import { useEffect, useMemo, useRef, useState } from 'react';
import { I18nManager, PanResponder, StyleProp, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

type InfiniteMarqueeProps = {
  children: React.ReactNode;
  /**
   * Pixels per second. Higher = faster.
   */
  speedPxPerSecond?: number;
  /**
   * Gap between the duplicated tracks (px).
   */
  gap?: number;
  /**
   * Optional extra style for the outer clipping container.
   */
  containerStyle?: StyleProp<ViewStyle>;
  /**
   * Padding inside the "viewport" so items/shadows aren't clipped at edges.
   */
  viewportPaddingHorizontal?: number;
  viewportPaddingVertical?: number;
  viewportPaddingTop?: number;
  viewportPaddingBottom?: number;
};

/**
 * Seamless, never-ending leftward marquee.
 *
 * Common "infinite marquee" pattern:
 * - Render content twice in a row
 * - Animate translateX from 0 -> -contentWidth
 * - Loop; because copies are identical, the reset is visually seamless
 */
export function InfiniteMarquee({
  children,
  speedPxPerSecond = 40,
  gap = 16,
  containerStyle,
  viewportPaddingHorizontal = 0,
  viewportPaddingVertical = 0,
  viewportPaddingTop,
  viewportPaddingBottom,
}: InfiniteMarqueeProps) {
  const baseTranslateX = useSharedValue(0); // Base animation
  const gestureOffset = useSharedValue(0); // Gesture offset
  const isPaused = useSharedValue(false);
  const animationSpeed = useSharedValue(speedPxPerSecond); // Current animation speed multiplier
  const [contentWidth, setContentWidth] = useState<number>(0);
  const contentWidthRef = useRef<number>(0); // Ref to avoid stale closures
  const pauseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const directionMultiplier = useMemo(() => {
    return I18nManager.isRTL ? 1 : -1;
  }, []);

  // Start/resume base animation - must be stable reference
  const startAnimationRef = useRef<{
    start: (startFrom?: number) => void;
  }>({
    start: (startFrom?: number) => {
      const currentContentWidth = contentWidthRef.current;
      if (!currentContentWidth || currentContentWidth <= 0) return;
      
      cancelAnimation(baseTranslateX);
      animationSpeed.value = speedPxPerSecond;
      
      const durationMs = Math.max(1, Math.round((currentContentWidth / speedPxPerSecond) * 1000));
      
      // Use provided start position or default to 0
      const startPos = startFrom !== undefined ? startFrom : 0;
      baseTranslateX.value = startPos;
      
      baseTranslateX.value = withRepeat(
        withTiming(directionMultiplier * currentContentWidth, {
          duration: durationMs,
          easing: Easing.linear,
        }),
        -1,
        false
      );
    },
  });

  // Update ref when contentWidth changes
  useEffect(() => {
    contentWidthRef.current = contentWidth;
  }, [contentWidth]);

  // Initialize animation when content width is known
  useEffect(() => {
    if (!contentWidth || contentWidth <= 0) return;
    startAnimationRef.current.start();
    return () => {
      cancelAnimation(baseTranslateX);
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
        pauseTimeoutRef.current = null;
      }
    };
  }, [contentWidth, directionMultiplier, speedPxPerSecond]);

  // Continue animation from current wheel position (wheel-like behavior)
  const continueFromPositionRef = useRef<{
    continueFromPosition: () => void;
  }>({
    continueFromPosition: () => {
      const currentContentWidth = contentWidthRef.current;
      if (!currentContentWidth || currentContentWidth <= 0) {
        gestureOffset.value = 0;
        isPaused.value = false;
        if (currentContentWidth > 0) {
          startAnimationRef.current.start();
        }
        return;
      }
      
      // Get current total position (where the wheel is now)
      let currentTotal = baseTranslateX.value + gestureOffset.value;
      
      // Normalize position to stay within loop bounds to prevent cards from disappearing
      // The loop is: 0 -> directionMultiplier * contentWidth
      const loopSize = Math.abs(directionMultiplier * currentContentWidth);
      if (loopSize > 0) {
        // Normalize to [0, loopSize] range (or negative if directionMultiplier is negative)
        currentTotal = currentTotal % loopSize;
        if (directionMultiplier < 0) {
          // For leftward (negative), ensure it's negative
          if (currentTotal > 0) {
            currentTotal = currentTotal - loopSize;
          }
        } else {
          // For rightward (positive), ensure it's positive
          if (currentTotal < 0) {
            currentTotal = currentTotal + loopSize;
          }
        }
      }
      
      // Cancel any existing animations
      cancelAnimation(baseTranslateX);
      cancelAnimation(gestureOffset);
      
      // Merge gesture offset into base position (wheel maintains its position)
      baseTranslateX.value = currentTotal;
      gestureOffset.value = 0;
      isPaused.value = false;
      
      // Continue animation from this normalized position
      const durationMs = Math.max(1, Math.round((currentContentWidth / speedPxPerSecond) * 1000));
      const targetWidth = directionMultiplier * currentContentWidth;
      
      // Continue the infinite loop from current position
      baseTranslateX.value = withRepeat(
        withTiming(currentTotal + targetWidth, {
          duration: durationMs,
          easing: Easing.linear,
        }),
        -1,
        false // Don't reset - continue from where we are
      );
    },
  });

  // Pan responder for wheel-like scrolling (captures all gestures)
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true, // Capture all touches
      onMoveShouldSetPanResponder: () => true, // Always capture movement
      onPanResponderGrant: () => {
        // Pause base animation and capture current position
        cancelAnimation(baseTranslateX);
        isPaused.value = true;
        gestureOffset.value = 0;
        
        // Clear any existing pause timeout
        if (pauseTimeoutRef.current) {
          clearTimeout(pauseTimeoutRef.current);
          pauseTimeoutRef.current = null;
        }
      },
      onPanResponderMove: (_, gestureState) => {
        // Apply gesture offset directly (wheel-like dragging)
        // Swipe left (negative dx) moves cards left (negative translateX) - correct direction
        if (contentWidthRef.current > 0) {
          gestureOffset.value = gestureState.dx;
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const velocityX = gestureState.vx || 0;
        const dx = gestureState.dx;
        const currentContentWidth = contentWidthRef.current;

        // Clear any existing pause timeout
        if (pauseTimeoutRef.current) {
          clearTimeout(pauseTimeoutRef.current);
          pauseTimeoutRef.current = null;
        }

        // If there's significant velocity, apply decay (wheel momentum)
        if (Math.abs(velocityX) > 0.1 && currentContentWidth > 0) {
          // Velocity: negative vx = swiping left, positive vx = swiping right
          // For translateX: negative = left, positive = right
          // So we want: swipe left (negative vx) -> move left (negative translateX)
          // Therefore: decayVelocity = velocityX (same direction)
          const decayVelocity = velocityX * 1000; // Same direction: left swipe continues left
          
          gestureOffset.value = withDecay(
            {
              velocity: decayVelocity,
              deceleration: 0.998, // Slower deceleration for wheel feel
              clamp: [-(currentContentWidth * 3), currentContentWidth * 3],
            },
            (finished) => {
              if (finished) {
                // When decay finishes, continue from current wheel position
                runOnJS(continueFromPositionRef.current.continueFromPosition)();
              }
            }
          );
        } else {
          // No significant velocity - continue from current position immediately
          continueFromPositionRef.current.continueFromPosition();
        }
      },
      onPanResponderTerminate: () => {
        // Gesture was interrupted, continue from current position
        if (pauseTimeoutRef.current) {
          clearTimeout(pauseTimeoutRef.current);
          pauseTimeoutRef.current = null;
        }
        continueFromPositionRef.current.continueFromPosition();
      },
    })
  ).current;

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: baseTranslateX.value + gestureOffset.value }],
    };
  });

  return (
    <View style={containerStyle}>
      <View
        {...panResponder.panHandlers}
        style={{
          overflow: 'hidden',
          paddingHorizontal: viewportPaddingHorizontal,
          paddingTop: viewportPaddingTop ?? viewportPaddingVertical,
          paddingBottom: viewportPaddingBottom ?? viewportPaddingVertical,
        }}>
        <Animated.View style={[{ flexDirection: 'row' }, animatedStyle]}>
          <View
            style={{ flexDirection: 'row' }}
            onLayout={(e) => {
              const w = e.nativeEvent.layout.width;
              // Avoid thrashing if layout reports same width repeatedly
              if (w && w > 0) setContentWidth((prev) => (prev === w ? prev : w));
            }}>
            {children}
          </View>
          <View style={{ width: gap }} />
          <View
            style={{ flexDirection: 'row' }}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants">
            {children}
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

