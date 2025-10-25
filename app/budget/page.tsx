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

  useEffect(() => {
    if (selectedMonthId) {
      loadBudget()
    }
  }, [selectedMonthId])

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
      })
      setNewItemName('')
      setNewItemAmount('')
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
      })
      setEditingItemId(null)
      setEditItemName('')
      setEditItemAmount('')
      await loadBudget()
    } catch (error) {
      console.error('Failed to update item:', error)
    }
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
    (item) => item.budget_type_id === selectedTypeId
  )

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
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{type.name}</span>
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
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    placeholder="New type name"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <button
                    onClick={handleCreateType}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Budget Items */}
            <div className="md:col-span-2 bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Budget Items</h2>
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
                                  <td className="px-4 py-3 text-right">
                                    <button
                                      onClick={() => handleUpdateItem(item.id)}
                                      className="text-green-600 hover:text-green-700 mr-2"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => setEditingItemId(null)}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      Cancel
                                    </button>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="px-4 py-3 text-sm">{item.name}</td>
                                  <td className="px-4 py-3 text-sm">
                                    RM {item.budget_amount.toFixed(2)}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <button
                                      onClick={() => {
                                        setEditingItemId(item.id)
                                        setEditItemName(item.name)
                                        setEditItemAmount(item.budget_amount.toString())
                                      }}
                                      className="text-blue-600 hover:text-blue-700 mr-2"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleDeleteItem(item.id)}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      Delete
                                    </button>
                                  </td>
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder="Item name"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={newItemAmount}
                        onChange={(e) => setNewItemAmount(e.target.value)}
                        placeholder="Amount"
                        className="w-32 px-3 py-2 border border-gray-300 rounded-md"
                      />
                      <button
                        onClick={handleCreateItem}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Add Item
                      </button>
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
    </Layout>
  )
}

