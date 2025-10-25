'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'

interface WorkspaceContextType {
  workspaceId: string | null
  workspaceRole: string | null
  setWorkspace: (id: string, role: string) => void
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  workspaceId: null,
  workspaceRole: null,
  setWorkspace: () => {},
})

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [workspaceRole, setWorkspaceRole] = useState<string | null>(null)

  useEffect(() => {
    // Initialize from URL params or localStorage
    const urlWorkspaceId = searchParams.get('workspaceId')
    if (urlWorkspaceId) {
      setWorkspaceId(urlWorkspaceId)
      // Store in localStorage for persistence
      localStorage.setItem('lastWorkspaceId', urlWorkspaceId)
    } else {
      // Try to restore from localStorage
      const stored = localStorage.getItem('lastWorkspaceId')
      if (stored) {
        setWorkspaceId(stored)
      }
    }

    // Store role if present
    const urlRole = searchParams.get('role')
    if (urlRole) {
      setWorkspaceRole(urlRole)
      localStorage.setItem('lastWorkspaceRole', urlRole)
    } else {
      const storedRole = localStorage.getItem('lastWorkspaceRole')
      if (storedRole) {
        setWorkspaceRole(storedRole)
      }
    }
  }, [searchParams])

  const setWorkspace = (id: string, role: string) => {
    setWorkspaceId(id)
    setWorkspaceRole(role)
    localStorage.setItem('lastWorkspaceId', id)
    localStorage.setItem('lastWorkspaceRole', role)
    
    // Update URL
    const params = new URLSearchParams(searchParams.toString())
    params.set('workspaceId', id)
    params.set('role', role)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <WorkspaceContext.Provider value={{ workspaceId, workspaceRole, setWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  return useContext(WorkspaceContext)
}

