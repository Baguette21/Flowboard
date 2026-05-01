import "react-native-gesture-handler";
import { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { useConvexAuth, ConvexReactClient } from "convex/react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { CONVEX_URL } from "@/lib/config";
import { secureTokenStorage } from "@/lib/secureStorage";
import { NavigationContext, type Route } from "@/navigation/NavigationContext";
import { ForgotPasswordScreen, SignInScreen, SignUpScreen, VerifyEmailScreen } from "@/screens/AuthScreens";
import { InvitesScreen, MainTabs } from "@/screens/MainScreens";
import { BoardScreen, CardScreen, DrawingScreen, NoteScreen } from "@/screens/DetailScreens";
import { colors } from "@/theme/tokens";

const convex = new ConvexReactClient(CONVEX_URL, { unsavedChangesWarning: false });

function Router() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [stack, setStack] = useState<Route[]>([{ name: "signIn" }]);
  const route = stack[stack.length - 1];
  const navigation = useMemo(
    () => ({
      route,
      navigate: (next: Route) => setStack((current) => [...current, next]),
      replace: (next: Route) => setStack((current) => [...current.slice(0, -1), next]),
      back: () => setStack((current) => (current.length > 1 ? current.slice(0, -1) : [{ name: "main", tab: "workspace" }]))
    }),
    [route]
  );

  if (isLoading) {
    return <View style={styles.loading}><ActivityIndicator color={colors.ink} /></View>;
  }

  let effectiveRoute = route;
  if (isAuthenticated && ["signIn", "signUp", "verifyEmail", "forgotPassword"].includes(route.name)) {
    effectiveRoute = { name: "main", tab: "workspace" };
  }
  if (!isAuthenticated && !["signIn", "signUp", "verifyEmail", "forgotPassword"].includes(route.name)) {
    effectiveRoute = { name: "signIn" };
  }

  return (
    <NavigationContext.Provider value={{ ...navigation, route: effectiveRoute }}>
      {effectiveRoute.name === "signIn" ? <SignInScreen /> : null}
      {effectiveRoute.name === "signUp" ? <SignUpScreen /> : null}
      {effectiveRoute.name === "verifyEmail" ? <VerifyEmailScreen email={effectiveRoute.email} /> : null}
      {effectiveRoute.name === "forgotPassword" ? <ForgotPasswordScreen /> : null}
      {effectiveRoute.name === "main" ? <MainTabs tab={effectiveRoute.tab} /> : null}
      {effectiveRoute.name === "invites" ? <InvitesScreen /> : null}
      {effectiveRoute.name === "board" ? <BoardScreen boardId={effectiveRoute.boardId} /> : null}
      {effectiveRoute.name === "card" ? <CardScreen cardId={effectiveRoute.cardId} /> : null}
      {effectiveRoute.name === "note" ? <NoteScreen noteId={effectiveRoute.noteId} /> : null}
      {effectiveRoute.name === "drawing" ? <DrawingScreen drawingId={effectiveRoute.drawingId} /> : null}
    </NavigationContext.Provider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ConvexAuthProvider
        client={convex}
        storage={secureTokenStorage}
        storageNamespace="planthing-mobile"
        replaceURL={() => undefined}
        shouldHandleCode={false}
      >
        <Router />
      </ConvexAuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.paperBg
  }
});
