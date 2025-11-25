"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection"
import { FileText, Download, Calendar, BarChart3, TrendingUp, Users, Package, ToggleLeft, ToggleRight } from "lucide-react"
import { useState, useMemo } from "react"
import Link from "next/link"

// Mock reports data
const mockReports = [
  {
    id: "1",
    title: "Monthly Distribution Report - January 2024",
    type: "Monthly",
    period: "January 2024",
    totalDistributions: 45,
    totalQuantity: 1250,
    beneficiariesServed: 320,
    status: "completed",
    generatedAt: "2024-02-01T10:00:00Z"
  },
  {
    id: "2",
    title: "Weekly Activity Report - Week 3",
    type: "Weekly",
    period: "Week 3, January 2024",
    totalDistributions: 12,
    totalQuantity: 340,
    beneficiariesServed: 85,
    status: "completed",
    generatedAt: "2024-01-25T14:30:00Z"
  }
]

export default function NGOReportsPage() {
  const navItems = [
    { label: "Dashboard", href: "/ngo" },
    { label: "Map", href: "/map" },
    { label: "Requests", href: "/ngo/requests" },
    { label: "Beneficiaries", href: "/ngo/beneficiaries" },
    { label: "Reports", href: "/ngo/reports" },
  ]

  const { user, loading: authLoading } = useAuth()
  const [useMockData, setUseMockData] = useState(true)

  // Real data from Firestore
  const { data: distributions, loading: distributionsLoading } = useFirestoreCollection<{
    id: string
    ngoId: string
    ngo_id: string
    quantity_kg: number
    beneficiaries_served: number
    created_at: string
    createdAt: any
  }>('distributions', {
    whereFilter: user?.uid ? {
      field: 'ngoId',
      operator: '==',
      value: user.uid
    } : undefined,
    orderByField: 'createdAt',
    orderByDirection: 'desc',
    limitCount: 100
  })

  // Generate reports from real data
  const realReports = useMemo(() => {
    if (!distributions || distributions.length === 0) return []

    // Group by month
    const monthlyData = new Map<string, {
      distributions: number
      quantity: number
      beneficiaries: number
    }>()

    distributions.forEach(d => {
      const date = d.createdAt?.toDate ? d.createdAt.toDate() : new Date(d.created_at || Date.now())
      const monthKey = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      const existing = monthlyData.get(monthKey) || { distributions: 0, quantity: 0, beneficiaries: 0 }
      monthlyData.set(monthKey, {
        distributions: existing.distributions + 1,
        quantity: existing.quantity + (d.quantity_kg || 0),
        beneficiaries: existing.beneficiaries + (d.beneficiaries_served || 0)
      })
    })

    return Array.from(monthlyData.entries()).map(([period, data]) => ({
      id: period,
      title: `Monthly Distribution Report - ${period}`,
      type: "Monthly",
      period,
      totalDistributions: data.distributions,
      totalQuantity: data.quantity,
      beneficiariesServed: data.beneficiaries,
      status: "completed",
      generatedAt: new Date().toISOString()
    }))
  }, [distributions])

  const reports = useMockData ? mockReports : realReports
  const loading = useMockData ? false : distributionsLoading

  const stats = {
    totalReports: reports.length,
    totalDistributions: reports.reduce((sum, r) => sum + r.totalDistributions, 0),
    totalQuantity: reports.reduce((sum, r) => sum + r.totalQuantity, 0),
    totalBeneficiaries: reports.reduce((sum, r) => sum + r.beneficiariesServed, 0)
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
                <p className="text-2xl font-bold">{stats.totalReports}</p>
              </div>
              <FileText className="h-8 w-8 text-primary" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Distributions</p>
                <p className="text-2xl font-bold">{stats.totalDistributions}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Quantity</p>
                <p className="text-2xl font-bold">{stats.totalQuantity}</p>
                <p className="text-xs text-muted-foreground">kg</p>
              </div>
              <BarChart3 className="h-8 w-8 text-green-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Beneficiaries Served</p>
                <p className="text-2xl font-bold">{stats.totalBeneficiaries}</p>
              </div>
              <Users className="h-8 w-8 text-orange-500" />
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
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Distributions</p>
                            <p className="text-xl font-bold">{report.totalDistributions}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Total Quantity</p>
                            <p className="text-xl font-bold">{report.totalQuantity} kg</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Beneficiaries Served</p>
                            <p className="text-xl font-bold">{report.beneficiariesServed}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>Generated: {new Date(report.generatedAt).toLocaleDateString()}</span>
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

