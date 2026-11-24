/**
 * Settings of this device: kept in localStorage, never sent anywhere. The
 * theme and the text size are attributes on <html> that styles/main.css
 * reads ("App themes").
 */
export const THEMES = [
  { id: "gold", label: "Золото" },
  { id: "teal", label: "Бірюза" },
  { id: "lime", label: "Лайм" },
  { id: "ice", label: "Лід" },
  { id: "violet", label: "Фіалка" },
  { id: "potuzhno", label: "Потужно" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export const TEXT_SIZES = [
  { id: "small", label: "Малий" },
  { id: "normal", label: "Звичайний" },
  { id: "large", label: "Великий" },
] as const;

export type TextSize = (typeof TEXT_SIZES)[number]["id"];

export interface ISettings {
  theme: ThemeId;
  textSize: TextSize;
  /** Balls flying into the net on the tournament scoreboard. */
  goalAnimation: boolean;
  /** Chances and forecasts: tables, playoff ties, title race, stakes. */
  showChances: boolean;
  /** Whether statistics count playoff games when a page opens. */
  includePlayoff: boolean;
}

export const DEFAULT_SETTINGS: ISettings = {
  theme: "gold",
  textSize: "normal",
  goalAnimation: true,
  showChances: true,
  includePlayoff: true,
};

const STORAGE_KEY = "fc-settings";

const isOneOf = <T extends string>(
  list: readonly { id: T }[],
  value: unknown
): value is T => list.some((item) => item.id === value);

/** Stored settings over the defaults; anything unknown or broken is dropped. */
export const loadSettings = (): ISettings => {
  try {
    const stored: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "{}"
    );
    if (typeof stored !== "object" || stored === null) return DEFAULT_SETTINGS;
    const raw: Record<string, unknown> = { ...stored };
    const flag = (key: keyof ISettings) =>
      typeof raw[key] === "boolean" ? raw[key] : DEFAULT_SETTINGS[key];
    return {
      theme: isOneOf(THEMES, raw.theme) ? raw.theme : DEFAULT_SETTINGS.theme,
      textSize: isOneOf(TEXT_SIZES, raw.textSize)
        ? raw.textSize
        : DEFAULT_SETTINGS.textSize,
      goalAnimation: flag("goalAnimation") === true,
      showChances: flag("showChances") === true,
      includePlayoff: flag("includePlayoff") === true,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = (settings: ISettings) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Private mode: the settings last until the page is closed.
  }
};

/** Puts the theme and the text size on <html> and tints the browser bar. */
export const applySettings = ({ theme, textSize }: ISettings) => {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.dataset.text = textSize;
  const ground = getComputedStyle(root).getPropertyValue("--ground").trim();
  if (ground) {
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", ground);
  }
};
