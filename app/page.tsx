'use client'

import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import MonthSelector from '@/components/MonthSelector'
import ProgressBar from '@/components/ProgressBar'
import Badge from '@/components/Badge'
import { apiGET } from '@/lib/api'
import { useWorkspace } from '@/lib/workspace-context'

interface BudgetItem {
  id: string
  budget_type_id: string
  name: string
  budget_amount: number
  posted_spend: number
  approved_reimbursed_spend: number
  remaining: number
  overBudget: boolean
}

interface BudgetType {
  id: string
  name: string
  order: number
}

export default function DashboardPage() {
  const { workspaceId, workspaceRole } = useWorkspace()
  const [selectedMonthId, setSelectedMonthId] = useState<string | null>(null)
  const [budgetTypes, setBudgetTypes] = useState<BudgetType[]>([])
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (selectedMonthId) {
      loadBudget()
    }
  }, [selectedMonthId])

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

  const totalBudget = budgetItems.reduce((sum, item) => sum + Number(item.budget_amount), 0)
  const totalPosted = budgetItems.reduce((sum, item) => sum + Number(item.posted_spend), 0)
  const totalApprovedReimbursed = budgetItems.reduce((sum, item) => sum + Number(item.approved_reimbursed_spend), 0)
  const totalRemaining = totalBudget - totalPosted - totalApprovedReimbursed

  return (
    <Layout>
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>

        <MonthSelector
          selectedMonthId={selectedMonthId}
          onMonthChange={setSelectedMonthId}
          workspaceId={workspaceId}
          role={workspaceRole}
        />

        {loading ? (
          <div className="text-gray-500">Loading budget...</div>
        ) : selectedMonthId ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Total Budget</h3>
                <p className="text-2xl font-bold text-gray-900">
                  RM {totalBudget.toFixed(2)}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Posted</h3>
                <p className="text-2xl font-bold text-blue-600">
                  RM {totalPosted.toFixed(2)}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Approved Reimbursed</h3>
                <p className="text-2xl font-bold text-green-600">
                  RM {totalApprovedReimbursed.toFixed(2)}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Remaining</h3>
                <p className={`text-2xl font-bold ${totalRemaining < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                  RM {totalRemaining.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Budget Items Grid */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Budget Items</h2>
              </div>
              <div className="p-6">
                {budgetTypes.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No budget types yet. Go to Budget page to create one.
                  </p>
                ) : (
                  <div className="space-y-6">
                    {budgetTypes.map((type) => {
                      const typeItems = budgetItems.filter(
                        (item) => item.budget_type_id === type.id
                      )
                      
                      if (typeItems.length === 0) return null

                      return (
                        <div key={type.id}>
                          <h3 className="text-md font-semibold text-gray-700 mb-3">
                            {type.name}
                          </h3>
                          <div className="space-y-3">
                            {typeItems.map((item) => (
                              <div
                                key={item.id}
                                className="border border-gray-200 rounded-lg p-4"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900">
                                      {item.name}
                                    </span>
                                    {item.overBudget && (
                                      <Badge variant="danger">Over Budget</Badge>
                                    )}
                                  </div>
                                  <span className="text-sm text-gray-500">
                                    RM {item.remaining.toFixed(2)} of RM {item.budget_amount.toFixed(2)} remaining
                                  </span>
                                </div>
                                <ProgressBar
                                  current={Number(item.posted_spend) + Number(item.approved_reimbursed_spend)}
                                  total={Number(item.budget_amount)}
                                  overBudget={item.overBudget}
                                />
                                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                                  <span>Posted: RM {item.posted_spend.toFixed(2)}</span>
                                  <span>Approved Reimb: RM {item.approved_reimbursed_spend.toFixed(2)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="text-gray-500 text-center py-8">
            Please select or create a month to view the dashboard
          </div>
        )}
      </div>
    </Layout>
  )
}

