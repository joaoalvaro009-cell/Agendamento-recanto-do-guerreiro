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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          barber_id: string
          confirmation_code: string
          created_at: string
          customer_name: string
          customer_phone: string
          id: string
          notes: string | null
          reminder_10m: boolean
          reminder_1h: boolean
          service_name: string
          service_price: number
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          barber_id: string
          confirmation_code?: string
          created_at?: string
          customer_name: string
          customer_phone: string
          id?: string
          notes?: string | null
          reminder_10m?: boolean
          reminder_1h?: boolean
          service_name: string
          service_price: number
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          barber_id?: string
          confirmation_code?: string
          created_at?: string
          customer_name?: string
          customer_phone?: string
          id?: string
          notes?: string | null
          reminder_10m?: boolean
          reminder_1h?: boolean
          service_name?: string
          service_price?: number
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
        ]
      }
      barbers: {
        Row: {
          active: boolean
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_order: number
          email: string | null
          id: string
          is_admin: boolean
          name: string
          phone: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_order?: number
          email?: string | null
          id?: string
          is_admin?: boolean
          name: string
          phone: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_order?: number
          email?: string | null
          id?: string
          is_admin?: boolean
          name?: string
          phone?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      blocked_slots: {
        Row: {
          barber_id: string
          blocked_date: string
          blocked_time: string | null
          created_at: string
          id: string
          reason: string | null
        }
        Insert: {
          barber_id: string
          blocked_date: string
          blocked_time?: string | null
          created_at?: string
          id?: string
          reason?: string | null
        }
        Update: {
          barber_id?: string
          blocked_date?: string
          blocked_time?: string | null
          created_at?: string
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocked_slots_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          active: boolean
          created_at: string
          display_order: number
          featured: boolean
          id: string
          items: string[]
          name: string
          price: number
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_order?: number
          featured?: boolean
          id?: string
          items?: string[]
          name: string
          price: number
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          display_order?: number
          featured?: boolean
          id?: string
          items?: string[]
          name?: string
          price?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          active: boolean
          created_at: string
          description: string
          display_order: number
          duration: number
          id: string
          image_url: string | null
          name: string
          price: number
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string
          display_order?: number
          duration?: number
          id?: string
          image_url?: string | null
          name: string
          price: number
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string
          display_order?: number
          duration?: number
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          created_at: string
          id: string
          instagram_handle: string
          instagram_url: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          instagram_handle?: string
          instagram_url?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          instagram_handle?: string
          instagram_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          active: boolean
          bio: string
          created_at: string
          display_order: number
          icon: string
          id: string
          image_url: string | null
          name: string
          role: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          bio?: string
          created_at?: string
          display_order?: number
          icon?: string
          id?: string
          image_url?: string | null
          name: string
          role: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          bio?: string
          created_at?: string
          display_order?: number
          icon?: string
          id?: string
          image_url?: string | null
          name?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cancel_appointment_by_code: {
        Args: { _code: string }
        Returns: {
          appointment_date: string
          appointment_time: string
          barber_id: string
          confirmation_code: string
          created_at: string
          customer_name: string
          customer_phone: string
          id: string
          notes: string | null
          reminder_10m: boolean
          reminder_1h: boolean
          service_name: string
          service_price: number
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "appointments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_barber_id: { Args: never; Returns: string }
      get_appointment_by_code: {
        Args: { _code: string }
        Returns: {
          appointment_date: string
          appointment_time: string
          barber_id: string
          confirmation_code: string
          created_at: string
          customer_name: string
          customer_phone: string
          id: string
          notes: string | null
          reminder_10m: boolean
          reminder_1h: boolean
          service_name: string
          service_price: number
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "appointments"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      reschedule_appointment_by_code: {
        Args: { _code: string; _new_date: string; _new_time: string }
        Returns: {
          appointment_date: string
          appointment_time: string
          barber_id: string
          confirmation_code: string
          created_at: string
          customer_name: string
          customer_phone: string
          id: string
          notes: string | null
          reminder_10m: boolean
          reminder_1h: boolean
          service_name: string
          service_price: number
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "appointments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      taken_slots: {
        Args: { _barber_id: string; _date: string }
        Returns: {
          appointment_time: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "barber"
      appointment_status: "confirmed" | "cancelled" | "completed" | "no_show"
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
    Enums: {
      app_role: ["admin", "barber"],
      appointment_status: ["confirmed", "cancelled", "completed", "no_show"],
    },
  },
} as const
