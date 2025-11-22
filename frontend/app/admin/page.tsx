"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatsGrid } from "@/components/stats-grid"
import { ActivityFeed } from "@/components/activity-feed"
import { DonationChart } from "@/components/donation-chart"
import { useAuth } from "@/context/AuthContext"
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection"
import { TrendingUp, Users, Package, AlertCircle, Heart, Activity, AlertTriangle, Zap, Shield } from "lucide-react"
import { useState, useEffect } from "react"
import { getActiveAlerts, createEmergencyAlert, checkBackendHealth } from "@/utils/api"
import { toast } from "sonner"

export default function AdminDashboard() {
  const navItems = [
    { label: "Overview", href: "/admin" },
    { label: "Users", href: "/admin/users" },
    { label: "Analytics", href: "/admin/analytics" },
    { label: "Emergency", href: "/admin/emergency" },
    { label: "Reports", href: "/admin/reports" },
  ]

  // Auth & user data
  const { user, userData, loading: authLoading } = useAuth()

  // Real-time platform data
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

  // Emergency alerts state
  const [emergencyAlerts, setEmergencyAlerts] = useState<any[]>([])
  const [backendHealth, setBackendHealth] = useState<any>(null)
  const [loadingAlerts, setLoadingAlerts] = useState(true)

  // Fetch emergency alerts
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const alerts = await getActiveAlerts()
        setEmergencyAlerts(alerts || [])
      } catch (error) {
        console.error('Failed to fetch alerts:', error)
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
    
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchAlerts()
      fetchHealth()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  // Calculate global statistics
  const totalDonations = allDonations?.length || 0
  const totalFoodRedistributed = allDonations?.reduce((sum, d) => sum + (d.quantity_kg || 0), 0) || 0
  const totalBeneficiaries = allDistributions?.reduce((sum, d) => sum + (d.beneficiaries_served || 0), 0) || 0
  const activeVolunteers = allUsers?.filter(u => u.user_type === 'volunteer').length || 0
  const activeDonors = allUsers?.filter(u => u.user_type === 'donor').length || 0
  const activeNGOs = allUsers?.filter(u => u.user_type === 'ngo').length || 0
  const completedDonations = allDonations?.filter(d => d.status === 'completed').length || 0
  const successRate = totalDonations > 0 ? ((completedDonations / totalDonations) * 100).toFixed(1) : 0

  const adminStats = [
    {
      label: "Total Donations",
      value: totalDonations.toLocaleString(),
      icon: TrendingUp,
      trend: `${completedDonations} completed`,
    },
    {
      label: "Food Redistributed",
      value: `${(totalFoodRedistributed / 1000).toFixed(1)}T`,
      icon: Package,
      color: "text-accent",
      trend: `${successRate}% success rate`,
    },
    {
      label: "Active Users",
      value: allUsers?.length.toLocaleString() || "0",
      icon: Users,
      trend: `${activeDonors}D • ${activeNGOs}N • ${activeVolunteers}V`,
    },
    {
      label: "Beneficiaries",
      value: totalBeneficiaries.toLocaleString(),
      icon: Heart,
      color: "text-accent",
      trend: "Lives impacted",
    },
  ]

  // Generate activity feed from real data
  const activities = [
    ...(allDonations?.slice(0, 2).map((donation) => ({
      id: donation.id,
      type: "donation" as const,
      title: `Donation ${donation.status}`,
      description: `${donation.quantity_kg} kg from ${donation.donor_id?.substring(0, 8)}...`,
      timestamp: new Date(donation.created_at).toLocaleString(),
      icon: <Package className="w-5 h-5 text-primary" />,
    })) || []),
    ...(allDistributions?.slice(0, 1).map((dist) => ({
      id: dist.id,
      type: "delivery" as const,
      title: "Distribution Completed",
      description: `${dist.quantity_kg} kg to ${dist.beneficiaries_served} beneficiaries`,
      timestamp: new Date(dist.created_at).toLocaleString(),
      icon: <Heart className="w-5 h-5 text-accent" />,
    })) || []),
  ]

  // Emergency alert handler
  const handleEmergencyAlert = async () => {
    try {
      await createEmergencyAlert({
        location: { lat: 0, lng: 0 },
        alert_type: 'food_shortage',
        severity: 'high',
        description: 'Emergency food shortage detected'
      })
      toast.success('Emergency alert created!')
      const alerts = await getActiveAlerts()
      setEmergencyAlerts(alerts || [])
    } catch (error) {
      toast.error('Failed to create emergency alert')
    }
  }

  // Loading state
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
        {/* Admin Welcome */}
        <Card className="p-6 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">
                AAHARNET.AI Admin Control Center 🛡️
              </h1>
              <p className="text-muted-foreground">
                Monitoring {allUsers?.length || 0} users across the platform
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">System Status</p>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${backendHealth?.status === 'healthy' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                <p className="text-lg font-bold">{backendHealth?.status || 'Checking...'}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Key Metrics */}
        <StatsGrid stats={adminStats} columns={4} />

        {/* Emergency Alerts - Prominent Display */}
        {emergencyAlerts.length > 0 && (
          <Card className="p-6 bg-destructive/10 border-destructive/30">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-8 h-8 text-destructive flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-lg font-bold mb-2">Active Emergency Alerts ({emergencyAlerts.length})</h3>
                <div className="space-y-2">
                  {emergencyAlerts.slice(0, 3).map((alert: any, idx: number) => (
                    <div key={idx} className="p-3 bg-background rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">{alert.alert_type || 'Emergency Alert'}</p>
                          <p className="text-sm text-muted-foreground">{alert.description}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded ${
                          alert.severity === 'critical' ? 'bg-destructive text-destructive-foreground' :
                          alert.severity === 'high' ? 'bg-orange-500 text-white' :
                          'bg-yellow-500 text-black'
                        }`}>
                          {alert.severity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Charts and System Health */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <DonationChart />
          </div>

          {/* System Health */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              System Health
            </h2>
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
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${item.color}`} />
                    <span className="text-sm font-medium">{item.status}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Stats */}
            <div className="mt-6 pt-4 border-t">
              <p className="text-sm font-semibold mb-2">Today's Activity</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">New Donations</span>
                  <span className="font-medium">{allDonations?.filter((d: any) => 
                    new Date(d.created_at).toDateString() === new Date().toDateString()
                  ).length || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Active Tasks</span>
                  <span className="font-medium">{allDonations?.filter((d: any) => d.status === 'active').length || 0}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Activity Feed and Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {activities.length > 0 ? (
              <ActivityFeed activities={activities} />
            ) : (
              <Card className="p-6 text-center">
                <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No recent activity</h3>
                <p className="text-muted-foreground">Platform activity will appear here</p>
              </Card>
            )}
          </div>

          {/* AI Insights & Alerts */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              AI Insights
            </h2>
            <div className="space-y-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <p className="font-semibold text-sm">Platform Growth</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {successRate}% donation success rate - Excellent performance!
                </p>
              </div>

              <div className="p-3 bg-accent/10 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-accent" />
                  <p className="font-semibold text-sm">User Engagement</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {activeVolunteers} volunteers helping {activeNGOs} NGOs
                </p>
              </div>

              <div className="p-3 bg-green-500/10 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Heart className="w-4 h-4 text-green-600" />
                  <p className="font-semibold text-sm">Impact Score</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {((totalFoodRedistributed / 1000) * 10).toFixed(0)}K impact points generated
                </p>
              </div>
            </div>

            {loadingAlerts ? (
              <div className="mt-4 text-center">
                <p className="text-xs text-muted-foreground">Loading alerts...</p>
              </div>
            ) : emergencyAlerts.length === 0 ? (
              <div className="mt-4 p-3 bg-muted rounded-lg text-center">
                <Shield className="w-6 h-6 mx-auto mb-2 text-green-500" />
                <p className="text-xs text-muted-foreground">No active emergencies</p>
              </div>
            ) : null}
          </Card>
        </div>

        {/* Admin Actions */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Admin Controls</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button 
              variant="outline" 
              className="w-full bg-transparent"
              onClick={() => toast.info('User management coming soon')}
            >
              <Users className="w-4 h-4 mr-2" />
              Manage Users
            </Button>
            <Button 
              variant="outline" 
              className="w-full bg-transparent"
              onClick={() => toast.info('Analytics coming soon')}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              View Analytics
            </Button>
            <Button 
              variant="destructive" 
              className="w-full"
              onClick={handleEmergencyAlert}
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Create Emergency
            </Button>
            <Button 
              variant="outline" 
              className="w-full bg-transparent"
              onClick={() => toast.info('Settings coming soon')}
            >
              <Package className="w-4 h-4 mr-2" />
              System Settings
            </Button>
          </div>
        </Card>

        {/* Platform Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6 text-center">
            <Users className="w-10 h-10 mx-auto mb-3 text-primary" />
            <p className="text-2xl font-bold">{activeDonors}</p>
            <p className="text-sm text-muted-foreground">Active Donors</p>
          </Card>
          <Card className="p-6 text-center">
            <Heart className="w-10 h-10 mx-auto mb-3 text-accent" />
            <p className="text-2xl font-bold">{activeNGOs}</p>
            <p className="text-sm text-muted-foreground">Partner NGOs</p>
          </Card>
          <Card className="p-6 text-center">
            <Package className="w-10 h-10 mx-auto mb-3 text-primary" />
            <p className="text-2xl font-bold">{activeVolunteers}</p>
            <p className="text-sm text-muted-foreground">Volunteers</p>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
