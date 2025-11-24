"use client"

/**
 * Role Panel for Volunteers
 * Shows volunteer-specific interface with current tasks and route
 */

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Play, CheckCircle, Navigation, MapPin } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

interface Donation {
  id: string
  donorId: string
  lat: number
  lng: number
  qtyKg: number
  foodType: string
  status: string
  volunteerId?: string
}

interface Volunteer {
  id: string
  lat: number
  lng: number
  status: string
  currentTaskId?: string
}

interface RolePanelVolunteerProps {
  donations: Donation[]
  volunteers: Volunteer[]
  userId: string
  onAction: () => void
}

export function RolePanelVolunteer({ donations, volunteers, userId, onAction }: RolePanelVolunteerProps) {
  const { user } = useAuth()
  const [isActive, setIsActive] = useState(false)

  const myVolunteer = volunteers.find(v => v.userId === userId)
  const assignedTasks = donations.filter(d => d.volunteerId === userId)
  const activeTask = assignedTasks.find(d => d.status === 'assigned' || d.status === 'picked')

  const handleStartTask = () => {
    setIsActive(true)
    // Update volunteer status in Firestore
    // This would be handled by backend API
  }

  const handleCompleteTask = () => {
    setIsActive(false)
    // Update task status in Firestore
    // This would be handled by backend API
  }

  return (
    <Card className="absolute bottom-4 left-4 z-[1000] w-80 bg-background/95 backdrop-blur-sm border">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Volunteer Dashboard</h3>
          <Badge variant={isActive ? 'default' : 'outline'}>
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        {/* Current Task */}
        {activeTask && (
          <Card className="p-3 bg-primary/10 border-primary/20">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Current Task</span>
              </div>
              <div className="text-sm">
                <div>{activeTask.qtyKg} kg - {activeTask.foodType}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Status: {activeTask.status}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    window.open(
                      `https://www.google.com/maps/dir/?api=1&destination=${activeTask.lat},${activeTask.lng}`,
                      '_blank'
                    )
                  }}
                  className="flex-1"
                >
                  <Navigation className="h-3 w-3 mr-1" />
                  Navigate
                </Button>
                <Button
                  size="sm"
                  onClick={handleCompleteTask}
                  className="flex-1"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Complete
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 bg-muted rounded">
            <div className="text-xs text-muted-foreground">Assigned</div>
            <div className="text-lg font-semibold">{assignedTasks.length}</div>
          </div>
          <div className="p-2 bg-muted rounded">
            <div className="text-xs text-muted-foreground">Completed</div>
            <div className="text-lg font-semibold">
              {assignedTasks.filter(d => d.status === 'delivered').length}
            </div>
          </div>
        </div>

        {/* Task List */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">My Tasks</h4>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {assignedTasks.slice(0, 5).map((task) => (
              <div
                key={task.id}
                className="p-2 bg-muted rounded text-sm flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{task.qtyKg} kg</span>
                </div>
                <Badge variant={task.status === 'delivered' ? 'default' : 'secondary'}>
                  {task.status}
                </Badge>
              </div>
            ))}
            {assignedTasks.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-4">
                No tasks assigned yet
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <Button
          className="w-full"
          onClick={isActive ? handleCompleteTask : handleStartTask}
          variant={isActive ? 'outline' : 'default'}
        >
          <Play className="h-4 w-4 mr-2" />
          {isActive ? 'End Shift' : 'Start Shift'}
        </Button>
      </div>
    </Card>
  )
}

