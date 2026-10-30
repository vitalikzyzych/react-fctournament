const env = import.meta.env;

export const FIREBASE_CONFIG = {
  apiKey: env.VITE_FIREBASE_API_KEY ?? "",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: env.VITE_FIREBASE_PROJECT_ID ?? "",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: env.VITE_FIREBASE_APP_ID ?? "",
};

/** Use the local Firestore emulator instead of the real database (local testing only). */
export const USE_EMULATOR = env.VITE_USE_EMULATOR === "true";

/** Without these the app shows a setup notice instead of failing on every request. */
export const IS_FIREBASE_CONFIGURED =
  USE_EMULATOR ||
  Boolean(
    FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId && FIREBASE_CONFIG.appId
  );

export const RECAPTCHA_SITE_KEY = env.VITE_RECAPTCHA_SITE_KEY ?? "";
export const APPCHECK_DEBUG_TOKEN = env.VITE_APPCHECK_DEBUG_TOKEN ?? "";
