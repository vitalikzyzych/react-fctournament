import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import {
  connectFirestoreEmulator,
  type Firestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

import {
  APPCHECK_DEBUG_TOKEN,
  FIREBASE_CONFIG,
  IS_FIREBASE_CONFIGURED,
  RECAPTCHA_SITE_KEY,
  USE_EMULATOR,
} from "@/constants/env";

let db: Firestore | null = null;

/**
 * Firestore with a persistent local cache: data shows instantly on reload, and
 * results entered offline are sent once the connection is back.
 * There is no sign-in. Writes are limited by firestore.rules and, once a
 * reCAPTCHA key is set, by App Check (only this site can reach the database).
 */
export const getDb = (): Firestore => {
  if (db) return db;
  if (!IS_FIREBASE_CONFIGURED) throw new Error("Firebase is not configured");

  if (USE_EMULATOR) {
    // Local Firestore emulator (npm run emulator). "demo-" projects never
    // reach real Firebase. No cache, so an emulator restart starts clean.
    const app = initializeApp({ projectId: "demo-fc-tournament" });
    db = initializeFirestore(app, {});
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    return db;
  }

  const app = initializeApp(FIREBASE_CONFIG);

  if (RECAPTCHA_SITE_KEY) {
    if (APPCHECK_DEBUG_TOKEN && window.location.hostname === "localhost") {
      window.FIREBASE_APPCHECK_DEBUG_TOKEN = APPCHECK_DEBUG_TOKEN;
    }
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    });
  }

  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
  return db;
};
