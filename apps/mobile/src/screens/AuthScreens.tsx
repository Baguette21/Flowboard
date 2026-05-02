import React, { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useAuthActions } from "@convex-dev/auth/react";
import { Logo, LogoLockup, Mono, Screen } from "@/components/Primitives";
import type { AppTheme } from "@/theme/tokens";
import type { ScreenKey } from "@/types";

const copy: Record<"welcome" | "signin" | "signup" | "otp" | "empty", string[]> = {
  welcome: ["Plans that grow with you.", "Plans, notes, and drawings on one calm paper surface."],
  signin: ["Welcome back.", "Sign in to sync your working garden."],
  signup: ["Start a new workspace.", "Create your first board and invite collaborators."],
  otp: ["Check your inbox.", "Enter the code sent to your email."],
  empty: ["Nothing planted yet.", "Create a board to start growing your plan."],
};

export function AuthScreen({ type, theme, setScreen }: { type: keyof typeof copy; theme: AppTheme; setScreen: (screen: ScreenKey) => void }) {
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setError(null);
    if (type === "welcome") {
      setScreen("signup");
      return;
    }
    if (type === "empty") {
      setScreen("homeMixed");
      return;
    }
    setPending(true);
    try {
      if (type === "signup") {
        await signIn("password", { flow: "signUp", email, password, name });
        setScreen("otp");
      } else if (type === "signin") {
        await signIn("password", { flow: "signIn", email, password });
        setScreen("homeMixed");
      } else {
        await signIn("password", { flow: "signUp", email, password, name, code });
        setScreen("homeMixed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete sign-in.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Screen theme={theme}>
      <View style={styles.authScreen}>
        <Logo theme={theme} size={type === "welcome" ? 64 : 48} />
        {type === "welcome" ? <LogoLockup theme={theme} size={28} /> : <Mono theme={theme}>PlanThing mobile</Mono>}
        <Text style={[styles.authTitle, { color: theme.ink }]}>{copy[type][0]}</Text>
        <Text style={[styles.authBody, { color: theme.muted }]}>{copy[type][1]}</Text>
        <View style={styles.authFields}>
          {type === "signup" ? <TextInput value={name} onChangeText={setName} placeholder="Name" placeholderTextColor={theme.subtle} style={[styles.authInput, { color: theme.ink, backgroundColor: theme.panel, borderColor: theme.whisper }]} /> : null}
          {type !== "welcome" && type !== "empty" ? <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Email" placeholderTextColor={theme.subtle} style={[styles.authInput, { color: theme.ink, backgroundColor: theme.panel, borderColor: theme.whisper }]} /> : null}
          {type === "signin" || type === "signup" || type === "otp" ? <TextInput value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor={theme.subtle} secureTextEntry style={[styles.authInput, { color: theme.ink, backgroundColor: theme.panel, borderColor: theme.whisper }]} /> : null}
          {type === "otp" ? <TextInput value={code} onChangeText={setCode} keyboardType="number-pad" placeholder="Verification code" placeholderTextColor={theme.subtle} style={[styles.authInput, { color: theme.ink, backgroundColor: theme.panel, borderColor: theme.whisper }]} /> : null}
        </View>
        {error ? <Text style={[styles.errorText, { color: theme.accent }]}>{error}</Text> : null}
        <TouchableOpacity disabled={pending} onPress={submit} style={[styles.authButton, { backgroundColor: theme.ink, opacity: pending ? 0.7 : 1 }]}>
          {pending ? <ActivityIndicator color={theme.bg} /> : <Text style={[styles.authButtonText, { color: theme.bg }]}>{type === "welcome" ? "Get started" : type === "empty" ? "Create plan" : "Continue"}</Text>}
        </TouchableOpacity>
        {type === "signin" ? <TouchableOpacity onPress={() => setScreen("signup")}><Text style={[styles.linkText, { color: theme.muted }]}>Need an account?</Text></TouchableOpacity> : null}
        {type === "signup" ? <TouchableOpacity onPress={() => setScreen("signin")}><Text style={[styles.linkText, { color: theme.muted }]}>Already have an account?</Text></TouchableOpacity> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  authScreen: { minHeight: 620, paddingHorizontal: 28, paddingTop: 72, alignItems: "flex-start", gap: 16 },
  authTitle: { fontSize: 38, lineHeight: 41, fontWeight: "800", marginTop: 6 },
  authBody: { fontSize: 16, lineHeight: 24 },
  authFields: { width: "100%", gap: 10, marginTop: 10 },
  authInput: { height: 48, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, fontSize: 15, fontWeight: "600" },
  authButton: { height: 50, minWidth: 138, borderRadius: 15, paddingHorizontal: 22, alignItems: "center", justifyContent: "center", marginTop: 4 },
  authButtonText: { fontSize: 15, fontWeight: "800" },
  errorText: { fontSize: 13, lineHeight: 18, fontWeight: "700" },
  linkText: { fontSize: 13, fontWeight: "700" },
});
