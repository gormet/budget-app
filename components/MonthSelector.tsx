'use client'

import { useEffect, useState } from 'react'
import { apiGET, apiPOST } from '@/lib/api'

interface Month {
  id: string
  year: number
  month: number
  title: string | null
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
  const [createYear, setCreateYear] = useState(new Date().getFullYear())
  const [createMonth, setCreateMonth] = useState(new Date().getMonth() + 1)
  const [createTitle, setCreateTitle] = useState('')

  useEffect(() => {
    if (workspaceId) {
      loadMonths()
    }
  }, [workspaceId])

  async function loadMonths() {
    if (!workspaceId) return
    
    try {
      const response: any = await apiGET(`/api/months?workspaceId=${workspaceId}`)
      setMonths(response.data)
      if (response.data.length > 0 && !selectedMonthId) {
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
      await apiPOST(`/api/months/${selectedMonthId}/duplicate`, {
        targetYear: duplicateYear,
        targetMonth: duplicateMonth,
        title: duplicateTitle || undefined,
      })
      setShowDuplicateModal(false)
      setDuplicateTitle('')
      await loadMonths()
    } catch (error) {
      console.error('Failed to duplicate month:', error)
      alert('Failed to duplicate budget')
    }
  }

  async function handleCreate() {
    if (!workspaceId) {
      alert('Please select a workspace first')
      return
    }
    
    try {
      const response: any = await apiPOST('/api/months', {
        workspaceId,
        year: createYear,
        month: createMonth,
        title: createTitle || undefined,
      })
      setShowCreateModal(false)
      setCreateTitle('')
      await loadMonths()
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
          <button
            onClick={() => setShowDuplicateModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Duplicate
          </button>
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
    </div>
  )
}

