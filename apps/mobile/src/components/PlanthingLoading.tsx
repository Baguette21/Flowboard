import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import type { AppTheme } from "@/theme/tokens";
import { palette } from "@/theme/tokens";

const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const STEM_LENGTH = 44;
const GROUND_LENGTH = 40;

export function PlanthingLoading({ message, theme }: { message?: string; theme: AppTheme }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 2600,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [progress]);

  const stemDashOffset = progress.interpolate({
    inputRange: [0, 0.28, 0.82, 1],
    outputRange: [STEM_LENGTH, 0, 0, 0],
  });
  const stemOpacity = progress.interpolate({
    inputRange: [0, 0.82, 1],
    outputRange: [1, 1, 0],
  });

  const leafRightScale = progress.interpolate({
    inputRange: [0, 0.2, 0.4, 0.82, 1],
    outputRange: [0, 0, 1, 1, 1],
  });
  const leafRightOpacity = progress.interpolate({
    inputRange: [0, 0.2, 0.4, 0.82, 1],
    outputRange: [0, 0, 1, 1, 0],
  });

  const leafLeftScale = progress.interpolate({
    inputRange: [0, 0.32, 0.52, 0.82, 1],
    outputRange: [0, 0, 1, 1, 1],
  });
  const leafLeftOpacity = progress.interpolate({
    inputRange: [0, 0.32, 0.52, 0.82, 1],
    outputRange: [0, 0, 1, 1, 0],
  });

  const budScale = progress.interpolate({
    inputRange: [0, 0.55, 0.68, 0.78, 0.82, 1],
    outputRange: [0, 0, 1.25, 1, 1, 1],
  });
  const budOpacity = progress.interpolate({
    inputRange: [0, 0.55, 0.68, 0.82, 1],
    outputRange: [0, 0, 1, 1, 0],
  });

  const groundDashOffset = progress.interpolate({
    inputRange: [0, 0.18, 0.82, 1],
    outputRange: [GROUND_LENGTH, 0, 0, 0],
  });
  const groundOpacity = progress.interpolate({
    inputRange: [0, 0.82, 1],
    outputRange: [0.35, 0.35, 0],
  });

  const ink = theme.muted;

  return (
    <View style={styles.wrap} accessibilityRole="progressbar" accessibilityLabel={message ?? "Loading"}>
      <Svg viewBox="0 0 80 80" width={72} height={72} fill="none">
        <AnimatedLine
          x1="20"
          y1="65"
          x2="60"
          y2="65"
          stroke={ink}
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray={`${GROUND_LENGTH}`}
          strokeDashoffset={groundDashOffset as unknown as number}
          opacity={groundOpacity as unknown as number}
        />
        <AnimatedPath
          d="M 40 65 L 40 24"
          stroke={ink}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={`${STEM_LENGTH}`}
          strokeDashoffset={stemDashOffset as unknown as number}
          opacity={stemOpacity as unknown as number}
        />
        <AnimatedPath
          d="M 40 38 Q 53 41 60 30 Q 50 26 40 32 Z"
          fill={ink}
          opacity={leafRightOpacity as unknown as number}
          originX={40}
          originY={36}
          scale={leafRightScale as unknown as number}
        />
        <AnimatedPath
          d="M 40 50 Q 26 55 19 43 Q 30 39 40 45 Z"
          fill={ink}
          opacity={leafLeftOpacity as unknown as number}
          originX={40}
          originY={48}
          scale={leafLeftScale as unknown as number}
        />
        <AnimatedCircle
          cx={40}
          cy={22}
          r={5}
          fill={palette.accent}
          opacity={budOpacity as unknown as number}
          originX={40}
          originY={22}
          scale={budScale as unknown as number}
        />
      </Svg>
      {message ? <Text style={[styles.message, { color: theme.muted }]}>{message}</Text> : null}
    </View>
  );
}

export function PlanthingLoadingScreen({ message, theme }: { message?: string; theme: AppTheme }) {
  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <PlanthingLoading message={message} theme={theme} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: "center", justifyContent: "center" },
  wrap: { alignItems: "center", justifyContent: "center", gap: 18 },
  message: { fontFamily: "Courier", fontSize: 13, fontWeight: "600", letterSpacing: 0.4 },
});
