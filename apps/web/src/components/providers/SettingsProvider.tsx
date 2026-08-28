"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "./AuthProvider";

export type ThemeOption = "dark" | "system" | "high-contrast";
export type DensityOption = "comfortable" | "compact";
export type FrameworkOption = "CIS" | "NIST" | "STIG" | "ISO";

export interface UserPreferences {
  theme: ThemeOption;
  density: DensityOption;
  reducedMotion: boolean;
  defaultFramework: FrameworkOption;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: "dark",
  density: "comfortable",
  reducedMotion: false,
  defaultFramework: "CIS",
};

interface SettingsContextType {
  preferences: UserPreferences;
  setTheme: (theme: ThemeOption) => void;
  setDensity: (density: DensityOption) => void;
  setReducedMotion: (reducedMotion: boolean) => void;
  setDefaultFramework: (framework: FrameworkOption) => void;
  resetPreferences: () => void;
  isSaving: boolean;
  lastSaved: Date | null;
}

const SettingsContext = createContext<SettingsContextType>({
  preferences: DEFAULT_PREFERENCES,
  setTheme: () => {},
  setDensity: () => {},
  setReducedMotion: () => {},
  setDefaultFramework: () => {},
  resetPreferences: () => {},
  isSaving: false,
  lastSaved: null,
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);

  // Storage key scoped by authenticated user identity for tenant/user isolation
  const storageKey = user?.id
    ? `netvigil_settings_${user.id}`
    : "netvigil_settings_default";

  // Apply DOM attributes & classes globally
  const applyPreferencesToDOM = useCallback((prefs: UserPreferences) => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;

    // 1. Theme Application
    root.classList.remove("theme-high-contrast", "light");
    if (prefs.theme === "high-contrast") {
      root.classList.add("dark", "theme-high-contrast");
    } else if (prefs.theme === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) {
        root.classList.add("dark");
      } else {
        root.classList.add("light");
      }
    } else {
      // Default: dark
      root.classList.add("dark");
    }

    // 2. Density Application
    root.setAttribute("data-density", prefs.density);
    if (prefs.density === "compact") {
      root.classList.add("density-compact");
    } else {
      root.classList.remove("density-compact");
    }

    // 3. Reduced Motion Application
    root.setAttribute("data-reduced-motion", String(prefs.reducedMotion));
    if (prefs.reducedMotion) {
      root.classList.add("reduced-motion");
    } else {
      root.classList.remove("reduced-motion");
    }
  }, []);

  // Load preferences on mount or when user session changes
  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        const merged: UserPreferences = {
          theme: parsed.theme || DEFAULT_PREFERENCES.theme,
          density: parsed.density || DEFAULT_PREFERENCES.density,
          reducedMotion: typeof parsed.reducedMotion === "boolean" ? parsed.reducedMotion : DEFAULT_PREFERENCES.reducedMotion,
          defaultFramework: parsed.defaultFramework || DEFAULT_PREFERENCES.defaultFramework,
        };
        setPreferences(merged);
        applyPreferencesToDOM(merged);
        return;
      }
    } catch {
      // ignore
    }
    applyPreferencesToDOM(DEFAULT_PREFERENCES);
  }, [storageKey, applyPreferencesToDOM]);

  // Listen to system color scheme changes when in 'system' mode
  useEffect(() => {
    if (!mounted || preferences.theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      applyPreferencesToDOM(preferences);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [mounted, preferences, applyPreferencesToDOM]);

  // Persist preference updates
  const savePreferences = useCallback(
    (newPrefs: UserPreferences) => {
      setPreferences(newPrefs);
      applyPreferencesToDOM(newPrefs);
      setIsSaving(true);
      try {
        localStorage.setItem(storageKey, JSON.stringify(newPrefs));
        setLastSaved(new Date());
      } catch {
        // ignore
      } finally {
        setTimeout(() => setIsSaving(false), 400);
      }
    },
    [storageKey, applyPreferencesToDOM]
  );

  const setTheme = useCallback(
    (theme: ThemeOption) => {
      savePreferences({ ...preferences, theme });
    },
    [preferences, savePreferences]
  );

  const setDensity = useCallback(
    (density: DensityOption) => {
      savePreferences({ ...preferences, density });
    },
    [preferences, savePreferences]
  );

  const setReducedMotion = useCallback(
    (reducedMotion: boolean) => {
      savePreferences({ ...preferences, reducedMotion });
    },
    [preferences, savePreferences]
  );

  const setDefaultFramework = useCallback(
    (defaultFramework: FrameworkOption) => {
      savePreferences({ ...preferences, defaultFramework });
    },
    [preferences, savePreferences]
  );

  const resetPreferences = useCallback(() => {
    savePreferences(DEFAULT_PREFERENCES);
  }, [savePreferences]);

  return (
    <SettingsContext.Provider
      value={{
        preferences,
        setTheme,
        setDensity,
        setReducedMotion,
        setDefaultFramework,
        resetPreferences,
        isSaving,
        lastSaved,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
