import { fetchHeatmapData } from "@/lib/github";

function getIntensityClass(count: number): string {
  if (count === 0) return "bg-bg-border";
  if (count <= 2) return "bg-accent-low opacity-50";
  if (count <= 5) return "bg-accent-low opacity-80";
  if (count <= 10) return "bg-accent-blue opacity-75";
  return "bg-accent-blue opacity-100";
}

export default async function HeatmapGrid({ username, token }: { username: string; token?: string }) {
  const { counts: commitCounts, source } = await fetchHeatmapData(username, token);

  // Build 365-day grid from today going back 52 weeks
  const today = new Date();
  const days: { dateStr: string; count: number }[] = [];

  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    days.push({ dateStr, count: commitCounts[dateStr] || 0 });
  }

  // Calculate streaks (chronological order — oldest first)
  let currentStreak = 0;
  let longestStreak = 0;
  let runningStreak = 0;

  for (let i = 0; i < days.length; i++) {
    if (days[i].count > 0) {
      runningStreak++;
      if (runningStreak > longestStreak) longestStreak = runningStreak;
    } else {
      if (i !== days.length - 1) runningStreak = 0;
    }
  }
  currentStreak = runningStreak;

  // Arrange into 52 columns of 7 days
  const cols: { dateStr: string; count: number }[][] = [];
  for (let w = 0; w < 52; w++) {
    cols.push(days.slice(w * 7, (w + 1) * 7));
  }

  return (
    <div className="rounded-xl border border-bg-border bg-bg-card p-5 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-xl font-semibold text-primary">Contributions</h3>
          <p className="text-secondary text-xs mt-1">
            {source === "graphql"
              ? "Showing full contribution history (last 365 days)."
              : "Showing recent push activity (last ~90 days). Add a token to see your full contribution graph."}
          </p>
        </div>
        <div className="flex gap-4 text-sm shrink-0">
          <div className="text-secondary">
            Current streak: <span className="text-primary font-bold font-mono">{currentStreak}</span>
          </div>
          <div className="text-secondary">
            Longest streak: <span className="text-primary font-bold font-mono">{longestStreak}</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="inline-flex gap-1">
          {cols.map((week, wIdx) => (
            <div key={`w-${wIdx}`} className="flex flex-col gap-1">
              {week.map((day, dIdx) => (
                <div
                  key={`d-${dIdx}`}
                  className={`w-3 h-3 rounded-sm relative group cursor-pointer ${getIntensityClass(day.count)}`}
                >
                  {/* Hover tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max bg-bg-card border border-bg-border px-2 py-1 rounded text-xs text-primary z-10 transition-opacity pointer-events-none shadow-lg">
                    {day.count} {day.count === 1 ? "contribution" : "contributions"} on {day.dateStr}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-bg-border" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
