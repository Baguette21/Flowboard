import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { RootApp } from "@/RootApp";
import { convex } from "@/lib/convexClient";

class RuntimeErrorBoundary extends React.Component<React.PropsWithChildren, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error(error);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.errorScreen}>
          <Text style={styles.errorTitle}>Mobile runtime error</Text>
          <Text style={styles.errorMessage}>{this.state.error.message}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <ConvexAuthProvider
        client={convex}
        storage={AsyncStorage}
        storageNamespace="planthing-mobile"
        replaceURL={() => undefined}
        shouldHandleCode={false}
      >
        <RuntimeErrorBoundary>
          <RootApp />
        </RuntimeErrorBoundary>
      </ConvexAuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  errorScreen: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "#F5F3EE",
  },
  errorTitle: {
    color: "#111111",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 10,
  },
  errorMessage: {
    color: "rgba(0,0,0,0.62)",
    fontSize: 14,
    lineHeight: 20,
  },
});
