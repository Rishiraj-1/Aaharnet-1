"use client"

/**
 * Example Integrated Donor Dashboard
 * This shows how to connect the frontend to the backend API
 */

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatsGrid } from "@/components/stats-grid"
import { ActivityFeed } from "@/components/activity-feed"
import { DonationChart } from "@/components/donation-chart"
import { ImpactMetrics } from "@/components/impact-metrics"
import { useAuth } from "@/context/AuthContext"
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection"
import { MapPin, TrendingUp, Star, Package, Truck, Heart } from "lucide-react"

export default function DonorDashboardIntegrated() {
  const navItems = [
    { label: "My Donations", href: "/donor" },
    { label: "Schedule Pickup", href: "/donor/schedule" },
    { label: "Analytics", href: "/donor/analytics" },
    { label: "Settings", href: "/donor/settings" },
  ]

  // Get current user from AuthContext
  const { user, userData, loading: authLoading } = useAuth()

  // Fetch user's donations from Firestore in real-time
  const { data: donations, loading: donationsLoading } = useFirestoreCollection<{
    id: string
    donor_id: string
    food_type: string
    quantity_kg: number
    status: string
    created_at: string
  }>('donations', {
    whereFilter: {
      field: 'donor_id',
      operator: '==',
      value: user?.uid || ''
    },
    orderByField: 'created_at',
    orderByDirection: 'desc',
    limitCount: 10
  })

  // Calculate stats from real data
  const totalDonations = donations?.length || 0
  const totalFoodDonated = donations?.reduce((sum, d) => sum + (d.quantity_kg || 0), 0) || 0
  const recentDonation = donations?.[0]

  const stats = [
    { 
      label: "Total Donations", 
      value: totalDonations.toString(), 
      icon: TrendingUp, 
      trend: "↑ 12% this month" 
    },
    { 
      label: "Food Donated", 
      value: `${(totalFoodDonated / 1000).toFixed(1)}T`, 
      icon: Package, 
      trend: "↑ 8% this month" 
    },
    { 
      label: "Rating", 
      value: "4.8", 
      icon: Star 
    },
    { 
      label: "Impact Score", 
      value: (totalFoodDonated * 10).toString(), 
      icon: Heart, 
      color: "text-accent" 
    },
  ]

  // Convert Firestore data to activity feed format
  const activities = donations?.slice(0, 3).map((donation, index) => ({
    id: donation.id,
    type: "donation" as const,
    title: "Donation " + (donation.status === 'completed' ? 'Completed' : donation.status),
    description: `${donation.quantity_kg} kg of ${donation.food_type}`,
    timestamp: new Date(donation.created_at).toLocaleString(),
    icon: <Package className="w-5 h-5 text-primary" />,
  })) || []

  const impactMetrics = [
    { 
      label: "Monthly Donation Goal", 
      current: totalFoodDonated, 
      target: 3000, 
      unit: "kg" 
    },
    { 
      label: "Donations Completed", 
      current: totalDonations, 
      target: 150, 
      unit: "donations" 
    },
  ]

  if (authLoading || donationsLoading) {
    return (
      <DashboardLayout title="Donor Dashboard" navItems={navItems}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Donor Dashboard" navItems={navItems}>
      <div className="space-y-8">
        {/* Welcome message */}
        {userData && (
          <Card className="p-6 bg-primary/5 border-primary/20">
            <h1 className="text-2xl font-bold mb-2">
              Welcome back, {userData.name}!
            </h1>
            <p className="text-muted-foreground">
              You've donated {totalFoodDonated} kg of food this month.
            </p>
          </Card>
        )}

        {/* Stats */}
        <StatsGrid stats={stats} columns={4} />

        {/* Charts and Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <DonationChart />
          </div>
          <ImpactMetrics metrics={impactMetrics} />
        </div>

        {/* Activity Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {activities.length > 0 ? (
              <ActivityFeed activities={activities} />
            ) : (
              <Card className="p-6">
                <p className="text-muted-foreground text-center">
                  No donations yet. Start by creating your first donation!
                </p>
              </Card>
            )}
          </div>

          {/* Quick Actions */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Button className="w-full bg-primary hover:bg-primary/90">
                Schedule Pickup
              </Button>
              <Button variant="outline" className="w-full bg-transparent">
                View Analytics
              </Button>
              <Button variant="outline" className="w-full bg-transparent">
                Contact Support
              </Button>
            </div>
          </Card>
        </div>

        {/* Donation Status */}
        {recentDonation && (
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Recent Donation</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{recentDonation.food_type}</p>
                <p className="text-sm text-muted-foreground">
                  {recentDonation.quantity_kg} kg • Status: {recentDonation.status}
                </p>
              </div>
              <Button variant="outline">View Details</Button>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}

