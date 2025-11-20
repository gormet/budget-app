'use client'

import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import MonthSelector from '@/components/MonthSelector'
import Badge from '@/components/Badge'
import { apiGET, apiPOST } from '@/lib/api'
import { useWorkspace } from '@/lib/workspace-context'

interface ReimbursementItem {
  id: string
  item_name: string
  amount: number
  reimbursement_amount: number
  reimburse_to: string | null
  reimburse_status: 'PENDING' | 'APPROVED' | 'REJECTED'
  budget_items: {
    id: string
    name: string
  }
  expenses: {
    id: string
    date: string
    expense_name: string
    month_id: string
  }
}

interface WorkspaceMember {
  profile_id: string
  email: string
  display_name: string | null
  role: string
}

export default function ReimbursementsPage() {
  const { workspaceId, workspaceRole } = useWorkspace()
  const [selectedMonthId, setSelectedMonthId] = useState<string | null>(null)
  const [items, setItems] = useState<ReimbursementItem[]>([])
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING')
  
  const isOwner = workspaceRole === 'OWNER'

  useEffect(() => {
    if (workspaceId) {
      loadReimbursements()
    } else {
      // Clear data when no workspace
      setItems([])
    }
  }, [statusFilter, selectedMonthId, workspaceId])

  // Load workspace members
  useEffect(() => {
    if (workspaceId) {
      loadMembers()
    }
  }, [workspaceId])

  // Clear selection when workspace changes
  useEffect(() => {
    if (workspaceId) {
      setSelectedMonthId('')
      setItems([])
      setMembers([])
      setStatusFilter('PENDING')
    }
  }, [workspaceId])

  async function loadReimbursements() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'ALL') {
        params.append('status', statusFilter)
      }
      if (selectedMonthId) {
        params.append('monthId', selectedMonthId)
      }

      const response: any = await apiGET(`/api/reimbursements?${params.toString()}`)
      setItems(response.data)
    } catch (error) {
      console.error('Failed to load reimbursements:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadMembers() {
    if (!workspaceId) return

    try {
      const response: any = await apiGET(`/api/workspaces/${workspaceId}/members`)
      setMembers(response.data || [])
    } catch (error) {
      console.error('Failed to load members:', error)
    }
  }

  async function handleApprove(itemId: string) {
    if (!isOwner) {
      alert('Only workspace owners can approve reimbursements')
      return
    }
    
    try {
      await apiPOST(`/api/reimbursements/${itemId}/approve`)
      await loadReimbursements()
    } catch (error: any) {
      console.error('Failed to approve:', error)
      alert(error.message || 'Failed to approve reimbursement')
    }
  }

  async function handleReject(itemId: string) {
    if (!isOwner) {
      alert('Only workspace owners can reject reimbursements')
      return
    }
    
    try {
      await apiPOST(`/api/reimbursements/${itemId}/reject`)
      await loadReimbursements()
    } catch (error: any) {
      console.error('Failed to reject:', error)
      alert(error.message || 'Failed to reject reimbursement')
    }
  }

  async function handleUpdateReimburseTo(itemId: string, reimburseTo: string) {
    try {
      await apiPOST(`/api/reimbursements/${itemId}/update-reimburse-to`, {
        reimburseTo: reimburseTo || null,
      })
      await loadReimbursements()
    } catch (error: any) {
      console.error('Failed to update reimburse to:', error)
      alert(error.message || 'Failed to update assignee')
    }
  }

  // Calculate breakdown by member for pending items
  const getMemberBreakdown = () => {
    const breakdown = new Map<string, { count: number; total: number; email: string }>()
    
    items.forEach(item => {
      const memberId = item.reimburse_to || 'unassigned'
      const existing = breakdown.get(memberId) || { count: 0, total: 0, email: '' }
      
      if (memberId !== 'unassigned') {
        const member = members.find(m => m.profile_id === memberId)
        existing.email = member?.email || 'Unknown'
      } else {
        existing.email = 'Unassigned'
      }
      
      existing.count += 1
      existing.total += item.reimbursement_amount
      breakdown.set(memberId, existing)
    })
    
    return Array.from(breakdown.entries()).map(([id, data]) => ({
      id,
      email: data.email,
      count: data.count,
      total: data.total,
    }))
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="warning">Pending</Badge>
      case 'APPROVED':
        return <Badge variant="success">Approved</Badge>
      case 'REJECTED':
        return <Badge variant="danger">Rejected</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <Layout>
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Reimbursements</h1>

        <MonthSelector
          selectedMonthId={selectedMonthId}
          onMonthChange={setSelectedMonthId}
          workspaceId={workspaceId}
          role={workspaceRole}
        />

        {/* Status Filter */}
        <div className="mb-6">
          <div className="flex gap-2">
            {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-md ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Total Summary for Pending */}
        {statusFilter === 'PENDING' && items.length > 0 && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-amber-900">Total Pending Reimbursements</h3>
                <Badge variant="warning">{items.length} item{items.length !== 1 ? 's' : ''}</Badge>
              </div>
              <p className="text-2xl font-bold text-amber-900">
                RM {items.reduce((sum, item) => sum + item.reimbursement_amount, 0).toFixed(2)}
              </p>
            </div>
            
            {/* By Member Breakdown */}
            <div className="border-t border-amber-200 pt-3 mt-3">
              <h4 className="text-xs font-semibold text-amber-800 mb-2">By Member:</h4>
              <div className="space-y-1">
                {getMemberBreakdown().map((member) => (
                  <div key={member.id} className="flex items-center justify-between text-xs text-amber-800">
                    <span>• {member.email}</span>
                    <span className="font-medium">
                      {member.count} item{member.count !== 1 ? 's' : ''} • RM {member.total.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Reimbursements Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No reimbursement items found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Expense
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Item
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Budget Item
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Reimb. Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Reimburse To
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(item.expenses.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.expenses.expense_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {item.item_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {item.budget_items.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        RM {item.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        RM {item.reimbursement_amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.reimburse_status === 'PENDING' ? (
                          <select
                            value={item.reimburse_to || ''}
                            onChange={(e) => handleUpdateReimburseTo(item.id, e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                          >
                            <option value="">Unassigned</option>
                            {members.map((member) => (
                              <option key={member.profile_id} value={member.profile_id}>
                                {member.email}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-gray-500">
                            {item.reimburse_to 
                              ? members.find(m => m.profile_id === item.reimburse_to)?.email || 'Unknown'
                              : 'Unassigned'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(item.reimburse_status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        {item.reimburse_status === 'PENDING' && isOwner && (
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleApprove(item.id)}
                              className="text-green-600 hover:text-green-700 font-medium"
                              title="Approve reimbursement"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(item.id)}
                              className="text-red-600 hover:text-red-700 font-medium"
                              title="Reject reimbursement"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {item.reimburse_status === 'PENDING' && !isOwner && (
                          <span className="text-gray-400 text-xs">Owner only</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

