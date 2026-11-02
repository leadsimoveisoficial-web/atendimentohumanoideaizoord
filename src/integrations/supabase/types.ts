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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      orders: {
        Row: {
          created_at: string
          customer_name: string
          id: string
          items: Json
          notes: string
          status: string
          table_number: string
          total: number
        }
        Insert: {
          created_at?: string
          customer_name?: string
          id?: string
          items?: Json
          notes?: string
          status?: string
          table_number?: string
          total?: number
        }
        Update: {
          created_at?: string
          customer_name?: string
          id?: string
          items?: Json
          notes?: string
          status?: string
          table_number?: string
          total?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          display_name: string
          id: string
          music_genre: string
          music_volume: number
          updated_at: string
        }
        Insert: {
          display_name?: string
          id: string
          music_genre?: string
          music_volume?: number
          updated_at?: string
        }
        Update: {
          display_name?: string
          id?: string
          music_genre?: string
          music_volume?: number
          updated_at?: string
        }
        Relationships: []
      }
      security_cameras: {
        Row: {
          created_at: string
          id: string
          name: string
          snapshot_url: string
          stream_url: string
          zone: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          snapshot_url?: string
          stream_url?: string
          zone?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          snapshot_url?: string
          stream_url?: string
          zone?: string
        }
        Relationships: []
      }
      security_events: {
        Row: {
          camera_id: string | null
          camera_name: string
          created_at: string
          id: string
          level: string
          people_count: number | null
          summary: string
        }
        Insert: {
          camera_id?: string | null
          camera_name?: string
          created_at?: string
          id?: string
          level?: string
          people_count?: number | null
          summary: string
        }
        Update: {
          camera_id?: string | null
          camera_name?: string
          created_at?: string
          id?: string
          level?: string
          people_count?: number | null
          summary?: string
        }
        Relationships: []
      }
      security_settings: {
        Row: {
          close_time: string
          enabled: boolean
          id: number
          interval_minutes: number
          open_time: string
          updated_at: string
        }
        Insert: {
          close_time?: string
          enabled?: boolean
          id?: number
          interval_minutes?: number
          open_time?: string
          updated_at?: string
        }
        Update: {
          close_time?: string
          enabled?: boolean
          id?: number
          interval_minutes?: number
          open_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      ti_projects: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          name: string
          url?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          url?: string
        }
        Relationships: []
      }
      ti_tasks: {
        Row: {
          created_at: string
          created_by: string
          done: boolean
          id: string
          kind: string
          project_id: string
          text: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          done?: boolean
          id?: string
          kind?: string
          project_id: string
          text: string
        }
        Update: {
          created_at?: string
          created_by?: string
          done?: boolean
          id?: string
          kind?: string
          project_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "ti_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ti_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      security_mode_active: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
