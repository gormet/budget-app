'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import MonthSelector from '@/components/MonthSelector'
import { apiGET, apiPOST } from '@/lib/api'
import { useWorkspace } from '@/lib/workspace-context'

interface BudgetItem {
  id: string
  budget_type_id: string
  name: string
  budget_amount: number
  remaining: number
}

interface LineItem {
  itemName: string
  budgetItemId: string
  amount: string
  needReimburse: boolean
  reimbursementAmount: string
}

export default function NewExpensePage() {
  const router = useRouter()
  const { workspaceId, workspaceRole } = useWorkspace()
  const [selectedMonthId, setSelectedMonthId] = useState<string | null>(null)
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([])
  const [loading, setLoading] = useState(false)
  
  const canEdit = workspaceRole === 'OWNER' || workspaceRole === 'EDITOR'

  // Form state
  const [expenseName, setExpenseName] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { itemName: '', budgetItemId: '', amount: '', needReimburse: false, reimbursementAmount: '' },
  ])

  useEffect(() => {
    if (selectedMonthId) {
      loadBudgetItems()
    } else {
      // Clear data when no month selected
      setBudgetItems([])
    }
  }, [selectedMonthId])

  // Clear selection when workspace changes
  useEffect(() => {
    if (workspaceId) {
      setSelectedMonthId('')
      setBudgetItems([])
      // Reset form
      setExpenseName('')
      setDate(new Date().toISOString().split('T')[0])
      setNote('')
      setLineItems([
        { itemName: '', budgetItemId: '', amount: '', needReimburse: false, reimbursementAmount: '' },
      ])
    }
  }, [workspaceId])

  async function loadBudgetItems() {
    if (!selectedMonthId) return

    setLoading(true)
    try {
      const response: any = await apiGET(`/api/budget/${selectedMonthId}`)
      setBudgetItems(response.data.items)
    } catch (error) {
      console.error('Failed to load budget items:', error)
    } finally {
      setLoading(false)
    }
  }

  function addLineItem() {
    setLineItems([
      ...lineItems,
      { itemName: '', budgetItemId: '', amount: '', needReimburse: false, reimbursementAmount: '' },
    ])
  }

  function removeLineItem(index: number) {
    setLineItems(lineItems.filter((_, i) => i !== index))
  }

  function updateLineItem(index: number, field: keyof LineItem, value: any) {
    const updated = [...lineItems]
    updated[index] = { ...updated[index], [field]: value }

    // If needReimburse changes to true, default reimbursementAmount to amount
    if (field === 'needReimburse' && value === true) {
      updated[index].reimbursementAmount = updated[index].amount
    }
    // If needReimburse changes to false, clear reimbursementAmount
    if (field === 'needReimburse' && value === false) {
      updated[index].reimbursementAmount = ''
    }

    setLineItems(updated)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!selectedMonthId) {
      alert('Please select a month')
      return
    }

    if (!expenseName.trim()) {
      alert('Please enter expense name')
      return
    }

    if (lineItems.length === 0 || lineItems.some(li => !li.itemName.trim() || !li.budgetItemId || !li.amount)) {
      alert('Please complete all line items')
      return
    }

    // Validate reimbursement amounts
    for (const item of lineItems) {
      const amount = parseFloat(item.amount)
      if (item.needReimburse) {
        const reimbAmount = parseFloat(item.reimbursementAmount)
        if (isNaN(reimbAmount) || reimbAmount < 0 || reimbAmount > amount) {
          alert('Reimbursement amount must be between 0 and the item amount')
          return
        }
      }
    }

    setLoading(true)
    try {
      await apiPOST('/api/expenses', {
        monthId: selectedMonthId,
        date,
        expenseName,
        note: note || undefined,
        items: lineItems.map(li => ({
          itemName: li.itemName,
          budgetItemId: li.budgetItemId,
          amount: parseFloat(li.amount),
          needReimburse: li.needReimburse,
          reimbursementAmount: li.needReimburse ? parseFloat(li.reimbursementAmount) : undefined,
        })),
      })

      alert('Expense created successfully!')
      router.push('/history')
    } catch (error: any) {
      console.error('Failed to create expense:', error)
      alert('Failed to create expense: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">New Expense</h1>

        <MonthSelector
          selectedMonthId={selectedMonthId}
          onMonthChange={setSelectedMonthId}
          workspaceId={workspaceId}
          role={workspaceRole}
        />

        {!canEdit && workspaceRole && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
            You have view-only access to this workspace. Contact the owner to request edit permissions.
          </div>
        )}

        {selectedMonthId ? (
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
            {/* Header */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expense Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={expenseName}
                  onChange={(e) => setExpenseName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Office Supplies"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note (optional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add any additional notes..."
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Line Items</h3>

              <div className="space-y-4">
                {lineItems.map((item, index) => {
                  const selectedBudgetItem = budgetItems.find(bi => bi.id === item.budgetItemId)
                  
                  return (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Item Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={item.itemName}
                            onChange={(e) => updateLineItem(index, 'itemName', e.target.value)}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="e.g., Printer paper"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Budget Item <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={item.budgetItemId}
                            onChange={(e) => updateLineItem(index, 'budgetItemId', e.target.value)}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          >
                            <option value="">Select budget item</option>
                            {budgetItems.map((bi) => (
                              <option key={bi.id} value={bi.id}>
                                {bi.name} (Remaining: RM {bi.remaining.toFixed(2)})
                              </option>
                            ))}
                          </select>
                          {selectedBudgetItem && (
                            <p className="text-xs text-gray-500 mt-1">
                              Remaining: RM {selectedBudgetItem.remaining.toFixed(2)}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Amount <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.amount}
                            onChange={(e) => updateLineItem(index, 'amount', e.target.value)}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="0.00"
                          />
                        </div>

                        <div className="flex items-end">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={item.needReimburse}
                              onChange={(e) => updateLineItem(index, 'needReimburse', e.target.checked)}
                              className="mr-2 h-4 w-4 text-blue-600"
                            />
                            <span className="text-sm font-medium text-gray-700">
                              Need Reimbursement
                            </span>
                          </label>
                        </div>

                        {item.needReimburse && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Reimbursement Amount <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={item.reimbursementAmount}
                              onChange={(e) => updateLineItem(index, 'reimbursementAmount', e.target.value)}
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              placeholder="0.00"
                            />
                          </div>
                        )}
                      </div>

                      {lineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLineItem(index)}
                          className="mt-2 text-red-600 hover:text-red-700 text-sm"
                        >
                          Remove Item
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>

              <button
                type="button"
                onClick={addLineItem}
                className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                + Add Line Item
              </button>
            </div>

            {/* Submit */}
            <div className="border-t border-gray-200 pt-6 mt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Creating...' : 'Create Expense'}
              </button>
            </div>
          </form>
        ) : (
          <div className="text-gray-500 text-center py-8">
            Please select or create a month to add an expense
          </div>
        )}
      </div>
    </Layout>
  )
}

