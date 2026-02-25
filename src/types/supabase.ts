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
  public: {
    Tables: {
      classic_note_subscriptions: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
          id: number
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
          id?: number
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "classic_note_subscriptions_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classic_note_subscriptions_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookmarks: {
        Row: {
          concert_id: string
          created_at: string | null
          id: number
          user_id: string
          scheduled_dates: string[] | null
        }
        Insert: {
          concert_id: string
          created_at?: string | null
          id?: number
          user_id: string
          scheduled_dates?: string[] | null
        }
        Update: {
          concert_id?: string
          created_at?: string | null
          id?: number
          user_id?: string
          scheduled_dates?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_concert_id_fkey"
            columns: ["concert_id"]
            isOneToOne: false
            referencedRelation: "concerts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_comments: {
        Row: {
          author_id: string
          author_nickname: string
          author_username: string | null
          content: string
          created_at: string | null
          id: number
          post_id: number
          updated_at: string | null
        }
        Insert: {
          author_id: string
          author_nickname: string
          author_username?: string | null
          content: string
          created_at?: string | null
          id?: number
          post_id: number
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          author_nickname?: string
          author_username?: string | null
          content?: string
          created_at?: string | null
          id?: number
          post_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          author_id: string
          author_nickname: string
          author_username: string | null
          author_role: string
          category: string
          concert_id: string | null
          content: string
          created_at: string | null
          id: number
          source_note_id: number | null
          title: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          author_id: string
          author_nickname: string
          author_username?: string | null
          author_role?: string
          category: string
          concert_id?: string | null
          content?: string
          created_at?: string | null
          id?: number
          source_note_id?: number | null
          title: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          author_id?: string
          author_nickname?: string
          author_username?: string | null
          author_role?: string
          category?: string
          concert_id?: string | null
          content?: string
          created_at?: string | null
          id?: number
          source_note_id?: number | null
          title?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: []
      }
      concerts: {
        Row: {
          age_limit: string | null
          area: string | null
          bookmark_count: number
          crew: string | null
          end_date: string | null
          genre: string | null
          id: string
          intro_images: Json | null
          open_run: string | null
          performers: string | null
          poster: string | null
          producer: string | null
          rank: number | null
          schedule: string | null
          start_date: string | null
          status: string | null
          synced_at: string | null
          synopsis: string | null
          ticket_price: string | null
          ticket_sites: Json | null
          title: string | null
          venue: string | null
        }
        Insert: {
          age_limit?: string | null
          area?: string | null
          bookmark_count?: number
          crew?: string | null
          end_date?: string | null
          genre?: string | null
          id: string
          intro_images?: Json | null
          open_run?: string | null
          performers?: string | null
          poster?: string | null
          producer?: string | null
          rank?: number | null
          schedule?: string | null
          start_date?: string | null
          status?: string | null
          synced_at?: string | null
          synopsis?: string | null
          ticket_price?: string | null
          ticket_sites?: Json | null
          title?: string | null
          venue?: string | null
        }
        Update: {
          age_limit?: string | null
          area?: string | null
          bookmark_count?: number
          crew?: string | null
          end_date?: string | null
          genre?: string | null
          id?: string
          intro_images?: Json | null
          open_run?: string | null
          performers?: string | null
          poster?: string | null
          producer?: string | null
          rank?: number | null
          schedule?: string | null
          start_date?: string | null
          status?: string | null
          synced_at?: string | null
          synopsis?: string | null
          ticket_price?: string | null
          ticket_sites?: Json | null
          title?: string | null
          venue?: string | null
        }
        Relationships: []
      }
      magazine_concerts: {
        Row: {
          concert_id: string
          display_order: number | null
          id: number
          post_id: number | null
        }
        Insert: {
          concert_id: string
          display_order?: number | null
          id?: number
          post_id?: number | null
        }
        Update: {
          concert_id?: string
          display_order?: number | null
          id?: number
          post_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "magazine_concerts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "magazine_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      magazine_posts: {
        Row: {
          author_id: string
          author_nickname: string
          category: string
          content: string
          created_at: string | null
          id: number
          title: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          author_id: string
          author_nickname: string
          category: string
          content: string
          created_at?: string | null
          id?: number
          title: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          author_id?: string
          author_nickname?: string
          category?: string
          content?: string
          created_at?: string | null
          id?: number
          title?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: []
      }
      notes: {
        Row: {
          concert_id: string | null
          content: string | null
          created_at: string | null
          id: number
          is_public: boolean | null
          note_date: string
          title: string | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          concert_id?: string | null
          content?: string | null
          created_at?: string | null
          id?: number
          is_public?: boolean | null
          note_date: string
          title?: string | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          concert_id?: string | null
          content?: string | null
          created_at?: string | null
          id?: number
          is_public?: boolean | null
          note_date?: string
          title?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_concert_id_fkey"
            columns: ["concert_id"]
            isOneToOne: false
            referencedRelation: "concerts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          classic_note_public: boolean | null
          created_at: string | null
          deleted_at: string | null
          email: string
          id: string
          nickname: string | null
          phone: string | null
          role: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          classic_note_public?: boolean | null
          created_at?: string | null
          deleted_at?: string | null
          email: string
          id: string
          nickname?: string | null
          phone?: string | null
          role?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          classic_note_public?: boolean | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string
          id?: string
          nickname?: string | null
          phone?: string | null
          role?: string
          username?: string | null
        }
        Relationships: []
      }
      support_posts: {
        Row: {
          author_id: string
          author_nickname: string
          author_username: string | null
          category: string
          content: string
          created_at: string | null
          id: number
          is_private: boolean
          title: string
          updated_at: string | null
          view_count: number
        }
        Insert: {
          author_id: string
          author_nickname: string
          author_username?: string | null
          category: string
          content?: string
          created_at?: string | null
          id?: number
          is_private?: boolean
          title: string
          updated_at?: string | null
          view_count?: number
        }
        Update: {
          author_id?: string
          author_nickname?: string
          author_username?: string | null
          category?: string
          content?: string
          created_at?: string | null
          id?: number
          is_private?: boolean
          title?: string
          updated_at?: string | null
          view_count?: number
        }
        Relationships: []
      }
      support_replies: {
        Row: {
          author_id: string
          author_nickname: string
          content: string
          created_at: string | null
          id: number
          post_id: number
          updated_at: string | null
        }
        Insert: {
          author_id: string
          author_nickname: string
          content: string
          created_at?: string | null
          id?: number
          post_id: number
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          author_nickname?: string
          content?: string
          created_at?: string | null
          id?: number
          post_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_replies_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: true
            referencedRelation: "support_posts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_delete_community_comment: {
        Args: { p_comment_id: number }
        Returns: undefined
      }
      admin_delete_community_post: {
        Args: { p_post_id: number }
        Returns: undefined
      }
      admin_delete_support_post: {
        Args: { p_post_id: number }
        Returns: undefined
      }
      check_nickname_exists: { Args: { p_nickname: string }; Returns: boolean }
      delete_user: { Args: never; Returns: undefined }
      increment_community_view_count: {
        Args: { p_post_id: number }
        Returns: undefined
      }
      increment_support_view_count: {
        Args: { p_post_id: number }
        Returns: undefined
      }
      increment_view_count: { Args: { p_post_id: number }; Returns: undefined }
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
