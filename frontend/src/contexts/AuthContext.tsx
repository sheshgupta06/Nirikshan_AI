import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import {
  supabaseGetCurrentUser,
  supabaseGetSession,
  supabaseSignOut,
  onSupabaseAuthStateChange,
  fetchSupabaseProfile,
  saveSupabaseProfile,
} from '../services/supabaseClient'
import type { UserProfileConfig } from '../types/scan'

const LS_PROFILE_KEY = 'nirikshan_user_profile'
const LS_MOCK_USER_KEY = 'nirikshan_mock_user'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Partial<UserProfileConfig> | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  updateProfile: (updated: Partial<UserProfileConfig>) => Promise<boolean>
}

const defaultProfile: Partial<UserProfileConfig> = {
  profile_name: 'Default User',
  allergies: '',
  health_conditions: [],
  dietary_preference: 'VEGETARIAN',
  watchlist: '',
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: defaultProfile,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
  updateProfile: async () => false,
})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Partial<UserProfileConfig> | null>(() => {
    try {
      const saved = localStorage.getItem(LS_PROFILE_KEY)
      if (saved) return JSON.parse(saved)
    } catch {
      // ignore
    }
    return defaultProfile
  })
  const [loading, setLoading] = useState(true)

  // Loads profile from Supabase profiles table, falls back to metadata or localStorage
  const loadProfile = useCallback(async (activeUser: User) => {
    try {
      const dbProfile = await fetchSupabaseProfile(activeUser.id)
      if (dbProfile) {
        setProfile((prev) => {
          const merged = { ...prev, ...dbProfile }
          localStorage.setItem(LS_PROFILE_KEY, JSON.stringify(merged))
          return merged
        })
        return
      }
    } catch (e) {
      console.warn('Could not fetch profile from Supabase:', e)
    }

    // Fallback: derive name from metadata or email
    const fallbackName =
      activeUser.user_metadata?.full_name ||
      activeUser.email?.split('@')[0] ||
      'Nirikshan User'

    setProfile((prev) => {
      const updated = {
        ...prev,
        profile_name: prev?.profile_name && prev.profile_name !== 'Default User' ? prev.profile_name : fallbackName,
      }
      localStorage.setItem(LS_PROFILE_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  // Check initial session & register auth listener
  useEffect(() => {
    let mounted = true

    const initAuth = async () => {
      try {
        const currentSession = await supabaseGetSession()
        const currentUser = currentSession?.user || (await supabaseGetCurrentUser())

        if (currentUser && mounted) {
          setUser(currentUser)
          setSession(currentSession)
          await loadProfile(currentUser)
        } else {
          // Check if mock user was saved
          const mock = localStorage.getItem(LS_MOCK_USER_KEY)
          if (mock && mounted) {
            try {
              const parsed = JSON.parse(mock)
              setUser(parsed)
            } catch {
              localStorage.removeItem(LS_MOCK_USER_KEY)
            }
          }
        }
      } catch (err) {
        console.warn('Error checking initial auth state:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    initAuth()

    const { unsubscribe } = onSupabaseAuthStateChange(async (_event, newSession) => {
      if (!mounted) return
      setSession(newSession)
      const newUser = newSession?.user ?? null
      setUser(newUser)

      if (newUser) {
        await loadProfile(newUser)
      } else {
        localStorage.removeItem(LS_MOCK_USER_KEY)
      }
    })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [loadProfile])

  const refreshProfile = useCallback(async () => {
    if (user) {
      await loadProfile(user)
    }
  }, [user, loadProfile])

  const updateProfile = useCallback(
    async (updated: Partial<UserProfileConfig>): Promise<boolean> => {
      const merged = { ...profile, ...updated }
      setProfile(merged)
      try {
        localStorage.setItem(LS_PROFILE_KEY, JSON.stringify(merged))
      } catch {
        // ignore
      }

      if (user) {
        try {
          const ok = await saveSupabaseProfile(user.id, merged)
          return ok
        } catch (e) {
          console.error('Failed to save profile to Supabase:', e)
          return false
        }
      }
      return true
    },
    [user, profile]
  )

  const signOut = useCallback(async () => {
    try {
      await supabaseSignOut()
    } catch (e) {
      console.warn('Error signing out from Supabase:', e)
    }
    localStorage.removeItem(LS_MOCK_USER_KEY)
    localStorage.removeItem(LS_PROFILE_KEY)
    setUser(null)
    setSession(null)
    setProfile(defaultProfile)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signOut,
        refreshProfile,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
