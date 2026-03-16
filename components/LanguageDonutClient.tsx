"use client"

import { useState } from "react"
import { PieChart, Pie, Cell, Sector, ResponsiveContainer } from "recharts"

const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: "#f7df1e",
  TypeScript: "#3178c6",
  Python:     "#3776ab",
  Java:       "#b07219",
  HTML:       "#e34c26",
  CSS:        "#563d7c",
  Rust:       "#dea584",
  Go:         "#00add8",
  C:          "#555555",
  "C++":      "#f34b7d",
  Ruby:       "#701516",
  Swift:      "#f05138",
  Kotlin:     "#a97bff",
  PHP:        "#4f5d95",
  "C#":       "#178600",
  Shell:      "#89e051",
  Dart:       "#00b4ab",
  Scala:      "#c22d40",
  "Jupyter Notebook": "#da5b0b",
  Vue:        "#41b883",
}

const DEFAULT_COLOR = "#4F9CF9"

interface LanguageData {
  name: string
  percentage: number
  bytes: number
}

interface Props {
  languages: LanguageData[]
  totalRepos: number
}

// Custom active shape — pulls the hovered slice outward
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderActiveShape = (props: any) => {
  const {
    cx, cy, innerRadius, outerRadius,
    startAngle, endAngle, fill,
  } = props

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 2}
        outerRadius={outerRadius + 10}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={1}
      />
    </g>
  )
}

export default function LanguageDonutClient({ languages, totalRepos }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const top6 = languages.slice(0, 6)
  const active = activeIndex !== null ? top6[activeIndex] : null

  return (
    <div className="rounded-xl border border-bg-border bg-bg-card p-5 h-full flex flex-col justify-center">
      {/* Header */}
      <p className="text-xs text-secondary uppercase tracking-widest mb-1">
        Top Languages
      </p>
      <p className="text-xs text-secondary mb-4">
        Across top {totalRepos} public repos
      </p>

      <div className="flex items-center gap-6">

        {/* Donut with dynamic center */}
        <div className="relative w-44 h-44 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={top6}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={72}
                dataKey="percentage"
                // @ts-expect-error - Recharts types for activeIndex are often incomplete
                activeIndex={activeIndex ?? undefined}
                activeShape={renderActiveShape}
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                stroke="none"
              >
                {top6.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={LANGUAGE_COLORS[entry.name] ?? DEFAULT_COLOR}
                    opacity={
                      activeIndex === null || activeIndex === index ? 1 : 0.35
                    }
                    style={{ cursor: "pointer", transition: "opacity 0.2s" }}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Dynamic center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {active ? (
              <>
                <span
                  className="text-xl font-bold font-mono leading-none"
                  style={{ color: LANGUAGE_COLORS[active.name] ?? DEFAULT_COLOR }}
                >
                  {active.percentage.toFixed(1)}%
                </span>
                <span className="text-xs text-secondary mt-1 text-center px-2 leading-tight">
                  {active.name}
                </span>
              </>
            ) : (
              <>
                <span className="text-lg font-bold text-primary font-mono leading-none">
                  {top6.length}
                </span>
                <span className="text-xs text-secondary mt-1">
                  languages
                </span>
              </>
            )}
          </div>
        </div>

        {/* Ranked sidebar legend */}
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          {top6.map((lang, index) => {
            const color = LANGUAGE_COLORS[lang.name] ?? DEFAULT_COLOR
            const isActive = activeIndex === index
            const isDimmed = activeIndex !== null && !isActive

            return (
              <div
                key={lang.name}
                className="flex items-center gap-2 transition-opacity duration-200"
                style={{ opacity: isDimmed ? 0.35 : 1 }}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                {/* Bar */}
                <div className="relative h-1.5 flex-1 rounded-full bg-bg-border overflow-hidden">
                  <div
                    className="absolute left-0 top-0 h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${lang.percentage}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>

                {/* Name */}
                <span
                  className="text-xs w-24 truncate text-right transition-colors duration-200"
                  style={{ color: isActive ? color : "#9CA3AF" }}
                >
                  {lang.name}
                </span>

                {/* Percentage */}
                <span className="text-xs font-mono text-secondary w-10 text-right">
                  {lang.percentage.toFixed(1)}%
                </span>
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
