'use client'

import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import MonthSelector from '@/components/MonthSelector'
import { apiGET, apiPOST } from '@/lib/api'
import { useWorkspace } from '@/lib/workspace-context'

interface BudgetType {
  id: string
  name: string
  order: number
  month_id: string
}

interface BudgetItem {
  id: string
  budget_type_id: string
  name: string
  budget_amount: number
  order: number
  is_saving: boolean
}

interface TogglePreview {
  budgetItemId: string
  budgetItemName: string
  budgetItemAmount: number
  currentIsSaving: boolean
  hasExpenses: boolean
  expenseCount: number
  totalSpentOnThisItem: number
  totalSavingBefore: number
  totalSavingAfter: number
  spentOnSavingBudgets: number
  savedRemainingBefore: number
  savedRemainingAfter: number
}

export default function BudgetPage() {
  const { workspaceId, workspaceRole } = useWorkspace()
  const [selectedMonthId, setSelectedMonthId] = useState<string | null>(null)
  const [budgetTypes, setBudgetTypes] = useState<BudgetType[]>([])
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([])
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  
  const canEdit = workspaceRole === 'OWNER' || workspaceRole === 'EDITOR'

  // New type state
  const [newTypeName, setNewTypeName] = useState('')
  
  // Edit type state
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null)
  const [editTypeName, setEditTypeName] = useState('')

  // New item state
  const [newItemName, setNewItemName] = useState('')
  const [newItemAmount, setNewItemAmount] = useState('')

  // Edit item state
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editItemName, setEditItemName] = useState('')
  const [editItemAmount, setEditItemAmount] = useState('')
  const [editItemIsSaving, setEditItemIsSaving] = useState(false)

  // New item saving state
  const [newItemIsSaving, setNewItemIsSaving] = useState(false)

  // Filter state
  const [filterSavingsOnly, setFilterSavingsOnly] = useState(false)

  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmPreview, setConfirmPreview] = useState<TogglePreview | null>(null)
  const [pendingToggleItemId, setPendingToggleItemId] = useState<string | null>(null)
  const [pendingToggleValue, setPendingToggleValue] = useState(false)

  useEffect(() => {
    if (selectedMonthId) {
      loadBudget()
    } else {
      // Clear data when no month selected
      setBudgetTypes([])
      setBudgetItems([])
      setSelectedTypeId(null)
    }
  }, [selectedMonthId])

  // Reload data when workspace changes
  useEffect(() => {
    if (workspaceId) {
      // Clear selection when workspace changes (empty string triggers auto-select in MonthSelector)
      setSelectedMonthId('')
      setBudgetTypes([])
      setBudgetItems([])
      setSelectedTypeId(null)
    }
  }, [workspaceId])

  useEffect(() => {
    if (budgetTypes.length > 0 && !selectedTypeId) {
      setSelectedTypeId(budgetTypes[0].id)
    }
  }, [budgetTypes])

  async function loadBudget() {
    if (!selectedMonthId) return
    
    setLoading(true)
    try {
      const response: any = await apiGET(`/api/budget/${selectedMonthId}`)
      setBudgetTypes(response.data.types)
      setBudgetItems(response.data.items)
    } catch (error) {
      console.error('Failed to load budget:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateType() {
    if (!newTypeName.trim() || !selectedMonthId) return

    try {
      await apiPOST('/api/budget-types', {
        monthId: selectedMonthId,
        name: newTypeName,
        order: budgetTypes.length,
      })
      setNewTypeName('')
      await loadBudget()
    } catch (error) {
      console.error('Failed to create type:', error)
    }
  }

  async function handleUpdateType(typeId: string) {
    if (!editTypeName.trim()) return

    try {
      await apiPOST(`/api/budget-types/${typeId}/update`, {
        name: editTypeName,
      })
      setEditingTypeId(null)
      setEditTypeName('')
      await loadBudget()
    } catch (error) {
      console.error('Failed to update type:', error)
    }
  }

  async function handleDeleteType(typeId: string) {
    if (!confirm('Delete this budget type and all its items?')) return

    try {
      await apiPOST(`/api/budget-types/${typeId}/delete`)
      await loadBudget()
      if (selectedTypeId === typeId) {
        setSelectedTypeId(null)
      }
    } catch (error) {
      console.error('Failed to delete type:', error)
    }
  }

  async function handleCreateItem() {
    if (!newItemName.trim() || !selectedTypeId) return

    const amount = parseFloat(newItemAmount)
    if (isNaN(amount) || amount < 0) {
      alert('Please enter a valid budget amount')
      return
    }

    try {
      await apiPOST('/api/budget-items', {
        budgetTypeId: selectedTypeId,
        name: newItemName,
        budgetAmount: amount,
        order: budgetItems.filter(i => i.budget_type_id === selectedTypeId).length,
        isSaving: newItemIsSaving,
      })
      setNewItemName('')
      setNewItemAmount('')
      setNewItemIsSaving(false)
      await loadBudget()
    } catch (error) {
      console.error('Failed to create item:', error)
    }
  }

  async function handleUpdateItem(itemId: string) {
    if (!editItemName.trim()) return

    const amount = parseFloat(editItemAmount)
    if (isNaN(amount) || amount < 0) {
      alert('Please enter a valid budget amount')
      return
    }

    try {
      await apiPOST(`/api/budget-items/${itemId}/update`, {
        name: editItemName,
        budgetAmount: amount,
        isSaving: editItemIsSaving,
      })
      setEditingItemId(null)
      setEditItemName('')
      setEditItemAmount('')
      setEditItemIsSaving(false)
      await loadBudget()
    } catch (error) {
      console.error('Failed to update item:', error)
    }
  }

  async function handleToggleSaving(itemId: string, currentValue: boolean) {
    const item = budgetItems.find(i => i.id === itemId)
    if (!item) return

    // If toggling off, check if there are expenses and show confirmation
    if (currentValue) {
      try {
        const response: any = await apiGET(`/api/budget-items/${itemId}/preview-toggle`)
        if (response.ok && response.data.hasExpenses) {
          // Show confirmation modal
          setConfirmPreview(response.data)
          setPendingToggleItemId(itemId)
          setPendingToggleValue(!currentValue)
          setShowConfirmModal(true)
          return
        }
      } catch (error) {
        console.error('Failed to get preview:', error)
      }
    }

    // No expenses or toggling on - proceed directly
    await toggleSavingDirect(itemId, !currentValue)
  }

  async function toggleSavingDirect(itemId: string, newValue: boolean) {
    try {
      await apiPOST(`/api/budget-items/${itemId}/update`, {
        isSaving: newValue,
      })
      await loadBudget()
    } catch (error) {
      console.error('Failed to toggle saving:', error)
      alert('Failed to update saving status')
    }
  }

  function handleConfirmToggle() {
    if (pendingToggleItemId) {
      toggleSavingDirect(pendingToggleItemId, pendingToggleValue)
    }
    setShowConfirmModal(false)
    setConfirmPreview(null)
    setPendingToggleItemId(null)
  }

  function handleCancelToggle() {
    setShowConfirmModal(false)
    setConfirmPreview(null)
    setPendingToggleItemId(null)
  }

  async function handleDeleteItem(itemId: string) {
    if (!confirm('Delete this budget item?')) return

    try {
      await apiPOST(`/api/budget-items/${itemId}/delete`)
      await loadBudget()
    } catch (error) {
      console.error('Failed to delete item:', error)
    }
  }

  const selectedTypeItems = budgetItems.filter(
    (item) => {
      if (item.budget_type_id !== selectedTypeId) return false
      if (filterSavingsOnly && !item.is_saving) return false
      return true
    }
  )

  // Calculate total budget amount for each type
  const getTypeTotalBudget = (typeId: string) => {
    return budgetItems
      .filter(item => item.budget_type_id === typeId)
      .reduce((sum, item) => sum + item.budget_amount, 0)
  }

  return (
    <Layout>
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Budget Editor</h1>

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

        {loading ? (
          <div className="text-gray-500">Loading budget...</div>
        ) : selectedMonthId ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Budget Types */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Budget Types</h2>
              </div>
              <div className="p-4">
                <div className="space-y-2 mb-4">
                  {budgetTypes.map((type) => (
                    <div
                      key={type.id}
                      className={`p-3 rounded-md cursor-pointer ${
                        selectedTypeId === type.id
                          ? 'bg-blue-100 border border-blue-300'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                      onClick={() => setSelectedTypeId(type.id)}
                    >
                      {editingTypeId === type.id ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={editTypeName}
                            onChange={(e) => setEditTypeName(e.target.value)}
                            className="flex-1 px-2 py-1 border rounded"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleUpdateType(type.id)
                            }}
                            className="text-green-600 hover:text-green-700"
                          >
                            ✓
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingTypeId(null)
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{type.name}</span>
                            {canEdit && (
                              <div className="flex gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setEditingTypeId(type.id)
                                    setEditTypeName(type.name)
                                  }}
                                  className="text-blue-600 hover:text-blue-700 text-sm"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteType(type.id)
                                  }}
                                  className="text-red-600 hover:text-red-700 text-sm"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="mt-1 text-sm text-gray-600">
                            Total: <span className="font-semibold text-gray-900">RM {getTypeTotalBudget(type.id).toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {budgetTypes.length > 0 && (
                  <div className="mb-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-md">
                      <span className="font-semibold text-gray-900">Grand Total:</span>
                      <span className="text-lg font-bold text-blue-700">
                        RM {budgetTypes.reduce((sum, type) => sum + getTypeTotalBudget(type.id), 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                {canEdit && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTypeName}
                      onChange={(e) => setNewTypeName(e.target.value)}
                      placeholder="New type name"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                      disabled={!canEdit}
                    />
                    <button
                      onClick={handleCreateType}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      disabled={!canEdit}
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Budget Items */}
            <div className="md:col-span-2 bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Budget Items</h2>
                {selectedTypeId && (
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterSavingsOnly}
                      onChange={(e) => setFilterSavingsOnly(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span>Show only Savings</span>
                  </label>
                )}
              </div>
              <div className="p-4">
                {selectedTypeId ? (
                  <>
                    <div className="overflow-x-auto mb-4">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Name
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Budget Amount
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Saving
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {selectedTypeItems.map((item) => (
                            <tr key={item.id}>
                              {editingItemId === item.id ? (
                                <>
                                  <td className="px-4 py-3">
                                    <input
                                      type="text"
                                      value={editItemName}
                                      onChange={(e) => setEditItemName(e.target.value)}
                                      className="w-full px-2 py-1 border rounded"
                                    />
                                  </td>
                                  <td className="px-4 py-3">
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={editItemAmount}
                                      onChange={(e) => setEditItemAmount(e.target.value)}
                                      className="w-full px-2 py-1 border rounded"
                                    />
                                  </td>
                                  <td className="px-4 py-3">
                                    <label className="flex items-center gap-2 cursor-pointer" title="Reserve this allocation as saving">
                                      <input
                                        type="checkbox"
                                        checked={editItemIsSaving}
                                        onChange={(e) => setEditItemIsSaving(e.target.checked)}
                                        className="rounded border-gray-300"
                                      />
                                      <span className="text-sm">Mark as Saving</span>
                                    </label>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <button
                                      onClick={() => handleUpdateItem(item.id)}
                                      className="text-green-600 hover:text-green-700 mr-2"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingItemId(null)
                                        setEditItemName('')
                                        setEditItemAmount('')
                                        setEditItemIsSaving(false)
                                      }}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      Cancel
                                    </button>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="px-4 py-3 text-sm">
                                    <div className="flex items-center gap-2">
                                      {item.name}
                                      {item.is_saving && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                                          Saving
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-sm">
                                    RM {item.budget_amount.toFixed(2)}
                                  </td>
                                  <td className="px-4 py-3">
                                    <label className="flex items-center cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={item.is_saving}
                                        onChange={() => handleToggleSaving(item.id, item.is_saving)}
                                        disabled={!canEdit}
                                        className="rounded border-gray-300"
                                      />
                                    </label>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <button
                                      onClick={() => {
                                        setEditingItemId(item.id)
                                        setEditItemName(item.name)
                                        setEditItemAmount(item.budget_amount.toString())
                                        setEditItemIsSaving(item.is_saving)
                                      }}
                                      className="text-blue-600 hover:text-blue-700 mr-2"
                                      disabled={!canEdit}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleDeleteItem(item.id)}
                                      className="text-red-600 hover:text-red-700"
                                      disabled={!canEdit}
                                    >
                                      Delete
                                    </button>
                                  </td>
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                          <tr>
                            <td className="px-4 py-3 font-semibold text-gray-900">
                              Total for this type
                            </td>
                            <td className="px-4 py-3 font-semibold text-gray-900">
                              RM {selectedTypeItems.reduce((sum, item) => sum + item.budget_amount, 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-3"></td>
                            <td className="px-4 py-3"></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value)}
                          placeholder="Item name"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                          disabled={!canEdit}
                        />
                        <input
                          type="number"
                          step="0.01"
                          value={newItemAmount}
                          onChange={(e) => setNewItemAmount(e.target.value)}
                          placeholder="Amount"
                          className="w-32 px-3 py-2 border border-gray-300 rounded-md"
                          disabled={!canEdit}
                        />
                      </div>
                      <div className="flex gap-2 items-center">
                        <label className="flex items-center gap-2 flex-1 cursor-pointer" title="Reserve this allocation as saving">
                          <input
                            type="checkbox"
                            checked={newItemIsSaving}
                            onChange={(e) => setNewItemIsSaving(e.target.checked)}
                            className="rounded border-gray-300"
                            disabled={!canEdit}
                          />
                          <span className="text-sm text-gray-700">Mark as Saving</span>
                        </label>
                        <button
                          onClick={handleCreateItem}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                          disabled={!canEdit}
                        >
                          Add Item
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    Select a budget type to view and edit items
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-gray-500 text-center py-8">
            Please select or create a month to edit the budget
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && confirmPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Convert from Saving?
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              This budget item <strong>{confirmPreview.budgetItemName}</strong> has {confirmPreview.expenseCount} expense(s) 
              totaling <strong>RM {confirmPreview.totalSpentOnThisItem.toFixed(2)}</strong>.
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Converting this item from "Saving" to normal budget will reclassify these expenses as regular spending 
              instead of withdrawals from savings.
            </p>
            <div className="bg-gray-50 rounded p-3 mb-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Saving (before):</span>
                <span className="font-medium">RM {confirmPreview.totalSavingBefore.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Saving (after):</span>
                <span className="font-medium">RM {confirmPreview.totalSavingAfter.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-gray-600">Change:</span>
                <span className="font-medium text-red-600">
                  - RM {(confirmPreview.totalSavingBefore - confirmPreview.totalSavingAfter).toFixed(2)}
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCancelToggle}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmToggle}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Confirm & Convert
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

