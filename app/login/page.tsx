'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/lib/use-toast'
import { Wallet, ArrowRight, Users } from 'lucide-react'

const DEMO_USERS = [
  { name: 'Shreyas', email: 'shreyas@demo.com', password: 'demo1234' },
  { name: 'Akash',   email: 'akash@demo.com',   password: 'demo1234' },
  { name: 'Kritika', email: 'kritika@demo.com',  password: 'demo1234' },
]

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState<string | null>(null)

  async function handleNameLogin(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInAnonymously({
        options: { data: { name: trimmed } },
      })

      if (error) throw error

      if (data.user) {
        // Upsert profile with the given name
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({ id: data.user.id, name: trimmed }, { onConflict: 'id' })

        if (profileError) throw profileError
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Could not sign in',
        description: err instanceof Error ? err.message : 'Please try again.',
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
    } catch (err) {
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
            <CardTitle className="text-lg">Get started</CardTitle>
            <CardDescription>Enter your name to join or create a group</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Name login */}
            <form onSubmit={handleNameLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Your name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Shreyas"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={50}
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={!name.trim() || loading}>
                {loading ? 'Signing in…' : 'Continue'}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>

            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-gray-400 font-medium">or try the demo</span>
              <Separator className="flex-1" />
            </div>

            {/* Demo logins */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-gray-400" />
                <p className="text-sm text-gray-500">Log in as a demo user to explore a seeded group</p>
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
              <p className="text-xs text-gray-400 text-center mt-2">
                Demo credentials: demo@email / demo1234
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
