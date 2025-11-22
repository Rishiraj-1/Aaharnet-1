"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatsGrid } from "@/components/stats-grid"
import { ActivityFeed } from "@/components/activity-feed"
import { DonationChart } from "@/components/donation-chart"
import { ImpactMetrics } from "@/components/impact-metrics"
import { useAuth } from "@/context/AuthContext"
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection"
import { useSurplusForecast } from "@/hooks/useForecast"
import { useShelfLife } from "@/hooks/useShelfLife"
import { MapPin, TrendingUp, Star, Package, Truck, Heart, Upload, Camera } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

export default function DonorDashboard() {
  const navItems = [
    { label: "My Donations", href: "/donor" },
    { label: "Schedule Pickup", href: "/donor/schedule" },
    { label: "Analytics", href: "/donor/analytics" },
    { label: "Settings", href: "/donor/settings" },
  ]

  // Auth & user data
  const { user, userData, loading: authLoading } = useAuth()

  // Fetch real-time donations from Firestore
  const { data: donations, loading: donationsLoading } = useFirestoreCollection<{
    id: string
    donor_id: string
    food_type: string
    quantity_kg: number
    status: string
    created_at: string
  }>('donations', {
    whereFilter: user?.uid ? {
      field: 'donor_id',
      operator: '==',
      value: user.uid
    } : undefined,
    orderByField: 'created_at',
    orderByDirection: 'desc',
    limitCount: 10
  })

  // AI forecasting for surplus prediction
  const forecastRequest = donations && donations.length > 0 ? {
    location: user?.location || 'default',
    category: 'all',
    days_ahead: 7
  } : null
  
  const { forecast, loading: forecastLoading } = useSurplusForecast(forecastRequest)

  // Calculate real stats
  const totalDonations = donations?.length || 0
  const totalFoodDonated = donations?.reduce((sum, d) => sum + (d.quantity_kg || 0), 0) || 0
  const completedDonations = donations?.filter(d => d.status === 'completed').length || 0
  const impactScore = Math.round(totalFoodDonated * 10)

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
      label: "Completion Rate", 
      value: totalDonations > 0 ? `${Math.round((completedDonations / totalDonations) * 100)}%` : "0%", 
      icon: Star 
    },
    { 
      label: "Impact Score", 
      value: impactScore.toString(), 
      icon: Heart, 
      color: "text-accent" 
    },
  ]

  // Convert to activity feed
  const activities = donations?.slice(0, 3).map((donation) => ({
    id: donation.id,
    type: "donation" as const,
    title: `Donation ${donation.status}`,
    description: `${donation.quantity_kg} kg of ${donation.food_type}`,
    timestamp: new Date(donation.created_at).toLocaleString(),
    icon: <Package className="w-5 h-5 text-primary" />,
  })) || []

  const impactMetrics = [
    { label: "Monthly Donation Goal", current: totalFoodDonated, target: 3000, unit: "kg" },
    { label: "Donations Completed", current: completedDonations, target: 50, unit: "donations" },
    { label: "Impact Score", current: impactScore, target: 10000, unit: "points" },
  ]

  // Loading state
  if (authLoading || donationsLoading) {
    return (
      <DashboardLayout title="Donor Dashboard" navItems={navItems}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Donor Dashboard" navItems={navItems}>
      <div className="space-y-8">
        {/* Welcome Card with User Info */}
        {userData && (
          <Card className="p-6 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-2">
                  Welcome back, {userData.name}! 👋
                </h1>
                <p className="text-muted-foreground">
                  You've made an impact by donating {totalFoodDonated} kg of food
                </p>
              </div>
              {forecast && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">AI Forecast</p>
                  <p className="text-lg font-bold text-primary">
                    {forecast.predictions?.[0]?.predicted_surplus 
                      ? `${forecast.predictions[0].predicted_surplus.toFixed(0)} kg surplus predicted`
                      : 'Analyzing...'}
                  </p>
                </div>
              )}
            </div>
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
              <Card className="p-6 text-center">
                <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No donations yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start making an impact by creating your first donation!
                </p>
                <Button className="bg-primary hover:bg-primary/90">
                  Create Donation
                </Button>
              </Card>
            )}
          </div>

          {/* Quick Actions */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Button className="w-full bg-primary hover:bg-primary/90">
                <Upload className="w-4 h-4 mr-2" />
                Schedule Pickup
              </Button>
              <Button variant="outline" className="w-full bg-transparent">
                <Camera className="w-4 h-4 mr-2" />
                AI Food Analysis
              </Button>
              <Button variant="outline" className="w-full bg-transparent">
                <TrendingUp className="w-4 h-4 mr-2" />
                View Analytics
              </Button>
            </div>
          </Card>
        </div>

        {/* AI Insights - Only show if we have forecast data */}
        {forecast && forecast.recommendations && (
          <Card className="p-6 bg-accent/10 border-accent/30">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-accent/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold mb-2">AI Recommendations</h3>
                <ul className="space-y-1">
                  {forecast.recommendations.slice(0, 3).map((rec, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-accent">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
