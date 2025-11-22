"use client"

import type React from "react"

import { Card } from "@/components/ui/card"

interface Activity {
  id: number
  type: "donation" | "pickup" | "delivery" | "volunteer"
  title: string
  description: string
  timestamp: string
  icon: React.ReactNode
}

interface ActivityFeedProps {
  activities: Activity[]
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-4 pb-4 border-b border-border last:border-0">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
              {activity.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{activity.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{activity.description}</p>
              <p className="text-xs text-muted-foreground mt-2">{activity.timestamp}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
