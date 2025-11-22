"use client"

import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface ImpactMetric {
  label: string
  current: number
  target: number
  unit: string
}

interface ImpactMetricsProps {
  metrics: ImpactMetric[]
}

export function ImpactMetrics({ metrics }: ImpactMetricsProps) {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-6">Impact Metrics</h2>
      <div className="space-y-6">
        {metrics.map((metric, i) => {
          const percentage = (metric.current / metric.target) * 100
          return (
            <div key={i}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{metric.label}</span>
                <span className="text-sm text-muted-foreground">
                  {metric.current} / {metric.target} {metric.unit}
                </span>
              </div>
              <Progress value={Math.min(percentage, 100)} className="h-2" />
            </div>
          )
        })}
      </div>
    </Card>
  )
}
