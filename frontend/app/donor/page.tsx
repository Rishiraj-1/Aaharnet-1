"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/context/AuthContext"
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection"
import { useSurplusForecast } from "@/hooks/useForecast"
import { MapPin, TrendingUp, Star, Package, Truck, Heart, Upload, Camera, Map as MapIcon, Sparkles, ArrowRight, Calendar, Award, Zap, Users, Activity } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import Link from "next/link"
import { cn } from "@/lib/utils"

export default function DonorDashboard() {
  const navItems = [
    { label: "My Donations", href: "/donor" },
    { label: "Map", href: "/map" },
    { label: "Schedule Pickup", href: "/donor/schedule" },
    { label: "Analytics", href: "/donor/analytics" },
    { label: "Settings", href: "/donor/settings" },
  ]

  const { user, userData, loading: authLoading } = useAuth()

  const { data: allDonations, loading: donationsLoading } = useFirestoreCollection<{
    id: string
    donor_id?: string
    donorId?: string
    food_type?: string
    foodType?: string
    quantity_kg?: number
    qtyKg?: number
    status: string
    created_at?: string
    createdAt?: any
  }>('donations', {
    limitCount: 100
  })

  const myDonations = (allDonations || []).filter(d => 
    (d.donor_id === user?.uid || d.donorId === user?.uid)
  )

  const sortedDonations = [...myDonations].sort((a, b) => {
    const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.created_at || 0)
    const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.created_at || 0)
    return dateB.getTime() - dateA.getTime()
  }).slice(0, 10)

  const forecastRequest = sortedDonations && sortedDonations.length > 0 ? (() => {
    const donationsByDate = new Map<string, number>()
    
    sortedDonations.forEach(donation => {
      const date = donation.createdAt?.toDate 
        ? donation.createdAt.toDate().toISOString().split('T')[0]
        : donation.created_at 
          ? new Date(donation.created_at).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]
      
      const qty = donation.qtyKg || donation.quantity_kg || 0
      donationsByDate.set(date, (donationsByDate.get(date) || 0) + qty)
    })
    
    const historical_data = Array.from(donationsByDate.entries())
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
  
  const { forecast, loading: forecastLoading } = useSurplusForecast(forecastRequest)

  const totalDonations = sortedDonations.length
  const totalFoodDonated = sortedDonations.reduce((sum, d) => sum + (d.quantity_kg || d.qtyKg || 0), 0)
  const completedDonations = sortedDonations.filter(d => d.status === 'completed' || d.status === 'delivered').length
  const impactScore = Math.round(totalFoodDonated * 10)
  const completionRate = totalDonations > 0 ? Math.round((completedDonations / totalDonations) * 100) : 0

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
        {/* Hero Section - Completely Redesigned */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-8 text-white shadow-2xl">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                    Donor Dashboard
                  </Badge>
                </div>
                <h1 className="text-4xl font-bold mb-2">
                  Welcome back, {userData?.name || 'Donor'}! 👋
                </h1>
                <p className="text-lg text-white/90 mb-6">
                  You've made a significant impact by donating <span className="font-bold">{totalFoodDonated} kg</span> of food
                </p>
                
                {/* Impact Stats in Hero */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <p className="text-sm text-white/80 mb-1">Total Donations</p>
                    <p className="text-2xl font-bold">{totalDonations}</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <p className="text-sm text-white/80 mb-1">Completion Rate</p>
                    <p className="text-2xl font-bold">{completionRate}%</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <p className="text-sm text-white/80 mb-1">Impact Score</p>
                    <p className="text-2xl font-bold">{impactScore}</p>
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
                    {forecast.predictions?.[0]?.predicted_surplus 
                      ? `${forecast.predictions[0].predicted_surplus.toFixed(0)} kg`
                      : 'Analyzing...'}
                  </p>
                  <p className="text-sm text-white/80">Surplus predicted</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions - Redesigned */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/map">
            <Card className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group border-2 hover:border-primary/50 bg-gradient-to-br from-background to-muted/30">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <MapIcon className="h-6 w-6 text-primary" />
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-bold text-lg mb-1">Open Map</h3>
              <p className="text-sm text-muted-foreground">View donations & locations</p>
            </Card>
          </Link>
          
          <Link href="/donor/schedule">
            <Card className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group border-2 hover:border-primary/50 bg-gradient-to-br from-background to-muted/30">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                  <Calendar className="h-6 w-6 text-emerald-500" />
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-bold text-lg mb-1">Schedule Pickup</h3>
              <p className="text-sm text-muted-foreground">Plan your next donation</p>
            </Card>
          </Link>
          
          <Link href="/donor/analytics">
            <Card className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group border-2 hover:border-primary/50 bg-gradient-to-br from-background to-muted/30">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
                  <TrendingUp className="h-6 w-6 text-amber-500" />
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-bold text-lg mb-1">View Analytics</h3>
              <p className="text-sm text-muted-foreground">Track your impact</p>
            </Card>
          </Link>
          
          <Card className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group border-2 hover:border-primary/50 bg-gradient-to-br from-background to-muted/30">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-rose-500/10 group-hover:bg-rose-500/20 transition-colors">
                <Camera className="h-6 w-6 text-rose-500" />
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-rose-500 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="font-bold text-lg mb-1">AI Food Analysis</h3>
            <p className="text-sm text-muted-foreground">Analyze food quality</p>
          </Card>
        </div>

        {/* Main Stats - Redesigned with Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-blue-500/20">
                <Package className="h-6 w-6 text-blue-500" />
              </div>
              <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30">
                +12%
              </Badge>
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Total Donations</p>
            <p className="text-3xl font-bold mb-1">{totalDonations}</p>
            <p className="text-xs text-muted-foreground">All time</p>
          </Card>

          <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-emerald-500/20">
                <Heart className="h-6 w-6 text-emerald-500" />
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                +8%
              </Badge>
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Food Donated</p>
            <p className="text-3xl font-bold mb-1">{(totalFoodDonated / 1000).toFixed(1)}T</p>
            <p className="text-xs text-muted-foreground">kg total</p>
          </Card>

          <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-amber-500/20">
                <Star className="h-6 w-6 text-amber-500" />
              </div>
              <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30">
                {completionRate}%
              </Badge>
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Completion Rate</p>
            <p className="text-3xl font-bold mb-1">{completionRate}%</p>
            <p className="text-xs text-muted-foreground">Success rate</p>
          </Card>

          <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-rose-500/20">
                <Award className="h-6 w-6 text-rose-500" />
              </div>
              <Badge className="bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-500/30">
                Top 10%
              </Badge>
          </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Impact Score</p>
            <p className="text-3xl font-bold mb-1">{impactScore}</p>
            <p className="text-xs text-muted-foreground">points</p>
          </Card>
        </div>

        {/* Recent Donations - Redesigned */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6 shadow-lg border-0 bg-gradient-to-br from-background to-muted/20">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Activity className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Recent Donations</h2>
                  <p className="text-sm text-muted-foreground">Your latest activity</p>
                </div>
              </div>
              <Link href="/donor/analytics">
                <Button variant="outline" size="sm">
                  View All
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>

            {sortedDonations.length > 0 ? (
              <div className="space-y-4">
                {sortedDonations.slice(0, 5).map((donation) => {
                  const date = donation.createdAt?.toDate ? donation.createdAt.toDate() : new Date(donation.created_at || Date.now())
                  const qty = donation.quantity_kg || donation.qtyKg || 0
                  const foodType = donation.food_type || donation.foodType || 'Food'
                  
                  return (
                    <div 
                      key={donation.id}
                      className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border border-border/50 hover:border-primary/50 transition-all group"
                    >
                      <div className={cn(
                        "p-3 rounded-xl",
                        donation.status === 'delivered' ? "bg-emerald-500/10" :
                        donation.status === 'assigned' ? "bg-blue-500/10" :
                        "bg-amber-500/10"
                      )}>
                        <Package className={cn(
                          "h-5 w-5",
                          donation.status === 'delivered' ? "text-emerald-500" :
                          donation.status === 'assigned' ? "text-blue-500" :
                          "text-amber-500"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold">{qty} kg - {foodType}</p>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-xs",
                              donation.status === 'delivered' && "border-emerald-500/50 text-emerald-700 dark:text-emerald-400",
                              donation.status === 'assigned' && "border-blue-500/50 text-blue-700 dark:text-blue-400"
                            )}
                          >
                            {donation.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {date.toLocaleDateString()} • {date.toLocaleTimeString()}
                        </p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="relative inline-flex items-center justify-center mb-4">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10 rounded-full blur-xl"></div>
                  <Package className="h-16 w-16 text-primary relative z-10" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No donations yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start making an impact by creating your first donation!
                </p>
                <Link href="/map">
                  <Button className="bg-gradient-to-r from-primary to-primary/80">
                  Create Donation
                </Button>
                </Link>
              </div>
            )}
          </Card>

          {/* AI Insights Card */}
          <Card className="p-6 shadow-lg border-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-primary/20">
                <Zap className="h-5 w-5 text-primary" />
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
                      <div className="p-1 rounded bg-primary/10 mt-0.5">
                        <Sparkles className="h-3 w-3 text-primary" />
                      </div>
                      <p className="text-sm flex-1">{rec}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
                <p className="text-sm text-muted-foreground">Analyzing your data...</p>
              </div>
            )}

            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Monthly Goal</p>
                  <p className="font-semibold">3,000 kg</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground mb-1">Progress</p>
                  <p className="font-semibold text-primary">
                    {Math.round((totalFoodDonated / 3000) * 100)}%
                  </p>
                </div>
              </div>
              <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all"
                  style={{ width: `${Math.min((totalFoodDonated / 3000) * 100, 100)}%` }}
                />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
