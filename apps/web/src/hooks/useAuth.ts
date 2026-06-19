'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { User } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  loading: boolean
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ user: null, loading: true })

  useEffect(() => {
    const supabase = createClient()

    let mounted = true
    async function getUser() {
      const { data } = await supabase.auth.getUser()
      if (mounted) {
        setState({ user: data.user, loading: false })
      }
    }

    getUser()

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (mounted) {
          setState({ user: session?.user ?? null, loading: false })
        }
      }
    )

    return () => {
      mounted = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  return state
}
