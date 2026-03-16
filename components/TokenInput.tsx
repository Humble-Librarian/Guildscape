"use client"

interface TokenInputProps {
  value: string
  onChange: (val: string) => void
}

export function TokenInput({ value, onChange }: TokenInputProps) {
  return (
    <div className="flex flex-col gap-1 w-full max-w-md mx-auto mt-4 text-left">
      <label className="text-xs text-secondary uppercase tracking-widest">
        GitHub Token
        <span className="ml-2 text-muted normal-case tracking-normal">optional — unlocks full history</span>
      </label>
      <input
        type="password"
        placeholder="ghp_xxxxxxxxxxxx"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-bg-card border border-bg-border rounded-xl px-4 py-2.5 text-sm text-primary
                   placeholder:text-muted focus:outline-none focus:border-accent-blue transition"
      />
      <p className="text-xs text-muted mt-1 leading-relaxed">
        Generate at github.com/settings/tokens — no scopes needed for public data.<br/>
        Your token is never stored and is only used for this session.
      </p>
    </div>
  )
}
