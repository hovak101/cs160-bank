export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          account_id: string
          account_name: string
          account_number: string
          account_type: Database["public"]["Enums"]["account_type"]
          balance: number
          created_at: string
          currency: string
          customer_id: string
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
        }
        Insert: {
          account_id?: string
          account_name: string
          account_number: string
          account_type: Database["public"]["Enums"]["account_type"]
          balance?: number
          created_at?: string
          currency: string
          customer_id: string
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Update: {
          account_id?: string
          account_name?: string
          account_number?: string
          account_type?: Database["public"]["Enums"]["account_type"]
          balance?: number
          created_at?: string
          currency?: string
          customer_id?: string
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      atm_simulations: {
        Row: {
          account_id: string
          action: string
          amount: number
          atm_id: string
          atm_location: string
          atm_name: string
          atm_simulation_id: string
          completed_at: string | null
          created_at: string
          customer_id: string
          status: string
          transaction_id: string
          updated_at: string
          verification_code: string | null
        }
        Insert: {
          account_id: string
          action: string
          amount: number
          atm_id: string
          atm_location: string
          atm_name: string
          atm_simulation_id?: string
          completed_at?: string | null
          created_at?: string
          customer_id: string
          status?: string
          transaction_id: string
          updated_at?: string
          verification_code?: string | null
        }
        Update: {
          account_id?: string
          action?: string
          amount?: number
          atm_id?: string
          atm_location?: string
          atm_name?: string
          atm_simulation_id?: string
          completed_at?: string | null
          created_at?: string
          customer_id?: string
          status?: string
          transaction_id?: string
          updated_at?: string
          verification_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atm_simulations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "atm_simulations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "atm_simulations_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: true
            referencedRelation: "transactions"
            referencedColumns: ["transaction_id"]
          },
        ]
      }
      bank_income: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          income_category: string
          income_id: string
          recognized_at: string
          reference_number: string | null
          source_account_id: string | null
          source_transaction_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          income_category: string
          income_id?: string
          recognized_at?: string
          reference_number?: string | null
          source_account_id?: string | null
          source_transaction_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          income_category?: string
          income_id?: string
          recognized_at?: string
          reference_number?: string | null
          source_account_id?: string | null
          source_transaction_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_income_source_account_id_fkey"
            columns: ["source_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "bank_income_source_transaction_id_fkey"
            columns: ["source_transaction_id"]
            isOneToOne: true
            referencedRelation: "transactions"
            referencedColumns: ["transaction_id"]
          },
        ]
      }
      bill_schedules: {
        Row: {
          account_id: string | null
          amount: number | null
          created_at: string | null
          currency: string | null
          end_date: string | null
          frequency: string | null
          next_payment_date: string | null
          nickname: string | null
          payee_id: string | null
          schedule_id: string
          start_date: string | null
          status: string | null
        }
        Insert: {
          account_id?: string | null
          amount?: number | null
          created_at?: string | null
          currency?: string | null
          end_date?: string | null
          frequency?: string | null
          next_payment_date?: string | null
          nickname?: string | null
          payee_id?: string | null
          schedule_id?: string
          start_date?: string | null
          status?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: number | null
          created_at?: string | null
          currency?: string | null
          end_date?: string | null
          frequency?: string | null
          next_payment_date?: string | null
          nickname?: string | null
          payee_id?: string | null
          schedule_id?: string
          start_date?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bill_schedules_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["account_id"]
          },
        ]
      }
      cashboxes: {
        Row: {
          balance: number
          cashbox_id: string
          created_at: string
          customer_id: string
          updated_at: string
        }
        Insert: {
          balance?: number
          cashbox_id?: string
          created_at?: string
          customer_id: string
          updated_at?: string
        }
        Update: {
          balance?: number
          cashbox_id?: string
          created_at?: string
          customer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cashboxes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      cheque_deposits: {
        Row: {
          cheque_deposit_id: string
          created_at: string
          image_url: string
          transaction_id: string
        }
        Insert: {
          cheque_deposit_id?: string
          created_at?: string
          image_url: string
          transaction_id: string
        }
        Update: {
          cheque_deposit_id?: string
          created_at?: string
          image_url?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cheque_deposits_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["transaction_id"]
          },
        ]
      }
      credit_accounts: {
        Row: {
          account_id: string
          apr: number
          available_credit: number | null
          cash_advance_apr: number
          cash_advance_balance: number
          cash_advance_limit: number
          created_at: string
          credit_limit: number
          current_balance: number
          last_payment_at: string | null
          last_statement_at: string | null
          late_fee_amount: number
          minimum_payment_due: number
          next_statement_at: string | null
          payment_due_at: string | null
          purchase_apr: number
          rewards_points: number
          statement_balance: number
          updated_at: string
        }
        Insert: {
          account_id: string
          apr?: number
          available_credit?: number | null
          cash_advance_apr?: number
          cash_advance_balance?: number
          cash_advance_limit?: number
          created_at?: string
          credit_limit: number
          current_balance?: number
          last_payment_at?: string | null
          last_statement_at?: string | null
          late_fee_amount?: number
          minimum_payment_due?: number
          next_statement_at?: string | null
          payment_due_at?: string | null
          purchase_apr?: number
          rewards_points?: number
          statement_balance?: number
          updated_at?: string
        }
        Update: {
          account_id?: string
          apr?: number
          available_credit?: number | null
          cash_advance_apr?: number
          cash_advance_balance?: number
          cash_advance_limit?: number
          created_at?: string
          credit_limit?: number
          current_balance?: number
          last_payment_at?: string | null
          last_statement_at?: string | null
          late_fee_amount?: number
          minimum_payment_due?: number
          next_statement_at?: string | null
          payment_due_at?: string | null
          purchase_apr?: number
          rewards_points?: number
          statement_balance?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_accounts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["account_id"]
          },
        ]
      }
      credit_cards: {
        Row: {
          account_id: string
          card_brand: string
          card_id: string
          card_last4: string
          card_status: string
          cardholder_name: string
          created_at: string
          exp_month: number
          exp_year: number
          rewards_program: string
          rewards_rate: number
          security_code_hash: string
          security_code_last_updated_at: string
          security_code_mode: string
          updated_at: string
        }
        Insert: {
          account_id: string
          card_brand?: string
          card_id?: string
          card_last4: string
          card_status?: string
          cardholder_name: string
          created_at?: string
          exp_month: number
          exp_year: number
          rewards_program?: string
          rewards_rate?: number
          security_code_hash: string
          security_code_last_updated_at?: string
          security_code_mode?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          card_brand?: string
          card_id?: string
          card_last4?: string
          card_status?: string
          cardholder_name?: string
          created_at?: string
          exp_month?: number
          exp_year?: number
          rewards_program?: string
          rewards_rate?: number
          security_code_hash?: string
          security_code_last_updated_at?: string
          security_code_mode?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_cards_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "credit_accounts"
            referencedColumns: ["account_id"]
          },
        ]
      }
      customers: {
        Row: {
          address_line_1: string | null
          address_line_2: string | null
          city: string | null
          country: string | null
          created_at: string | null
          customer_id: string
          first_name: string | null
          kyc_status: Database["public"]["Enums"]["kyc_status"] | null
          last_name: string | null
          phone_number: string | null
          state: string | null
          tax_id: string | null
          user_id: string
          zip_code: string | null
        }
        Insert: {
          address_line_1?: string | null
          address_line_2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          customer_id?: string
          first_name?: string | null
          kyc_status?: Database["public"]["Enums"]["kyc_status"] | null
          last_name?: string | null
          phone_number?: string | null
          state?: string | null
          tax_id?: string | null
          user_id: string
          zip_code?: string | null
        }
        Update: {
          address_line_1?: string | null
          address_line_2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          customer_id?: string
          first_name?: string | null
          kyc_status?: Database["public"]["Enums"]["kyc_status"] | null
          last_name?: string | null
          phone_number?: string | null
          state?: string | null
          tax_id?: string | null
          user_id?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      loans: {
        Row: {
          accrued_interest: number
          admin_decision_notes: string | null
          annual_interest_rate: number
          checking_account_id: string
          created_at: string
          customer_id: string
          debt_to_income_ratio: number
          disbursed_at: string | null
          employment_status: string
          estimated_monthly_payment: number
          existing_credit_debt: number
          last_interest_accrued_at: string | null
          last_payment_at: string | null
          loan_id: string
          monthly_housing_payment: number
          monthly_income: number
          other_financial_notes: string | null
          outstanding_principal: number
          paid_off_at: string | null
          principal_amount: number
          purpose: string | null
          recommended_decision: string
          reviewed_at: string | null
          reviewed_by_user_id: string | null
          risk_score: number
          risk_summary: string | null
          risk_tier: string
          status: string
          term_months: number
          total_interest_charged: number
          total_paid: number
          updated_at: string
        }
        Insert: {
          accrued_interest?: number
          admin_decision_notes?: string | null
          annual_interest_rate: number
          checking_account_id: string
          created_at?: string
          customer_id: string
          debt_to_income_ratio?: number
          disbursed_at?: string | null
          employment_status: string
          estimated_monthly_payment?: number
          existing_credit_debt?: number
          last_interest_accrued_at?: string | null
          last_payment_at?: string | null
          loan_id?: string
          monthly_housing_payment?: number
          monthly_income: number
          other_financial_notes?: string | null
          outstanding_principal?: number
          paid_off_at?: string | null
          principal_amount: number
          purpose?: string | null
          recommended_decision?: string
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          risk_score?: number
          risk_summary?: string | null
          risk_tier?: string
          status?: string
          term_months: number
          total_interest_charged?: number
          total_paid?: number
          updated_at?: string
        }
        Update: {
          accrued_interest?: number
          admin_decision_notes?: string | null
          annual_interest_rate?: number
          checking_account_id?: string
          created_at?: string
          customer_id?: string
          debt_to_income_ratio?: number
          disbursed_at?: string | null
          employment_status?: string
          estimated_monthly_payment?: number
          existing_credit_debt?: number
          last_interest_accrued_at?: string | null
          last_payment_at?: string | null
          loan_id?: string
          monthly_housing_payment?: number
          monthly_income?: number
          other_financial_notes?: string | null
          outstanding_principal?: number
          paid_off_at?: string | null
          principal_amount?: number
          purpose?: string | null
          recommended_decision?: string
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          risk_score?: number
          risk_summary?: string | null
          risk_tier?: string
          status?: string
          term_months?: number
          total_interest_charged?: number
          total_paid?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loans_checking_account_id_fkey"
            columns: ["checking_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "loans_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      managers: {
        Row: {
          created_at: string | null
          employee_id: string | null
          first_name: string | null
          is_active: boolean
          last_name: string | null
          manager_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          employee_id?: string | null
          first_name?: string | null
          is_active?: boolean
          last_name?: string | null
          manager_id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          employee_id?: string | null
          first_name?: string | null
          is_active?: boolean
          last_name?: string | null
          manager_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "managers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      payment_executions: {
        Row: {
          actual_execution_at: string | null
          execution_id: string
          failure_reason: string | null
          retry_count: number | null
          schedule_id: string | null
          scheduled_date: string | null
          status: string | null
          transaction_id: string | null
        }
        Insert: {
          actual_execution_at?: string | null
          execution_id?: string
          failure_reason?: string | null
          retry_count?: number | null
          schedule_id?: string | null
          scheduled_date?: string | null
          status?: string | null
          transaction_id?: string | null
        }
        Update: {
          actual_execution_at?: string | null
          execution_id?: string
          failure_reason?: string | null
          retry_count?: number | null
          schedule_id?: string | null
          scheduled_date?: string | null
          status?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_executions_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "bill_schedules"
            referencedColumns: ["schedule_id"]
          },
          {
            foreignKeyName: "payment_executions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["transaction_id"]
          },
        ]
      }
      plaid_linked_accounts: {
        Row: {
          access_token_auth_tag: string
          access_token_iv: string
          created_at: string
          customer_id: string
          encrypted_access_token: string
          institution_name: string | null
          last_verified_at: string | null
          linked_account_id: string
          plaid_account_id: string
          plaid_account_mask: string | null
          plaid_account_name: string
          plaid_account_official_name: string | null
          plaid_account_subtype: string | null
          plaid_account_type: string | null
          plaid_item_id: string
          status: string
          updated_at: string
        }
        Insert: {
          access_token_auth_tag: string
          access_token_iv: string
          created_at?: string
          customer_id: string
          encrypted_access_token: string
          institution_name?: string | null
          last_verified_at?: string | null
          linked_account_id?: string
          plaid_account_id: string
          plaid_account_mask?: string | null
          plaid_account_name: string
          plaid_account_official_name?: string | null
          plaid_account_subtype?: string | null
          plaid_account_type?: string | null
          plaid_item_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          access_token_auth_tag?: string
          access_token_iv?: string
          created_at?: string
          customer_id?: string
          encrypted_access_token?: string
          institution_name?: string | null
          last_verified_at?: string | null
          linked_account_id?: string
          plaid_account_id?: string
          plaid_account_mask?: string | null
          plaid_account_name?: string
          plaid_account_official_name?: string | null
          plaid_account_subtype?: string | null
          plaid_account_type?: string | null
          plaid_item_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plaid_linked_accounts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      savings_monthly_activity: {
        Row: {
          account_id: string
          created_at: string
          interest_credited_amount: number
          interest_credited_at: string | null
          month_key: string
          opening_balance: number
          updated_at: string
          withdrawal_cap_amount: number
          withdrawn_amount: number
        }
        Insert: {
          account_id: string
          created_at?: string
          interest_credited_amount?: number
          interest_credited_at?: string | null
          month_key: string
          opening_balance: number
          updated_at?: string
          withdrawal_cap_amount: number
          withdrawn_amount?: number
        }
        Update: {
          account_id?: string
          created_at?: string
          interest_credited_amount?: number
          interest_credited_at?: string | null
          month_key?: string
          opening_balance?: number
          updated_at?: string
          withdrawal_cap_amount?: number
          withdrawn_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "savings_monthly_activity_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["account_id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          description: string | null
          destination_account_id: string | null
          executed_at: string | null
          reference_number: string
          source_account_id: string | null
          status: string | null
          transaction_id: string
          transaction_type: string | null
        }
        Insert: {
          amount: number
          description?: string | null
          destination_account_id?: string | null
          executed_at?: string | null
          reference_number: string
          source_account_id?: string | null
          status?: string | null
          transaction_id?: string
          transaction_type?: string | null
        }
        Update: {
          amount?: number
          description?: string | null
          destination_account_id?: string | null
          executed_at?: string | null
          reference_number?: string
          source_account_id?: string | null
          status?: string | null
          transaction_id?: string
          transaction_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_destination_account_id_fkey"
            columns: ["destination_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "transactions_source_account_id_fkey"
            columns: ["source_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["account_id"]
          },
        ]
      }
      users: {
        Row: {
          account_locked_until: string | null
          created_at: string | null
          deactivation_reason: string | null
          email: string
          failed_login_attempts: number | null
          is_active: boolean | null
          last_login_at: string | null
          mfa_enabled: boolean | null
          password_changed_at: string | null
          role: Database["public"]["Enums"]["role"] | null
          user_id: string
        }
        Insert: {
          account_locked_until?: string | null
          created_at?: string | null
          deactivation_reason?: string | null
          email: string
          failed_login_attempts?: number | null
          is_active?: boolean | null
          last_login_at?: string | null
          mfa_enabled?: boolean | null
          password_changed_at?: string | null
          role?: Database["public"]["Enums"]["role"] | null
          user_id: string
        }
        Update: {
          account_locked_until?: string | null
          created_at?: string | null
          deactivation_reason?: string | null
          email?: string
          failed_login_attempts?: number | null
          is_active?: boolean | null
          last_login_at?: string | null
          mfa_enabled?: boolean | null
          password_changed_at?: string | null
          role?: Database["public"]["Enums"]["role"] | null
          user_id?: string
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
      account_status: "active" | "frozen" | "closed"
      account_type: "credit" | "checking" | "saving"
      billschedule_status: "active" | "paused" | "cancelled" | "completed"
      checkdeposit_status:
        | "submitted"
        | "pending_review"
        | "cleared"
        | "bounced"
      frequency: "once" | "weekly" | "biweekly" | "monthly" | "annually"
      kyc_status: "pending" | "verified" | "rejected"
      paymentexecution_status:
        | "success"
        | "failed"
        | "retrying"
        | "skipped_insufficient_funds"
      role: "customer" | "manager" | "admin" | "auditor"
      transaction_status: "pending" | "completed" | "failed" | "reversed"
      transaction_type:
        | "deposit"
        | "withdrawal"
        | "transfer"
        | "fee"
        | "interest"
        | "atm_withdrawal"
        | "atm_deposit"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_status: ["active", "frozen", "closed"],
      account_type: ["credit", "checking", "saving"],
      billschedule_status: ["active", "paused", "cancelled", "completed"],
      checkdeposit_status: [
        "submitted",
        "pending_review",
        "cleared",
        "bounced",
      ],
      frequency: ["once", "weekly", "biweekly", "monthly", "annually"],
      kyc_status: ["pending", "verified", "rejected"],
      paymentexecution_status: [
        "success",
        "failed",
        "retrying",
        "skipped_insufficient_funds",
      ],
      role: ["customer", "manager", "admin", "auditor"],
      transaction_status: ["pending", "completed", "failed", "reversed"],
      transaction_type: [
        "deposit",
        "withdrawal",
        "transfer",
        "fee",
        "interest",
        "atm_withdrawal",
        "atm_deposit",
      ],
    },
  },
} as const
