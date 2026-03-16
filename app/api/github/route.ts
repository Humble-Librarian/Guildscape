import { NextRequest, NextResponse } from "next/server"

const GITHUB_BASE = "https://api.github.com"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { endpoint, token } = body as { endpoint: string; token?: string }

  if (!endpoint) {
    return NextResponse.json({ error: "endpoint is required" }, { status: 400 })
  }

  // Token priority: user-provided > server env PAT > unauthenticated
  const authToken = token || process.env.GITHUB_PAT

  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  }

  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`
  }

  const url = `${GITHUB_BASE}${endpoint}`

  try {
    const res = await fetch(url, { headers })

    // ✅ KEY FIX: Pass 202 back with empty body so retry logic works.
    if (res.status === 202) {
      return new NextResponse(null, { status: 202 })
    }

    if (res.status === 404) {
      return NextResponse.json({ error: "GitHub user or resource not found" }, { status: 404 })
    }

    if (res.status === 401) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: `GitHub API error: ${res.status}` },
        { status: res.status }
      )
    }

    const data = await res.json()

    // Pass rate limit info back so frontend can display it
    return NextResponse.json(data, {
      headers: {
        "X-RateLimit-Remaining": res.headers.get("X-RateLimit-Remaining") || "",
        "X-RateLimit-Limit": res.headers.get("X-RateLimit-Limit") || "",
      },
    })
  } catch {
    return NextResponse.json({ error: "Failed to reach GitHub API" }, { status: 500 })
  }
}
