import NextAuth from "next-auth"
import GithubProvider from "next-auth/providers/github"
import type { NextAuthOptions } from "next-auth"

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          // Only request what you need — public data only
          scope: "read:user",
        },
      },
    }),
  ],
  callbacks: {
    // Persist the access token and username into the session
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token as string
        token.username = (profile as { login?: string })?.login as string
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      session.username = token.username as string
      return session
    },
  },
  pages: {
    signIn: "/",   // Redirect to landing page if not signed in
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
