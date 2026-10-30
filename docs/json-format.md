# Tournament JSON format (schemaVersion 1)

This is the format the app imports and exports. Give this whole file to ChatGPT when asking it to prepare a tournament, together with the club list from the app (Import / Export page, "Скопіювати список клубів").

Two complete examples are in `examples/`:

- `examples/tournament-new.example.json`: a new tournament, fixtures only, every `result` is `null`.
- `examples/tournament-completed.example.json`: a finished tournament with every result filled in, including the playoff (two legs per quarter-final and semi-final, and one quarter-final that needed a replay).

## Top-level structure

```json
{
  "schemaVersion": 1,
  "tournament": { },
  "players": [ ],
  "groups": [ ],
  "clubs": [ ],
  "matches": [ ]
}
```

All six fields are required. Unknown extra fields are ignored and are not stored.

## tournament

| Field | Type | Rules |
|---|---|---|
| `id` | string | Unique tournament id. Lowercase letters, digits and single hyphens, for example `fc26-t04`. Must not already exist in the app. |
| `number` | integer | Tournament number, 1 or higher, for example `4`. |
| `name` | string | Display name in Ukrainian, for example `Турнір 4`. Up to 80 characters. |
| `game` | string | For example `EA SPORTS FC 26`. |
| `format` | string | `sv-groups-4x4` (4 groups of 4 clubs) or `sv-league-40` (a 40-club league, see below). |
| `status` | string | `planned`, `active` or `completed`. |
| `champion` | string or null | Optional. Club `id` of the champion, for a tournament whose final was not played (for example an older tournament without a full playoff). Must be a club from `clubs`. When the final has a winner, the final winner is the champion and this field is ignored. |

Status rules:

- `planned`: no match may have a result.
- `active`: some, all or no matches may have results. Use this for a tournament that is being played.
- `completed`: every match in the file must have a result, playoff games included. Completed tournaments are locked in the app until someone unlocks them.

## players

Always exactly these two entries:

```json
[{ "id": "S", "name": "S" }, { "id": "V", "name": "V" }]
```

`name` may be changed, `id` must stay `S` and `V`.

## groups

```json
[{ "id": "A", "name": "Група A" }, { "id": "B", "name": "Група B" }]
```

`id` is 1 to 4 uppercase letters or digits. For `sv-groups-4x4` there are exactly four groups: `A`, `B`, `C`, `D`. For `sv-league-40` there is one group, `{ "id": "L", "name": "Ліга" }`.

## clubs

```json
{ "id": "real-madrid", "name": "Real Madrid", "country": "Spain", "owner": "S", "group": "A" }
```

| Field | Type | Rules |
|---|---|---|
| `id` | string | Lowercase slug, for example `real-madrid`, `paris-saint-germain`. |
| `name` | string | Display name. |
| `country` | string | Optional. |
| `owner` | string | `S` or `V`: who plays this club in this tournament. |
| `group` | string | A group `id` from `groups`. |
| `pot` | integer | Only for `sv-league-40`, required there: the pot, 1 to 4. |
| `code` | string | Only for `sv-league-40`, required there: pot, owner and number in the pot, for example `1S-1`, `3V-2`. |

**Club ids must stay the same across all tournaments.** The history of a club is joined by its id. If Real Madrid is `real-madrid` in tournament 1, it must be `real-madrid` in every later file, not `real_madrid` or `realmadrid`. Use the club list exported from the app and reuse its ids. A club that has never played before gets a new id in the same style.

Ownership belongs to the tournament, so the same club may be `S` in one tournament and `V` in another.

## matches

`matches` holds group matches (`"stage": "group"`) and, optionally, playoff games (`"stage": "playoff"`, see the next section). A new tournament usually has only group matches; the playoff is filled in later in the app.

### Group matches

```json
{
  "id": "A1-1",
  "stage": "group",
  "group": "A",
  "matchday": 1,
  "home": "real-madrid",
  "away": "arsenal",
  "result": { "home": 2, "away": 1 }
}
```

| Field | Type | Rules |
|---|---|---|
| `id` | string | Unique within the tournament. Letters, digits, `-` and `_`, up to 40 characters. Convention: `{group}{matchday}-{n}`, for example `A1-1`, `A1-2`, `B3-1`. |
| `stage` | string | `group`. |
| `group` | string | Group `id`. Both clubs must belong to this group. |
| `matchday` | integer | Matchday number, starting at 1. |
| `home` | string | Club `id` of the home team. |
| `away` | string | Club `id` of the away team. |
| `result` | object or null | `null` means the match is not played yet. `{ "home": 0, "away": 0 }` is a played 0:0 draw. Goals are whole numbers from 0 to 99. Only the final score is stored. |

A missing `result` field is read as `null`.

### Playoff games

After the group stage there is a playoff: 4 quarter-final ties, 2 semi-final ties and a final. Which clubs play in each tie is decided by the players, not by the group tables. In the app, a quarter-final pairs a club of one player with a club of the other player from a different group. Semi-finals and the final may pair any two clubs, because the winners left can belong to one player.

How a tie is played:

- **Quarter-finals and semi-finals: two legs.** Game 1 is at the first club, game 2 at the second club (home and away swap).
- **Final: one game.**
- **The aggregate decides**: the goals of all games of the tie added up per club. In the final that is simply the score of the game.
- **A level aggregate is replayed**: if the two legs end level on aggregate, or the final is a draw, the same two clubs play another game (game 3 after two legs, game 2 after the final), again until the aggregate is not level. Home and away keep swapping from game to game.
- The winner of the final is the tournament champion. Without a decided final, the champion can be set with `tournament.champion` or picked in the app.

Example: the second leg of quarter-final 2, at the second club.

```json
{
  "id": "QF2-2",
  "stage": "playoff",
  "round": "QF",
  "tie": 2,
  "game": 2,
  "home": "inter",
  "away": "manchester-city",
  "result": { "home": 1, "away": 1 }
}
```

| Field | Type | Rules |
|---|---|---|
| `id` | string | Must be `{round}{tie}-{game}`, for example `QF1-1`, `QF1-2`, `SF1-1`, `F1-1`. |
| `stage` | string | `playoff`. |
| `round` | string | `QF` (quarter-final, ties 1 to 4), `SF` (semi-final, ties 1 and 2) or `F` (final, tie 1). |
| `tie` | integer | Number of the tie within the round. |
| `game` | integer | `1` and `2` for the legs of a quarter-final or semi-final (`1` for the final), then `3`, `4`, ... for replays (`2`, `3`, ... in the final). Up to 20. |
| `home`, `away` | string | Club `id`s from `clubs`. The same two clubs in every game of a tie. Game 1 at the first club, game 2 at the second, and so on. |
| `result` | object or null | Same as for group matches. |

Rules checked on import:

1. The games of a tie are numbered 1, 2, 3, ... without gaps.
2. Every game of a tie is between the same two clubs.
3. A replay (a game after the legs of the round) is allowed only when every game before it is played and the aggregate of those games is level.
4. A club appears in at most one tie per round.
5. A tie may be missing entirely (not drawn yet). Teams are never `null`: leave the tie out instead.

Files from earlier tournaments where a quarter-final or semi-final was a single game still import: a tie with one decided game is complete.

## Format rules for sv-groups-4x4

These rules apply to the group matches. The import refuses a file that breaks any of these:

1. 16 clubs, 4 groups (`A` to `D`), 4 clubs per group.
2. Every group has exactly 2 clubs with owner `S` and 2 with owner `V`.
3. Clubs of the same player never play each other. Every match is an `S` club against a `V` club.
4. Every S and V pair in a group plays twice, once at home and once away. That is 8 matches per group and 32 in total.
5. 4 matchdays (1 to 4). Every club plays exactly once on every matchday, so each matchday has 8 matches.

A schedule that satisfies these rules, with the group's clubs called S1, S2 (owner S) and V1, V2 (owner V):

| Matchday | Match 1 | Match 2 |
|---|---|---|
| 1 | S1 vs V1 | S2 vs V2 |
| 2 | V2 vs S1 | V1 vs S2 |
| 3 | V1 vs S1 | V2 vs S2 |
| 4 | S1 vs V2 | S2 vs V1 |

The home team is listed first.

## Format rules for sv-league-40

A league phase in the style of the UEFA Champions League. These rules apply to the league matches. The import refuses a file that breaks any of these:

1. 40 clubs in one group `L`, 20 with owner `S` and 20 with owner `V`.
2. 4 pots of 10 clubs. Every pot has 5 `S` clubs and 5 `V` clubs. Every club has `pot` and a unique `code` that starts with its pot and owner (`2V-4` is a V club of pot 2).
3. Clubs of the same player never play each other. Every match is an `S` club against a `V` club.
4. Every club plays 8 matches against 8 different clubs: 2 from every pot, its own included, one of them at home and one away. That is 4 home and 4 away matches per club.
5. No pair of clubs meets twice.
6. 8 matchdays (1 to 8). Every club plays exactly once on every matchday, so each matchday has 20 matches and there are 160 in total.
7. Match ids are `L{matchday}-{number}`, from `L1-1` to `L8-20`. `stage` is `group`, `group` is `L`.

`docs/chatgpt-league-prompt.md` has a ready prompt that asks ChatGPT for such a draw. `examples/tournament-league.example.json` is a valid file.

After the league the app has two champions. The winner of the league table, once every league match is played, is the league winner. The playoff works as in the other format, with the 4 best `S` clubs and the 4 best `V` clubs of the table suggested for the quarter-final draw. In the quarter-finals every pair is an `S` club against a `V` club; groups play no part. The winner of the final is the champion of the tournament.

## Standings

The app calculates standings, it does not read them from the file. Order: points (3 for a win, 1 for a draw), then goal difference, then head-to-head between the tied clubs, then goals scored. Playoff games do not count in the group tables. They do count in the S against V records, the tournament statistics and club history.

## Prompt template for ChatGPT

```
Create a tournament JSON file in the format described below (schemaVersion 1).
Reuse the club ids from the club list exactly. For a club that is not in the
list, create a new lowercase slug id in the same style.

Tournament: id "fc26-t05", number 5, name "Турнір 5", game "EA SPORTS FC 26",
format "sv-groups-4x4", status "active".

Groups and owners:
Group A: <club> (S), <club> (S), <club> (V), <club> (V)
Group B: ...
Group C: ...
Group D: ...

Generate all 32 group-stage matches with the schedule from the format rules,
match ids like "A1-1", and "result": null for every match.
Return only the JSON.

<paste docs/json-format.md here>
<paste the club list here>
```

For a finished tournament, use status `completed`, list the real fixtures and fill in every `result`. Add the playoff games as described in "Playoff games": two legs per quarter-final and semi-final (`QF1-1`, `QF1-2`), one final (`F1-1`), and a replay only where the aggregate was level.

## Export and backup

- Each tournament page has "Експорт JSON", which downloads the tournament in this same format. The file can be imported again after deleting the tournament or with a new `id`.
- The Import / Export page has "Резервна копія всіх турнірів", which downloads `{ "schemaVersion": 1, "exportedAt": "...", "tournaments": [ ... ] }`, a list of files in this format. Restoring from that file is not built yet. Each entry can be imported on its own.
