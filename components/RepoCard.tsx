import { GitHubRepo } from "@/lib/github";
import { formatDate, getLanguageColor } from "@/lib/utils";
import { formatNumber } from "@/lib/utils";

export default function RepoCard({ repo }: { repo: GitHubRepo }) {
  const languageColor = getLanguageColor(repo.language);

  return (
    <a
      href={repo.html_url}
      target="_blank"
      rel="noreferrer"
      className="flex flex-col justify-between rounded-xl border border-bg-border bg-bg-card p-5 hover:border-accent-blue transition-colors group"
    >
      <div className="space-y-3 mb-4">
        <h3 className="text-lg font-semibold text-primary group-hover:text-accent-blue transition-colors break-words">
          {repo.name}
        </h3>
        <p className="text-sm text-secondary overflow-hidden line-clamp-2">
          {repo.description || "No description provided."}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-secondary mt-auto">
        {repo.language && (
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: languageColor }}
            />
            <span>{repo.language}</span>
          </div>
        )}
        
        {repo.stargazers_count > 0 && (
          <div className="flex items-center gap-1">
            <span aria-hidden="true">⭐</span> {formatNumber(repo.stargazers_count)}
          </div>
        )}
        
        {repo.forks_count > 0 && (
          <div className="flex items-center gap-1">
            <span aria-hidden="true">🍴</span> {formatNumber(repo.forks_count)}
          </div>
        )}

        {repo.open_issues_count > 0 && (
          <div className="flex items-center gap-1">
            <span aria-hidden="true">⭕</span> {formatNumber(repo.open_issues_count)}
          </div>
        )}

        <div className="ml-auto">
          Updated {formatDate(repo.updated_at)}
        </div>
      </div>
    </a>
  );
}
