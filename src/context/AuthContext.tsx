import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  ACCESS_TOKEN_KEY,
  AUTH_USER_KEY,
  REFRESH_TOKEN_KEY,
  authApi,
  getApiErrorMessage,
} from '../lib/api'
import type { LoginRequest, RegisterRequest, User } from '../types'

interface AuthContextValue {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (data: LoginRequest) => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const readStoredUser = (): User | null => {
  const raw = localStorage.getItem(AUTH_USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    localStorage.removeItem(AUTH_USER_KEY)
    return null
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => readStoredUser())
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(ACCESS_TOKEN_KEY))
  const [isLoading, setIsLoading] = useState(true)

  const persistSession = useCallback((auth: { accessToken: string; refreshToken: string; userId: number; email: string; displayName: string; role: User['role'] }) => {
    const nextUser: User = {
      id: auth.userId,
      email: auth.email,
      displayName: auth.displayName,
      role: auth.role,
      profileAvatar: null,
    }
    localStorage.setItem(ACCESS_TOKEN_KEY, auth.accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, auth.refreshToken)
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextUser))
    setToken(auth.accessToken)
    setUser(nextUser)
  }, [])

  const clearSession = useCallback(() => {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(AUTH_USER_KEY)
    setToken(null)
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    const currentToken = localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!currentToken) {
      clearSession()
      return
    }
    const profile = await authApi.me()
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(profile))
    setToken(currentToken)
    setUser(profile)
  }, [clearSession])

  useEffect(() => {
    const onExpired = () => clearSession()
    window.addEventListener('breezedesk:auth-expired', onExpired)
    return () => window.removeEventListener('breezedesk:auth-expired', onExpired)
  }, [clearSession])

  useEffect(() => {
    const boot = async () => {
      if (!localStorage.getItem(ACCESS_TOKEN_KEY)) {
        setIsLoading(false)
        return
      }
      try {
        await refreshUser()
      } catch {
        clearSession()
      } finally {
        setIsLoading(false)
      }
    }
    void boot()
  }, [clearSession, refreshUser])

  const login = async (data: LoginRequest) => {
    try {
      const auth = await authApi.login(data)
      persistSession(auth)
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Login failed'))
    }
  }

  const register = async (data: RegisterRequest) => {
    try {
      const auth = await authApi.register(data)
      persistSession(auth)
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Registration failed'))
    }
  }

  const logout = async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
    try {
      // The backend protects /auth/logout, so keep the access token until the
      // revoke request has had a chance to reach the server.
      if (refreshToken) await authApi.logout(refreshToken)
    } catch {
      // Local logout must always complete even if the network is unavailable.
    } finally {
      clearSession()
    }
  }

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    isLoading,
    isAuthenticated: Boolean(token && user),
    login,
    register,
    logout,
    refreshUser,
  }), [isLoading, logout, refreshUser, token, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
