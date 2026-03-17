"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SearchBar() {
  const [username, setUsername] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      router.push(`/${encodeURIComponent(username.trim())}`);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 w-full max-w-md mx-auto">
        <input
          type="text"
          placeholder="Enter GitHub username..."
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="flex-1 bg-bg-card border border-bg-border rounded-xl px-4 py-3 text-primary focus:outline-none focus:border-accent-blue transition-colors"
          required
        />
        <button
          type="submit"
          className="bg-accent-blue text-white font-medium px-6 py-3 rounded-xl hover:opacity-90 transition-opacity"
        >
          Search
        </button>
      </form>
    </div>
  );
}
