# FC Турніри

Web app for the EA SPORTS FC tournaments between S and V: tournaments imported from JSON, match results entered from any device, standings and statistics calculated from the results, and the full history across tournaments. The interface is in Ukrainian.

React 19, TypeScript, Vite, PrimeReact and PrimeFlex, Cloud Firestore. No backend server and no sign-in.

Common tasks and fixes (deploy, import problems, replacing a tournament, missing crests or flags, backups) are in `docs/how-to.md`.

## Commands

```bash
npm install
npm run dev            # http://localhost:3100, uses the Firebase project from .env.local
npm run build          # type check and production build into dist/
npm run lint
npm test               # domain unit tests (validation, standings, statistics)
npm run emulator       # local Firestore emulator on 127.0.0.1:8080 (needs Java 21)
npm run dev:emulator   # dev server against the emulator instead of the real database
npm run test:rules     # firestore.rules tests, with the emulator running
npm run deploy         # build, then deploy hosting and Firestore rules
```

## First-time setup

These steps happen in the Firebase console and on your machine. They are needed once.

### 1. Create the Firebase project

1. Open https://console.firebase.google.com and click "Create a project".
2. Name it, for example `fc-tournament`. Google Analytics is not needed.
3. The project starts on the free Spark plan. Keep it there; no billing account is needed.

### 2. Create the Firestore database

1. In the project, open Build, then Firestore Database, then "Create database".
2. Pick a location close to you, for example `eur3 (europe)` or `europe-central2 (Warsaw)`. The location cannot be changed later.
3. Choose "Start in production mode". The real rules are deployed in step 5.

### 3. Register the web app and fill in .env.local

1. Open Project settings (gear icon), General tab, "Your apps", and click the web icon `</>`.
2. Give it a nickname. Leave "Also set up Firebase Hosting" unticked; hosting is configured in this repo.
3. Copy the values from the `firebaseConfig` object.
4. In this folder:

   ```bash
   cp .env.example .env.local
   ```

   Fill in `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID` and `VITE_FIREBASE_APP_ID`. These values are not secret; they end up in the public JavaScript anyway.

5. `npm install` and `npm run dev`. Until the rules from step 5 are deployed, production mode refuses every read, so the app shows a loading error. That is expected.

### 4. Connect the Firebase CLI

```bash
npx firebase-tools login
npx firebase-tools use --add
```

Pick the project and use the alias `default`. This creates `.firebaserc`.

### 5. Deploy

```bash
npm run deploy
```

This builds with the values from `.env.local`, deploys `firestore.rules` and uploads `dist/` to Firebase Hosting. The app is then live at `https://<project-id>.web.app`. Run the same command after every change.

### 6. App Check (recommended)

Without sign-in, anyone who has the site's Firebase config could write to the database from a script, within what the rules allow. App Check makes Firestore accept requests only from the deployed site.

1. Create a reCAPTCHA v3 key at https://www.google.com/recaptcha/admin/create. Type: "Score based (v3)". Domains: `<project-id>.web.app`, `<project-id>.firebaseapp.com` and `localhost`.
2. In the Firebase console, open Build, then App Check, then Apps. Register the web app with the reCAPTCHA provider and paste the **secret** key.
3. Put the **site** key in `.env.local` as `VITE_RECAPTCHA_SITE_KEY`.
4. For local development: in App Check, open the web app's menu, "Manage debug tokens", "Add debug token", generate one, and put it in `.env.local` as `VITE_APPCHECK_DEBUG_TOKEN`.
5. `npm run deploy`, open the site and use it for a while. On the App Check page, Cloud Firestore should show verified requests.
6. Only then click "Enforce" for Cloud Firestore. From that moment, requests without a valid App Check token are refused.

### 7. First data

The database starts empty: the app never creates data on its own. Open the Import / Export page and import your tournament JSON files, the completed ones first (status `completed`) and then the current one (status `active`). The format is described in `docs/json-format.md`.

The files in `examples/` are only for the unit tests and as a reference for ChatGPT. Do not import them into the real database. To try the app with them, use the emulator (`npm run emulator` and `npm run dev:emulator`), which is wiped when it stops.

## Access model

There is no sign-in, by decision: anyone with the link can view and enter results. `firestore.rules` still limits what can be written: only the exact document shapes the app creates, scores from 0 to 99, only status changes on a tournament, no edits to a completed tournament, and no deletion of a completed tournament or of single matches.

## Backups

The Spark plan has no automatic Firestore backups. Use "Резервна копія всіх турнірів" on the Import / Export page now and then, and keep the original JSON files.
