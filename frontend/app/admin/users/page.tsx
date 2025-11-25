"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/context/AuthContext"
import { useRole } from "@/hooks/useRole"
import { Users, Search, Shield, User, Building2, Heart, Ban, CheckCircle, XCircle, Loader2, ArrowRight, Filter, Download } from "lucide-react"
import { useState, useMemo, useEffect } from "react"
import { toast } from "sonner"
import { listUsers, setAdminRole } from "@/utils/api"
import { cn } from "@/lib/utils"
import { AnimatedMetricCard } from "@/components/ui/animated-metric-card"

export default function AdminUsersPage() {
  const navItems = [
    { label: "Overview", href: "/admin" },
    { label: "Map", href: "/map" },
    { label: "Users", href: "/admin/users" },
    { label: "Analytics", href: "/admin/analytics" },
    { label: "Emergency", href: "/admin/emergency" },
    { label: "Reports", href: "/admin/reports" },
  ]

  const { user } = useAuth()
  const { admin, loading: roleLoading } = useRole()
  const [searchQuery, setSearchQuery] = useState("")
  const [filterRole, setFilterRole] = useState<string>("all")
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [usersLoading, setUsersLoading] = useState(true)

  if (!roleLoading && !admin) {
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

  useEffect(() => {
    if (admin) {
      const fetchUsers = async () => {
        try {
          setUsersLoading(true)
          const response = await listUsers()
          setAllUsers(response.users || [])
        } catch (error: any) {
          toast.error(`Failed to load users: ${error.message}`)
          console.error('Error loading users:', error)
        } finally {
          setUsersLoading(false)
        }
      }
      fetchUsers()
    }
  }, [admin])

  const filteredUsers = useMemo(() => {
    if (!allUsers) return []
    
    let filtered = allUsers

    if (filterRole !== 'all') {
      filtered = filtered.filter((u: any) => u.role === filterRole)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((u: any) => 
        u.display_name?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query) ||
        u.uid?.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [allUsers, searchQuery, filterRole])

  const roleStats = useMemo(() => {
    if (!allUsers) return { donor: 0, ngo: 0, volunteer: 0, admin: 0, total: 0 }
    
    const stats = { donor: 0, ngo: 0, volunteer: 0, admin: 0, total: allUsers.length }
    allUsers.forEach((u: any) => {
      const role = u.role || 'donor'
      if (stats.hasOwnProperty(role)) {
        stats[role as keyof typeof stats]++
      }
    })
    return stats
  }, [allUsers])

  const handleSetAdmin = async (userId: string) => {
    try {
      await setAdminRole(userId)
      toast.success('Admin role assigned successfully. The user should refresh their token to see the change.')
      const response = await listUsers()
      setAllUsers(response.users || [])
    } catch (error: any) {
      toast.error(`Failed to set admin role: ${error.message}`)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="w-4 h-4" />
      case 'ngo': return <Building2 className="w-4 h-4" />
      case 'volunteer': return <Heart className="w-4 h-4" />
      default: return <User className="w-4 h-4" />
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/30'
      case 'ngo': return 'bg-teal-500/20 text-teal-700 dark:text-teal-400 border-teal-500/30'
      case 'volunteer': return 'bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30'
      default: return 'bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30'
    }
  }

  return (
    <DashboardLayout title="User Management" navItems={navItems}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
            <p className="text-muted-foreground mt-1">Manage all platform users and permissions</p>
          </div>
          <Button variant="outline" className="shadow-sm">
            <Download className="h-4 w-4 mr-2" />
            Export Users
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <AnimatedMetricCard
            title="Total Users"
            value={roleStats.total}
            icon={Users}
            gradient="from-purple-500 to-indigo-500"
            bgGradient="from-purple-500/10 to-indigo-500/10"
          />
          <AnimatedMetricCard
            title="Donors"
            value={roleStats.donor}
            icon={User}
            gradient="from-orange-500 to-amber-500"
            bgGradient="from-orange-500/10 to-amber-500/10"
          />
          <AnimatedMetricCard
            title="NGOs"
            value={roleStats.ngo}
            icon={Building2}
            gradient="from-teal-500 to-cyan-500"
            bgGradient="from-teal-500/10 to-cyan-500/10"
          />
          <AnimatedMetricCard
            title="Volunteers"
            value={roleStats.volunteer}
            icon={Heart}
            gradient="from-blue-500 to-cyan-500"
            bgGradient="from-blue-500/10 to-cyan-500/10"
          />
          <AnimatedMetricCard
            title="Admins"
            value={roleStats.admin}
            icon={Shield}
            gradient="from-purple-500 to-pink-500"
            bgGradient="from-purple-500/10 to-pink-500/10"
          />
        </div>

        {/* Search and Filters */}
        <Card className="p-4 shadow-lg border-0 bg-gradient-to-br from-background to-muted/20">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by name, email, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-4 py-2 border rounded-md bg-background"
              >
                <option value="all">All Roles</option>
                <option value="donor">Donors</option>
                <option value="ngo">NGOs</option>
                <option value="volunteer">Volunteers</option>
                <option value="admin">Admins</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Users Table */}
        <Card className="shadow-lg border-0 bg-gradient-to-br from-background to-muted/20">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Users ({filteredUsers.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-4 text-left text-sm font-medium">User</th>
                  <th className="p-4 text-left text-sm font-medium">Role</th>
                  <th className="p-4 text-left text-sm font-medium">Email</th>
                  <th className="p-4 text-left text-sm font-medium">Status</th>
                  <th className="p-4 text-left text-sm font-medium">Joined</th>
                  <th className="p-4 text-left text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                      Loading users...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user: any) => (
                    <tr key={user.uid || user.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            {getRoleIcon(user.role || 'donor')}
                          </div>
                          <div>
                            <p className="font-medium">{user.display_name || user.email || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{user.uid}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge className={getRoleColor(user.role || 'donor')}>
                          {user.role || 'donor'}
                          {user.admin && ' (Admin)'}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm">{user.email || 'N/A'}</td>
                      <td className="p-4">
                        <Badge variant={!user.disabled ? "default" : "destructive"} className="shadow-sm">
                          {!user.disabled ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Active
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3 mr-1" />
                              Disabled
                            </>
                          )}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {user.created_at 
                          ? new Date(user.created_at * 1000).toLocaleDateString()
                          : 'N/A'}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {!user.admin && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSetAdmin(user.uid)}
                              className="text-purple-600 hover:text-purple-700 border-purple-500/30 hover:bg-purple-500/10 shadow-sm"
                            >
                              <Shield className="w-4 h-4 mr-1" />
                              Make Admin
                            </Button>
                          )}
                          <Button variant="outline" size="sm" className="shadow-sm">
                            <ArrowRight className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}
