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
      attempts: {
        Row: {
          answer: string
          confidence: number
          created_at: string
          duration_sec: number | null
          feedback: Json
          id: string
          mode: string
          question_id: string
          score: number
        }
        Insert: {
          answer: string
          confidence: number
          created_at?: string
          duration_sec?: number | null
          feedback: Json
          id?: string
          mode: string
          question_id: string
          score: number
        }
        Update: {
          answer?: string
          confidence?: number
          created_at?: string
          duration_sec?: number | null
          feedback?: Json
          id?: string
          mode?: string
          question_id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "recall_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      dumps: {
        Row: {
          created_at: string
          feedback: Json | null
          id: string
          text: string
          topic_id: string
        }
        Insert: {
          created_at?: string
          feedback?: Json | null
          id?: string
          text: string
          topic_id: string
        }
        Update: {
          created_at?: string
          feedback?: Json | null
          id?: string
          text?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dumps_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      explanations: {
        Row: {
          created_at: string
          drill_type: string | null
          feedback: Json | null
          id: string
          score: number | null
          text: string
          topic_id: string
        }
        Insert: {
          created_at?: string
          drill_type?: string | null
          feedback?: Json | null
          id?: string
          score?: number | null
          text: string
          topic_id: string
        }
        Update: {
          created_at?: string
          drill_type?: string | null
          feedback?: Json | null
          id?: string
          score?: number | null
          text?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "explanations_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_chunks: {
        Row: {
          content: string
          created_at: string
          id: string
          position: number
          title: string
          topic_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          position: number
          title: string
          topic_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          position?: number
          title?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_chunks_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      pretest_answers: {
        Row: {
          answer: string
          created_at: string
          id: string
          position: number
          question: string
          topic_id: string
        }
        Insert: {
          answer?: string
          created_at?: string
          id?: string
          position: number
          question: string
          topic_id: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          position?: number
          question?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pretest_answers_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      recall_questions: {
        Row: {
          created_at: string
          id: string
          key_points: string[]
          position: number
          text: string
          topic_id: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_points: string[]
          position: number
          text: string
          topic_id: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          key_points?: string[]
          position?: number
          text?: string
          topic_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "recall_questions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      review_state: {
        Row: {
          created_at: string
          difficulty: number | null
          due_at: string
          id: string
          interval_days: number
          last_score: number | null
          question_id: string
          stability: number | null
          step: number
        }
        Insert: {
          created_at?: string
          difficulty?: number | null
          due_at: string
          id?: string
          interval_days?: number
          last_score?: number | null
          question_id: string
          stability?: number | null
          step?: number
        }
        Update: {
          created_at?: string
          difficulty?: number | null
          due_at?: string
          id?: string
          interval_days?: number
          last_score?: number | null
          question_id?: string
          stability?: number | null
          step?: number
        }
        Relationships: [
          {
            foreignKeyName: "review_state_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: true
            referencedRelation: "recall_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          created_at: string
          daily_review_cap: number
          exploration_ratio: number
          id: number
          interests: string[]
        }
        Insert: {
          created_at?: string
          daily_review_cap?: number
          exploration_ratio?: number
          id?: number
          interests?: string[]
        }
        Update: {
          created_at?: string
          daily_review_cap?: number
          exploration_ratio?: number
          id?: number
          interests?: string[]
        }
        Relationships: []
      }
      sources: {
        Row: {
          created_at: string
          id: string
          title: string
          topic_id: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          title: string
          topic_id: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          topic_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "sources_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      suggestions: {
        Row: {
          created_at: string
          difficulty: string | null
          dismiss_reason: string | null
          id: string
          mode: string
          reason: string
          starter_questions: string[]
          status: string
          tags: string[]
          title: string
        }
        Insert: {
          created_at?: string
          difficulty?: string | null
          dismiss_reason?: string | null
          id?: string
          mode: string
          reason: string
          starter_questions?: string[]
          status?: string
          tags?: string[]
          title: string
        }
        Update: {
          created_at?: string
          difficulty?: string | null
          dismiss_reason?: string | null
          id?: string
          mode?: string
          reason?: string
          starter_questions?: string[]
          status?: string
          tags?: string[]
          title?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      topic_cards: {
        Row: {
          analogy: string
          connects_to: string[]
          counterpoint: string
          created_at: string
          id: string
          notes: string | null
          one_sentence: string
          paragraph: string
          topic_id: string
        }
        Insert: {
          analogy: string
          connects_to?: string[]
          counterpoint: string
          created_at?: string
          id?: string
          notes?: string | null
          one_sentence: string
          paragraph: string
          topic_id: string
        }
        Update: {
          analogy?: string
          connects_to?: string[]
          counterpoint?: string
          created_at?: string
          id?: string
          notes?: string | null
          one_sentence?: string
          paragraph?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_cards_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: true
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_tags: {
        Row: {
          created_at: string
          tag_id: string
          topic_id: string
        }
        Insert: {
          created_at?: string
          tag_id: string
          topic_id: string
        }
        Update: {
          created_at?: string
          tag_id?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_tags_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          created_at: string
          id: string
          interest_rating: number | null
          level: string | null
          mastery_level: string | null
          researched_at: string | null
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          interest_rating?: number | null
          level?: string | null
          mastery_level?: string | null
          researched_at?: string | null
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          interest_rating?: number | null
          level?: string | null
          mastery_level?: string | null
          researched_at?: string | null
          status?: string
          title?: string
        }
        Relationships: []
      }
      user_questions: {
        Row: {
          answer: string | null
          created_at: string
          id: string
          is_suggested: boolean
          position: number
          text: string
          topic_id: string
        }
        Insert: {
          answer?: string | null
          created_at?: string
          id?: string
          is_suggested?: boolean
          position: number
          text: string
          topic_id: string
        }
        Update: {
          answer?: string | null
          created_at?: string
          id?: string
          is_suggested?: boolean
          position?: number
          text?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_questions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
