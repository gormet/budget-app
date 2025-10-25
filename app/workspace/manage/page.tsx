'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Layout from '@/components/Layout'
import { apiGET, apiPOST } from '@/lib/api'
import Badge from '@/components/Badge'
import { useWorkspace } from '@/lib/workspace-context'

interface Member {
  profile_id: string
  email: string
  display_name: string | null
  role: 'OWNER' | 'EDITOR' | 'VIEWER'
  created_at: string
}

export default function WorkspaceManagePage() {
  const searchParams = useSearchParams()
  const { workspaceRole } = useWorkspace()
  const workspaceId = searchParams.get('workspaceId')
  
  const [workspace, setWorkspace] = useState<any>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'OWNER' | 'EDITOR' | 'VIEWER'>('VIEWER')
  const [inviting, setInviting] = useState(false)

  const isOwner = workspaceRole === 'OWNER'

  useEffect(() => {
    if (workspaceId) {
      loadWorkspace()
      loadMembers()
    }
  }, [workspaceId])

  async function loadWorkspace() {
    try {
      const response: any = await apiGET(`/api/workspaces/${workspaceId}`)
      setWorkspace(response.data)
    } catch (error) {
      console.error('Failed to load workspace:', error)
    }
  }

  async function loadMembers() {
    setLoading(true)
    try {
      const response: any = await apiGET(`/api/workspaces/${workspaceId}/members`)
      setMembers(response.data)
    } catch (error) {
      console.error('Failed to load members:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail.trim() || !workspaceId) return

    setInviting(true)
    try {
      await apiPOST(`/api/workspaces/${workspaceId}/invite`, {
        email: inviteEmail.trim(),
        role: inviteRole,
      })
      setInviteEmail('')
      alert('User invited successfully!')
      await loadMembers()
    } catch (error: any) {
      console.error('Failed to invite:', error)
      alert(error.message || 'Failed to invite user')
    } finally {
      setInviting(false)
    }
  }

  async function handleChangeRole(profileId: string, newRole: 'OWNER' | 'EDITOR' | 'VIEWER') {
    if (!workspaceId) return
    
    try {
      await apiPOST(`/api/workspaces/${workspaceId}/members/${profileId}/role`, {
        role: newRole,
      })
      alert('Role updated successfully!')
      await loadMembers()
    } catch (error: any) {
      console.error('Failed to change role:', error)
      alert(error.message || 'Failed to change role')
    }
  }

  async function handleRemoveMember(profileId: string) {
    if (!workspaceId) return
    if (!confirm('Are you sure you want to remove this member?')) return

    try {
      await apiPOST(`/api/workspaces/${workspaceId}/members/${profileId}/remove`)
      alert('Member removed successfully!')
      await loadMembers()
    } catch (error: any) {
      console.error('Failed to remove member:', error)
      alert(error.message || 'Failed to remove member')
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'OWNER':
        return <Badge variant="info">{role}</Badge>
      case 'EDITOR':
        return <Badge variant="success">{role}</Badge>
      case 'VIEWER':
        return <Badge>{role}</Badge>
      default:
        return <Badge>{role}</Badge>
    }
  }

  if (!isOwner) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">Only workspace owners can manage members.</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Manage Workspace: {workspace?.name}
        </h1>

        {/* Invite Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Invite Member</h2>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="flex gap-4">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md"
                required
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-md"
              >
                <option value="VIEWER">Viewer</option>
                <option value="EDITOR">Editor</option>
                <option value="OWNER">Owner</option>
              </select>
              <button
                type="submit"
                disabled={inviting}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {inviting ? 'Inviting...' : 'Invite'}
              </button>
            </div>
            <p className="text-sm text-gray-600">
              Note: The user must have an account already. They need to sign up first.
            </p>
          </form>
        </div>

        {/* Members List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Members ({members.length})</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading members...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Display Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {members.map((member) => (
                    <tr key={member.profile_id}>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {member.email}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {member.display_name || '-'}
                      </td>
                      <td className="px-6 py-4">
                        {getRoleBadge(member.role)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(member.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right text-sm">
                        <div className="flex gap-2 justify-end">
                          {member.role !== 'OWNER' && (
                            <select
                              value={member.role}
                              onChange={(e) =>
                                handleChangeRole(member.profile_id, e.target.value as any)
                              }
                              className="text-sm px-2 py-1 border border-gray-300 rounded"
                            >
                              <option value="VIEWER">Viewer</option>
                              <option value="EDITOR">Editor</option>
                              <option value="OWNER">Owner</option>
                            </select>
                          )}
                          <button
                            onClick={() => handleRemoveMember(member.profile_id)}
                            className="text-red-600 hover:text-red-700 font-medium"
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Role Descriptions */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3">Role Permissions</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li><strong>OWNER:</strong> Full access including member management and reimbursement approvals</li>
            <li><strong>EDITOR:</strong> Can create and edit months, budgets, and expenses (cannot approve reimbursements)</li>
            <li><strong>VIEWER:</strong> Read-only access to all workspace data</li>
          </ul>
        </div>
      </div>
    </Layout>
  )
}

