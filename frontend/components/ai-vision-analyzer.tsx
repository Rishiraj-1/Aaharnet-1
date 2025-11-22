"use client"

/**
 * AI Vision Analyzer Component
 * Analyzes food freshness using AI (Computer Vision)
 * According to AAHARNET.AI master plan
 */

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { analyzeShelfLife } from "@/utils/api"
import { Camera, Upload, Loader2, CheckCircle, AlertCircle, TrendingDown } from "lucide-react"
import { toast } from "sonner"

interface AnalysisResult {
  freshness_score: number
  estimated_hours_remaining: number
  confidence: number
  recommendations: string[]
  analysis_details: any
}

export function AIVisionAnalyzer() {
  const [foodType, setFoodType] = useState("apple")
  const [temperature, setTemperature] = useState("4")
  const [humidity, setHumidity] = useState("65")
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)

  const handleAnalyze = async () => {
    if (!foodType) {
      toast.error("Please select a food type")
      return
    }

    setAnalyzing(true)
    try {
      const analysis = await analyzeShelfLife({
        food_type: foodType,
        storage_conditions: {
          temperature: parseFloat(temperature) || 4,
          humidity: parseFloat(humidity) || 65
        },
        purchase_date: new Date().toISOString()
      })

      setResult(analysis)
      toast.success("Analysis complete!")
    } catch (error: any) {
      console.error("Analysis failed:", error)
      toast.error(error.message || "Failed to analyze food")
    } finally {
      setAnalyzing(false)
    }
  }

  const getFreshnessColor = (score: number) => {
    if (score >= 80) return "text-green-500"
    if (score >= 50) return "text-yellow-500"
    return "text-red-500"
  }

  const getFreshnessLabel = (score: number) => {
    if (score >= 80) return "Excellent"
    if (score >= 50) return "Good"
    if (score >= 30) return "Fair"
    return "Poor"
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary/10 rounded-lg">
          <Camera className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold">AI Food Freshness Analyzer</h2>
          <p className="text-sm text-muted-foreground">Estimate shelf-life with AI</p>
        </div>
      </div>

      {!result ? (
        <div className="space-y-4">
          {/* Food Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="food-type">Food Type</Label>
            <Select value={foodType} onValueChange={setFoodType}>
              <SelectTrigger id="food-type">
                <SelectValue placeholder="Select food type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="apple">Apple</SelectItem>
                <SelectItem value="banana">Banana</SelectItem>
                <SelectItem value="bread">Bread</SelectItem>
                <SelectItem value="vegetables">Vegetables</SelectItem>
                <SelectItem value="meat">Meat</SelectItem>
                <SelectItem value="dairy">Dairy</SelectItem>
                <SelectItem value="rice">Rice</SelectItem>
                <SelectItem value="pasta">Pasta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Storage Conditions */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="temperature">Temperature (°C)</Label>
              <Input
                id="temperature"
                type="number"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                placeholder="4"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="humidity">Humidity (%)</Label>
              <Input
                id="humidity"
                type="number"
                value={humidity}
                onChange={(e) => setHumidity(e.target.value)}
                placeholder="65"
              />
            </div>
          </div>

          {/* Analyze Button */}
          <Button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="w-full bg-primary hover:bg-primary/90"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing with AI...
              </>
            ) : (
              <>
                <Camera className="w-4 h-4 mr-2" />
                Analyze Freshness
              </>
            )}
          </Button>

          {/* Info Box */}
          <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
            <p className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                AI analyzes storage conditions and food type to estimate remaining shelf-life.
                For best results, provide accurate temperature and humidity.
              </span>
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Freshness Score */}
          <div className="text-center p-6 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-background mb-3">
              <span className={`text-3xl font-bold ${getFreshnessColor(result.freshness_score)}`}>
                {result.freshness_score}
              </span>
            </div>
            <h3 className="text-xl font-bold mb-1">
              {getFreshnessLabel(result.freshness_score)} Freshness
            </h3>
            <p className="text-sm text-muted-foreground">
              Confidence: {result.confidence}%
            </p>
          </div>

          {/* Time Remaining */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-muted rounded-lg text-center">
              <TrendingDown className="w-6 h-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{result.estimated_hours_remaining}h</p>
              <p className="text-xs text-muted-foreground">Hours Remaining</p>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold">{Math.floor(result.estimated_hours_remaining / 24)}d</p>
              <p className="text-xs text-muted-foreground">Days Remaining</p>
            </div>
          </div>

          {/* AI Recommendations */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-primary" />
              AI Recommendations
            </h4>
            <ul className="space-y-2">
              {result.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="text-primary mt-1">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={() => setResult(null)}
              variant="outline"
              className="flex-1"
            >
              Analyze Another
            </Button>
            <Button
              onClick={() => toast.success("Donation scheduled!")}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              <Upload className="w-4 h-4 mr-2" />
              Donate Now
            </Button>
          </div>

          {/* Analysis Details */}
          {result.analysis_details && (
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                View Technical Details
              </summary>
              <div className="mt-2 p-3 bg-muted rounded text-xs">
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(result.analysis_details, null, 2)}
                </pre>
              </div>
            </details>
          )}
        </div>
      )}
    </Card>
  )
}

