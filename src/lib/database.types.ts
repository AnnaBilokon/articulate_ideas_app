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
      achievements: {
        Row: {
          achieved_on: string
          created_at: string
          from_goal: boolean
          goal_id: string | null
          id: string
          note: string | null
          title: string
        }
        Insert: {
          achieved_on?: string
          created_at?: string
          from_goal?: boolean
          goal_id?: string | null
          id?: string
          note?: string | null
          title: string
        }
        Update: {
          achieved_on?: string
          created_at?: string
          from_goal?: boolean
          goal_id?: string | null
          id?: string
          note?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievements_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
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
      beliefs: {
        Row: {
          belief: string
          created_at: string
          evidence_against: string | null
          id: string
          let_go_at: string | null
          origin: string | null
          reframe: string | null
          status: string
          strength_now: number | null
          strength_start: number | null
          updated_at: string
        }
        Insert: {
          belief: string
          created_at?: string
          evidence_against?: string | null
          id?: string
          let_go_at?: string | null
          origin?: string | null
          reframe?: string | null
          status?: string
          strength_now?: number | null
          strength_start?: number | null
          updated_at?: string
        }
        Update: {
          belief?: string
          created_at?: string
          evidence_against?: string | null
          id?: string
          let_go_at?: string | null
          origin?: string | null
          reframe?: string | null
          status?: string
          strength_now?: number | null
          strength_start?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      challenge_attempts: {
        Row: {
          answer: Json
          challenge_id: string
          created_at: string
          id: string
          result: Json
          score: number
        }
        Insert: {
          answer: Json
          challenge_id: string
          created_at?: string
          id?: string
          result: Json
          score: number
        }
        Update: {
          answer?: Json
          challenge_id?: string
          created_at?: string
          id?: string
          result?: Json
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "challenge_attempts_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          content: Json
          created_at: string
          id: string
          kind: string
          topic_id: string
        }
        Insert: {
          content: Json
          created_at?: string
          id?: string
          kind: string
          topic_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          kind?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenges_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      chunk_recalls: {
        Row: {
          chunk_id: string
          created_at: string
          feedback: Json
          id: string
          text: string
        }
        Insert: {
          chunk_id: string
          created_at?: string
          feedback: Json
          id?: string
          text: string
        }
        Update: {
          chunk_id?: string
          created_at?: string
          feedback?: Json
          id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "chunk_recalls_chunk_id_fkey"
            columns: ["chunk_id"]
            isOneToOne: false
            referencedRelation: "lesson_chunks"
            referencedColumns: ["id"]
          },
        ]
      }
      critical_answers: {
        Row: {
          answer: string
          created_at: string
          critical_question_id: string
          feedback: Json
          id: string
        }
        Insert: {
          answer: string
          created_at?: string
          critical_question_id: string
          feedback: Json
          id?: string
        }
        Update: {
          answer?: string
          created_at?: string
          critical_question_id?: string
          feedback?: Json
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "critical_answers_critical_question_id_fkey"
            columns: ["critical_question_id"]
            isOneToOne: false
            referencedRelation: "critical_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      critical_questions: {
        Row: {
          considerations: string[]
          created_at: string
          id: string
          kind: string
          position: number
          text: string
          topic_id: string
        }
        Insert: {
          considerations: string[]
          created_at?: string
          id?: string
          kind: string
          position: number
          text: string
          topic_id: string
        }
        Update: {
          considerations?: string[]
          created_at?: string
          id?: string
          kind?: string
          position?: number
          text?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "critical_questions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
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
      glossary_terms: {
        Row: {
          created_at: string
          definition: string
          example: string | null
          full_form: string | null
          id: string
          source: string
          term: string
          topic_id: string
        }
        Insert: {
          created_at?: string
          definition: string
          example?: string | null
          full_form?: string | null
          id?: string
          source?: string
          term: string
          topic_id: string
        }
        Update: {
          created_at?: string
          definition?: string
          example?: string | null
          full_form?: string | null
          id?: string
          source?: string
          term?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "glossary_terms_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_notes: {
        Row: {
          body: string
          created_at: string
          goal_id: string
          id: string
        }
        Insert: {
          body: string
          created_at?: string
          goal_id: string
          id?: string
        }
        Update: {
          body?: string
          created_at?: string
          goal_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_notes_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_steps: {
        Row: {
          created_at: string
          done_at: string | null
          goal_id: string
          id: string
          position: number
          title: string
        }
        Insert: {
          created_at?: string
          done_at?: string | null
          goal_id: string
          id?: string
          position?: number
          title: string
        }
        Update: {
          created_at?: string
          done_at?: string | null
          goal_id?: string
          id?: string
          position?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_steps_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          achieved_at: string | null
          created_at: string
          id: string
          metric_current: number
          metric_target: number | null
          metric_unit: string | null
          status: string
          target_year: number | null
          title: string
          updated_at: string
          why: string | null
        }
        Insert: {
          achieved_at?: string | null
          created_at?: string
          id?: string
          metric_current?: number
          metric_target?: number | null
          metric_unit?: string | null
          status?: string
          target_year?: number | null
          title: string
          updated_at?: string
          why?: string | null
        }
        Update: {
          achieved_at?: string | null
          created_at?: string
          id?: string
          metric_current?: number
          metric_target?: number | null
          metric_unit?: string | null
          status?: string
          target_year?: number | null
          title?: string
          updated_at?: string
          why?: string | null
        }
        Relationships: []
      }
      habit_checks: {
        Row: {
          created_at: string
          day: string
          habit_id: string
          id: string
        }
        Insert: {
          created_at?: string
          day: string
          habit_id: string
          id?: string
        }
        Update: {
          created_at?: string
          day?: string
          habit_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_checks_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          archived_at: string | null
          created_at: string
          days: number[]
          id: string
          schedule: string
          times_per_week: number | null
          title: string
          updated_at: string
          why: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          days?: number[]
          id?: string
          schedule?: string
          times_per_week?: number | null
          title: string
          updated_at?: string
          why?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          days?: number[]
          id?: string
          schedule?: string
          times_per_week?: number | null
          title?: string
          updated_at?: string
          why?: string | null
        }
        Relationships: []
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
      money_categories: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          kind: string
          name: string
          position: number
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          kind: string
          name: string
          position?: number
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          kind?: string
          name?: string
          position?: number
        }
        Relationships: []
      }
      money_entries: {
        Row: {
          amount: number | null
          balance: number | null
          category_id: string
          id: string
          note: string | null
          period_id: string
          planned: number | null
          spent: number | null
        }
        Insert: {
          amount?: number | null
          balance?: number | null
          category_id: string
          id?: string
          note?: string | null
          period_id: string
          planned?: number | null
          spent?: number | null
        }
        Update: {
          amount?: number | null
          balance?: number | null
          category_id?: string
          id?: string
          note?: string | null
          period_id?: string
          planned?: number | null
          spent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "money_entries_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "money_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "money_entries_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "money_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      money_one_offs: {
        Row: {
          amount: number
          created_at: string
          id: string
          period_id: string
          title: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          period_id: string
          title: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          period_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "money_one_offs_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "money_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      money_periods: {
        Row: {
          created_at: string
          id: string
          month: string
          note: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          month: string
          note?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          month?: string
          note?: string | null
        }
        Relationships: []
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
      saved_questions: {
        Row: {
          area: string | null
          created_at: string
          critical_question_id: string | null
          id: string
          started_at: string | null
          started_topic_id: string | null
          text: string
          title: string | null
          topic_id: string | null
        }
        Insert: {
          area?: string | null
          created_at?: string
          critical_question_id?: string | null
          id?: string
          started_at?: string | null
          started_topic_id?: string | null
          text: string
          title?: string | null
          topic_id?: string | null
        }
        Update: {
          area?: string | null
          created_at?: string
          critical_question_id?: string | null
          id?: string
          started_at?: string | null
          started_topic_id?: string | null
          text?: string
          title?: string | null
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_questions_critical_question_id_fkey"
            columns: ["critical_question_id"]
            isOneToOne: true
            referencedRelation: "critical_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_questions_started_topic_id_fkey"
            columns: ["started_topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_questions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
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
      speaking_exercises: {
        Row: {
          answer: string | null
          completed_at: string | null
          created_at: string
          feedback: Json | null
          follow_up_answer: string | null
          follow_up_feedback: Json | null
          id: string
          plan_day: number
          question: string
          revisit: string[]
          scenario: string
          skill: string
          spoken: boolean | null
          tip: string | null
          topic: string
        }
        Insert: {
          answer?: string | null
          completed_at?: string | null
          created_at?: string
          feedback?: Json | null
          follow_up_answer?: string | null
          follow_up_feedback?: Json | null
          id?: string
          plan_day: number
          question: string
          revisit?: string[]
          scenario: string
          skill: string
          spoken?: boolean | null
          tip?: string | null
          topic: string
        }
        Update: {
          answer?: string | null
          completed_at?: string | null
          created_at?: string
          feedback?: Json | null
          follow_up_answer?: string | null
          follow_up_feedback?: Json | null
          id?: string
          plan_day?: number
          question?: string
          revisit?: string[]
          scenario?: string
          skill?: string
          spoken?: boolean | null
          tip?: string | null
          topic?: string
        }
        Relationships: []
      }
      speaking_expressions: {
        Row: {
          created_at: string
          example: string
          exercise_id: string | null
          expression: string
          id: string
          last_used_at: string | null
          meaning: string
          times_used: number
        }
        Insert: {
          created_at?: string
          example: string
          exercise_id?: string | null
          expression: string
          id?: string
          last_used_at?: string | null
          meaning: string
          times_used?: number
        }
        Update: {
          created_at?: string
          example?: string
          exercise_id?: string | null
          expression?: string
          id?: string
          last_used_at?: string | null
          meaning?: string
          times_used?: number
        }
        Relationships: [
          {
            foreignKeyName: "speaking_expressions_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "speaking_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      speaking_profile: {
        Row: {
          challenges: string
          contexts: string[]
          created_at: string
          goals: string
          id: number
          level: string
          topics: string[]
          updated_at: string
        }
        Insert: {
          challenges: string
          contexts?: string[]
          created_at?: string
          goals: string
          id?: number
          level: string
          topics?: string[]
          updated_at?: string
        }
        Update: {
          challenges?: string
          contexts?: string[]
          created_at?: string
          goals?: string
          id?: number
          level?: string
          topics?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      strength_achievements: {
        Row: {
          achievement_id: string
          strength_id: string
        }
        Insert: {
          achievement_id: string
          strength_id: string
        }
        Update: {
          achievement_id?: string
          strength_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "strength_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strength_achievements_strength_id_fkey"
            columns: ["strength_id"]
            isOneToOne: false
            referencedRelation: "strengths"
            referencedColumns: ["id"]
          },
        ]
      }
      strengths: {
        Row: {
          created_at: string
          description: string | null
          id: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          title?: string
        }
        Relationships: []
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
          lesson_style: string
          level: string | null
          mastery_level: string | null
          researched_at: string | null
          source_text: string | null
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          interest_rating?: number | null
          lesson_style?: string
          level?: string | null
          mastery_level?: string | null
          researched_at?: string | null
          source_text?: string | null
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          interest_rating?: number | null
          lesson_style?: string
          level?: string | null
          mastery_level?: string | null
          researched_at?: string | null
          source_text?: string | null
          status?: string
          title?: string
        }
        Relationships: []
      }
      tutor_sessions: {
        Row: {
          created_at: string
          done: boolean
          id: string
          messages: Json
          summary: string[] | null
          topic_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          done?: boolean
          id?: string
          messages?: Json
          summary?: string[] | null
          topic_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          done?: boolean
          id?: string
          messages?: Json
          summary?: string[] | null
          topic_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutor_sessions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
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
      vocabulary_attempts: {
        Row: {
          answer: string
          confidence: number
          created_at: string
          duration_sec: number | null
          feedback: Json
          id: string
          score: number
          word_id: string
        }
        Insert: {
          answer: string
          confidence: number
          created_at?: string
          duration_sec?: number | null
          feedback: Json
          id?: string
          score: number
          word_id: string
        }
        Update: {
          answer?: string
          confidence?: number
          created_at?: string
          duration_sec?: number | null
          feedback?: Json
          id?: string
          score?: number
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vocabulary_attempts_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "vocabulary_words"
            referencedColumns: ["id"]
          },
        ]
      }
      vocabulary_words: {
        Row: {
          context: string | null
          created_at: string
          definition: string
          due_at: string
          examples: string[]
          id: string
          interval_days: number
          last_score: number | null
          part_of_speech: string | null
          step: number
          topic_id: string | null
          translation: string | null
          usage_note: string | null
          word: string
        }
        Insert: {
          context?: string | null
          created_at?: string
          definition: string
          due_at?: string
          examples?: string[]
          id?: string
          interval_days?: number
          last_score?: number | null
          part_of_speech?: string | null
          step?: number
          topic_id?: string | null
          translation?: string | null
          usage_note?: string | null
          word: string
        }
        Update: {
          context?: string | null
          created_at?: string
          definition?: string
          due_at?: string
          examples?: string[]
          id?: string
          interval_days?: number
          last_score?: number | null
          part_of_speech?: string | null
          step?: number
          topic_id?: string | null
          translation?: string | null
          usage_note?: string | null
          word?: string
        }
        Relationships: [
          {
            foreignKeyName: "vocabulary_words_topic_id_fkey"
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
