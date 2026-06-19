'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface AdminSecretContextValue {
  adminSecret: string
  setAdminSecret: (value: string) => void
}

const AdminSecretContext = createContext<AdminSecretContextValue | null>(null)
const STORAGE_KEY = 'prism_admin_secret'

export function AdminSecretProvider({ children }: { children: ReactNode }) {
  const [adminSecret, setAdminSecretState] = useState('')

  useEffect(() => {
    try {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null
      if (saved) setAdminSecretState(saved)
    } catch {
      // ignore storage errors
    }
  }, [])

  const setAdminSecret = (value: string) => {
    setAdminSecretState(value)
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, value)
      }
    } catch {
      // ignore storage errors
    }
  }

  return (
    <AdminSecretContext.Provider value={{ adminSecret, setAdminSecret }}>
      {children}
    </AdminSecretContext.Provider>
  )
}

export function useAdminSecret(): AdminSecretContextValue {
  const ctx = useContext(AdminSecretContext)
  if (!ctx) {
    throw new Error('useAdminSecret must be used inside AdminSecretProvider')
  }
  return ctx
}
