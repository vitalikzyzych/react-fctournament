import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import {
  applySettings,
  DEFAULT_SETTINGS,
  type ISettings,
  loadSettings,
  saveSettings,
} from "@/utils";

interface ISettingsContext {
  settings: ISettings;
  /** Changes some settings, stores them and applies the look at once. */
  update: (changes: Partial<ISettings>) => void;
  reset: () => void;
}

const SettingsContext = createContext<ISettingsContext | null>(null);

/**
 * Settings of this device (theme, text size, what to show), read from
 * localStorage once. main.tsx applies the stored look before the first
 * render, so a chosen theme never flashes the default one.
 */
export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<ISettings>(loadSettings);

  const store = useCallback((next: ISettings) => {
    saveSettings(next);
    applySettings(next);
    setSettings(next);
  }, []);

  const value = useMemo<ISettingsContext>(
    () => ({
      settings,
      update: (changes) => store({ ...settings, ...changes }),
      reset: () => store(DEFAULT_SETTINGS),
    }),
    [settings, store]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): ISettingsContext => {
  const context = useContext(SettingsContext);
  if (!context)
    throw new Error("useSettings must be used inside SettingsProvider");
  return context;
};
