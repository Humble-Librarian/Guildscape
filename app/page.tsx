import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"
import { LoginButton } from "@/components/LoginButton"

export default async function Home() {
  const session = await getServerSession(authOptions)

  // If already logged in, go straight to dashboard
  if (session?.username) {
    redirect(`/${session.username}`)
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 sm:p-24 bg-[#0A0F1E]">
      <div className="w-full max-w-2xl text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-5xl font-bold font-sans text-primary">
            GitHub Visualizer
          </h1>
          <p className="text-lg text-secondary">
            Visualize your GitHub activity — commits, languages, contributions.
          </p>
        </div>
        <LoginButton />
      </div>
    </main>
  );
}
