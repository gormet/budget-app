export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          display_name: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          display_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          display_name?: string | null
          created_at?: string
        }
      }
      workspaces: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
      }
      workspace_members: {
        Row: {
          workspace_id: string
          profile_id: string
          role: 'OWNER' | 'EDITOR' | 'VIEWER'
          created_at: string
        }
        Insert: {
          workspace_id: string
          profile_id: string
          role?: 'OWNER' | 'EDITOR' | 'VIEWER'
          created_at?: string
        }
        Update: {
          workspace_id?: string
          profile_id?: string
          role?: 'OWNER' | 'EDITOR' | 'VIEWER'
          created_at?: string
        }
      }
      months: {
        Row: {
          id: string
          owner_id: string
          workspace_id: string
          year: number
          month: number
          title: string | null
          income: number
          carry_over: number
          created_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          workspace_id: string
          year: number
          month: number
          title?: string | null
          income: number
          carry_over?: number
          created_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          workspace_id?: string
          year?: number
          month?: number
          title?: string | null
          income?: number
          carry_over?: number
          created_at?: string
        }
      }
      budget_types: {
        Row: {
          id: string
          month_id: string
          name: string
          order: number
          created_at: string
        }
        Insert: {
          id?: string
          month_id: string
          name: string
          order?: number
          created_at?: string
        }
        Update: {
          id?: string
          month_id?: string
          name?: string
          order?: number
          created_at?: string
        }
      }
      budget_items: {
        Row: {
          id: string
          budget_type_id: string
          name: string
          budget_amount: number
          order: number
          is_saving: boolean
          created_at: string
        }
        Insert: {
          id?: string
          budget_type_id: string
          name: string
          budget_amount?: number
          order?: number
          is_saving?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          budget_type_id?: string
          name?: string
          budget_amount?: number
          order?: number
          is_saving?: boolean
          created_at?: string
        }
      }
      expenses: {
        Row: {
          id: string
          month_id: string
          date: string
          expense_name: string
          note: string | null
          created_by: string
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          month_id: string
          date: string
          expense_name: string
          note?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          month_id?: string
          date?: string
          expense_name?: string
          note?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      expense_items: {
        Row: {
          id: string
          expense_id: string
          item_name: string
          budget_item_id: string
          amount: number
          need_reimburse: boolean
          reimbursement_amount: number | null
          reimburse_status: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED'
          created_at: string
        }
        Insert: {
          id?: string
          expense_id: string
          item_name: string
          budget_item_id: string
          amount: number
          need_reimburse?: boolean
          reimbursement_amount?: number | null
          reimburse_status?: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED'
          created_at?: string
        }
        Update: {
          id?: string
          expense_id?: string
          item_name?: string
          budget_item_id?: string
          amount?: number
          need_reimburse?: boolean
          reimbursement_amount?: number | null
          reimburse_status?: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED'
          created_at?: string
        }
      }
      attachments: {
        Row: {
          id: string
          expense_id: string
          file_url: string
          filename: string
          size_bytes: number | null
          created_at: string
        }
        Insert: {
          id?: string
          expense_id: string
          file_url: string
          filename: string
          size_bytes?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          expense_id?: string
          file_url?: string
          filename?: string
          size_bytes?: number | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      duplicate_month_owned: {
        Args: {
          src_month: string
          tgt_year: number
          tgt_month: number
          tgt_title?: string
        }
        Returns: string
      }
      approve_reimbursement: {
        Args: {
          expense_item_id: string
        }
        Returns: void
      }
      reject_reimbursement: {
        Args: {
          expense_item_id: string
        }
        Returns: void
      }
      get_workspace_role: {
        Args: {
          workspace_uuid: string
        }
        Returns: 'OWNER' | 'EDITOR' | 'VIEWER'
      }
      create_workspace_with_owner: {
        Args: {
          workspace_name: string
        }
        Returns: Json
      }
      get_workspace_members: {
        Args: {
          workspace_uuid: string
        }
        Returns: {
          profile_id: string
          email: string
          display_name: string | null
          role: 'OWNER' | 'EDITOR' | 'VIEWER'
          created_at: string
        }[]
      }
    }
    Enums: {
      reimburse_status: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED'
      workspace_role: 'OWNER' | 'EDITOR' | 'VIEWER'
    }
  }
}

// Additional types for application use
export type Month = Database['public']['Tables']['months']['Row']

export interface MonthTotals {
  month_id: string
  workspace_id: string
  year: number
  month: number
  title: string | null
  income: number
  carry_over: number
  total_income: number       // 1. income + carry_over
  total_budget: number       // 2. sum of budget_items.budget_amount
  posted: number             // 3. spend excluding reimbursement items
  approved_reimburse: number // 4. sum of approved reimbursement_amount
  total_spending: number     // 5. posted + approved_reimburse
  remaining: number          // 6. total_budget - total_spending
  unallocated: number        // 7. total_income - total_budget
  total_saving: number       // 8. savings budget - savings spend (net savings)
}

