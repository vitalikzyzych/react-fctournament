# How to: common tasks and fixes

Short step lists for things that come up while running the app. Every command runs in the `fc-tournament` folder. First-time Firebase setup is in `README.md`; the JSON format is in `docs/json-format.md`.

Contents:

- [Publish a change to the live site](#publish-a-change-to-the-live-site)
- [Save the code to GitHub](#save-the-code-to-github)
- [Import a tournament from ChatGPT](#import-a-tournament-from-chatgpt)
- [The import shows errors](#the-import-shows-errors)
- [Replace a tournament that is already imported](#replace-a-tournament-that-is-already-imported)
- [Fix a result in a completed tournament](#fix-a-result-in-a-completed-tournament)
- [Start a planned tournament](#start-a-planned-tournament)
- [A club has no crest](#a-club-has-no-crest)
- [A club has no flag](#a-club-has-no-flag)
- [Keep club history connected across tournaments](#keep-club-history-connected-across-tournaments)
- [Back up all data](#back-up-all-data)
- [Firebase CLI uses the wrong Google account](#firebase-cli-uses-the-wrong-google-account)
- [Try changes without touching the real data](#try-changes-without-touching-the-real-data)

## Publish a change to the live site

```bash
npm run deploy
```

This builds the code in the folder and uploads the site and the database rules to https://eafc-tournament-75465.web.app. Tournament data is not touched.

- It uses `.env.local`, so run it on the machine that has that file.
- It publishes what is in the folder, committed or not.
- Open tabs get the new version after a refresh.
- To undo a deploy: Firebase console, Hosting, Release history, "Rollback" on the previous version.

## Save the code to GitHub

```bash
git add .
git commit -m "Short description of the change"
git push
```

`git push` only saves the code. The live site changes only with `npm run deploy`.

If the push is refused with "Permission denied" or 403, git is signed in with another GitHub account. Run `gh auth login` and choose the personal account, or switch the remote to SSH: `git remote set-url origin git@github.com:<user>/<repo>.git`.

## Import a tournament from ChatGPT

1. Give ChatGPT `docs/json-format.md` (paste or attach) and the tournament data. For a 40-club league tournament use `docs/chatgpt-league-prompt.md` instead.
2. If clubs played before, also paste the club list from the app: Import / Export, "Скопіювати список клубів", with the line "Reuse these club ids exactly".
3. Pick the status:
   - `completed`: a finished tournament. Every match needs a result.
   - `active`: the tournament being played now. Some or no results.
   - `planned`: a future tournament. No results.
4. In the app: Імпорт, paste the JSON or choose the file, "Перевірити".
5. Check the preview (groups, S and V badges, number of results, clubs without a crest), then "Імпортувати турнір".

## The import shows errors

The import refuses a file that breaks a rule, and lists every problem in Ukrainian.

1. Copy the whole error list.
2. Send it to ChatGPT with: "Fix these errors and send the full JSON again".
3. Paste the new JSON and check again.

Common causes: a club id used in a match that is not in `clubs`, two clubs of the same player playing each other, a missing match, a match id that does not follow the pattern, `completed` with matches that have no result.

Warnings (yellow) do not block the import. Read them anyway: "Клуб ... має id ..., а в попередніх турнірах ..." means the club's history would split in two (see [Keep club history connected](#keep-club-history-connected-across-tournaments)).

## Replace a tournament that is already imported

An import with an existing tournament id is refused. To replace it:

1. Optional: open the tournament and click "Експорт JSON" to keep the current version.
2. If it is completed, click "Розблокувати" first. A completed tournament cannot be deleted.
3. Click the red delete icon and confirm.
4. Import the new file.

## Fix a result in a completed tournament

Completed tournaments are locked on purpose.

1. Open the tournament, click "Розблокувати", confirm.
2. Fix the score on the Матчі or Плей-офф tab.
3. Click "Завершити", type the 4-digit code, confirm.

While it is unlocked, it counts as in progress (not as a title) and the app may have two active tournaments.

## Start a planned tournament

A planned tournament shows its schedule but takes no results until it starts.

1. Complete the current tournament first. "Почати турнір" stays disabled while another tournament is in progress; the hint names it.
2. Open the planned tournament, click "Почати турнір", confirm.

## A club has no crest

Crests come from a catalog of about 500 clubs (ESPN team lists) that ships with the app. Matching is automatic, by club id and then by name, every time a page is shown. Nothing needs to run for an import.

A club without a crest shows the first letter of its name in a circle, and the import preview lists it under "Немає логотипа для".

To fix it:

1. In the app: Import / Export, "Завантажити clubs.json".
2. Run:

   ```bash
   npm run club-catalog -- ~/Downloads/clubs.json
   ```

   It downloads the ESPN lists again, rebuilds `src/constants/clubCatalog.json`, and prints the clubs that still do not match.
3. For each club still listed, find out why:
   - **The name differs from ESPN's** (for example "Inter" against "Internazionale"): add a line to `ALIASES` in `scripts/build-club-catalog.ts`, our name on the left, ESPN's display name on the right. Run step 2 again.
   - **ESPN does not cover the club's league**: add the league to `LEAGUES` in the same file (ESPN league slug and flag code, for example `["pol.1", "pl"]`). Run step 2 again.
4. `npm run deploy`. No re-import is needed; the crest appears once the new catalog is live.

## A club has no flag

The flag comes from the club's `country` in the tournament file (English or Ukrainian name, for example "Spain" or "Іспанія"). Without it, the app uses the country of the club's league from the crest catalog.

If the flag is still missing, the country is not in the app's flag list (`src/ui/CountryFlag.tsx`, about 27 countries). To add one:

1. Add an import at the top, for example `import ro from "flag-icons/flags/4x3/ro.svg";` (the file name is the country code).
2. Add the code to `FLAGS` (`ro,`).
3. Add the country names to `COUNTRY_CODES` (`romania: "ro", румунія: "ro",`).
4. `npm run deploy`.

## Keep club history connected across tournaments

A club's history (titles, records, head-to-head) is joined by its club id. If the same club gets `real-madrid` in one file and `real_madrid` in another, its history splits in two.

- Before preparing a new file, paste the club list from the app into ChatGPT with "Reuse these club ids exactly".
- During import, read the yellow warnings: they name clubs whose id differs from earlier tournaments.
- If a wrong id was already imported: export that tournament, fix the id in the file (every place it appears), then [replace the tournament](#replace-a-tournament-that-is-already-imported).

## Back up all data

The free Firebase plan has no automatic backups.

1. Import / Export, "Резервна копія всіх турнірів". This downloads one file with every tournament.
2. Keep it together with the original JSON files.

Restoring from that file is not built yet. Each tournament inside it can be imported on its own.

## Firebase CLI uses the wrong Google account

`npm run deploy` fails with a permission error, or `npx firebase-tools projects:list` does not show `eafc-tournament-75465`.

```bash
npx firebase-tools login:list
npx firebase-tools login:add                         # if the personal account is missing
npx firebase-tools login:use vitalikzyzych@gmail.com # use it for this folder only
```

Other folders keep their own account.

## Try changes without touching the real data

The local Firestore emulator is a throwaway database. It needs Java 21:

```bash
JAVA_HOME=/opt/homebrew/opt/openjdk@21 PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH" npm run emulator
```

In a second terminal:

```bash
npm run dev:emulator
```

The app then reads and writes only the emulator, which is wiped when it stops. Import the files from `examples/` there, never into the real database.

Automated checks:

```bash
npm test             # unit tests
npm run test:rules   # database rules tests, emulator must be running
npx tsc -b           # type check
npm run lint
```
