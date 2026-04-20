import { useEffect, useState } from "react";

export interface ExperimentalFeatures {
  multiBoardTabs: boolean;
}

const EXPERIMENTAL_FEATURES_STORAGE_KEY = "flowboard.experimentalFeatures";
const EXPERIMENTAL_FEATURES_EVENT = "flowboard:experimental-features";

const DEFAULT_FEATURES: ExperimentalFeatures = {
  multiBoardTabs: false,
};

function readExperimentalFeatures(): ExperimentalFeatures {
  if (typeof window === "undefined") {
    return DEFAULT_FEATURES;
  }

  const raw = window.localStorage.getItem(EXPERIMENTAL_FEATURES_STORAGE_KEY);
  if (!raw) {
    return DEFAULT_FEATURES;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ExperimentalFeatures>;
    return {
      multiBoardTabs: parsed.multiBoardTabs === true,
    };
  } catch {
    return DEFAULT_FEATURES;
  }
}

function writeExperimentalFeatures(nextFeatures: ExperimentalFeatures) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    EXPERIMENTAL_FEATURES_STORAGE_KEY,
    JSON.stringify(nextFeatures),
  );
  window.dispatchEvent(
    new CustomEvent<ExperimentalFeatures>(EXPERIMENTAL_FEATURES_EVENT, {
      detail: nextFeatures,
    }),
  );
}

export function useExperimentalFeatures() {
  const [features, setFeatures] = useState<ExperimentalFeatures>(() =>
    readExperimentalFeatures(),
  );

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === EXPERIMENTAL_FEATURES_STORAGE_KEY) {
        setFeatures(readExperimentalFeatures());
      }
    };

    const handleCustomEvent = (event: Event) => {
      const customEvent = event as CustomEvent<ExperimentalFeatures>;
      setFeatures(customEvent.detail ?? readExperimentalFeatures());
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(EXPERIMENTAL_FEATURES_EVENT, handleCustomEvent);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(EXPERIMENTAL_FEATURES_EVENT, handleCustomEvent);
    };
  }, []);

  const setFeature = <K extends keyof ExperimentalFeatures>(
    key: K,
    value: ExperimentalFeatures[K],
  ) => {
    const nextFeatures = {
      ...features,
      [key]: value,
    };
    setFeatures(nextFeatures);
    writeExperimentalFeatures(nextFeatures);
  };

  return {
    features,
    setFeature,
  };
}
