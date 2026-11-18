import type { IClub, IMatchdayRecap, ITournament } from "@/domain";

const WIDTH = 1080;
const PAD = 72;
const ROW = 66;

/** A theme colour from the page's CSS variables. */
const themeColor = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const fitText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
) => {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) {
    cut = cut.slice(0, -1);
  }
  return `${cut}…`;
};

/**
 * Draws a matchday summary as a PNG: the tournament, S and V wins of the
 * matchday, goals and cards, and every result. Crests are left out: their
 * host sends no CORS headers, so they cannot be drawn on a canvas.
 */
export const drawMatchdayImage = (
  recap: IMatchdayRecap,
  tournament: ITournament,
  clubsById: Map<string, IClub>
): Promise<Blob | null> => {
  const height = 430 + recap.matches.length * ROW + 90;
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);

  const color = {
    ground: themeColor("--surface-ground"),
    card: themeColor("--surface-card"),
    text: themeColor("--text-color"),
    muted: themeColor("--text-color-secondary"),
    border: themeColor("--surface-border"),
    S: themeColor("--red-500"),
    V: themeColor("--blue-500"),
    accent: themeColor("--primary-color"),
  };
  const font = (size: number, weight = 600) =>
    `${weight} ${size}px Inter, system-ui, sans-serif`;
  const badge = (x: number, y: number, r: number, player: "S" | "V") => {
    ctx.fillStyle = color[player];
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color.ground;
    ctx.font = font(r, 800);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(player, x, y + 1);
  };

  ctx.fillStyle = color.ground;
  ctx.fillRect(0, 0, WIDTH, height);

  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillStyle = color.muted;
  ctx.font = font(30, 600);
  ctx.fillText(`№ ${tournament.number} · ${tournament.game}`, PAD, 100);
  ctx.fillStyle = color.text;
  ctx.font = font(56, 800);
  ctx.fillText(fitText(ctx, tournament.name, WIDTH - PAD * 2), PAD, 170);
  ctx.fillStyle = color.accent;
  ctx.font = font(38, 700);
  ctx.fillText(`Тур ${recap.matchday}`, PAD, 230);

  // S wins : V wins
  const mid = WIDTH / 2;
  badge(mid - 250, 320, 44, "S");
  badge(mid + 250, 320, 44, "V");
  ctx.fillStyle = color.text;
  ctx.font = font(110, 800);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${recap.wins.S} : ${recap.wins.V}`, mid, 326);
  ctx.fillStyle = color.muted;
  ctx.font = font(28, 500);
  const cards = recap.cards.yellow + recap.cards.red;
  ctx.fillText(
    `перемоги  ·  нічиїх ${recap.draws}  ·  голів ${recap.goals.S}:${recap.goals.V}${cards ? `  ·  карток ${cards}` : ""}`,
    mid,
    400
  );

  recap.matches.forEach((match, index) => {
    const y = 470 + index * ROW;
    const home = clubsById.get(match.home);
    const away = clubsById.get(match.away);
    ctx.fillStyle = index % 2 ? color.ground : color.card;
    ctx.fillRect(PAD - 20, y - ROW / 2, WIDTH - (PAD - 20) * 2, ROW);
    const nameWidth = mid - PAD - 110;
    if (home) badge(PAD + 16, y, 16, home.owner);
    if (away) badge(WIDTH - PAD - 16, y, 16, away.owner);
    // Set after the badges, which draw their letter in a smaller font.
    ctx.font = font(30, 600);
    ctx.textBaseline = "middle";
    ctx.fillStyle = color.text;
    ctx.textAlign = "left";
    ctx.fillText(
      fitText(ctx, home?.name ?? match.home, nameWidth),
      PAD + 46,
      y
    );
    ctx.textAlign = "right";
    ctx.fillText(
      fitText(ctx, away?.name ?? match.away, nameWidth),
      WIDTH - PAD - 46,
      y
    );
    ctx.textAlign = "center";
    ctx.font = font(34, 800);
    ctx.fillText(`${match.result.home}:${match.result.away}`, mid, y);
  });

  ctx.fillStyle = color.muted;
  ctx.font = font(24, 500);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("FC Турніри", mid, height - 40);

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
};

/**
 * Shares the image through the phone's share sheet when it can take files,
 * otherwise downloads it. Resolves "shared", "downloaded" or "cancelled".
 */
export const shareImage = async (
  blob: Blob,
  fileName: string,
  title: string
): Promise<"shared" | "downloaded" | "cancelled"> => {
  const file = new File([blob], fileName, { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return "shared";
    } catch {
      return "cancelled";
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
  return "downloaded";
};
