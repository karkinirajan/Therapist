"use client";

interface Point {
  date: string;
  mood: number;
  anxiety: number;
}

const WIDTH = 640;
const HEIGHT = 200;
const PAD_X = 28;
const PAD_Y = 16;

function pathFor(points: Point[], key: "mood" | "anxiety"): string {
  if (points.length === 0) return "";
  const innerW = WIDTH - PAD_X * 2;
  const innerH = HEIGHT - PAD_Y * 2;
  const step = points.length > 1 ? innerW / (points.length - 1) : 0;

  return points
    .map((p, i) => {
      const x = PAD_X + step * i;
      const y = PAD_Y + innerH - (p[key] / 10) * innerH;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

/** Dependency-free SVG line chart for the mood/anxiety trend (Progress page). */
export function TrendChart({ points }: { points: Point[] }) {
  if (points.length < 2) {
    return (
      <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        Log at least two check-ins to see a trend.
      </div>
    );
  }

  const gridLines = [0, 2.5, 5, 7.5, 10];
  const innerH = HEIGHT - PAD_Y * 2;

  const first = points[0]?.date;
  const last = points[points.length - 1]?.date;

  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Mood and anxiety trend over time">
        {gridLines.map((g) => {
          const y = PAD_Y + innerH - (g / 10) * innerH;
          return (
            <line
              key={g}
              x1={PAD_X}
              x2={WIDTH - PAD_X}
              y1={y}
              y2={y}
              stroke="var(--color-border)"
              strokeWidth={1}
            />
          );
        })}
        <path d={pathFor(points, "anxiety")} fill="none" stroke="var(--color-warning)" strokeWidth={2} />
        <path d={pathFor(points, "mood")} fill="none" stroke="var(--color-primary)" strokeWidth={2.5} />
      </svg>
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{first}</span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2 rounded-full bg-primary" /> Mood
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2 rounded-full bg-warning" /> Anxiety
          </span>
        </div>
        <span>{last}</span>
      </div>
    </div>
  );
}
