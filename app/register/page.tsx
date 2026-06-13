'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/lib/use-toast'
import { Wallet, Eye, EyeOff } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword
  const weak = password.length > 0 && password.length < 6

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !password || password !== confirmPassword) return
    if (password.length < 6) {
      toast({ variant: 'destructive', title: 'Password too short', description: 'Use at least 6 characters.' })
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { name: name.trim() },
        },
      })

      if (error) throw error

      // handle_new_user trigger auto-creates the profile row.
      // If the project has email confirmation disabled, the user is signed in immediately.
      // If confirmation is required, data.user exists but session is null.
      if (data.session) {
        toast({ variant: 'success', title: 'Account created!', description: `Welcome, ${name.trim()}.` })
        router.push('/dashboard')
        router.refresh()
      } else {
        toast({
          title: 'Check your email',
          description: 'We sent you a confirmation link. Click it to activate your account.',
        })
        router.push('/login')
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Registration failed',
        description: err instanceof Error ? err.message : 'Could not create account.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#f6faf6]">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-green-600 rounded-2xl flex items-center justify-center shadow-md">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pocket</h1>
            <p className="text-sm text-gray-500">Expense Splitter</p>
          </div>
        </div>

        <Card className="shadow-md border-gray-100">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Create your account</CardTitle>
            <CardDescription>Your expenses, your name — saved securely</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="name">Your name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Shreyas"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={50}
                  autoFocus
                  autoComplete="name"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min. 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    className={`pr-10 ${weak ? 'border-amber-400 focus-visible:ring-amber-400' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {weak && <p className="text-xs text-amber-600">Password must be at least 6 characters</p>}
              </div>

              {/* Confirm password */}
              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirm password</Label>
                <div className="relative">
                  <Input
                    id="confirm"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    className={`pr-10 ${passwordMismatch ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordMismatch && <p className="text-xs text-red-500">Passwords don&apos;t match</p>}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={
                  !name.trim() ||
                  !email.trim() ||
                  !password ||
                  password !== confirmPassword ||
                  weak ||
                  loading
                }
              >
                {loading ? 'Creating account…' : 'Create account'}
              </Button>
            </form>

            <p className="text-center text-sm text-gray-500">
              Already have an account?{' '}
              <Link href="/login" className="text-green-600 font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
