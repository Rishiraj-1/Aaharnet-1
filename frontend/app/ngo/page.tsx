"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/context/AuthContext"
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection"
import { useDemandForecast } from "@/hooks/useForecast"
import { Users, Package, TrendingUp, Heart, Truck, MapPin, AlertCircle, Search, ArrowRight, Sparkles, Zap, Activity, Building2, Target, Award, Bell } from "lucide-react"
import { useState, useEffect } from "react"
import { findNearbyUsers, forecastDemand } from "@/utils/api"
import { toast } from "sonner"
import Link from "next/link"
import { cn } from "@/lib/utils"

export default function NGODashboard() {
  const navItems = [
    { label: "Dashboard", href: "/ngo" },
    { label: "Map", href: "/map" },
    { label: "Requests", href: "/ngo/requests" },
    { label: "Beneficiaries", href: "/ngo/beneficiaries" },
    { label: "Reports", href: "/ngo/reports" },
  ]

  const { user, userData, loading: authLoading } = useAuth()
  
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

  const demandForecastRequest = distributions && distributions.length > 0 ? (() => {
    const distributionsByDate = new Map<string, number>()
    
    distributions.forEach(distribution => {
      const date = distribution.created_at 
        ? new Date(distribution.created_at).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]
      
      const qty = distribution.quantity_kg || 0
      distributionsByDate.set(date, (distributionsByDate.get(date) || 0) + qty)
    })
    
    const historical_data = Array.from(distributionsByDate.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date))
    
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

  const [nearbyDonors, setNearbyDonors] = useState<any[]>([])
  const [loadingNearby, setLoadingNearby] = useState(false)

  const totalFoodReceived = distributions?.reduce((sum, d) => sum + (d.quantity_kg || 0), 0) || 0
  const totalBeneficiaries = distributions?.reduce((sum, d) => sum + (d.beneficiaries_served || 0), 0) || 0
  const activeRequests = requests?.filter(r => r.status === 'pending' || r.status === 'active').length || 0
  const completedDistributions = distributions?.length || 0

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
        {/* Hero Section - Unique Design */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 via-teal-600 to-emerald-600 p-8 text-white shadow-2xl">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                    NGO Dashboard
                  </Badge>
                </div>
                <h1 className="text-4xl font-bold mb-2">
                  Welcome, {userData?.name || 'NGO'}! 🤝
                </h1>
                <p className="text-lg text-white/90 mb-6">
                  Serving <span className="font-bold">{totalBeneficiaries}</span> beneficiaries with <span className="font-bold">{(totalFoodReceived/1000).toFixed(1)}T</span> of food redistributed
                </p>
                
                {/* Impact Stats in Hero */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <p className="text-sm text-white/80 mb-1">Active Requests</p>
                    <p className="text-2xl font-bold">{activeRequests}</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <p className="text-sm text-white/80 mb-1">Distributions</p>
                    <p className="text-2xl font-bold">{completedDistributions}</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <p className="text-sm text-white/80 mb-1">Success Rate</p>
                    <p className="text-2xl font-bold">
                      {activeRequests > 0 ? Math.round((completedDistributions / (activeRequests + completedDistributions)) * 100) : 100}%
                    </p>
                  </div>
                </div>
              </div>
              
              {forecast && (
                <div className="text-right bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-5 w-5" />
                    <p className="text-sm font-medium">AI Forecast</p>
                  </div>
                  <p className="text-3xl font-bold mb-1">
                    {forecast.predictions?.[0]?.predicted_demand 
                      ? `${forecast.predictions[0].predicted_demand.toFixed(0)} kg`
                      : 'Analyzing...'}
                  </p>
                  <p className="text-sm text-white/80">Demand predicted</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions - Redesigned */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/map">
            <Card className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group border-2 hover:border-teal-500/50 bg-gradient-to-br from-background to-muted/30">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-teal-500/10 group-hover:bg-teal-500/20 transition-colors">
                  <MapPin className="h-6 w-6 text-teal-500" />
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-teal-500 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-bold text-lg mb-1">Open Map</h3>
              <p className="text-sm text-muted-foreground">View donations & locations</p>
            </Card>
          </Link>
          
          <Link href="/ngo/requests">
            <Card className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group border-2 hover:border-teal-500/50 bg-gradient-to-br from-background to-muted/30">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                  <Package className="h-6 w-6 text-emerald-500" />
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-bold text-lg mb-1">Create Request</h3>
              <p className="text-sm text-muted-foreground">Request food supplies</p>
            </Card>
          </Link>
          
          <Card 
            className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group border-2 hover:border-teal-500/50 bg-gradient-to-br from-background to-muted/30"
            onClick={findNearby}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
                <Search className="h-6 w-6 text-amber-500" />
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="font-bold text-lg mb-1">Find Donors</h3>
            <p className="text-sm text-muted-foreground">AI-matched nearby donors</p>
          </Card>
          
          <Link href="/ngo/beneficiaries">
            <Card className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group border-2 hover:border-teal-500/50 bg-gradient-to-br from-background to-muted/30">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-rose-500/10 group-hover:bg-rose-500/20 transition-colors">
                  <Users className="h-6 w-6 text-rose-500" />
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-rose-500 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-bold text-lg mb-1">Beneficiaries</h3>
              <p className="text-sm text-muted-foreground">Manage recipients</p>
            </Card>
          </Link>
        </div>

        {/* Main Stats - Redesigned */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-teal-500/10 via-teal-500/5 to-transparent">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-teal-500/20">
                <Users className="h-6 w-6 text-teal-500" />
              </div>
              <Badge className="bg-teal-500/20 text-teal-700 dark:text-teal-400 border-teal-500/30">
                +5%
              </Badge>
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Beneficiaries Served</p>
            <p className="text-3xl font-bold mb-1">
              {totalBeneficiaries > 1000 ? `${(totalBeneficiaries / 1000).toFixed(1)}K` : totalBeneficiaries}
            </p>
            <p className="text-xs text-muted-foreground">Total people helped</p>
          </Card>

          <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-emerald-500/20">
                <Package className="h-6 w-6 text-emerald-500" />
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                +12%
              </Badge>
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Food Received</p>
            <p className="text-3xl font-bold mb-1">{(totalFoodReceived / 1000).toFixed(1)}T</p>
            <p className="text-xs text-muted-foreground">kg total</p>
          </Card>

          <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-amber-500/20">
                <Bell className="h-6 w-6 text-amber-500" />
              </div>
              <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30">
                {activeRequests}
              </Badge>
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Active Requests</p>
            <p className="text-3xl font-bold mb-1">{activeRequests}</p>
            <p className="text-xs text-muted-foreground">Pending fulfillment</p>
          </Card>

          <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-rose-500/20">
                <Heart className="h-6 w-6 text-rose-500" />
              </div>
              <Badge className="bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-500/30">
                Top NGO
              </Badge>
          </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Distributions</p>
            <p className="text-3xl font-bold mb-1">{completedDistributions}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </Card>
        </div>

        {/* Recent Activity & AI Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6 shadow-lg border-0 bg-gradient-to-br from-background to-muted/20">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-teal-500/10">
                  <Activity className="h-5 w-5 text-teal-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Recent Activity</h2>
                  <p className="text-sm text-muted-foreground">Latest distributions & requests</p>
                </div>
              </div>
              <Link href="/ngo/reports">
                <Button variant="outline" size="sm">
                  View All
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>

            {distributions && distributions.length > 0 ? (
              <div className="space-y-4">
                {distributions.slice(0, 5).map((dist) => {
                  const date = new Date(dist.created_at)
                  return (
                    <div 
                      key={dist.id}
                      className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border border-border/50 hover:border-teal-500/50 transition-all group"
                    >
                      <div className="p-3 rounded-xl bg-emerald-500/10">
                        <Heart className="h-5 w-5 text-emerald-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold">Distribution: {dist.quantity_kg} kg</p>
                          <Badge variant="outline" className="border-emerald-500/50 text-emerald-700 dark:text-emerald-400">
                            {dist.food_type}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {dist.beneficiaries_served} beneficiaries • {date.toLocaleDateString()}
                        </p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-teal-500 group-hover:translate-x-1 transition-all" />
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="relative inline-flex items-center justify-center mb-4">
                  <div className="absolute inset-0 bg-gradient-to-r from-teal-500/20 to-teal-500/10 rounded-full blur-xl"></div>
                  <Package className="h-16 w-16 text-teal-500 relative z-10" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No activity yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start by creating a food request!
                </p>
                <Link href="/ngo/requests">
                  <Button className="bg-gradient-to-r from-teal-500 to-teal-600">
                  Create Request
                </Button>
                </Link>
              </div>
            )}
          </Card>

          {/* AI Insights Card */}
          <Card className="p-6 shadow-lg border-0 bg-gradient-to-br from-teal-500/10 via-teal-500/5 to-transparent">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-teal-500/20">
                <Zap className="h-5 w-5 text-teal-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold">AI Insights</h2>
                <p className="text-sm text-muted-foreground">Smart recommendations</p>
              </div>
          </div>

            {forecast && forecast.recommendations ? (
              <div className="space-y-4">
                {forecast.recommendations.slice(0, 3).map((rec, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-background/50 border border-border/50">
                    <div className="flex items-start gap-2">
                      <div className="p-1 rounded bg-teal-500/10 mt-0.5">
                        <Sparkles className="h-3 w-3 text-teal-500" />
                      </div>
                      <p className="text-sm flex-1">{rec}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500 mx-auto mb-3"></div>
                <p className="text-sm text-muted-foreground">Analyzing demand patterns...</p>
              </div>
            )}

            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-between p-3 rounded-lg bg-teal-500/5">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Monthly Goal</p>
                  <p className="font-semibold">50,000 kg</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground mb-1">Progress</p>
                  <p className="font-semibold text-teal-500">
                    {Math.round((totalFoodReceived / 50000) * 100)}%
                  </p>
                </div>
              </div>
              <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-teal-500 to-teal-600 rounded-full transition-all"
                  style={{ width: `${Math.min((totalFoodReceived / 50000) * 100, 100)}%` }}
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Nearby Donors - Geospatial Feature */}
        {nearbyDonors.length > 0 && (
          <Card className="p-6 shadow-lg border-0 bg-gradient-to-br from-background to-muted/20">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-teal-500/10">
                  <MapPin className="h-5 w-5 text-teal-500" />
                </div>
          <div>
              <h2 className="text-xl font-bold">Nearby Donors (AI-Matched)</h2>
                  <p className="text-sm text-muted-foreground">{nearbyDonors.length} found within 10km</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {nearbyDonors.slice(0, 6).map((donor: any) => (
                <Card key={donor.id} className="p-4 hover:shadow-lg transition-all border-2 hover:border-teal-500/50 bg-gradient-to-br from-card to-muted/30">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-1">{donor.name}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {donor.distance_km?.toFixed(1)} km away
                      </p>
                    </div>
                  </div>
                  <Button className="w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700">
                    Contact Donor
                  </Button>
                </Card>
              ))}
            </div>
          </Card>
        )}

        {/* Urgent Requests Alert */}
        {activeRequests > 5 && (
          <Card className="p-6 shadow-lg border-0 bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent border-red-500/30">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-red-500/20">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-1">High Demand Alert</h3>
                <p className="text-sm text-muted-foreground">
                  You have {activeRequests} active requests. Consider increasing outreach to donors.
                </p>
              </div>
              <Link href="/ngo/requests">
                <Button variant="outline" className="border-red-500/50 text-red-700 dark:text-red-400 hover:bg-red-500/10">
                  View Requests
                </Button>
              </Link>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
