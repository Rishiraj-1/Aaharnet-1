"use client"

import { Card } from "@/components/ui/card"
import type { LucideIcon } from "lucide-react"

interface Stat {
  label: string
  value: string
  icon: LucideIcon
  color?: string
  trend?: string
}

interface StatsGridProps {
  stats: Stat[]
  columns?: number
}

export function StatsGrid({ stats, columns = 4 }: StatsGridProps) {
  const gridClass =
    {
      2: "grid-cols-1 md:grid-cols-2",
      3: "grid-cols-1 md:grid-cols-3",
      4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
    }[columns] || "grid-cols-1 md:grid-cols-4"

  return (
    <div className={`grid ${gridClass} gap-4`}>
      {stats.map((stat, i) => {
        const Icon = stat.icon
        return (
          <Card key={i} className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-3xl font-bold mt-2">{stat.value}</p>
                {stat.trend && <p className="text-xs text-primary mt-2">{stat.trend}</p>}
              </div>
              <Icon className={`w-8 h-8 opacity-50 ${stat.color || "text-primary"}`} />
            </div>
          </Card>
        )
      })}
    </div>
  )
}
