"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DonationChart } from "@/components/donation-chart"
import { ImpactMetrics } from "@/components/impact-metrics"
import { useAuth } from "@/context/AuthContext"
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection"
import { TrendingUp, Package, Heart, Award, ToggleLeft, ToggleRight, BarChart3, PieChart, Sparkles, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { useState, useMemo } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

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
      impactScore: Math.round(totalFoodDonated * 0.68),
      monthlyTrend,
      foodTypeDistribution,
      topRecipients
    }
  }, [donations])

  const analytics = useMockData ? mockAnalytics : realAnalytics
  const loading = useMockData ? false : donationsLoading

  const metricCards = [
    {
      title: "Total Donations",
      value: analytics.totalDonations,
      subtitle: "All time",
      icon: Package,
      gradient: "from-blue-500 to-cyan-500",
      bgGradient: "from-blue-500/10 to-cyan-500/10",
      trend: "+12%",
      trendUp: true
    },
    {
      title: "Food Donated",
      value: `${analytics.totalFoodDonated.toFixed(0)}`,
      subtitle: "kg total",
      icon: Heart,
      gradient: "from-rose-500 to-pink-500",
      bgGradient: "from-rose-500/10 to-pink-500/10",
      trend: "+8%",
      trendUp: true
    },
    {
      title: "Avg. Donation",
      value: `${analytics.averageDonationSize.toFixed(1)}`,
      subtitle: "kg per donation",
      icon: TrendingUp,
      gradient: "from-emerald-500 to-teal-500",
      bgGradient: "from-emerald-500/10 to-teal-500/10",
      trend: "+5%",
      trendUp: true
    },
    {
      title: "Impact Score",
      value: analytics.impactScore,
      subtitle: "points",
      icon: Award,
      gradient: "from-amber-500 to-orange-500",
      bgGradient: "from-amber-500/10 to-orange-500/10",
      trend: "+15%",
      trendUp: true
    }
  ]

  return (
    <DashboardLayout title="Analytics" navItems={navItems}>
      <div className="space-y-8">
        {/* Header with Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
            <p className="text-muted-foreground mt-1">Track your donation impact and performance</p>
          </div>
          <Button
            variant="outline"
            onClick={() => setUseMockData(!useMockData)}
            className="flex items-center gap-2 shadow-sm"
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

        {/* Key Metrics - Redesigned with gradients */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metricCards.map((metric, index) => (
            <Card 
              key={index}
              className={cn(
                "relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300",
                "bg-gradient-to-br", metric.bgGradient
              )}
            >
              <div className="p-6 relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className={cn(
                    "p-3 rounded-xl bg-gradient-to-br shadow-lg",
                    metric.gradient
                  )}>
                    <metric.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className={cn(
                    "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full",
                    metric.trendUp 
                      ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" 
                      : "bg-red-500/20 text-red-700 dark:text-red-400"
                  )}>
                    {metric.trendUp ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    {metric.trend}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">{metric.title}</p>
                  <p className="text-3xl font-bold mb-1">{metric.value}</p>
                  <p className="text-xs text-muted-foreground">{metric.subtitle}</p>
                </div>
              </div>
              <div className={cn(
                "absolute -bottom-12 -right-12 w-32 h-32 rounded-full opacity-20 blur-2xl",
                "bg-gradient-to-br", metric.gradient
              )} />
            </Card>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Trend */}
          <Card className="p-6 shadow-lg border-0 bg-gradient-to-br from-background to-muted/20">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Monthly Trend</h3>
                  <p className="text-sm text-muted-foreground">Donation activity over time</p>
                </div>
              </div>
            </div>
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : analytics.monthlyTrend.length > 0 ? (
              <div className="space-y-4">
                {analytics.monthlyTrend.map((item, idx) => {
                  const maxQuantity = Math.max(...analytics.monthlyTrend.map(m => m.quantity))
                  const percentage = (item.quantity / maxQuantity) * 100
                  return (
                    <div key={item.month} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{item.month}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-muted-foreground">{item.donations} donations</span>
                          <span className="font-semibold">{item.quantity} kg</span>
                        </div>
                      </div>
                      <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No data available</p>
                </div>
              </div>
            )}
          </Card>

          {/* Food Type Distribution */}
          <Card className="p-6 shadow-lg border-0 bg-gradient-to-br from-background to-muted/20">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <PieChart className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Food Distribution</h3>
                  <p className="text-sm text-muted-foreground">By food type</p>
                </div>
              </div>
            </div>
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : analytics.foodTypeDistribution.length > 0 ? (
              <div className="space-y-4">
                {analytics.foodTypeDistribution.map((item, idx) => {
                  const colors = [
                    "from-blue-500 to-cyan-500",
                    "from-emerald-500 to-teal-500",
                    "from-amber-500 to-orange-500",
                    "from-rose-500 to-pink-500"
                  ]
                  return (
                    <div key={item.type} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{item.type}</span>
                        <span className="text-muted-foreground">
                          {item.percentage.toFixed(1)}% ({item.quantity} kg)
                        </span>
                      </div>
                      <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full bg-gradient-to-r transition-all duration-500",
                            colors[idx % colors.length]
                          )}
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <PieChart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No data available</p>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Top Recipients & Completion Rate */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Recipients */}
          <Card className="p-6 shadow-lg border-0 bg-gradient-to-br from-background to-muted/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Top Recipients</h3>
                <p className="text-sm text-muted-foreground">Your most active partners</p>
              </div>
            </div>
            {loading ? (
              <div className="h-32 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : analytics.topRecipients.length > 0 ? (
              <div className="space-y-4">
                {analytics.topRecipients.map((recipient, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-muted/50 to-muted/30 border border-border/50 hover:border-primary/50 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "h-12 w-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-lg",
                        index === 0 && "bg-gradient-to-br from-amber-500 to-orange-500 text-white",
                        index === 1 && "bg-gradient-to-br from-slate-400 to-slate-500 text-white",
                        index === 2 && "bg-gradient-to-br from-amber-700 to-amber-800 text-white"
                      )}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold">{recipient.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {recipient.donations} donations
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{recipient.quantity} kg</p>
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
          <Card className="p-6 shadow-lg border-0 bg-gradient-to-br from-background to-muted/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Award className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Completion Rate</h3>
                <p className="text-sm text-muted-foreground">Your donation success rate</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="text-center">
                <div className="relative inline-flex items-center justify-center">
                  <svg className="transform -rotate-90 w-32 h-32">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-muted"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${analytics.completionRate * 3.51} 351.86`}
                      className="text-emerald-500"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute">
                    <p className="text-3xl font-bold">{analytics.completionRate.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                    style={{ width: `${analytics.completionRate}%` }}
                  />
                </div>
                <p className="text-sm text-center text-muted-foreground">
                  {analytics.completionRate >= 90 
                    ? "🎉 Excellent! Keep up the great work!"
                    : analytics.completionRate >= 70
                    ? "👍 Good progress! Try to complete more donations."
                    : "💪 Room for improvement. Focus on completing scheduled donations."}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
