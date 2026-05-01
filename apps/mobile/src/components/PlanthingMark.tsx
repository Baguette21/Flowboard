import { View, StyleSheet, type ViewStyle } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { colors } from "@/theme/tokens";

export function PlanthingMark({
  size = 28,
  style
}: {
  size?: number;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.wrap, { width: size, height: size }, style]}>
      <Svg viewBox="0 0 24 24" width={size} height={size}>
        <Path
          d="M 12 21 L 12 7"
          stroke={colors.ink}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <Path d="M 12 15 Q 6.5 17 4 12 Q 8 10.5 12 13 Z" fill={colors.ink} />
        <Path d="M 12 11 Q 17 12 19.5 7 Q 15.5 5.5 12 8.5 Z" fill={colors.ink} />
        <Circle cx="12" cy="6" r="2.25" fill={colors.sproutRed} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center"
  }
});
