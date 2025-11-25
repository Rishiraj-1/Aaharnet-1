"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DonationChart } from "@/components/donation-chart"
import { ImpactMetrics } from "@/components/impact-metrics"
import { useAuth } from "@/context/AuthContext"
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection"
import { TrendingUp, Package, Heart, Award, ToggleLeft, ToggleRight, BarChart3, PieChart } from "lucide-react"
import { useState, useMemo } from "react"
import Link from "next/link"

// Mock analytics data
const mockAnalytics = {
  totalDonations: 45,
  totalFoodDonated: 1250,
  averageDonationSize: 27.8,
  completionRate: 92.5,
  impactScore: 850,
  monthlyTrend: [
    { month: "Jan", donations: 8, quantity: 220 },
    { month: "Feb", donations: 12, quantity: 340 },
    { month: "Mar", donations: 10, quantity: 280 },
    { month: "Apr", donations: 15, quantity: 410 },
  ],
  foodTypeDistribution: [
    { type: "Vegetarian", percentage: 65, quantity: 812 },
    { type: "Non-Vegetarian", percentage: 25, quantity: 313 },
    { type: "Vegan", percentage: 10, quantity: 125 },
  ],
  topRecipients: [
    { name: "Community Food Bank", donations: 15, quantity: 420 },
    { name: "Hope for All", donations: 12, quantity: 350 },
    { name: "Local Shelter", donations: 8, quantity: 230 },
  ]
}

export default function DonorAnalyticsPage() {
  const navItems = [
    { label: "My Donations", href: "/donor" },
    { label: "Map", href: "/map" },
    { label: "Schedule Pickup", href: "/donor/schedule" },
    { label: "Analytics", href: "/donor/analytics" },
    { label: "Settings", href: "/donor/settings" },
  ]

  const { user, loading: authLoading } = useAuth()
  const [useMockData, setUseMockData] = useState(true)

  // Real data from Firestore
  const { data: donations, loading: donationsLoading } = useFirestoreCollection<{
    id: string
    donorId: string
    qtyKg: number
    quantity_kg: number
    foodType: string
    food_type: string
    status: string
    createdAt: any
    created_at: string
    ngoId?: string
    ngo_id?: string
  }>('donations', {
    whereFilter: user?.uid ? {
      field: 'donorId',
      operator: '==',
      value: user.uid
    } : undefined,
    orderByField: 'createdAt',
    orderByDirection: 'desc',
    limitCount: 100
  })

  // Calculate real analytics from donations
  const realAnalytics = useMemo(() => {
    if (!donations || donations.length === 0) {
      return {
        totalDonations: 0,
        totalFoodDonated: 0,
        averageDonationSize: 0,
        completionRate: 0,
        impactScore: 0,
        monthlyTrend: [],
        foodTypeDistribution: [],
        topRecipients: []
      }
    }

    const totalDonations = donations.length
    const totalFoodDonated = donations.reduce((sum, d) => 
      sum + (d.qtyKg || d.quantity_kg || 0), 0
    )
    const completedDonations = donations.filter(d => 
      d.status === 'delivered' || d.status === 'completed'
    ).length
    const completionRate = totalDonations > 0 ? (completedDonations / totalDonations) * 100 : 0

    // Group by month
    const monthlyData = new Map<string, { donations: number; quantity: number }>()
    donations.forEach(d => {
      const date = d.createdAt?.toDate ? d.createdAt.toDate() : new Date(d.created_at || Date.now())
      const monthKey = date.toLocaleDateString('en-US', { month: 'short' })
      const existing = monthlyData.get(monthKey) || { donations: 0, quantity: 0 }
      monthlyData.set(monthKey, {
        donations: existing.donations + 1,
        quantity: existing.quantity + (d.qtyKg || d.quantity_kg || 0)
      })
    })
    const monthlyTrend = Array.from(monthlyData.entries()).map(([month, data]) => ({
      month,
      ...data
    }))

    // Food type distribution
    const foodTypeData = new Map<string, number>()
    donations.forEach(d => {
      const type = d.foodType || d.food_type || 'Unknown'
      foodTypeData.set(type, (foodTypeData.get(type) || 0) + (d.qtyKg || d.quantity_kg || 0))
    })
    const totalByType = Array.from(foodTypeData.values()).reduce((a, b) => a + b, 0)
    const foodTypeDistribution = Array.from(foodTypeData.entries()).map(([type, quantity]) => ({
      type,
      percentage: totalByType > 0 ? (quantity / totalByType) * 100 : 0,
      quantity
    }))

    // Top recipients (NGOs)
    const recipientData = new Map<string, { donations: number; quantity: number }>()
    donations.forEach(d => {
      const ngoId = d.ngoId || d.ngo_id
      if (ngoId) {
        const existing = recipientData.get(ngoId) || { donations: 0, quantity: 0 }
        recipientData.set(ngoId, {
          donations: existing.donations + 1,
          quantity: existing.quantity + (d.qtyKg || d.quantity_kg || 0)
        })
      }
    })
    const topRecipients = Array.from(recipientData.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 3)

    return {
      totalDonations,
      totalFoodDonated,
      averageDonationSize: totalDonations > 0 ? totalFoodDonated / totalDonations : 0,
      completionRate,
      impactScore: Math.round(totalFoodDonated * 0.68), // Impact calculation
      monthlyTrend,
      foodTypeDistribution,
      topRecipients
    }
  }, [donations])

  const analytics = useMockData ? mockAnalytics : realAnalytics
  const loading = useMockData ? false : donationsLoading

  return (
    <DashboardLayout title="Analytics" navItems={navItems}>
      <div className="space-y-6">
        {/* Toggle between mock and real data */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Data Source</h3>
              <p className="text-sm text-muted-foreground">
                {useMockData ? "Showing mock data for demonstration" : "Showing real data from database"}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setUseMockData(!useMockData)}
              className="flex items-center gap-2"
            >
              {useMockData ? (
                <>
                  <ToggleLeft className="h-4 w-4" />
                  Switch to Real Data
                </>
              ) : (
                <>
                  <ToggleRight className="h-4 w-4" />
                  Switch to Mock Data
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Donations</p>
                <p className="text-3xl font-bold">{analytics.totalDonations}</p>
                <p className="text-xs text-muted-foreground mt-1">All time</p>
              </div>
              <Package className="h-10 w-10 text-primary" />
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Food Donated</p>
                <p className="text-3xl font-bold">{analytics.totalFoodDonated.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground mt-1">kg</p>
              </div>
              <Heart className="h-10 w-10 text-red-500" />
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Donation</p>
                <p className="text-3xl font-bold">{analytics.averageDonationSize.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground mt-1">kg per donation</p>
              </div>
              <TrendingUp className="h-10 w-10 text-green-500" />
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Impact Score</p>
                <p className="text-3xl font-bold">{analytics.impactScore}</p>
                <p className="text-xs text-muted-foreground mt-1">points</p>
              </div>
              <Award className="h-10 w-10 text-yellow-500" />
            </div>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Monthly Trend
              </h3>
            </div>
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : analytics.monthlyTrend.length > 0 ? (
              <div className="space-y-2">
                {analytics.monthlyTrend.map((item) => (
                  <div key={item.month} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.month}</span>
                    <div className="flex items-center gap-4">
                      <div className="w-32">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${(item.quantity / Math.max(...analytics.monthlyTrend.map(m => m.quantity))) * 100}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-semibold w-20 text-right">
                        {item.quantity} kg
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Food Type Distribution
              </h3>
            </div>
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : analytics.foodTypeDistribution.length > 0 ? (
              <div className="space-y-4">
                {analytics.foodTypeDistribution.map((item) => (
                  <div key={item.type}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{item.type}</span>
                      <span className="text-sm text-muted-foreground">
                        {item.percentage.toFixed(1)}% ({item.quantity} kg)
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </Card>
        </div>

        {/* Top Recipients */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Top Recipients</h3>
          {loading ? (
            <div className="h-32 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : analytics.topRecipients.length > 0 ? (
            <div className="space-y-3">
              {analytics.topRecipients.map((recipient, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="font-bold text-primary">{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium">{recipient.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {recipient.donations} donations
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{recipient.quantity} kg</p>
                    <p className="text-xs text-muted-foreground">Total received</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-muted-foreground">
              No recipient data available
            </div>
          )}
        </Card>

        {/* Completion Rate */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Completion Rate</h3>
            <span className="text-2xl font-bold">{analytics.completionRate.toFixed(1)}%</span>
          </div>
          <div className="h-4 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${analytics.completionRate}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {analytics.completionRate >= 90 
              ? "Excellent! Keep up the great work!"
              : analytics.completionRate >= 70
              ? "Good progress! Try to complete more donations."
              : "Room for improvement. Focus on completing scheduled donations."}
          </p>
        </Card>
      </div>
    </DashboardLayout>
  )
}

