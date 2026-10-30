import { describe, expect, it } from "vitest";

import { findCatalogClub } from "./clubCatalog";
import { normalizeClubName } from "./clubNames";

describe("club catalog", () => {
  it("normalizes accents, slugs and club words", () => {
    expect(normalizeClubName("Atlético Madrid")).toBe("atletico madrid");
    expect(normalizeClubName("atletico-madrid")).toBe("atletico madrid");
    expect(normalizeClubName("AC Milan")).toBe("milan");
    expect(normalizeClubName("Beşiktaş")).toBe("besiktas");
    expect(normalizeClubName("FC")).toBe("fc");
  });

  it("finds clubs by id or by name, including short names", () => {
    const madrid = findCatalogClub("real-madrid", "Real Madrid");
    expect(madrid?.country).toBe("es");
    expect(findCatalogClub("inter", "Inter")?.country).toBe("it");
    expect(findCatalogClub("psg", "PSG")?.country).toBe("fr");
    expect(findCatalogClub(undefined, "Arsenal")?.country).toBe("gb-eng");
    expect(findCatalogClub("no-such-club", "No Such Club")).toBeNull();
  });
});
