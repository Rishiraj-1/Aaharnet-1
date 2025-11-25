"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"
import { useRole } from "@/hooks/useRole"
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection"
import { BarChart3, TrendingUp, Users, Package, Heart, Activity, ToggleLeft, ToggleRight, Shield } from "lucide-react"
import { useState, useMemo } from "react"
import Link from "next/link"

// Mock analytics data
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

  // Real data from Firestore
  const { data: users, loading: usersLoading } = useFirestoreCollection('users', { limitCount: 1000 })
  const { data: donations, loading: donationsLoading } = useFirestoreCollection('donations', { limitCount: 1000 })
  const { data: distributions, loading: distributionsLoading } = useFirestoreCollection('distributions', { limitCount: 1000 })
  const { data: volunteers, loading: volunteersLoading } = useFirestoreCollection('volunteers', { limitCount: 1000 })

  // Calculate real analytics
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

    // Monthly trend
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
      wastePrevented: 95.5, // Calculated metric
      monthlyTrend,
      userGrowth: [] // Would need historical data
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
      <div className="space-y-6">
        {/* Toggle */}
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
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-3xl font-bold">{analytics.totalUsers}</p>
              </div>
              <Users className="h-10 w-10 text-primary" />
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Food Redistributed</p>
                <p className="text-3xl font-bold">{(analytics.foodRedistributed / 1000).toFixed(1)}K</p>
                <p className="text-xs text-muted-foreground">kg</p>
              </div>
              <Package className="h-10 w-10 text-blue-500" />
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Beneficiaries Served</p>
                <p className="text-3xl font-bold">{(analytics.beneficiariesServed / 1000).toFixed(1)}K</p>
              </div>
              <Heart className="h-10 w-10 text-red-500" />
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Waste Prevented</p>
                <p className="text-3xl font-bold">{analytics.wastePrevented}%</p>
              </div>
              <TrendingUp className="h-10 w-10 text-green-500" />
            </div>
          </Card>
        </div>

        {/* User Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Donors</p>
                <p className="text-2xl font-bold">{analytics.totalDonors}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">NGOs</p>
                <p className="text-2xl font-bold">{analytics.totalNGOs}</p>
              </div>
              <Heart className="h-8 w-8 text-red-500" />
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Volunteers</p>
                <p className="text-2xl font-bold">{analytics.totalVolunteers}</p>
              </div>
              <Activity className="h-8 w-8 text-green-500" />
            </div>
          </Card>
        </div>

        {/* Monthly Trend Chart */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Monthly Activity Trend
          </h3>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : analytics.monthlyTrend.length > 0 ? (
            <div className="space-y-3">
              {analytics.monthlyTrend.map((item) => (
                <div key={item.month} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{item.month}</span>
                    <div className="flex gap-4 text-sm">
                      <span>Donations: {item.donations}</span>
                      <span>Distributions: {item.distributions}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="h-4 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${(item.donations / Math.max(...analytics.monthlyTrend.map(m => m.donations))) * 100}%` }}
                      />
                    </div>
                    <div className="h-4 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${(item.distributions / Math.max(...analytics.monthlyTrend.map(m => m.distributions))) * 100}%` }}
                      />
                    </div>
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
    </DashboardLayout>
  )
}

