'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Wallet, LogOut, User } from 'lucide-react'
import { getInitials } from '@/lib/utils'
import type { Profile } from '@/lib/types'

interface AppNavProps {
  profile: Profile | null
}

export function AppNav({ profile }: AppNavProps) {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
            <Wallet className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-lg">Pocket</span>
        </Link>

        <div className="flex items-center gap-3">
          {profile ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-xs">
                {getInitials(profile.name)}
              </div>
              <span className="text-sm font-medium text-gray-700 hidden sm:block">{profile.name}</span>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <User className="w-4 h-4 text-gray-400" />
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors px-2 py-1 rounded-md hover:bg-gray-100"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:block">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  )
}
