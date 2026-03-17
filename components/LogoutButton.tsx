"use client"

import { signOut } from "next-auth/react"

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="text-xs text-[#9CA3AF] hover:text-[#F3F4F6] transition-colors"
    >
      Sign out
    </button>
  )
}
