export function formatNumber(num: number): string {
  return Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(num);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes !== 1 ? "s" : ""} ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours !== 1 ? "s" : ""} ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays} day${diffInDays !== 1 ? "s" : ""} ago`;
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths} month${diffInMonths !== 1 ? "s" : ""} ago`;
  
  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} year${diffInYears !== 1 ? "s" : ""} ago`;
}

export function getLanguageColor(language: string | null): string {
  if (!language) return "#4B5563"; // text-muted equivalent
  
  const colors: Record<string, string> = {
    JavaScript: "#f7df1e",
    TypeScript: "#3178c6",
    Python: "#3572A5",
    Java: "#b07219",
    "C++": "#f34b7d",
    C: "#555555",
    "C#": "#178600",
    Ruby: "#701516",
    Go: "#00ADD8",
    Rust: "#dea584",
    HTML: "#e34c26",
    CSS: "#563d7c",
    PHP: "#4F5D95",
    Swift: "#F05138",
    Kotlin: "#A97BFF",
  };
  
  return colors[language] || "#8b949e"; // default gray
}

/** Maps week index (0–51, where 51 = most recent) to a short month label */
export function weekIndexToMonth(weekIndex: number): string {
  const now = new Date();
  const date = new Date(now);
  date.setDate(date.getDate() - (51 - weekIndex) * 7);
  return date.toLocaleString("default", { month: "short" });
}
