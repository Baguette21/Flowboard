import {
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View
} from "react-native";
import { colors, radius } from "@/theme/tokens";

export function TextField({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor={colors.subtleText}
        style={[styles.input, props.multiline && styles.multiline, props.style]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 7
  },
  label: {
    color: colors.mutedText,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase"
  },
  input: {
    minHeight: 50,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.whisperBorder,
    backgroundColor: "rgba(232, 228, 221, 0.72)",
    color: colors.ink,
    paddingHorizontal: 16,
    fontSize: 16
  },
  multiline: {
    minHeight: 92,
    paddingTop: 14,
    textAlignVertical: "top"
  },
  error: {
    color: colors.sproutRed,
    fontSize: 12,
    lineHeight: 17
  }
});
