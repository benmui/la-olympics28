import React, { createContext, useContext, useState } from 'react'
import { api } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token    = localStorage.getItem('la28_token')
    const username = localStorage.getItem('la28_username')
    if (token && username) return { token, username }
    return null
  })

  async function login(username, password) {
    const data = await api.login(username, password)
    const { token } = data
    localStorage.setItem('la28_token', token)
    localStorage.setItem('la28_username', username)
    setUser({ token, username })
    return data
  }

  async function register(username, password) {
    const data = await api.register(username, password)
    const { token } = data
    localStorage.setItem('la28_token', token)
    localStorage.setItem('la28_username', username)
    setUser({ token, username })
    return data
  }

  function logout() {
    localStorage.removeItem('la28_token')
    localStorage.removeItem('la28_username')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
