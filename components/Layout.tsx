'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import WorkspaceSwitcher from './WorkspaceSwitcher'
import { useWorkspace } from '@/lib/workspace-context'
import { useState } from 'react'
import { apiGET } from '@/lib/api'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const pathname = usePathname()
  const { workspaceId, workspaceRole, setWorkspace } = useWorkspace()
  const [showManageModal, setShowManageModal] = useState(false)

  const navItems = [
    { href: '/', label: 'Dashboard' },
    { href: '/budget', label: 'Budget' },
    { href: '/expense/new', label: 'New Expense' },
    { href: '/reimbursements', label: 'Reimbursements' },
    { href: '/history', label: 'History' },
  ]

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    localStorage.removeItem('lastWorkspaceId')
    localStorage.removeItem('lastWorkspaceRole')
    window.location.href = '/login'
  }

  const getRoleBadgeColor = (role: string | null) => {
    switch (role) {
      case 'OWNER':
        return 'bg-purple-100 text-purple-800'
      case 'EDITOR':
        return 'bg-blue-100 text-blue-800'
      case 'VIEWER':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-6">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-gray-900">Budget App</h1>
              </div>
              
              {/* Workspace Switcher */}
              <WorkspaceSwitcher
                selectedWorkspaceId={workspaceId}
                onWorkspaceChange={setWorkspace}
              />

              <div className="hidden sm:flex sm:space-x-8">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      pathname === item.href
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Role Badge */}
              {workspaceRole && (
                <span className={`px-2 py-1 text-xs font-semibold rounded ${getRoleBadgeColor(workspaceRole)}`}>
                  {workspaceRole}
                </span>
              )}

              {/* Manage Workspace (Owner only) */}
              {workspaceRole === 'OWNER' && workspaceId && (
                <Link
                  href={`/workspace/manage?workspaceId=${workspaceId}`}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Manage
                </Link>
              )}

              <button
                onClick={handleSignOut}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}

