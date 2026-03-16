import Image from "next/image";
import { GitHubUser } from "@/lib/github";

export default function ProfileHeader({ user }: { user: GitHubUser }) {
  const joinedYear = new Date(user.created_at).getFullYear();

  return (
    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 rounded-xl border border-bg-border bg-bg-card p-6 sm:p-8">
      <Image
        src={user.avatar_url}
        alt={user.login}
        width={120}
        height={120}
        className="rounded-full border border-bg-border shrink-0 bg-base"
        unoptimized={false}
      />
      <div className="flex-1 text-center sm:text-left space-y-3">
        <div>
          <h1 className="text-2xl font-semibold text-primary">{user.name || user.login}</h1>
          <a href={user.html_url} target="_blank" rel="noreferrer" className="text-accent-blue hover:underline">
            @{user.login}
          </a>
        </div>
        
        {user.bio && <p className="text-secondary max-w-2xl">{user.bio}</p>}
        
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-sm text-secondary">
          {user.location && (
            <span className="flex items-center gap-1">
              <span aria-hidden="true">📍</span> {user.location}
            </span>
          )}
          <span className="flex items-center gap-1">
            <span aria-hidden="true">🗓️</span> Joined {joinedYear}
          </span>
        </div>
      </div>
    </div>
  );
}
