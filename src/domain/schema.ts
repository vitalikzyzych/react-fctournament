import { z } from "zod";

import { MAX_PLAYOFF_GAMES, PLAYOFF_ROUND_IDS } from "./playoff";
import { PLAYER_IDS, SCHEMA_VERSION, TOURNAMENT_FORMATS } from "./types";

/** Lowercase slug: "real-madrid", "fc26-t04". Stable across tournaments. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Match ids are Firestore document ids, so keep them to safe characters. */
export const MATCH_ID_PATTERN = /^[A-Za-z0-9_-]{1,40}$/;
export const GROUP_ID_PATTERN = /^[A-Z0-9]{1,4}$/;
export const MAX_GOALS = 99;

const slug = z.string().regex(SLUG_PATTERN).max(60);
const name = z.string().trim().min(1).max(80);
const goals = z.int().min(0).max(MAX_GOALS);

export const scoreSchema = z.object({ home: goals, away: goals });
// A missing result is read as "not played yet".
const result = scoreSchema.nullable().default(null);

const groupMatchSchema = z.object({
  id: z.string().regex(MATCH_ID_PATTERN),
  stage: z.literal("group"),
  group: z.string().regex(GROUP_ID_PATTERN),
  matchday: z.int().min(1).max(50),
  home: slug,
  away: slug,
  result,
});

const playoffMatchSchema = z.object({
  id: z.string().regex(MATCH_ID_PATTERN),
  stage: z.literal("playoff"),
  round: z.enum(PLAYOFF_ROUND_IDS),
  tie: z.int().min(1).max(4),
  game: z.int().min(1).max(MAX_PLAYOFF_GAMES),
  home: slug,
  away: slug,
  result,
});

export const tournamentFileSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  tournament: z.object({
    id: slug,
    number: z.int().min(1).max(9999),
    name,
    game: name,
    format: z.enum(TOURNAMENT_FORMATS),
    status: z.enum(["planned", "active", "completed"]),
    // Optional: champion picked by hand when the final was not played.
    champion: slug.nullable().optional(),
  }),
  players: z
    .array(
      z.object({
        id: z.enum(PLAYER_IDS),
        name: z.string().trim().min(1).max(30),
      })
    )
    .length(2),
  groups: z
    .array(z.object({ id: z.string().regex(GROUP_ID_PATTERN), name }))
    .min(1)
    .max(16),
  clubs: z
    .array(
      z.object({
        id: slug,
        name,
        country: z.string().trim().min(1).max(40).optional(),
        owner: z.enum(PLAYER_IDS),
        group: z.string().regex(GROUP_ID_PATTERN),
      })
    )
    .min(2)
    .max(64),
  matches: z
    .array(
      z.discriminatedUnion("stage", [groupMatchSchema, playoffMatchSchema])
    )
    .min(1)
    .max(400),
});

const describeIssue = (issue: z.core.$ZodIssue): string => {
  switch (issue.code) {
    case "invalid_type":
      return issue.input === undefined
        ? "поле обовʼязкове"
        : `очікується тип ${issue.expected}`;
    case "too_small":
      return issue.origin === "array"
        ? `потрібно щонайменше ${issue.minimum} елемент(ів)`
        : issue.origin === "string"
          ? "значення не може бути порожнім"
          : `мінімальне значення ${issue.minimum}`;
    case "too_big":
      return issue.origin === "array"
        ? `допустимо не більше ${issue.maximum} елемент(ів)`
        : issue.origin === "string"
          ? `не довше ${issue.maximum} символів`
          : `максимальне значення ${issue.maximum}`;
    case "invalid_value":
      return `допустимі значення: ${issue.values.map(String).join(", ")}`;
    case "invalid_union":
      return "невідомий stage, допустимі значення: group, playoff";
    case "invalid_format":
      return "неправильний формат (див. docs/json-format.md)";
    default:
      return issue.message;
  }
};

const formatPath = (path: PropertyKey[]): string =>
  path.reduce<string>((acc, key) => {
    if (typeof key === "number") return `${acc}[${key}]`;
    return acc ? `${acc}.${String(key)}` : String(key);
  }, "");

/** Ukrainian, human-readable messages for zod issues ("clubs[3].owner: ..."). */
export const describeSchemaIssues = (error: z.ZodError): string[] =>
  error.issues.map((issue) => {
    const path = formatPath(issue.path);
    return path ? `${path}: ${describeIssue(issue)}` : describeIssue(issue);
  });
