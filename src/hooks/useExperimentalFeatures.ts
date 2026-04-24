export interface ExperimentalFeatures {
  multiBoardTabs: boolean;
}

const ALWAYS_ON_FEATURES: ExperimentalFeatures = {
  multiBoardTabs: true,
};

export function useExperimentalFeatures() {
  return {
    features: ALWAYS_ON_FEATURES,
    setFeature: () => {
      // Board tabs are no longer experimental.
    },
  };
}
