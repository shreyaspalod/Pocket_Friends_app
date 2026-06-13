'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/lib/use-toast'
import { Wallet, Eye, EyeOff, Users } from 'lucide-react'

const DEMO_USERS = [
  { name: 'Shreyas', email: 'shreyas@demo.com', password: 'demo1234' },
  { name: 'Akash',   email: 'akash@demo.com',   password: 'demo1234' },
  { name: 'Kritika', email: 'kritika@demo.com',  password: 'demo1234' },
]

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) return
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })
      if (error) throw error
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Sign in failed',
        description: err instanceof Error ? err.message : 'Invalid email or password.',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleDemoLogin(user: typeof DEMO_USERS[number]) {
    setDemoLoading(user.email)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: user.password,
      })
      if (error) throw error
      router.push('/dashboard')
      router.refresh()
    } catch {
      toast({
        variant: 'destructive',
        title: 'Demo login failed',
        description: 'Run the seed script first: npm run seed',
      })
    } finally {
      setDemoLoading(null)
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
            <CardTitle className="text-lg">Welcome back</CardTitle>
            <CardDescription>Sign in to your account to continue</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  autoComplete="email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={!email.trim() || !password || loading}
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>

            <p className="text-center text-sm text-gray-500">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-green-600 font-medium hover:underline">
                Create one
              </Link>
            </p>

            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-gray-400 font-medium">or try the demo</span>
              <Separator className="flex-1" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-gray-400" />
                <p className="text-sm text-gray-500">Explore a pre-seeded group instantly</p>
              </div>
              {DEMO_USERS.map((user) => (
                <button
                  key={user.email}
                  onClick={() => handleDemoLogin(user)}
                  disabled={demoLoading !== null}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border border-gray-200 bg-white hover:bg-green-50 hover:border-green-200 transition-colors text-sm font-medium text-gray-700 disabled:opacity-50"
                >
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-xs shrink-0">
                    {user.name[0]}
                  </div>
                  <span>Continue as {user.name}</span>
                  {demoLoading === user.email && (
                    <span className="ml-auto text-gray-400 text-xs">Loading…</span>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
