"use client"

import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChefHat, Heart, Users, Package, TrendingUp, Settings, Map, Shield } from 'lucide-react'
import Link from 'next/link'
import { useRole } from '@/hooks/useRole'

export default function DashboardPage() {
  const { user, userData, loading } = useAuth()
  const { admin, loading: roleLoading } = useRole()
  const router = useRouter()

  // All hooks must be called before any conditional returns
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  // Redirect based on user type - must be called before early returns
  useEffect(() => {
    if (userData && !loading && !roleLoading && user) {
      // Redirect admin users to admin dashboard
      if (admin || userData.user_type === 'admin') {
        router.push('/admin')
        return
      }
      if (userData.user_type === 'donor') {
        router.push('/donor')
      } else if (userData.user_type === 'ngo') {
        router.push('/ngo')
      } else if (userData.user_type === 'volunteer') {
        router.push('/volunteer')
      }
    }
  }, [userData, loading, roleLoading, user, router, admin])

  // Early returns after all hooks
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const userTypeDashboards = {
    donor: {
      title: 'Donor Dashboard',
      icon: ChefHat,
      description: 'Manage your food donations',
      path: '/donor',
      color: 'from-blue-500 to-blue-600'
    },
    ngo: {
      title: 'NGO Dashboard',
      icon: Heart,
      description: 'Receive and distribute food',
      path: '/ngo',
      color: 'from-green-500 to-green-600'
    },
    volunteer: {
      title: 'Volunteer Dashboard',
      icon: Users,
      description: 'Help deliver food to those in need',
      path: '/volunteer',
      color: 'from-orange-500 to-orange-600'
    },
    admin: {
      title: 'Admin Dashboard',
      icon: Shield,
      description: 'Manage platform and users',
      path: '/admin',
      color: 'from-purple-500 to-purple-600'
    }
  }

  // For admin users, show admin dashboard as primary
  const isAdmin = admin || userData?.user_type === 'admin'
  const dashboard = isAdmin 
    ? userTypeDashboards.admin 
    : (userTypeDashboards[userData?.user_type as keyof typeof userTypeDashboards] || userTypeDashboards.donor)

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Welcome Header */}
        <Card className="mb-8 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">
              Welcome back, {userData?.name || user?.email}! 👋
            </CardTitle>
            <CardDescription>
              Choose your role or continue to your dashboard
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Main Dashboard Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Primary Dashboard */}
          <Link href={dashboard.path}>
            <Card className="cursor-pointer hover:shadow-lg transition-all border-2 border-primary/20 hover:border-primary/40">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className={`p-3 rounded-lg bg-gradient-to-r ${dashboard.color}`}>
                    <dashboard.icon className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{dashboard.title}</h3>
                    <p className="text-sm text-muted-foreground">{dashboard.description}</p>
                  </div>
                </div>
                <Button className="w-full" variant="outline">
                  Go to Dashboard
                </Button>
              </CardContent>
            </Card>
          </Link>

          {/* Other Dashboards */}
          {Object.entries(userTypeDashboards).map(([type, config]) => {
            // Skip the current user's dashboard (or admin if user is admin)
            const currentUserType = isAdmin ? 'admin' : userData?.user_type
            if (type === currentUserType) return null
            return (
              <Link key={type} href={config.path}>
                <Card className="cursor-pointer hover:shadow-lg transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 rounded-lg bg-muted">
                        <config.icon className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">{config.title}</h3>
                        <p className="text-sm text-muted-foreground">{config.description}</p>
                      </div>
                    </div>
                    <Button className="w-full" variant="ghost">
                      View Dashboard
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Total Impact</p>
                  <h3 className="text-2xl font-bold">0</h3>
                  <p className="text-xs text-muted-foreground">Get started!</p>
                </div>
                <Package className="w-12 h-12 text-primary/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Streak</p>
                  <h3 className="text-2xl font-bold">0</h3>
                  <p className="text-xs text-muted-foreground">Days active</p>
                </div>
                <TrendingUp className="w-12 h-12 text-accent/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Rating</p>
                  <h3 className="text-2xl font-bold">-</h3>
                  <p className="text-xs text-muted-foreground">No ratings yet</p>
                </div>
                <Heart className="w-12 h-12 text-red-500/20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Map & Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <Card className="cursor-pointer hover:shadow-lg transition-all border-2 border-primary/20 hover:border-primary/40">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Interactive Map</h3>
                  <p className="text-sm text-muted-foreground">
                    View donations, NGOs, and volunteers on the map
                  </p>
                </div>
                <Link href="/map">
                  <Button variant="outline">
                    <Map className="w-4 h-4 mr-2" />
                    Open Map
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Account Settings</h3>
                  <p className="text-sm text-muted-foreground">
                    Update your profile and preferences
                  </p>
                </div>
                <Link href="/settings">
                  <Button variant="outline">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

