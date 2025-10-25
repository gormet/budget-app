'use client'

import { useEffect, useState } from 'react'
import { apiGET, apiPOST } from '@/lib/api'

interface Workspace {
  id: string
  name: string
  role: 'OWNER' | 'EDITOR' | 'VIEWER'
  created_at: string
}

interface WorkspaceSwitcherProps {
  selectedWorkspaceId: string | null
  onWorkspaceChange: (workspaceId: string, role: string) => void
}

export default function WorkspaceSwitcher({
  selectedWorkspaceId,
  onWorkspaceChange,
}: WorkspaceSwitcherProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadWorkspaces()
  }, [])

  async function loadWorkspaces() {
    setLoading(true)
    try {
      console.log('[WorkspaceSwitcher] Loading workspaces...')
      const response: any = await apiGET('/api/workspaces')
      console.log('[WorkspaceSwitcher] Loaded workspaces:', response.data)
      setWorkspaces(response.data)
      
      // Auto-select first workspace if none selected
      if (response.data.length > 0 && !selectedWorkspaceId) {
        console.log('[WorkspaceSwitcher] Auto-selecting first workspace:', response.data[0])
        onWorkspaceChange(response.data[0].id, response.data[0].role)
      } else if (response.data.length === 0) {
        console.log('[WorkspaceSwitcher] No workspaces found')
      } else {
        console.log('[WorkspaceSwitcher] Workspace already selected:', selectedWorkspaceId)
      }
    } catch (error) {
      console.error('[WorkspaceSwitcher] Failed to load workspaces:', error)
    } finally {
      setLoading(false)
    }
  }

  async function createWorkspace() {
    if (!newWorkspaceName.trim()) return
    
    setCreating(true)
    try {
      console.log('[WorkspaceSwitcher] Creating workspace:', newWorkspaceName)
      const response: any = await apiPOST('/api/workspaces', {
        name: newWorkspaceName.trim(),
      })
      console.log('[WorkspaceSwitcher] Workspace created:', response.data)
      
      setWorkspaces([response.data, ...workspaces])
      setNewWorkspaceName('')
      setShowCreateModal(false)
      onWorkspaceChange(response.data.id, response.data.role)
      console.log('[WorkspaceSwitcher] Workspace selected:', response.data.id)
    } catch (error) {
      console.error('[WorkspaceSwitcher] Failed to create workspace:', error)
      alert('Failed to create workspace')
    } finally {
      setCreating(false)
    }
  }

  const selectedWorkspace = workspaces.find(w => w.id === selectedWorkspaceId)

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="text-sm text-gray-500">Loading workspaces...</div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={selectedWorkspaceId || ''}
        onChange={(e) => {
          const workspace = workspaces.find(w => w.id === e.target.value)
          if (workspace) {
            onWorkspaceChange(workspace.id, workspace.role)
          }
        }}
        className="text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
      >
        {workspaces.length === 0 ? (
          <option value="">No workspaces</option>
        ) : (
          workspaces.map(workspace => (
            <option key={workspace.id} value={workspace.id}>
              {workspace.name} ({workspace.role})
            </option>
          ))
        )}
      </select>

      <button
        onClick={() => setShowCreateModal(true)}
        className="text-sm px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        + New
      </button>

      {/* Create Workspace Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-semibold mb-4">Create New Workspace</h2>
            
            <input
              type="text"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              placeholder="Workspace name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') createWorkspace()
                if (e.key === 'Escape') setShowCreateModal(false)
              }}
            />

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setNewWorkspaceName('')
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                disabled={creating}
              >
                Cancel
              </button>
              <button
                onClick={createWorkspace}
                disabled={!newWorkspaceName.trim() || creating}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

