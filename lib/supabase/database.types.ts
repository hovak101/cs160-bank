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
        Relationships: []
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
      managers: {
        Row: {
          created_at: string | null
          employee_id: string | null
          first_name: string | null
          last_name: string | null
          manager_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          employee_id?: string | null
          first_name?: string | null
          last_name?: string | null
          manager_id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          employee_id?: string | null
          first_name?: string | null
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
      ],
    },
  },
} as const
