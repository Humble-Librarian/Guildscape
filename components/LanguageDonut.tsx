import { fetchLanguages, GitHubRepo } from "@/lib/github";
import LanguageDonutClient from "@/components/LanguageDonutClient";

export default async function LanguageDonut({ username, repos, token }: { username: string, repos: GitHubRepo[], token?: string }) {
  // Use up to top 15 repos to keep API calls reasonable
  const topRepos = repos.slice(0, 15);
  
  const langCounts: Record<string, number> = {};
  
  await Promise.all(
    topRepos.map(async (repo) => {
      const langs = await fetchLanguages(username, repo.name, token);
      if (langs) {
        Object.entries(langs).forEach(([lang, bytes]) => {
          langCounts[lang] = (langCounts[lang] || 0) + Number(bytes);
        });
      }
    })
  );

  const totalBytes = Object.values(langCounts).reduce((sum, bytes) => sum + bytes, 0);
  
  const languagesConfig = Object.entries(langCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6) // top 6 languages
    .map(([name, bytes]) => ({
      name,
      bytes,
      percentage: totalBytes > 0 ? (bytes / totalBytes) * 100 : 0
    }));

  return (
    <LanguageDonutClient languages={languagesConfig} totalRepos={topRepos.length} />
  );
}
