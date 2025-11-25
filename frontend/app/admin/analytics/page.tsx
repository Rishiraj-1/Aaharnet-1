"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"
import { useRole } from "@/hooks/useRole"
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection"
import { BarChart3, TrendingUp, Users, Package, Heart, Activity, ToggleLeft, ToggleRight, Shield, ArrowUpRight, ArrowDownRight, Zap, Sparkles, Globe } from "lucide-react"
import { useState, useMemo } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { AnimatedMetricCard } from "@/components/ui/animated-metric-card"

const mockAnalytics = {
  totalUsers: 1250,
  totalDonations: 3450,
  totalDistributions: 2890,
  totalVolunteers: 156,
  totalNGOs: 45,
  totalDonors: 1050,
  foodRedistributed: 125000,
  beneficiariesServed: 8900,
  wastePrevented: 98.5,
  monthlyTrend: [
    { month: "Jan", donations: 280, distributions: 240, users: 1000 },
    { month: "Feb", donations: 320, distributions: 290, users: 1100 },
    { month: "Mar", donations: 350, distributions: 310, users: 1150 },
    { month: "Apr", donations: 380, distributions: 340, users: 1250 },
  ],
  userGrowth: [
    { month: "Jan", donors: 800, ngos: 30, volunteers: 120 },
    { month: "Feb", donors: 900, ngos: 35, volunteers: 130 },
    { month: "Mar", donors: 950, ngos: 40, volunteers: 140 },
    { month: "Apr", donors: 1050, ngos: 45, volunteers: 156 },
  ]
}

export default function AdminAnalyticsPage() {
  const navItems = [
    { label: "Overview", href: "/admin" },
    { label: "Map", href: "/map" },
    { label: "Users", href: "/admin/users" },
    { label: "Analytics", href: "/admin/analytics" },
    { label: "Emergency", href: "/admin/emergency" },
    { label: "Reports", href: "/admin/reports" },
  ]

  const { user, loading: authLoading } = useAuth()
  const { admin, loading: roleLoading } = useRole()
  const [useMockData, setUseMockData] = useState(true)

  const { data: users, loading: usersLoading } = useFirestoreCollection('users', { limitCount: 1000 })
  const { data: donations, loading: donationsLoading } = useFirestoreCollection('donations', { limitCount: 1000 })
  const { data: distributions, loading: distributionsLoading } = useFirestoreCollection('distributions', { limitCount: 1000 })
  const { data: volunteers, loading: volunteersLoading } = useFirestoreCollection('volunteers', { limitCount: 1000 })

  const realAnalytics = useMemo(() => {
    if (!users || !donations || !distributions) {
      return {
        totalUsers: 0,
        totalDonations: 0,
        totalDistributions: 0,
        totalVolunteers: 0,
        totalNGOs: 0,
        totalDonors: 0,
        foodRedistributed: 0,
        beneficiariesServed: 0,
        wastePrevented: 0,
        monthlyTrend: [],
        userGrowth: []
      }
    }

    const totalUsers = users.length
    const totalDonations = donations.length
    const totalDistributions = distributions.length
    const totalVolunteers = users.filter((u: any) => u.user_type === 'volunteer').length
    const totalNGOs = users.filter((u: any) => u.user_type === 'ngo').length
    const totalDonors = users.filter((u: any) => u.user_type === 'donor').length
    const foodRedistributed = donations.reduce((sum: number, d: any) => 
      sum + (d.qtyKg || d.quantity_kg || 0), 0
    )
    const beneficiariesServed = distributions.reduce((sum: number, d: any) => 
      sum + (d.beneficiaries_served || 0), 0
    )

    const monthlyData = new Map<string, { donations: number; distributions: number; users: number }>()
    donations.forEach((d: any) => {
      const date = d.createdAt?.toDate ? d.createdAt.toDate() : new Date(d.created_at || Date.now())
      const monthKey = date.toLocaleDateString('en-US', { month: 'short' })
      const existing = monthlyData.get(monthKey) || { donations: 0, distributions: 0, users: 0 }
      monthlyData.set(monthKey, { ...existing, donations: existing.donations + 1 })
    })
    distributions.forEach((d: any) => {
      const date = d.createdAt?.toDate ? d.createdAt.toDate() : new Date(d.created_at || Date.now())
      const monthKey = date.toLocaleDateString('en-US', { month: 'short' })
      const existing = monthlyData.get(monthKey) || { donations: 0, distributions: 0, users: 0 }
      monthlyData.set(monthKey, { ...existing, distributions: existing.distributions + 1 })
    })
    const monthlyTrend = Array.from(monthlyData.entries()).map(([month, data]) => ({
      month,
      ...data
    }))

    return {
      totalUsers,
      totalDonations,
      totalDistributions,
      totalVolunteers,
      totalNGOs,
      totalDonors,
      foodRedistributed,
      beneficiariesServed,
      wastePrevented: 95.5,
      monthlyTrend,
      userGrowth: []
    }
  }, [users, donations, distributions])

  const analytics = useMockData ? mockAnalytics : realAnalytics
  const loading = useMockData ? false : (usersLoading || donationsLoading || distributionsLoading)

  if (!authLoading && !roleLoading && !admin) {
    return (
      <DashboardLayout title="Access Denied" navItems={navItems}>
        <Card className="p-6">
          <div className="text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-destructive" />
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You need admin privileges to access this page.</p>
          </div>
        </Card>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Analytics" navItems={navItems}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Platform Analytics</h1>
            <p className="text-muted-foreground mt-1">Comprehensive insights into platform performance</p>
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

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <AnimatedMetricCard
            title="Total Users"
            value={analytics.totalUsers.toLocaleString()}
            icon={Users}
            gradient="from-purple-500 to-indigo-500"
            bgGradient="from-purple-500/10 to-indigo-500/10"
            trend="+15%"
            trendUp={true}
          />
          <AnimatedMetricCard
            title="Food Redistributed"
            value={`${(analytics.foodRedistributed / 1000).toFixed(1)}K`}
            subtitle="kg"
            icon={Package}
            gradient="from-blue-500 to-cyan-500"
            bgGradient="from-blue-500/10 to-cyan-500/10"
            trend="+12%"
            trendUp={true}
          />
          <AnimatedMetricCard
            title="Beneficiaries Served"
            value={`${(analytics.beneficiariesServed / 1000).toFixed(1)}K`}
            icon={Heart}
            gradient="from-rose-500 to-pink-500"
            bgGradient="from-rose-500/10 to-pink-500/10"
            trend="+8%"
            trendUp={true}
          />
          <AnimatedMetricCard
            title="Waste Prevented"
            value={`${analytics.wastePrevented}%`}
            icon={TrendingUp}
            gradient="from-emerald-500 to-teal-500"
            bgGradient="from-emerald-500/10 to-teal-500/10"
            trend="+2%"
            trendUp={true}
          />
        </div>

        {/* User Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-orange-500/20">
                <Users className="h-6 w-6 text-orange-500" />
              </div>
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Donors</p>
            <p className="text-3xl font-bold mb-1">{analytics.totalDonors}</p>
            <p className="text-xs text-muted-foreground">Active donors</p>
          </Card>
          <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-teal-500/10 via-teal-500/5 to-transparent">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-teal-500/20">
                <Heart className="h-6 w-6 text-teal-500" />
              </div>
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">NGOs</p>
            <p className="text-3xl font-bold mb-1">{analytics.totalNGOs}</p>
            <p className="text-xs text-muted-foreground">Partner organizations</p>
          </Card>
          <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-blue-500/20">
                <Activity className="h-6 w-6 text-blue-500" />
              </div>
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Volunteers</p>
            <p className="text-3xl font-bold mb-1">{analytics.totalVolunteers}</p>
            <p className="text-xs text-muted-foreground">Active volunteers</p>
          </Card>
        </div>

        {/* Monthly Trend Chart */}
        <Card className="p-6 shadow-lg border-0 bg-gradient-to-br from-background to-muted/20">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <BarChart3 className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Monthly Activity Trend</h3>
              <p className="text-sm text-muted-foreground">Platform activity over time</p>
            </div>
          </div>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : analytics.monthlyTrend.length > 0 ? (
            <div className="space-y-4">
              {analytics.monthlyTrend.map((item) => {
                const maxDonations = Math.max(...analytics.monthlyTrend.map(m => m.donations))
                const maxDistributions = Math.max(...analytics.monthlyTrend.map(m => m.distributions))
                return (
                  <div key={item.month} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.month}</span>
                      <div className="flex gap-4 text-sm">
                        <span className="text-blue-500">Donations: {item.donations}</span>
                        <span className="text-emerald-500">Distributions: {item.distributions}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all"
                          style={{ width: `${(item.donations / maxDonations) * 100}%` }}
                        />
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all"
                          style={{ width: `${(item.distributions / maxDistributions) * 100}%` }}
                        />
                      </div>
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
      </div>
    </DashboardLayout>
  )
}
