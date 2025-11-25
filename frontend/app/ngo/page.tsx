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
import { useDemandForecast } from "@/hooks/useForecast"
import { Users, Package, TrendingUp, Heart, Truck, MapPin, AlertCircle, Search } from "lucide-react"
import { useState, useEffect } from "react"
import { findNearbyUsers, forecastDemand } from "@/utils/api"
import { toast } from "sonner"
import Link from "next/link"

export default function NGODashboard() {
  const navItems = [
    { label: "Dashboard", href: "/ngo" },
    { label: "Map", href: "/map" },
    { label: "Requests", href: "/ngo/requests" },
    { label: "Beneficiaries", href: "/ngo/beneficiaries" },
    { label: "Reports", href: "/ngo/reports" },
  ]

  // Auth & user data
  const { user, userData, loading: authLoading } = useAuth()
  
  // Real-time data from Firestore
  const { data: requests, loading: requestsLoading } = useFirestoreCollection<{
    id: string
    ngo_id: string
    food_types: string[]
    quantity_kg: number
    status: string
    created_at: string
  }>('requests', {
    whereFilter: user?.uid ? {
      field: 'ngo_id',
      operator: '==',
      value: user.uid
    } : undefined,
    orderByField: 'created_at',
    orderByDirection: 'desc',
    limitCount: 10
  })

  const { data: distributions, loading: distributionsLoading } = useFirestoreCollection<{
    id: string
    ngo_id: string
    food_type: string
    quantity_kg: number
    beneficiaries_served: number
    created_at: string
  }>('distributions', {
    whereFilter: user?.uid ? {
      field: 'ngo_id',
      operator: '==',
      value: user.uid
    } : undefined,
    orderByField: 'created_at',
    orderByDirection: 'desc',
    limitCount: 10
  })

  // AI forecasting for demand prediction
  // Generate historical_data from distributions for the forecast
  const demandForecastRequest = distributions && distributions.length > 0 ? (() => {
    // Group distributions by date and sum quantities
    const distributionsByDate = new Map<string, number>()
    
    distributions.forEach(distribution => {
      const date = distribution.created_at 
        ? new Date(distribution.created_at).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]
      
      const qty = distribution.quantity_kg || 0
      distributionsByDate.set(date, (distributionsByDate.get(date) || 0) + qty)
    })
    
    // Convert to historical_data format required by backend
    const historical_data = Array.from(distributionsByDate.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date))
    
    // Need at least 7 days of data for forecast
    if (historical_data.length < 7) {
      return null
    }
    
    return {
      historical_data,
      forecast_days: 7,
      food_type: undefined,
      location: user?.location || undefined
    }
  })() : null
  
  const { forecast, loading: forecastLoading } = useDemandForecast(demandForecastRequest)

  // Nearby donors state
  const [nearbyDonors, setNearbyDonors] = useState<any[]>([])
  const [loadingNearby, setLoadingNearby] = useState(false)

  // Calculate stats from real data
  const totalFoodReceived = distributions?.reduce((sum, d) => sum + (d.quantity_kg || 0), 0) || 0
  const totalBeneficiaries = distributions?.reduce((sum, d) => sum + (d.beneficiaries_served || 0), 0) || 0
  const activeRequests = requests?.filter(r => r.status === 'pending' || r.status === 'active').length || 0
  const completedDistributions = distributions?.length || 0

  const stats = [
    { 
      label: "Beneficiaries Served", 
      value: totalBeneficiaries > 1000 ? `${(totalBeneficiaries / 1000).toFixed(1)}K` : totalBeneficiaries.toString(), 
      icon: Users, 
      trend: "↑ 5% this month" 
    },
    { 
      label: "Food Received", 
      value: `${(totalFoodReceived / 1000).toFixed(1)}T`, 
      icon: Package, 
      trend: "↑ 12% this month" 
    },
    { 
      label: "Active Requests", 
      value: activeRequests.toString(), 
      icon: TrendingUp 
    },
    { 
      label: "Distributions", 
      value: completedDistributions.toString(), 
      icon: Heart, 
      color: "text-accent" 
    },
  ]

  // Convert to activity feed
  const activities = [
    ...(distributions?.slice(0, 2).map((dist) => ({
      id: dist.id,
      type: "delivery" as const,
      title: "Distribution Complete",
      description: `${dist.quantity_kg} kg of ${dist.food_type} to ${dist.beneficiaries_served} beneficiaries`,
      timestamp: new Date(dist.created_at).toLocaleString(),
      icon: <Heart className="w-5 h-5 text-accent" />,
    })) || []),
    ...(requests?.slice(0, 1).map((req) => ({
      id: req.id,
      type: "pickup" as const,
      title: "Food Request",
      description: `${req.quantity_kg} kg of ${req.food_types?.join(', ')} - ${req.status}`,
      timestamp: new Date(req.created_at).toLocaleString(),
      icon: <Package className="w-5 h-5 text-primary" />,
    })) || []),
  ]

  const impactMetrics = [
    { label: "Monthly Distribution Goal", current: totalFoodReceived, target: 50000, unit: "kg" },
    { label: "Beneficiaries Served", current: totalBeneficiaries, target: 10000, unit: "people" },
    { label: "Active Requests", current: activeRequests, target: 30, unit: "requests" },
  ]

  // Function to find nearby donors using geospatial API
  const findNearby = async () => {
    if (!userData?.location) {
      toast.error("Please update your location in settings")
      return
    }

    setLoadingNearby(true)
    try {
      const result = await findNearbyUsers({
        latitude: userData.location.lat,
        longitude: userData.location.lng,
        radius_km: 10,
        user_type: 'donor'
      })
      setNearbyDonors(result.nearby_users || [])
      toast.success(`Found ${result.nearby_users?.length || 0} nearby donors`)
    } catch (error) {
      console.error('Error finding nearby donors:', error)
      toast.error("Failed to find nearby donors")
    } finally {
      setLoadingNearby(false)
    }
  }

  // Loading state
  if (authLoading || requestsLoading || distributionsLoading) {
    return (
      <DashboardLayout title="NGO Dashboard" navItems={navItems}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="NGO Dashboard" navItems={navItems}>
      <div className="space-y-8">
        {/* Welcome Card with Forecast */}
        {userData && (
          <Card className="p-6 bg-gradient-to-r from-accent/10 to-primary/10 border-accent/20">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-2">
                  Welcome, {userData.name}! 🤝
                </h1>
                <p className="text-muted-foreground">
                  Serving {totalBeneficiaries} beneficiaries with {(totalFoodReceived/1000).toFixed(1)}T of food
                </p>
              </div>
              {forecast && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">AI Demand Forecast</p>
                  <p className="text-lg font-bold text-accent">
                    {forecast.predictions?.[0]?.predicted_demand 
                      ? `${forecast.predictions[0].predicted_demand.toFixed(0)} kg needed soon`
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
                <h3 className="text-lg font-semibold mb-2">No activity yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start by creating a food request!
                </p>
                <Button className="bg-accent hover:bg-accent/90">
                  Create Request
                </Button>
              </Card>
            )}
          </div>

          {/* Quick Actions */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link href="/map" className="block">
                <Button className="w-full bg-accent hover:bg-accent/90">
                  <MapPin className="w-4 h-4 mr-2" />
                  Open Map
                </Button>
              </Link>
              <Button className="w-full bg-accent hover:bg-accent/90">
                <Package className="w-4 h-4 mr-2" />
                Create Request
              </Button>
              <Button 
                variant="outline" 
                className="w-full bg-transparent"
                onClick={findNearby}
                disabled={loadingNearby}
              >
                <MapPin className="w-4 h-4 mr-2" />
                {loadingNearby ? 'Finding...' : 'Find Nearby Donors'}
              </Button>
              <Button variant="outline" className="w-full bg-transparent">
                <Users className="w-4 h-4 mr-2" />
                Manage Volunteers
              </Button>
            </div>
          </Card>
        </div>

        {/* Nearby Donors - Geospatial Feature */}
        {nearbyDonors.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Nearby Donors (AI-Matched)</h2>
              <span className="text-sm text-muted-foreground">{nearbyDonors.length} found within 10km</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {nearbyDonors.slice(0, 6).map((donor: any) => (
                <Card key={donor.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-lg">{donor.name}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {donor.distance_km?.toFixed(1)} km away
                      </p>
                    </div>
                  </div>
                  <Button className="w-full bg-accent hover:bg-accent/90">
                    Contact Donor
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* AI Recommendations */}
        {forecast && forecast.recommendations && (
          <Card className="p-6 bg-primary/10 border-primary/30">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold mb-2">AI Demand Insights</h3>
                <ul className="space-y-1">
                  {forecast.recommendations.slice(0, 3).map((rec, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        )}

        {/* Urgent Requests Alert */}
        {activeRequests > 5 && (
          <Card className="p-6 bg-destructive/10 border-destructive/30">
            <div className="flex items-center gap-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
              <div>
                <h3 className="font-bold text-lg">High Demand Alert</h3>
                <p className="text-sm text-muted-foreground">
                  You have {activeRequests} active requests. Consider increasing outreach to donors.
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
