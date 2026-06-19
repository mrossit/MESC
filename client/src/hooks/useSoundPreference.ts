import { useCallback, useEffect, useState } from "react";

const SOUND_ENABLED_KEY = "mesc_sound_enabled";
const SOUND_CHANGE_EVENT = "mesc:sound-preference-change";

function readSoundPreference(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(SOUND_ENABLED_KEY) !== "false";
}

export function useSoundPreference() {
  const [soundEnabled, setSoundEnabledState] = useState(readSoundPreference);

  useEffect(() => {
    const syncPreference = () => setSoundEnabledState(readSoundPreference());

    window.addEventListener("storage", syncPreference);
    window.addEventListener(SOUND_CHANGE_EVENT, syncPreference);

    return () => {
      window.removeEventListener("storage", syncPreference);
      window.removeEventListener(SOUND_CHANGE_EVENT, syncPreference);
    };
  }, []);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    localStorage.setItem(SOUND_ENABLED_KEY, enabled ? "true" : "false");
    setSoundEnabledState(enabled);
    window.dispatchEvent(new CustomEvent(SOUND_CHANGE_EVENT));
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled(!readSoundPreference());
  }, [setSoundEnabled]);

  return { soundEnabled, setSoundEnabled, toggleSound };
}
