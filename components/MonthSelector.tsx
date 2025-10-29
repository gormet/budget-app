'use client'

import { useEffect, useState } from 'react'
import { apiGET, apiPOST, apiPATCH, apiDELETE } from '@/lib/api'

interface Month {
  id: string
  year: number
  month: number
  title: string | null
  income: number
  carry_over: number
}

interface MonthSelectorProps {
  selectedMonthId: string | null
  onMonthChange: (monthId: string) => void
  workspaceId: string | null
  role: string | null
}

export default function MonthSelector({ 
  selectedMonthId, 
  onMonthChange, 
  workspaceId,
  role 
}: MonthSelectorProps) {
  const [months, setMonths] = useState<Month[]>([])
  const [loading, setLoading] = useState(true)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [duplicateYear, setDuplicateYear] = useState(new Date().getFullYear())
  const [duplicateMonth, setDuplicateMonth] = useState(new Date().getMonth() + 1)
  const [duplicateTitle, setDuplicateTitle] = useState('')
  const [duplicateIncome, setDuplicateIncome] = useState(0)
  const [duplicateCarryOver, setDuplicateCarryOver] = useState(0)
  const [createYear, setCreateYear] = useState(new Date().getFullYear())
  const [createMonth, setCreateMonth] = useState(new Date().getMonth() + 1)
  const [createTitle, setCreateTitle] = useState('')
  const [createIncome, setCreateIncome] = useState(0)
  const [createCarryOver, setCreateCarryOver] = useState(0)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editIncome, setEditIncome] = useState(0)
  const [editCarryOver, setEditCarryOver] = useState(0)
  const [hasBudgets, setHasBudgets] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (workspaceId) {
      loadMonths()
    } else {
      // Clear months when no workspace
      setMonths([])
      onMonthChange('')
    }
  }, [workspaceId])

  async function loadMonths() {
    if (!workspaceId) return
    
    try {
      const response: any = await apiGET(`/api/months?workspaceId=${workspaceId}`)
      setMonths(response.data)
      // Auto-select first month if available and no month is currently selected
      if (response.data.length > 0 && (!selectedMonthId || selectedMonthId === '')) {
        onMonthChange(response.data[0].id)
      }
    } catch (error) {
      console.error('Failed to load months:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDuplicate() {
    if (!selectedMonthId) return
    
    try {
      const response: any = await apiPOST(`/api/months/${selectedMonthId}/duplicate`, {
        targetYear: duplicateYear,
        targetMonth: duplicateMonth,
        title: duplicateTitle || undefined,
      })
      setShowDuplicateModal(false)
      setDuplicateTitle('')
      setDuplicateIncome(0)
      setDuplicateCarryOver(0)
      await loadMonths()
      // Select the new duplicated month
      if (response?.data?.id) {
        onMonthChange(response.data.id)
      }
    } catch (error) {
      console.error('Failed to duplicate month:', error)
      alert('Failed to duplicate budget')
    }
  }

  function openDuplicateModal() {
    if (!selectedMonthId) return
    const selectedMonth = months.find(m => m.id === selectedMonthId)
    if (selectedMonth) {
      // Prefill with current month's income and carry_over (editable)
      setDuplicateIncome(selectedMonth.income)
      setDuplicateCarryOver(selectedMonth.carry_over)
    }
    setShowDuplicateModal(true)
  }

  async function openEditModal() {
    if (!selectedMonthId) return
    const selectedMonth = months.find(m => m.id === selectedMonthId)
    if (!selectedMonth) return

    // Check if month has budgets
    await checkHasBudgets()
    
    setEditIncome(selectedMonth.income)
    setEditCarryOver(selectedMonth.carry_over)
    setShowEditModal(true)
  }

  async function checkHasBudgets() {
    if (!selectedMonthId) return
    
    try {
      // Check if budget types exist for this month
      const response: any = await apiGET(`/api/budget/${selectedMonthId}`)
      setHasBudgets(response.data.types.length > 0)
    } catch (error) {
      console.error('Failed to check budgets:', error)
      setHasBudgets(false)
    }
  }

  async function handleEdit() {
    if (!selectedMonthId) return

    if (editIncome < 0) {
      alert('Income must be >= 0')
      return
    }

    if (editCarryOver < 0) {
      alert('Carry over must be >= 0')
      return
    }
    
    try {
      await apiPATCH(`/api/months/${selectedMonthId}`, {
        income: editIncome,
        carryOver: editCarryOver,
      })
      setShowEditModal(false)
      await loadMonths()
      // Trigger parent component to reload data
      onMonthChange(selectedMonthId)
      alert('Month updated successfully')
    } catch (error: any) {
      console.error('Failed to update month:', error)
      alert(error.message || 'Failed to update month')
    }
  }

  async function handleDelete() {
    if (!selectedMonthId) return
    
    try {
      await apiDELETE(`/api/months/${selectedMonthId}`)
      setShowDeleteConfirm(false)
      await loadMonths()
      onMonthChange('') // Clear selection
      alert('Month deleted successfully')
    } catch (error: any) {
      console.error('Failed to delete month:', error)
      alert(error.message || 'Failed to delete month')
    }
  }

  async function handleCreate() {
    if (!workspaceId) {
      alert('Please select a workspace first')
      return
    }

    if (createIncome < 0) {
      alert('Income must be >= 0')
      return
    }

    if (createCarryOver < 0) {
      alert('Carry over must be >= 0')
      return
    }
    
    try {
      const response: any = await apiPOST('/api/months', {
        workspaceId,
        year: createYear,
        month: createMonth,
        title: createTitle || undefined,
        income: createIncome,
        carryOver: createCarryOver,
      })
      setShowCreateModal(false)
      setCreateTitle('')
      setCreateIncome(0)
      setCreateCarryOver(0)
      await loadMonths()
      // Select the new month and trigger data load
      onMonthChange(response.data.id)
    } catch (error) {
      console.error('Failed to create month:', error)
      alert('Failed to create month')
    }
  }

  const canEdit = role === 'OWNER' || role === 'EDITOR'

  const monthName = (m: number) => {
    return new Date(2000, m - 1, 1).toLocaleString('default', { month: 'long' })
  }

  if (!workspaceId) {
    return <div className="text-gray-500 mb-6">Please select a workspace first</div>
  }

  if (loading) {
    return <div className="text-gray-500">Loading months...</div>
  }

  return (
    <div className="mb-6">
      <div className="flex items-center gap-4 flex-wrap">
        <select
          value={selectedMonthId || ''}
          onChange={(e) => onMonthChange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {months.length === 0 && <option value="">No months yet</option>}
          {months.map((m) => (
            <option key={m.id} value={m.id}>
              {monthName(m.month)} {m.year} {m.title ? `- ${m.title}` : ''}
            </option>
          ))}
        </select>

        {canEdit && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            + New Month
          </button>
        )}

        {canEdit && selectedMonthId && (
          <>
            <button
              onClick={openEditModal}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              Edit Month
            </button>

            <button
              onClick={openDuplicateModal}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Duplicate
            </button>

            <button
              onClick={async () => {
                await checkHasBudgets()
                if (!hasBudgets) {
                  setShowDeleteConfirm(true)
                } else {
                  alert('Cannot delete month with budget items')
                }
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Delete
            </button>
          </>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Create New Month</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Year</label>
                <input
                  type="number"
                  value={createYear}
                  onChange={(e) => setCreateYear(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Month</label>
                <select
                  value={createMonth}
                  onChange={(e) => setCreateMonth(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                    <option key={m} value={m}>
                      {monthName(m)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Title (optional)
                </label>
                <input
                  type="text"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., Personal Budget"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Income (required) *
                </label>
                <input
                  type="number"
                  value={createIncome}
                  onChange={(e) => setCreateIncome(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Carry Over (optional)
                </label>
                <input
                  type="number"
                  value={createCarryOver}
                  onChange={(e) => setCreateCarryOver(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleCreate}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Create
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Modal */}
      {showDuplicateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Duplicate Budget</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Target Year</label>
                <input
                  type="number"
                  value={duplicateYear}
                  onChange={(e) => setDuplicateYear(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Target Month</label>
                <select
                  value={duplicateMonth}
                  onChange={(e) => setDuplicateMonth(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                    <option key={m} value={m}>
                      {monthName(m)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Title (optional)
                </label>
                <input
                  type="text"
                  value={duplicateTitle}
                  onChange={(e) => setDuplicateTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., Duplicated Budget"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Income (editable)
                </label>
                <input
                  type="number"
                  value={duplicateIncome}
                  onChange={(e) => setDuplicateIncome(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Carry Over (editable)
                </label>
                <input
                  type="number"
                  value={duplicateCarryOver}
                  onChange={(e) => setDuplicateCarryOver(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleDuplicate}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Duplicate
              </button>
              <button
                onClick={() => setShowDuplicateModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Edit Month Income</h3>
            {hasBudgets && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  ⚠️ This month has budget items. Income and Carry Over cannot be edited.
                </p>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Income
                </label>
                <input
                  type="number"
                  value={editIncome}
                  onChange={(e) => setEditIncome(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  disabled={hasBudgets}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Carry Over
                </label>
                <input
                  type="number"
                  value={editCarryOver}
                  onChange={(e) => setEditCarryOver(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  disabled={hasBudgets}
                />
              </div>
              {!hasBudgets && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditIncome(0)
                      setEditCarryOver(0)
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Reset to 0
                  </button>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleEdit}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={hasBudgets}
              >
                Save
              </button>
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4 text-red-600">Delete Month?</h3>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete this month? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

