import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuthActions } from "@convex-dev/auth/react";
import { AuthShell } from "@/features/auth/AuthShell";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { getErrorMessage } from "@/lib/errors";
import { useAppNavigation } from "@/navigation/NavigationContext";
import { colors, spacing } from "@/theme/tokens";

export function SignInScreen() {
  const navigation = useAppNavigation();
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await signIn("password", { email, password, flow: "signIn" });
      if (!result.signingIn) {
        navigation.navigate({ name: "verifyEmail", email });
      } else {
        navigation.replace({ name: "main", tab: "workspace" });
      }
    } catch (err) {
      setError(getErrorMessage(err, "Sign in failed. Try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Open your boards and keep the plan moving.">
      <View style={styles.form}>
        <TextField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button onPress={submit} loading={loading}>Sign In</Button>
        <Pressable style={styles.linkButton} onPress={() => navigation.navigate({ name: "forgotPassword" })}>
          <Text style={styles.linkText}>Forgot password?</Text>
        </Pressable>
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>No account yet?</Text>
        <Pressable onPress={() => navigation.navigate({ name: "signUp" })}>
          <Text style={styles.footerLink}>Create one</Text>
        </Pressable>
      </View>
    </AuthShell>
  );
}

export function SignUpScreen() {
  const navigation = useAppNavigation();
  const { signIn } = useAuthActions();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await signIn("password", { name: name.trim(), email, password, flow: "signUp" });
      if (!result.signingIn) navigation.navigate({ name: "verifyEmail", email });
      else navigation.replace({ name: "main", tab: "workspace" });
    } catch (err) {
      setError(getErrorMessage(err, "Sign up failed. Try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Create account" subtitle="Start with a board, then shape it your way.">
      <View style={styles.form}>
        <TextField label="Name" value={name} onChangeText={setName} />
        <TextField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button onPress={submit} loading={loading}>Create Account</Button>
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account?</Text>
        <Pressable onPress={() => navigation.navigate({ name: "signIn" })}>
          <Text style={styles.footerLink}>Sign in</Text>
        </Pressable>
      </View>
    </AuthShell>
  );
}

export function VerifyEmailScreen({ email }: { email: string }) {
  const navigation = useAppNavigation();
  const { signIn } = useAuthActions();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await signIn("password", { flow: "email-verification", email, code: code.trim() });
      if (!result.signingIn) throw new Error("Invalid verification code");
      navigation.replace({ name: "main", tab: "workspace" });
    } catch (err) {
      setError(getErrorMessage(err, "We could not verify that code."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Check your email" subtitle={`Enter the six-digit code sent to ${email}.`}>
      <View style={styles.form}>
        <TextField label="Verification Code" value={code} onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" maxLength={6} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button onPress={submit} loading={loading}>Verify Email</Button>
      </View>
    </AuthShell>
  );
}

export function ForgotPasswordScreen() {
  const navigation = useAppNavigation();
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    setLoading(true);
    try {
      if (!awaitingCode) {
        await signIn("password", { flow: "reset", email });
        setAwaitingCode(true);
      } else {
        const result = await signIn("password", { flow: "reset-verification", email, code, newPassword });
        if (!result.signingIn) throw new Error("Invalid code");
        navigation.replace({ name: "main", tab: "workspace" });
      }
    } catch (err) {
      if (!awaitingCode) setAwaitingCode(true);
      else setError(getErrorMessage(err, "Password reset failed."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title={awaitingCode ? "Reset password" : "Forgot password"} subtitle={awaitingCode ? `Enter the code sent to ${email}.` : "We will send a reset code if the account exists."}>
      <View style={styles.form}>
        <TextField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" editable={!awaitingCode} />
        {awaitingCode ? (
          <>
            <TextField label="Reset Code" value={code} onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" maxLength={6} />
            <TextField label="New Password" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
          </>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button onPress={submit} loading={loading}>{awaitingCode ? "Change Password" : "Send Reset Code"}</Button>
        <Pressable style={styles.linkButton} onPress={() => navigation.navigate({ name: "signIn" })}>
          <Text style={styles.linkText}>Back to sign in</Text>
        </Pressable>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  error: { color: colors.sproutRed, fontSize: 13, lineHeight: 18 },
  linkButton: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  linkText: { color: colors.mutedText, fontSize: 14, fontWeight: "700" },
  footer: { alignItems: "center", gap: 8 },
  footerText: { color: colors.mutedText, fontSize: 14 },
  footerLink: { color: colors.ink, fontSize: 15, fontWeight: "800" }
});
