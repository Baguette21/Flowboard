import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle
} from "react-native";
import { colors, radius } from "@/theme/tokens";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  children,
  variant = "primary",
  loading = false,
  style,
  disabled,
  ...props
}: PressableProps & {
  children: ReactNode;
  variant?: ButtonVariant;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      {...props}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        (pressed || loading) && styles.pressed,
        (disabled || loading) && styles.disabled,
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "primary" || variant === "danger" ? colors.paperBg : colors.ink}
        />
      ) : (
        <Text style={[styles.label, styles[`${variant}Label`]]}>{children}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    minWidth: 48,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    borderWidth: 1
  },
  primary: {
    backgroundColor: colors.ink,
    borderColor: colors.ink
  },
  secondary: {
    backgroundColor: colors.paperPanel,
    borderColor: colors.strongBorder
  },
  ghost: {
    backgroundColor: "transparent",
    borderColor: "transparent"
  },
  danger: {
    backgroundColor: colors.sproutRed,
    borderColor: colors.sproutRed
  },
  label: {
    fontSize: 15,
    fontWeight: "700"
  },
  primaryLabel: {
    color: colors.paperBg
  },
  secondaryLabel: {
    color: colors.ink
  },
  ghostLabel: {
    color: colors.ink
  },
  dangerLabel: {
    color: colors.paperBg
  },
  pressed: {
    opacity: 0.76
  },
  disabled: {
    opacity: 0.5
  }
});
