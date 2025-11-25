"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/context/AuthContext"
import { useRole } from "@/hooks/useRole"
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection"
import { DebugRole } from "@/components/debug-role"
import { TrendingUp, Users, Package, AlertCircle, Heart, Activity, AlertTriangle, Zap, Shield, UserCheck, Building2, Database, RefreshCw, ArrowRight, Sparkles, BarChart3, Globe, Settings, Bell, Target, Award } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { getActiveAlerts, createEmergencyAlert, checkBackendHealth, seedData } from "@/utils/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function AdminDashboard() {
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

  if (!authLoading && !roleLoading && !admin) {
    return (
      <DashboardLayout title="Access Denied" navItems={navItems}>
        <Card className="p-6">
          <div className="text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-destructive" />
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You need admin privileges to access this page.</p>
            <div className="mt-4">
              <DebugRole />
            </div>
          </div>
        </Card>
      </DashboardLayout>
    )
  }

  const { data: allDonations, loading: donationsLoading } = useFirestoreCollection<any>('donations', {
    orderByField: 'created_at',
    orderByDirection: 'desc',
    limitCount: 100
  })

  const { data: allUsers, loading: usersLoading } = useFirestoreCollection<any>('users', {
    limitCount: 1000
  })

  const { data: allDistributions, loading: distributionsLoading } = useFirestoreCollection<any>('distributions', {
    orderByField: 'created_at',
    orderByDirection: 'desc',
    limitCount: 100
  })

  const [emergencyAlerts, setEmergencyAlerts] = useState<any[]>([])
  const [backendHealth, setBackendHealth] = useState<any>(null)
  const [loadingAlerts, setLoadingAlerts] = useState(true)

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timed out')), 8000)
        )
        const alerts = await Promise.race([
          getActiveAlerts(),
          timeoutPromise
        ]) as any
        setEmergencyAlerts(alerts?.alerts || alerts || [])
      } catch (error) {
        console.error('Failed to fetch alerts:', error)
        setEmergencyAlerts([])
      } finally {
        setLoadingAlerts(false)
      }
    }

    const fetchHealth = async () => {
      try {
        const health = await checkBackendHealth()
        setBackendHealth(health)
      } catch (error) {
        console.error('Backend health check failed:', error)
      }
    }

    fetchAlerts()
    fetchHealth()
    
    const interval = setInterval(() => {
      fetchAlerts()
      fetchHealth()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const totalDonations = allDonations?.length || 0
  const totalFoodRedistributed = allDonations?.reduce((sum, d) => sum + (d.quantity_kg || 0), 0) || 0
  const totalBeneficiaries = allDistributions?.reduce((sum, d) => sum + (d.beneficiaries_served || 0), 0) || 0
  const activeVolunteers = allUsers?.filter(u => u.user_type === 'volunteer').length || 0
  const activeDonors = allUsers?.filter(u => u.user_type === 'donor').length || 0
  const activeNGOs = allUsers?.filter(u => u.user_type === 'ngo').length || 0
  const completedDonations = allDonations?.filter(d => d.status === 'completed').length || 0
  const successRate = totalDonations > 0 ? ((completedDonations / totalDonations) * 100).toFixed(1) : 0

  const handleEmergencyAlert = async () => {
    try {
      await createEmergencyAlert({
        location: { lat: 0, lng: 0 },
        alert_type: 'food_shortage',
        severity: 'high',
        description: 'Emergency food shortage detected'
      })
      toast.success('Emergency alert created!')
      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timed out')), 8000)
        )
        const alerts = await Promise.race([
          getActiveAlerts(),
          timeoutPromise
        ]) as any
        setEmergencyAlerts(alerts?.alerts || alerts || [])
      } catch (error) {
        console.error('Failed to refresh alerts:', error)
      }
    } catch (error) {
      toast.error('Failed to create emergency alert')
    }
  }

  const handleSeedData = async (force: boolean = false) => {
    try {
      toast.loading('Seeding data...', { id: 'seed' })
      const result = await seedData(force)
      toast.success(result.message || 'Data seeded successfully!', { id: 'seed' })
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (error: any) {
      toast.error(error.message || 'Failed to seed data', { id: 'seed' })
    }
  }

  if (authLoading || donationsLoading || usersLoading) {
    return (
      <DashboardLayout title="Admin Dashboard" navItems={navItems}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading platform analytics...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Admin Dashboard" navItems={navItems}>
      <div className="space-y-8">
        {/* Hero Section - Unique Design */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-700 p-8 text-white shadow-2xl">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Shield className="h-6 w-6" />
                  </div>
                  <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                    Admin Control Center
                  </Badge>
                </div>
                <h1 className="text-4xl font-bold mb-2">
                  AAHARNET.AI Platform Control 🛡️
              </h1>
                <p className="text-lg text-white/90 mb-6">
                  Monitoring <span className="font-bold">{allUsers?.length || 0}</span> users across the platform
              </p>
                
                {/* System Stats in Hero */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <p className="text-sm text-white/80 mb-1">System Status</p>
              <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${backendHealth?.status === 'healthy' ? 'bg-green-400' : 'bg-yellow-400'}`} />
                <p className="text-lg font-bold">{backendHealth?.status || 'Checking...'}</p>
                    </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <p className="text-sm text-white/80 mb-1">Success Rate</p>
                    <p className="text-2xl font-bold">{successRate}%</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <p className="text-sm text-white/80 mb-1">Active Alerts</p>
                    <p className="text-2xl font-bold">{emergencyAlerts.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions - Redesigned */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/admin/users">
            <Card className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group border-2 hover:border-purple-500/50 bg-gradient-to-br from-background to-muted/30">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                  <Users className="h-6 w-6 text-purple-500" />
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-purple-500 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-bold text-lg mb-1">Manage Users</h3>
              <p className="text-sm text-muted-foreground">User management</p>
            </Card>
          </Link>
          
          <Link href="/admin/analytics">
            <Card className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group border-2 hover:border-purple-500/50 bg-gradient-to-br from-background to-muted/30">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                  <BarChart3 className="h-6 w-6 text-blue-500" />
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-bold text-lg mb-1">View Analytics</h3>
              <p className="text-sm text-muted-foreground">Platform insights</p>
        </Card>
          </Link>
          
          <Link href="/admin/emergency">
            <Card className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group border-2 hover:border-purple-500/50 bg-gradient-to-br from-background to-muted/30">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-red-500/10 group-hover:bg-red-500/20 transition-colors">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-red-500 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-bold text-lg mb-1">Emergency</h3>
              <p className="text-sm text-muted-foreground">Manage alerts</p>
            </Card>
          </Link>
          
          <Link href="/admin/reports">
            <Card className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group border-2 hover:border-purple-500/50 bg-gradient-to-br from-background to-muted/30">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                  <Database className="h-6 w-6 text-emerald-500" />
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-bold text-lg mb-1">Reports</h3>
              <p className="text-sm text-muted-foreground">Platform reports</p>
            </Card>
          </Link>
        </div>

        {/* Main Stats - Redesigned */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-purple-500/20">
                <TrendingUp className="h-6 w-6 text-purple-500" />
              </div>
              <Badge className="bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/30">
                {completedDonations} done
              </Badge>
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Total Donations</p>
            <p className="text-3xl font-bold mb-1">{totalDonations.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">All time</p>
          </Card>

          <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-emerald-500/20">
                <Package className="h-6 w-6 text-emerald-500" />
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                {successRate}%
              </Badge>
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Food Redistributed</p>
            <p className="text-3xl font-bold mb-1">{(totalFoodRedistributed / 1000).toFixed(1)}T</p>
            <p className="text-xs text-muted-foreground">kg total</p>
          </Card>

          <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-blue-500/20">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
              <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30">
                {activeDonors}D • {activeNGOs}N • {activeVolunteers}V
              </Badge>
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Active Users</p>
            <p className="text-3xl font-bold mb-1">{allUsers?.length.toLocaleString() || "0"}</p>
            <p className="text-xs text-muted-foreground">Total users</p>
          </Card>

          <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-rose-500/20">
                <Heart className="h-6 w-6 text-rose-500" />
              </div>
              <Badge className="bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-500/30">
                Lives impacted
              </Badge>
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Beneficiaries</p>
            <p className="text-3xl font-bold mb-1">{totalBeneficiaries.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total served</p>
          </Card>
        </div>

        {/* Emergency Alerts & System Health */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Emergency Alerts */}
        {emergencyAlerts.length > 0 && (
            <Card className="lg:col-span-2 p-6 shadow-lg border-0 bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent border-red-500/30">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-red-500/20">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Active Emergency Alerts</h2>
                  <p className="text-sm text-muted-foreground">{emergencyAlerts.length} active alerts</p>
                </div>
              </div>
              <div className="space-y-3">
                  {emergencyAlerts.slice(0, 3).map((alert: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-xl bg-background/50 border border-red-500/20">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold">{alert.alert_type || 'Emergency Alert'}</p>
                          <p className="text-sm text-muted-foreground">{alert.description}</p>
                        </div>
                      <Badge className={cn(
                        "text-xs",
                        alert.severity === 'critical' && "bg-red-500 text-white",
                        alert.severity === 'high' && "bg-orange-500 text-white",
                        "bg-yellow-500 text-black"
                      )}>
                          {alert.severity}
                      </Badge>
                      </div>
                    </div>
                  ))}
              </div>
              <Link href="/admin/emergency">
                <Button variant="outline" className="w-full mt-4 border-red-500/50 text-red-700 dark:text-red-400 hover:bg-red-500/10">
                  View All Alerts
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
          </Card>
        )}

          {/* System Health */}
          <Card className="p-6 shadow-lg border-0 bg-gradient-to-br from-background to-muted/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Activity className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold">System Health</h2>
                <p className="text-sm text-muted-foreground">Platform status</p>
              </div>
            </div>
            <div className="space-y-4">
              {[
                { 
                  label: "API Backend", 
                  status: backendHealth?.status === 'healthy' ? "Operational" : "Unknown", 
                  color: backendHealth?.status === 'healthy' ? "bg-green-500" : "bg-gray-400" 
                },
                { 
                  label: "Database", 
                  status: allDonations ? "Connected" : "Checking", 
                  color: allDonations ? "bg-green-500" : "bg-yellow-500" 
                },
                { 
                  label: "Real-time Sync", 
                  status: "Active", 
                  color: "bg-green-500" 
                },
                { 
                  label: "AI Services", 
                  status: "Running", 
                  color: "bg-green-500" 
                },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${item.color}`} />
                    <span className="text-sm">{item.status}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t">
              <p className="text-sm font-semibold mb-3">Today's Activity</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm p-2 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground">New Donations</span>
                  <span className="font-medium">{allDonations?.filter((d: any) => 
                    new Date(d.created_at).toDateString() === new Date().toDateString()
                  ).length || 0}</span>
                </div>
                <div className="flex justify-between text-sm p-2 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground">Active Tasks</span>
                  <span className="font-medium">{allDonations?.filter((d: any) => d.status === 'active').length || 0}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* User Breakdown & Admin Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User Breakdown */}
          <Card className="lg:col-span-2 p-6 shadow-lg border-0 bg-gradient-to-br from-background to-muted/20">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Users className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Platform Overview</h2>
                  <p className="text-sm text-muted-foreground">User distribution</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-center">
                <Users className="w-8 h-8 mx-auto mb-2 text-orange-500" />
                <p className="text-2xl font-bold">{activeDonors}</p>
                <p className="text-sm text-muted-foreground">Active Donors</p>
              </div>
              <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/20 text-center">
                <Building2 className="w-8 h-8 mx-auto mb-2 text-teal-500" />
                <p className="text-2xl font-bold">{activeNGOs}</p>
                <p className="text-sm text-muted-foreground">Partner NGOs</p>
              </div>
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                <Heart className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                <p className="text-2xl font-bold">{activeVolunteers}</p>
                <p className="text-sm text-muted-foreground">Volunteers</p>
              </div>
            </div>
              </Card>

          {/* Admin Actions */}
          <Card className="p-6 shadow-lg border-0 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Settings className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Admin Controls</h2>
                <p className="text-sm text-muted-foreground">Quick actions</p>
              </div>
          </div>
            <div className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start border-purple-500/20 hover:bg-purple-500/10"
                onClick={() => handleSeedData(false)}
              >
                <Database className="w-4 h-4 mr-2" />
                Seed Data
              </Button>
              <Button 
                variant="destructive" 
                className="w-full justify-start"
                onClick={handleEmergencyAlert}
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Create Emergency
              </Button>
              <Link href="/admin/users" className="block">
                <Button variant="outline" className="w-full justify-start border-purple-500/20 hover:bg-purple-500/10">
                  <Users className="w-4 h-4 mr-2" />
                  Manage Users
                </Button>
              </Link>
              <Link href="/admin/analytics" className="block">
                <Button variant="outline" className="w-full justify-start border-purple-500/20 hover:bg-purple-500/10">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Analytics
                </Button>
              </Link>
            </div>
          </Card>
        </div>

        {/* AI Insights */}
        <Card className="p-6 shadow-lg border-0 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Zap className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold">AI Platform Insights</h2>
              <p className="text-sm text-muted-foreground">Smart recommendations</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-background/50 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-purple-500" />
                  <p className="font-semibold text-sm">Platform Growth</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {successRate}% donation success rate - Excellent performance!
                </p>
              </div>

            <div className="p-4 rounded-xl bg-background/50 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-blue-500" />
                  <p className="font-semibold text-sm">User Engagement</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {activeVolunteers} volunteers helping {activeNGOs} NGOs
                </p>
              </div>

            <div className="p-4 rounded-xl bg-background/50 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="w-4 h-4 text-rose-500" />
                  <p className="font-semibold text-sm">Impact Score</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {((totalFoodRedistributed / 1000) * 10).toFixed(0)}K impact points generated
                </p>
              </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}
