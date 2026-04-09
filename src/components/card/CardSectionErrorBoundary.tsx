import { Component, type ReactNode } from "react";

interface CardSectionErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface CardSectionErrorBoundaryState {
  hasError: boolean;
}

export class CardSectionErrorBoundary extends Component<
  CardSectionErrorBoundaryProps,
  CardSectionErrorBoundaryState
> {
  state: CardSectionErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): CardSectionErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Card section crashed", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}
