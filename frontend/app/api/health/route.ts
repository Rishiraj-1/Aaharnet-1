/**
 * Health check endpoint for frontend-backend connectivity
 */

import { NextResponse } from 'next/server'
import { checkBackendHealth } from '@/utils/api'

export async function GET() {
  try {
    const health = await checkBackendHealth()
    return NextResponse.json({
      status: 'healthy',
      backend: health,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error.message || 'Backend connection failed',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}

