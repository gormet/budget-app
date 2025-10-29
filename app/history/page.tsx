'use client'

import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import MonthSelector from '@/components/MonthSelector'
import Badge from '@/components/Badge'
import { apiGET } from '@/lib/api'
import { useWorkspace } from '@/lib/workspace-context'

interface ExpenseItem {
  id: string
  item_name: string
  amount: number
  need_reimburse: boolean
  reimbursement_amount: number | null
  reimburse_status: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED'
  budget_items: {
    id: string
    name: string
  }
}

interface Expense {
  id: string
  date: string
  expense_name: string
  note: string | null
  expense_items: ExpenseItem[]
  created_by_email?: string
  created_by_name?: string
}

export default function HistoryPage() {
  const { workspaceId, workspaceRole } = useWorkspace()
  const [selectedMonthId, setSelectedMonthId] = useState<string | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [expandedExpenseId, setExpandedExpenseId] = useState<string | null>(null)

  useEffect(() => {
    if (selectedMonthId) {
      loadExpenses()
    } else {
      // Clear data when no month selected
      setExpenses([])
    }
  }, [selectedMonthId, searchQuery, statusFilter])

  // Reload data when workspace changes
  useEffect(() => {
    if (workspaceId) {
      // Clear selection when workspace changes (empty string triggers auto-select in MonthSelector)
      setSelectedMonthId('')
      setExpenses([])
      setSearchQuery('')
      setStatusFilter('')
      setExpandedExpenseId(null)
    }
  }, [workspaceId])

  async function loadExpenses() {
    if (!selectedMonthId) return

    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('monthId', selectedMonthId)
      if (searchQuery) params.append('q', searchQuery)
      if (statusFilter) params.append('status', statusFilter)

      const response: any = await apiGET(`/api/expenses?${params.toString()}`)
      setExpenses(response.data)
    } catch (error) {
      console.error('Failed to load expenses:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="warning">Pending</Badge>
      case 'APPROVED':
        return <Badge variant="success">Approved</Badge>
      case 'REJECTED':
        return <Badge variant="danger">Rejected</Badge>
      case 'NONE':
        return <Badge variant="info">Posted</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const toggleExpense = (expenseId: string) => {
    setExpandedExpenseId(expandedExpenseId === expenseId ? null : expenseId)
  }

  return (
    <Layout>
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Expense History</h1>

        <MonthSelector
          selectedMonthId={selectedMonthId}
          onMonthChange={setSelectedMonthId}
          workspaceId={workspaceId}
          role={workspaceRole}
        />

        {selectedMonthId && (
          <>
            {/* Filters */}
            <div className="mb-6 flex gap-4 flex-wrap">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or note..."
                className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="POSTED">Posted</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            {/* Expenses List */}
            <div className="space-y-4">
              {loading ? (
                <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                  Loading expenses...
                </div>
              ) : expenses.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                  No expenses found
                </div>
              ) : (
                expenses.map((expense) => (
                  <div key={expense.id} className="bg-white rounded-lg shadow">
                    {/* Expense Header */}
                    <div
                      className="p-4 cursor-pointer hover:bg-gray-50"
                      onClick={() => toggleExpense(expense.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {expense.expense_name}
                            </h3>
                            <span className="text-sm text-gray-500">
                              {new Date(expense.date).toLocaleDateString()}
                            </span>
                            {expense.created_by_email && (
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                by {expense.created_by_name || expense.created_by_email}
                              </span>
                            )}
                          </div>
                          {expense.note && (
                            <p className="text-sm text-gray-600 mt-1">{expense.note}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">
                            {expense.expense_items.length} item(s)
                          </span>
                          <svg
                            className={`w-5 h-5 text-gray-400 transition-transform ${
                              expandedExpenseId === expense.id ? 'transform rotate-180' : ''
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Expense Items */}
                    {expandedExpenseId === expense.id && (
                      <div className="border-t border-gray-200">
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                  Item Name
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                  Budget Item
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                  Amount
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                  Reimb. Amount
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                  Status
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {expense.expense_items.map((item) => (
                                <tr key={item.id}>
                                  <td className="px-4 py-3 text-sm text-gray-900">
                                    {item.item_name}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-900">
                                    {item.budget_items.name}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-900">
                                    RM {item.amount.toFixed(2)}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-900">
                                    {item.need_reimburse
                                      ? `RM ${item.reimbursement_amount?.toFixed(2) || '0.00'}`
                                      : 'N/A'}
                                  </td>
                                  <td className="px-4 py-3 text-sm">
                                    {getStatusBadge(item.reimburse_status)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {!selectedMonthId && (
          <div className="text-gray-500 text-center py-8">
            Please select or create a month to view expense history
          </div>
        )}
      </div>
    </Layout>
  )
}

