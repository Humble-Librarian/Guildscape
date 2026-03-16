import { fetchCommitChartData, GitHubRepo } from "@/lib/github";
import CommitBarChartClient from "@/components/CommitBarChartClient";

export default async function CommitBarChart({
  username,
  repos,
  token,
}: {
  username: string;
  repos: GitHubRepo[];
  token?: string;
}) {
  const data = await fetchCommitChartData(username, repos, token);
  const totalCommitsLastYear = data.reduce((sum, item) => sum + item.commits, 0);

  return (
    <div className="rounded-xl border border-bg-border bg-bg-card p-5 h-full flex flex-col">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-secondary uppercase tracking-widest mb-1">
          Commits Last Year
        </h3>
        <p className="text-2xl font-bold font-mono text-primary">{totalCommitsLastYear}</p>
      </div>
      <div className="flex-1 w-full min-h-[250px]">
        <CommitBarChartClient data={data} />
      </div>
    </div>
  );
}
