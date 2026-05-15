export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Supabase v2 database type — must match exact structure supabase-js expects
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id: string
          name: string
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          created_at?: string | null
        }
        Relationships: []
      }
      groups: {
        Row: {
          id: string
          name: string
          description: string | null
          currency: string
          invite_code: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          currency?: string
          invite_code?: string
          created_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          currency?: string
          invite_code?: string
          created_by?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      group_members: {
        Row: {
          id: string
          group_id: string
          user_id: string
          joined_at: string
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          joined_at?: string | null
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          joined_at?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          id: string
          group_id: string
          paid_by: string | null
          title: string
          amount: number
          expense_date: string
          notes: string | null
          is_recurring: boolean
          recurrence_day: number | null
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          paid_by?: string | null
          title: string
          amount: number
          expense_date?: string
          notes?: string | null
          is_recurring?: boolean
          recurrence_day?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          group_id?: string
          paid_by?: string | null
          title?: string
          amount?: number
          expense_date?: string
          notes?: string | null
          is_recurring?: boolean
          recurrence_day?: number | null
          created_at?: string | null
        }
        Relationships: []
      }
      expense_splits: {
        Row: {
          id: string
          expense_id: string
          user_id: string
          amount: number
        }
        Insert: {
          id?: string
          expense_id: string
          user_id: string
          amount: number
        }
        Update: {
          id?: string
          expense_id?: string
          user_id?: string
          amount?: number
        }
        Relationships: []
      }
      settlements: {
        Row: {
          id: string
          group_id: string
          from_user: string | null
          to_user: string | null
          amount: number
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          from_user?: string | null
          to_user?: string | null
          amount: number
          note?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          group_id?: string
          from_user?: string | null
          to_user?: string | null
          amount?: number
          note?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// ── App-level types ──────────────────────────────────────────

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Group = Database['public']['Tables']['groups']['Row']
export type GroupMember = Database['public']['Tables']['group_members']['Row']
export type Expense = Database['public']['Tables']['expenses']['Row']
export type ExpenseSplit = Database['public']['Tables']['expense_splits']['Row']
export type Settlement = Database['public']['Tables']['settlements']['Row']

export interface ExpenseWithSplits extends Expense {
  paid_by_profile: Profile | null
  splits: (ExpenseSplit & { profile: Profile })[]
}

export interface SettlementWithProfiles extends Settlement {
  from_profile: Profile | null
  to_profile: Profile | null
}

export interface MemberBalance {
  userId: string
  name: string
  net: number
}

export interface SettlementSuggestion {
  from: { id: string; name: string }
  to: { id: string; name: string }
  amount: number
}
