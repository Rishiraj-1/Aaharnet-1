"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/context/AuthContext"
import { User, Mail, Phone, MapPin, Award, Truck, Clock, Edit, Save } from "lucide-react"
import { useState } from "react"

export default function VolunteerProfilePage() {
  const navItems = [
    { label: "Dashboard", href: "/volunteer" },
    { label: "Map", href: "/map" },
    { label: "Available Tasks", href: "/volunteer/tasks" },
    { label: "My Deliveries", href: "/volunteer/deliveries" },
    { label: "Profile", href: "/volunteer/profile" },
  ]

  const { user, userData, loading: authLoading } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: userData?.name || user?.displayName || "",
    email: user?.email || "",
    phone: userData?.phone || "",
    location: userData?.location || "",
    vehicleType: userData?.vehicleType || "Bike",
    availability: userData?.availability || "Full-time"
  })

  const stats = {
    totalDeliveries: 45,
    totalDistance: 125.5,
    totalHours: 156,
    impactPoints: 850,
    rating: 4.8
  }

  const handleSave = () => {
    // TODO: Save to Firestore
    setIsEditing(false)
  }

  return (
    <DashboardLayout title="Profile" navItems={navItems}>
      <div className="space-y-6">
        {/* Profile Header */}
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-10 w-10 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{formData.name || "Volunteer"}</h2>
                <p className="text-muted-foreground">{formData.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="bg-green-500">Active</Badge>
                  <Badge variant="outline">⭐ {stats.rating}</Badge>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            >
              {isEditing ? (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
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
                <p className="text-sm text-muted-foreground">Total Deliveries</p>
                <p className="text-2xl font-bold">{stats.totalDeliveries}</p>
              </div>
              <Truck className="h-8 w-8 text-primary" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Distance</p>
                <p className="text-2xl font-bold">{stats.totalDistance}</p>
                <p className="text-xs text-muted-foreground">km</p>
              </div>
              <MapPin className="h-8 w-8 text-blue-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Hours</p>
                <p className="text-2xl font-bold">{stats.totalHours}</p>
              </div>
              <Clock className="h-8 w-8 text-green-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Impact Points</p>
                <p className="text-2xl font-bold">{stats.impactPoints}</p>
              </div>
              <Award className="h-8 w-8 text-yellow-500" />
            </div>
          </Card>
        </div>

        {/* Profile Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
            <div className="space-y-4">
              <div>
                <Label>Full Name</Label>
                {isEditing ? (
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1"
                  />
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{formData.name || "Not set"}</span>
                  </div>
                )}
              </div>
              <div>
                <Label>Email</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{formData.email || "Not set"}</span>
                </div>
              </div>
              <div>
                <Label>Phone</Label>
                {isEditing ? (
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="mt-1"
                  />
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{formData.phone || "Not set"}</span>
                  </div>
                )}
              </div>
              <div>
                <Label>Location</Label>
                {isEditing ? (
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="mt-1"
                  />
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{formData.location || "Not set"}</span>
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Volunteer Information</h3>
            <div className="space-y-4">
              <div>
                <Label>Vehicle Type</Label>
                {isEditing ? (
                  <select
                    value={formData.vehicleType}
                    onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                    className="w-full p-2 border rounded mt-1"
                  >
                    <option>Bike</option>
                    <option>Car</option>
                    <option>Van</option>
                    <option>Other</option>
                  </select>
                ) : (
                  <div className="mt-1">
                    <Badge>{formData.vehicleType}</Badge>
                  </div>
                )}
              </div>
              <div>
                <Label>Availability</Label>
                {isEditing ? (
                  <select
                    value={formData.availability}
                    onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                    className="w-full p-2 border rounded mt-1"
                  >
                    <option>Full-time</option>
                    <option>Part-time</option>
                    <option>Weekends only</option>
                    <option>On-call</option>
                  </select>
                ) : (
                  <div className="mt-1">
                    <Badge variant="outline">{formData.availability}</Badge>
                  </div>
                )}
              </div>
              <div>
                <Label>Rating</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Award className="h-4 w-4 text-yellow-500" />
                  <span className="font-semibold">{stats.rating} / 5.0</span>
                  <span className="text-sm text-muted-foreground">(Based on {stats.totalDeliveries} deliveries)</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}

