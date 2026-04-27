import { useEffect, useState } from "react";

const PRIVACY_MODE_STORAGE_KEY = "planthing:privacy-mode";
const PRIVACY_MODE_EVENT = "planthing:privacy-mode-change";

function readPrivacyMode() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(PRIVACY_MODE_STORAGE_KEY) === "true";
}

export function usePrivacyMode() {
  const [enabled, setEnabledState] = useState(readPrivacyMode);

  useEffect(() => {
    const handleChange = () => setEnabledState(readPrivacyMode());

    window.addEventListener("storage", handleChange);
    window.addEventListener(PRIVACY_MODE_EVENT, handleChange);
    return () => {
      window.removeEventListener("storage", handleChange);
      window.removeEventListener(PRIVACY_MODE_EVENT, handleChange);
    };
  }, []);

  const setEnabled = (nextEnabled: boolean) => {
    window.localStorage.setItem(
      PRIVACY_MODE_STORAGE_KEY,
      nextEnabled ? "true" : "false",
    );
    setEnabledState(nextEnabled);
    window.dispatchEvent(new Event(PRIVACY_MODE_EVENT));
  };

  return { enabled, setEnabled };
}
