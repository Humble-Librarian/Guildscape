import Link from "next/link";
import { fetchUser, fetchRepos, GitHubRepo } from "@/lib/github";
import ProfileHeader from "@/components/ProfileHeader";
import StatCard from "@/components/StatCard";
import RepoGrid from "@/components/RepoGrid";
import CommitBarChart from "@/components/CommitBarChart";
import LanguageDonut from "@/components/LanguageDonut";
import HeatmapGrid from "@/components/HeatmapGrid";
import { formatNumber } from "@/lib/utils";
import { Suspense } from "react";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";

// For Next.js 14 App Router, page params are available via the `params` object.
interface PageProps {
  params: {
    username: string;
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `${username} — GitHub Visualizer`,
    description: `GitHub statistics and visualization for @${username}`,
  };
}

export default async function UserProfilePage({ params }: PageProps) {
  const { username } = await params;
  
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/");
  }

  // Users can only view their own dashboard in this authorized version
  if (session.username !== username) {
    redirect(`/${session.username}`);
  }

  const token = session.accessToken;
  
  const profile = await fetchUser(username, token);
  
  if (!profile) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-3xl font-bold text-primary mb-4">User not found</h1>
        <p className="text-secondary mb-8">The GitHub user @{username} does not exist.</p>
        <Link href="/" className="bg-bg-border text-primary px-6 py-3 rounded-xl hover:bg-opacity-80 transition-colors">
          Go Back
        </Link>
      </main>
    );
  }

  const repos = await fetchRepos(username, token) || [];
  const totalStars = repos.reduce((sum: number, repo: GitHubRepo) => sum + repo.stargazers_count, 0);

  return (
    <main className="min-h-screen p-6 sm:p-12 max-w-6xl mx-auto space-y-8">
      <nav className="mb-4 flex justify-between items-center">
        <Link href="/" className="text-secondary hover:text-primary transition-colors flex items-center gap-2">
          &larr; Back to search
        </Link>
        <LogoutButton />
      </nav>
      
      <ProfileHeader user={profile} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Repos" value={formatNumber(profile.public_repos)} />
        <StatCard label="Total Stars" value={formatNumber(totalStars)} />
        <StatCard label="Followers" value={formatNumber(profile.followers)} />
        <StatCard label="Following" value={formatNumber(profile.following)} />
      </div>

      <RepoGrid repos={repos} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Suspense fallback={<div className="rounded-xl border border-bg-border bg-bg-card p-5 h-[340px] animate-pulse"></div>}>
          <CommitBarChart username={username} repos={repos} token={token} />
        </Suspense>
        <Suspense fallback={<div className="rounded-xl border border-bg-border bg-bg-card p-5 h-[340px] animate-pulse"></div>}>
          <LanguageDonut username={username} repos={repos} token={token} />
        </Suspense>
      </div>

      <Suspense fallback={<div className="rounded-xl border border-bg-border bg-bg-card p-5 h-[280px] animate-pulse"></div>}>
        <HeatmapGrid username={username} token={token} />
      </Suspense>

      {/* Sections for later phases */}
      {/* Search Header */}
      {/* 4 Stat Cards */}
      {/* Repository Grid */}
      {/* Charts */}
      {/* Heatmap */}
      
    </main>
  );
}
