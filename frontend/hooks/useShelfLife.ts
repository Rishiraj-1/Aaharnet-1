"use client"

import { useState } from 'react'
import { analyzeShelfLife, type ShelfLifeRequest, type ShelfLifeResponse } from '@/utils/api'
import { toast } from 'sonner'

/**
 * Hook for analyzing food shelf life
 */
export function useShelfLifeAnalysis() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ShelfLifeResponse | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const analyze = async (request: ShelfLifeRequest) => {
    setLoading(true)
    setError(null)
    
    try {
      const analysisResult = await analyzeShelfLife(request)
      setResult(analysisResult)
      toast.success('Shelf life analyzed successfully')
      return analysisResult
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to analyze shelf life'
      setError(err)
      toast.error(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setResult(null)
    setError(null)
  }

  return {
    analyze,
    result,
    loading,
    error,
    reset,
  }
}

/**
 * Hook for uploading and analyzing food images
 */
export function useImageUpload() {
  const [uploading, setUploading] = useState(false)
  
  const uploadImage = async (file: File) => {
    setUploading(true)
    try {
      // Convert image to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      
      return base64
    } catch (err) {
      toast.error('Failed to upload image')
      throw err
    } finally {
      setUploading(false)
    }
  }

  return { uploadImage, uploading }
}

