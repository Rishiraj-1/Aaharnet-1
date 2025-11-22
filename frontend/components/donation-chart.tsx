"use client"

import { Card } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

const data = [
  { day: "Mon", donations: 240 },
  { day: "Tue", donations: 320 },
  { day: "Wed", donations: 280 },
  { day: "Thu", donations: 390 },
  { day: "Fri", donations: 450 },
  { day: "Sat", donations: 380 },
  { day: "Sun", donations: 290 },
]

export function DonationChart() {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-4">Weekly Donations</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="day" stroke="var(--muted-foreground)" />
          <YAxis stroke="var(--muted-foreground)" />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
            }}
          />
          <Bar dataKey="donations" fill="var(--primary)" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}
