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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      racquet_jobs: {
        Row: {
          created_at: string | null
          amount_due: number
          drop_in_date: string
          email: string | null
          id: string
          member_name: string
          ticket_number: string | null
          paid_at: string | null
          paid_by_staff: string | null
          payment_status: string
          phone: string
          pickup_deadline: string | null
          racquet_type: string | null
          reminder_2_sent: boolean | null
          reminder_3_sent: boolean | null
          status: string | null
          string_id: string | null
          string_power: string | null
          string_tension: number | null
          terms_accepted: boolean | null
          terms_accepted_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          amount_due?: number
          drop_in_date: string
          email?: string | null
          id?: string
          member_name: string
          ticket_number?: string | null
          paid_at?: string | null
          paid_by_staff?: string | null
          payment_status?: string
          phone: string
          pickup_deadline?: string | null
          racquet_type?: string | null
          reminder_2_sent?: boolean | null
          reminder_3_sent?: boolean | null
          status?: string | null
          string_id?: string | null
          string_power?: string | null
          string_tension?: number | null
          terms_accepted?: boolean | null
          terms_accepted_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          amount_due?: number
          drop_in_date?: string
          email?: string | null
          id?: string
          member_name?: string
          ticket_number?: string | null
          paid_at?: string | null
          paid_by_staff?: string | null
          payment_status?: string
          phone?: string
          pickup_deadline?: string | null
          racquet_type?: string | null
          reminder_2_sent?: boolean | null
          reminder_3_sent?: boolean | null
          status?: string | null
          string_id?: string | null
          string_power?: string | null
          string_tension?: number | null
          terms_accepted?: boolean | null
          terms_accepted_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "racquet_jobs_string_id_fkey"
            columns: ["string_id"]
            isOneToOne: false
            referencedRelation: "strings"
            referencedColumns: ["id"]
          },
        ]
      }
      strings: {
        Row: {
          active: boolean | null
          brand: string | null
          created_at: string | null
          gauge: string | null
          id: string
          price: number
          name: string
        }
        Insert: {
          active?: boolean | null
          brand?: string | null
          created_at?: string | null
          gauge?: string | null
          id?: string
          price?: number
          name: string
        }
        Update: {
          active?: boolean | null
          brand?: string | null
          created_at?: string | null
          gauge?: string | null
          price?: number
          id?: string
          name?: string
        }
        Relationships: []
      }
      status_events: {
        Row: {
          id: string
          job_id: string
          event_type: string
          staff_name: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          job_id: string
          event_type: string
          staff_name?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          job_id?: string
          event_type?: string
          staff_name?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "status_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "racquet_jobs"
            referencedColumns: ["id"]
          }
        ]
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
  public: {
    Enums: {},
  },
} as const
