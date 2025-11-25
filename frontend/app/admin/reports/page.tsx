"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/context/AuthContext"
import { useRole } from "@/hooks/useRole"
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection"
import { FileText, Download, Calendar, BarChart3, TrendingUp, Users, Package, ToggleLeft, ToggleRight, Shield } from "lucide-react"
import { useState, useMemo } from "react"
import Link from "next/link"

// Mock reports data
const mockReports = [
  {
    id: "1",
    title: "Platform Performance Report - Q1 2024",
    type: "Quarterly",
    period: "Q1 2024",
    totalUsers: 1250,
    totalDonations: 3450,
    totalDistributions: 2890,
    foodRedistributed: 125000,
    beneficiariesServed: 8900,
    status: "completed",
    generatedAt: "2024-04-01T10:00:00Z"
  },
  {
    id: "2",
    title: "Monthly Activity Report - March 2024",
    type: "Monthly",
    period: "March 2024",
    totalUsers: 1150,
    totalDonations: 350,
    totalDistributions: 310,
    foodRedistributed: 12500,
    beneficiariesServed: 850,
    status: "completed",
    generatedAt: "2024-04-01T09:00:00Z"
  },
  {
    id: "3",
    title: "User Growth Analysis - 2024",
    type: "Annual",
    period: "2024",
    totalUsers: 1250,
    totalDonations: 3450,
    totalDistributions: 2890,
    foodRedistributed: 125000,
    beneficiariesServed: 8900,
    status: "pending",
    generatedAt: "2024-01-01T00:00:00Z"
  }
]

export default function AdminReportsPage() {
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

  // Generate reports from real data
  const realReports = useMemo(() => {
    if (!users || !donations || !distributions) return []

    // Group by month
    const monthlyData = new Map<string, {
      users: number
      donations: number
      distributions: number
      foodRedistributed: number
      beneficiariesServed: number
    }>()

    donations.forEach((d: any) => {
      const date = d.createdAt?.toDate ? d.createdAt.toDate() : new Date(d.created_at || Date.now())
      const monthKey = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      const existing = monthlyData.get(monthKey) || { users: 0, donations: 0, distributions: 0, foodRedistributed: 0, beneficiariesServed: 0 }
      monthlyData.set(monthKey, {
        ...existing,
        donations: existing.donations + 1,
        foodRedistributed: existing.foodRedistributed + (d.qtyKg || d.quantity_kg || 0)
      })
    })

    distributions.forEach((d: any) => {
      const date = d.createdAt?.toDate ? d.createdAt.toDate() : new Date(d.created_at || Date.now())
      const monthKey = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      const existing = monthlyData.get(monthKey) || { users: 0, donations: 0, distributions: 0, foodRedistributed: 0, beneficiariesServed: 0 }
      monthlyData.set(monthKey, {
        ...existing,
        distributions: existing.distributions + 1,
        beneficiariesServed: existing.beneficiariesServed + (d.beneficiaries_served || 0)
      })
    })

    return Array.from(monthlyData.entries()).map(([period, data]) => ({
      id: period,
      title: `Monthly Activity Report - ${period}`,
      type: "Monthly",
      period,
      totalUsers: users.length,
      totalDonations: data.donations,
      totalDistributions: data.distributions,
      foodRedistributed: data.foodRedistributed,
      beneficiariesServed: data.beneficiariesServed,
      status: "completed",
      generatedAt: new Date().toISOString()
    }))
  }, [users, donations, distributions])

  const reports = useMockData ? mockReports : realReports
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
    <DashboardLayout title="Reports" navItems={navItems}>
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

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Reports</p>
                <p className="text-2xl font-bold">{reports.length}</p>
              </div>
              <FileText className="h-8 w-8 text-primary" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">
                  {reports.filter(r => r.status === 'completed').length}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-green-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">
                  {reports.filter(r => r.status === 'pending').length}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-yellow-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Food</p>
                <p className="text-2xl font-bold">
                  {(reports.reduce((sum, r) => sum + r.foodRedistributed, 0) / 1000).toFixed(1)}K
                </p>
                <p className="text-xs text-muted-foreground">kg</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Generate Custom Report
          </Button>
          <Button>
            <FileText className="h-4 w-4 mr-2" />
            Generate Monthly Report
          </Button>
        </div>

        {/* Reports List */}
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-bold mb-6">Generated Reports</h2>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading reports...</p>
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No reports found</h3>
                <p className="text-muted-foreground mb-4">
                  {useMockData 
                    ? "Mock data is empty. Switch to real data or generate a report."
                    : "No reports have been generated yet."}
                </p>
                <Button>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Your First Report
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {reports.map((report) => (
                  <Card key={report.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <div>
                          <h3 className="font-semibold text-lg">{report.title}</h3>
                          <p className="text-sm text-muted-foreground">{report.period}</p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Users</p>
                            <p className="font-bold">{report.totalUsers}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Donations</p>
                            <p className="font-bold">{report.totalDonations}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Distributions</p>
                            <p className="font-bold">{report.totalDistributions}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Food (kg)</p>
                            <p className="font-bold">{(report.foodRedistributed / 1000).toFixed(1)}K</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Beneficiaries</p>
                            <p className="font-bold">{(report.beneficiariesServed / 1000).toFixed(1)}K</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>Generated: {new Date(report.generatedAt).toLocaleDateString()}</span>
                          <Badge className={report.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'}>
                            {report.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}

