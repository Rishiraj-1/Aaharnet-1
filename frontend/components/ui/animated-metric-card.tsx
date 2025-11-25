"use client"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { LucideIcon, ArrowUpRight, ArrowDownRight } from "lucide-react"

interface AnimatedMetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  gradient: string
  bgGradient: string
  trend?: string
  trendUp?: boolean
}

export function AnimatedMetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  gradient,
  bgGradient,
  trend,
  trendUp
}: AnimatedMetricCardProps) {
  return (
    <Card 
      className={cn(
        "relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300",
        "bg-gradient-to-br", bgGradient
      )}
    >
      <div className="p-6 relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className={cn(
            "p-3 rounded-xl bg-gradient-to-br shadow-lg",
            gradient
          )}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          {trend && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full",
              trendUp 
                ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" 
                : "bg-red-500/20 text-red-700 dark:text-red-400"
            )}>
              {trendUp ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {trend}
            </div>
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <p className="text-3xl font-bold mb-1">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      <div className={cn(
        "absolute -bottom-12 -right-12 w-32 h-32 rounded-full opacity-20 blur-2xl",
        "bg-gradient-to-br", gradient
      )} />
    </Card>
  )
}

