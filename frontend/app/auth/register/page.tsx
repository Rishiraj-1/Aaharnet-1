"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import Link from 'next/link'
import { Mail, Lock, UserPlus, User, Building2, Heart, Shield } from 'lucide-react'
import { toast } from 'sonner'

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    user_type: 'donor' as 'donor' | 'ngo' | 'volunteer' | 'admin'
  })
  const [loading, setLoading] = useState(false)
  const { signUp, signInWithGoogle } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Validation
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      await signUp(formData.email, formData.password, {
        name: formData.name,
        phone: formData.phone,
        user_type: formData.user_type
      })
      
      // Redirect based on role
      const redirectPath = formData.user_type === 'admin' ? '/admin' : '/dashboard'
      router.push(redirectPath)
    } catch (error: any) {
      console.error('Registration error:', error)
      toast.error(error.message || 'Failed to register')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setLoading(true)
    try {
      await signInWithGoogle()
      // Note: Google sign-in will use default role 'donor' from AuthContext
      router.push('/dashboard')
    } catch (error: any) {
      console.error('Google sign up error:', error)
      toast.error(error.message || 'Failed to sign up with Google')
    } finally {
      setLoading(false)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ngo': return <Building2 className="w-5 h-5" />
      case 'volunteer': return <Heart className="w-5 h-5" />
      case 'admin': return <Shield className="w-5 h-5" />
      default: return <User className="w-5 h-5" />
    }
  }

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'donor': return 'Donate surplus food to help those in need'
      case 'ngo': return 'Claim donations and distribute to beneficiaries'
      case 'volunteer': return 'Help pick up and deliver food donations'
      case 'admin': return 'Manage platform operations and users'
      default: return ''
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <CardDescription>
            Join AAHARNET.AI to make a difference
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number (Optional)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+91 1234567890"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            {/* User Role Selection */}
            <div className="space-y-2">
              <Label>I want to join as:</Label>
              <RadioGroup
                value={formData.user_type}
                onValueChange={(value) => setFormData({ ...formData, user_type: value as any })}
                className="space-y-3"
              >
                <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="donor" id="donor" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="donor" className="cursor-pointer flex items-center gap-2 font-medium">
                      {getRoleIcon('donor')}
                      Donor
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {getRoleDescription('donor')}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="ngo" id="ngo" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="ngo" className="cursor-pointer flex items-center gap-2 font-medium">
                      {getRoleIcon('ngo')}
                      NGO
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {getRoleDescription('ngo')}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="volunteer" id="volunteer" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="volunteer" className="cursor-pointer flex items-center gap-2 font-medium">
                      {getRoleIcon('volunteer')}
                      Volunteer
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {getRoleDescription('volunteer')}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer border-dashed">
                  <RadioGroupItem value="admin" id="admin" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="admin" className="cursor-pointer flex items-center gap-2 font-medium">
                      {getRoleIcon('admin')}
                      Admin
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {getRoleDescription('admin')}
                    </p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                      ⚠️ Admin access requires approval
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-10"
                  required
                  minLength={6}
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="pl-10"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              <UserPlus className="w-4 h-4 mr-2" />
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-4">
            <Separator />
            <div className="mt-4">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogleSignUp}
                disabled={loading}
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}

