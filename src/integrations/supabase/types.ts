export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      hijack_pricing: {
        Row: {
          created_at: string
          current_fee_sol: number
          id: string
          last_fee_update_at: string
          last_hijack_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_fee_sol?: number
          id?: string
          last_fee_update_at?: string
          last_hijack_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_fee_sol?: number
          id?: string
          last_fee_update_at?: string
          last_hijack_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      token_hijacks: {
        Row: {
          block_time: number | null
          created_at: string
          error_message: string | null
          explorer_url: string | null
          fee_paid_sol: number | null
          id: string
          image_file_name: string | null
          image_file_size: number | null
          image_file_type: string | null
          image_uri: string | null
          metadata_uri: string | null
          new_metadata: Json | null
          status: string
          ticker_symbol: string
          token_name: string
          transaction_signature: string | null
          updated_at: string
          wallet_address: string
        }
        Insert: {
          block_time?: number | null
          created_at?: string
          error_message?: string | null
          explorer_url?: string | null
          fee_paid_sol?: number | null
          id?: string
          image_file_name?: string | null
          image_file_size?: number | null
          image_file_type?: string | null
          image_uri?: string | null
          metadata_uri?: string | null
          new_metadata?: Json | null
          status?: string
          ticker_symbol: string
          token_name: string
          transaction_signature?: string | null
          updated_at?: string
          wallet_address: string
        }
        Update: {
          block_time?: number | null
          created_at?: string
          error_message?: string | null
          explorer_url?: string | null
          fee_paid_sol?: number | null
          id?: string
          image_file_name?: string | null
          image_file_size?: number | null
          image_file_type?: string | null
          image_uri?: string | null
          metadata_uri?: string | null
          new_metadata?: Json | null
          status?: string
          ticker_symbol?: string
          token_name?: string
          transaction_signature?: string | null
          updated_at?: string
          wallet_address?: string
        }
        Relationships: []
      }
      twitter_posts: {
        Row: {
          created_at: string
          error_message: string | null
          hijack_id: string
          id: string
          posted_at: string | null
          status: string
          tweet_content: string
          tweet_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          hijack_id: string
          id?: string
          posted_at?: string | null
          status?: string
          tweet_content: string
          tweet_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          hijack_id?: string
          id?: string
          posted_at?: string | null
          status?: string
          tweet_content?: string
          tweet_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "twitter_posts_hijack_id_fkey"
            columns: ["hijack_id"]
            isOneToOne: false
            referencedRelation: "token_hijacks"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_connections: {
        Row: {
          connected_at: string
          id: string
          is_active: boolean
          last_active_at: string
          wallet_address: string
          wallet_type: string
        }
        Insert: {
          connected_at?: string
          id?: string
          is_active?: boolean
          last_active_at?: string
          wallet_address: string
          wallet_type: string
        }
        Update: {
          connected_at?: string
          id?: string
          is_active?: boolean
          last_active_at?: string
          wallet_address?: string
          wallet_type?: string
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
