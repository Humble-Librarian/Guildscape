import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { query, variables, token } = await req.json()

  const authToken = token || process.env.GITHUB_PAT

  if (!authToken) {
    return NextResponse.json(
      { error: "GraphQL endpoint requires a token" },
      { status: 401 }
    )
  }

  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ query, variables }),
  })

  if (!res.ok) {
    return NextResponse.json(
      { error: `GraphQL request failed: ${res.status}` },
      { status: res.status }
    )
  }

  const data = await res.json()
  return NextResponse.json(data)
}
