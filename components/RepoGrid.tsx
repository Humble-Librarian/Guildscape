import { GitHubRepo } from "@/lib/github";
import RepoCard from "./RepoCard";

export default function RepoGrid({ repos }: { repos: GitHubRepo[] }) {
  // Take top 6 sorted by stars (assuming they are already sorted by the API call)
  const topRepos = repos.slice(0, 6);

  if (topRepos.length === 0) {
    return (
      <div className="rounded-xl border border-bg-border bg-bg-card p-8 text-center text-secondary">
        No public repositories found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-primary flex items-center gap-2">
        <span aria-hidden="true">📦</span> Top Repositories
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {topRepos.map((repo) => (
          <RepoCard key={repo.id} repo={repo} />
        ))}
      </div>
    </div>
  );
}
