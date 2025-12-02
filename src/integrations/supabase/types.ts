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
      account_settings: {
        Row: {
          allow_messages_from: Database["public"]["Enums"]["post_privacy"]
          created_at: string | null
          id: string
          profile_visibility: Database["public"]["Enums"]["post_privacy"]
          show_birthdate: boolean | null
          show_email: boolean | null
          show_location: boolean | null
          show_online_status: boolean
          show_phone: boolean | null
          show_relationship: boolean | null
          show_work: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          allow_messages_from?: Database["public"]["Enums"]["post_privacy"]
          created_at?: string | null
          id?: string
          profile_visibility?: Database["public"]["Enums"]["post_privacy"]
          show_birthdate?: boolean | null
          show_email?: boolean | null
          show_location?: boolean | null
          show_online_status?: boolean
          show_phone?: boolean | null
          show_relationship?: boolean | null
          show_work?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          allow_messages_from?: Database["public"]["Enums"]["post_privacy"]
          created_at?: string | null
          id?: string
          profile_visibility?: Database["public"]["Enums"]["post_privacy"]
          show_birthdate?: boolean | null
          show_email?: boolean | null
          show_location?: boolean | null
          show_online_status?: boolean
          show_phone?: boolean | null
          show_relationship?: boolean | null
          show_work?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      admin_audit_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string | null
          details: Json | null
          id: string
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_audit_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      broadcast_messages: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string
          id: string
          message: string
          priority: string | null
          sent_at: string | null
          title: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by: string
          id?: string
          message: string
          priority?: string | null
          sent_at?: string | null
          title: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string
          id?: string
          message?: string
          priority?: string | null
          sent_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_messages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_messages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      comment_reactions: {
        Row: {
          comment_id: string
          created_at: string | null
          id: string
          reaction_type: Database["public"]["Enums"]["reaction_type"]
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string | null
          id?: string
          reaction_type: Database["public"]["Enums"]["reaction_type"]
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string | null
          id?: string
          reaction_type?: Database["public"]["Enums"]["reaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      comments: {
        Row: {
          created_at: string
          edit_history: Json | null
          edited_at: string | null
          id: string
          like_count: number | null
          parent_comment_id: string | null
          post_id: string
          reply_count: number | null
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          edit_history?: Json | null
          edited_at?: string | null
          id?: string
          like_count?: number | null
          parent_comment_id?: string | null
          post_id: string
          reply_count?: number | null
          text: string
          user_id: string
        }
        Update: {
          created_at?: string
          edit_history?: Json | null
          edited_at?: string | null
          id?: string
          like_count?: number | null
          parent_comment_id?: string | null
          post_id?: string
          reply_count?: number | null
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string | null
          last_read_at: string | null
          role: string | null
          unread_count: number
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          role?: string | null
          unread_count?: number
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          role?: string | null
          unread_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      conversations: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          title: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          title?: string | null
          type?: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          title?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      engagement_signals: {
        Row: {
          created_at: string
          id: string
          post_id: string
          signal_type: string
          signal_value: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          signal_type: string
          signal_value?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          signal_type?: string
          signal_value?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagement_signals_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_signals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_signals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      feed_variant_stats: {
        Row: {
          clicks: number | null
          created_at: string | null
          engagement_actions: number | null
          id: string
          impressions: number | null
          session_date: string | null
          time_spent_seconds: number | null
          updated_at: string | null
          user_id: string
          variant: string
        }
        Insert: {
          clicks?: number | null
          created_at?: string | null
          engagement_actions?: number | null
          id?: string
          impressions?: number | null
          session_date?: string | null
          time_spent_seconds?: number | null
          updated_at?: string | null
          user_id: string
          variant: string
        }
        Update: {
          clicks?: number | null
          created_at?: string | null
          engagement_actions?: number | null
          id?: string
          impressions?: number | null
          session_date?: string | null
          time_spent_seconds?: number | null
          updated_at?: string | null
          user_id?: string
          variant?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_variant_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_variant_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      feed_weights: {
        Row: {
          active: boolean
          created_at: string | null
          id: string
          updated_at: string | null
          variant: string
          w_engagement_prediction: number
          w_friend_score: number
          w_popularity_score: number
          w_recency_score: number
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          id?: string
          updated_at?: string | null
          variant?: string
          w_engagement_prediction?: number
          w_friend_score?: number
          w_popularity_score?: number
          w_recency_score?: number
        }
        Update: {
          active?: boolean
          created_at?: string | null
          id?: string
          updated_at?: string | null
          variant?: string
          w_engagement_prediction?: number
          w_friend_score?: number
          w_popularity_score?: number
          w_recency_score?: number
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      friend_requests: {
        Row: {
          created_at: string | null
          id: string
          receiver_id: string
          sender_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          receiver_id: string
          sender_id: string
          status: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          receiver_id?: string
          sender_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "friend_requests_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_requests_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "friend_requests_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_requests_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      gift_types: {
        Row: {
          animation_type: string
          created_at: string | null
          icon: string
          id: string
          name: string
          rarity: string
          value: number
        }
        Insert: {
          animation_type?: string
          created_at?: string | null
          icon: string
          id?: string
          name: string
          rarity?: string
          value: number
        }
        Update: {
          animation_type?: string
          created_at?: string | null
          icon?: string
          id?: string
          name?: string
          rarity?: string
          value?: number
        }
        Relationships: []
      }
      group_event_attendees: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "group_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_event_attendees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_event_attendees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      group_events: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          end_date: string | null
          group_id: string
          id: string
          location: string | null
          start_date: string
          title: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          end_date?: string | null
          group_id: string
          id?: string
          location?: string | null
          start_date: string
          title: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          end_date?: string | null
          group_id?: string
          id?: string
          location?: string | null
          start_date?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "group_events_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_join_requests: {
        Row: {
          created_at: string | null
          group_id: string
          id: string
          message: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          group_id: string
          id?: string
          message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          group_id?: string
          id?: string
          message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_join_requests_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_join_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_join_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "group_join_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_join_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string | null
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      group_messages: {
        Row: {
          content: string
          created_at: string | null
          group_id: string
          id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          group_id: string
          id?: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          group_id?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      group_posts: {
        Row: {
          content: string
          created_at: string | null
          group_id: string
          id: string
          media_type: string | null
          media_url: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          group_id: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          group_id?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_posts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      groups: {
        Row: {
          avatar_url: string | null
          cover_url: string | null
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          name: string
          privacy: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          cover_url?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          name: string
          privacy?: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          cover_url?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          privacy?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      hidden_friend_suggestions: {
        Row: {
          hidden_at: string | null
          hidden_user_id: string
          id: string
          user_id: string
        }
        Insert: {
          hidden_at?: string | null
          hidden_user_id: string
          id?: string
          user_id: string
        }
        Update: {
          hidden_at?: string | null
          hidden_user_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hidden_friend_suggestions_hidden_user_id_fkey"
            columns: ["hidden_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hidden_friend_suggestions_hidden_user_id_fkey"
            columns: ["hidden_user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "hidden_friend_suggestions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hidden_friend_suggestions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      live_chat_messages: {
        Row: {
          created_at: string | null
          id: string
          message: string
          stream_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          stream_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          stream_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_chat_messages_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      live_duo_invitations: {
        Row: {
          guest_id: string
          host_id: string
          id: string
          invited_at: string | null
          responded_at: string | null
          status: string
          stream_id: string
        }
        Insert: {
          guest_id: string
          host_id: string
          id?: string
          invited_at?: string | null
          responded_at?: string | null
          status?: string
          stream_id: string
        }
        Update: {
          guest_id?: string
          host_id?: string
          id?: string
          invited_at?: string | null
          responded_at?: string | null
          status?: string
          stream_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_duo_invitations_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_duo_invitations_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "live_duo_invitations_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_duo_invitations_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "live_duo_invitations_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      live_gifts: {
        Row: {
          created_at: string | null
          gift_type_id: string
          id: string
          quantity: number
          sender_id: string
          stream_id: string
          total_value: number
        }
        Insert: {
          created_at?: string | null
          gift_type_id: string
          id?: string
          quantity?: number
          sender_id: string
          stream_id: string
          total_value: number
        }
        Update: {
          created_at?: string | null
          gift_type_id?: string
          id?: string
          quantity?: number
          sender_id?: string
          stream_id?: string
          total_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "live_gifts_gift_type_id_fkey"
            columns: ["gift_type_id"]
            isOneToOne: false
            referencedRelation: "gift_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_gifts_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_gifts_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "live_gifts_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      live_reactions: {
        Row: {
          created_at: string | null
          id: string
          reaction_type: string
          stream_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          reaction_type: string
          stream_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          reaction_type?: string
          stream_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_reactions_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      live_stream_participants: {
        Row: {
          created_at: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          joined_at: string | null
          role: string
          status: string
          stream_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          role?: string
          status?: string
          stream_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          role?: string
          status?: string
          stream_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_stream_participants_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_stream_participants_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "live_stream_participants_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_stream_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_stream_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      live_streams: {
        Row: {
          created_at: string | null
          description: string | null
          duo_guest_id: string | null
          ended_at: string | null
          id: string
          is_duo: boolean | null
          started_at: string | null
          status: string
          stream_url: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          user_id: string
          viewer_count: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duo_guest_id?: string | null
          ended_at?: string | null
          id?: string
          is_duo?: boolean | null
          started_at?: string | null
          status?: string
          stream_url?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          user_id: string
          viewer_count?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duo_guest_id?: string | null
          ended_at?: string | null
          id?: string
          is_duo?: boolean | null
          started_at?: string | null
          status?: string
          stream_url?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          viewer_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "live_streams_duo_guest_id_fkey"
            columns: ["duo_guest_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_streams_duo_guest_id_fkey"
            columns: ["duo_guest_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "live_streams_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_streams_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      marketplace_orders: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          message: string | null
          product_id: string
          quantity: number
          seller_id: string
          status: string
          total_price: number
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          message?: string | null
          product_id: string
          quantity?: number
          seller_id: string
          status?: string
          total_price: number
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          message?: string | null
          product_id?: string
          quantity?: number
          seller_id?: string
          status?: string
          total_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "marketplace_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "marketplace_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      marketplace_products: {
        Row: {
          category: string
          condition: string | null
          created_at: string
          description: string | null
          id: string
          images: string[] | null
          location: string | null
          price: number
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          condition?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          location?: string | null
          price: number
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          condition?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          location?: string | null
          price?: number
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_products_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_products_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      message_status: {
        Row: {
          created_at: string | null
          delivered_at: string | null
          id: string
          message_id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          message_id: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          message_id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_status_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_status_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_status_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          content: string
          conversation_id: string
          created_at: string | null
          edited: boolean | null
          id: string
          pinned_at: string | null
          pinned_by: string | null
          reactions: Json | null
          read: boolean | null
          reply_to: string | null
          sender_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          content: string
          conversation_id: string
          created_at?: string | null
          edited?: boolean | null
          id?: string
          pinned_at?: string | null
          pinned_by?: string | null
          reactions?: Json | null
          read?: boolean | null
          reply_to?: string | null
          sender_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string
          conversation_id?: string
          created_at?: string | null
          edited?: boolean | null
          id?: string
          pinned_at?: string | null
          pinned_by?: string | null
          reactions?: Json | null
          read?: boolean | null
          reply_to?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_pinned_by_fkey"
            columns: ["pinned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_pinned_by_fkey"
            columns: ["pinned_by"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      moderation_queue: {
        Row: {
          content_id: string
          content_type: string
          created_at: string | null
          id: string
          metadata: Json | null
          moderator_id: string | null
          moderator_notes: string | null
          priority: string | null
          reason: string | null
          reporter_id: string | null
          reviewed_at: string | null
          status: string | null
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          moderator_id?: string | null
          moderator_notes?: string | null
          priority?: string | null
          reason?: string | null
          reporter_id?: string | null
          reviewed_at?: string | null
          status?: string | null
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          moderator_id?: string | null
          moderator_notes?: string | null
          priority?: string | null
          reason?: string | null
          reporter_id?: string | null
          reviewed_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moderation_queue_moderator_id_fkey"
            columns: ["moderator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_queue_moderator_id_fkey"
            columns: ["moderator_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "moderation_queue_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_queue_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          id: string
          metadata: Json
          read: boolean
          sender_id: string | null
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          read?: boolean
          sender_id?: string | null
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          read?: boolean
          sender_id?: string | null
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      photo_albums: {
        Row: {
          cover_photo_url: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          privacy: string
          system_album: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cover_photo_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          privacy?: string
          system_album?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cover_photo_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          privacy?: string
          system_album?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_albums_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_albums_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      photo_tags: {
        Row: {
          created_at: string | null
          id: string
          photo_id: string
          position_x: number | null
          position_y: number | null
          tagged_by: string
          tagged_user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          photo_id: string
          position_x?: number | null
          position_y?: number | null
          tagged_by: string
          tagged_user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          photo_id?: string
          position_x?: number | null
          position_y?: number | null
          tagged_by?: string
          tagged_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_tags_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_tags_tagged_by_fkey"
            columns: ["tagged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_tags_tagged_by_fkey"
            columns: ["tagged_by"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "photo_tags_tagged_user_id_fkey"
            columns: ["tagged_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_tags_tagged_user_id_fkey"
            columns: ["tagged_user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      photos: {
        Row: {
          album_id: string | null
          caption: string | null
          created_at: string | null
          id: string
          image_url: string
          location: string | null
          privacy: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          album_id?: string | null
          caption?: string | null
          created_at?: string | null
          id?: string
          image_url: string
          location?: string | null
          privacy?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          album_id?: string | null
          caption?: string | null
          created_at?: string | null
          id?: string
          image_url?: string
          location?: string | null
          privacy?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photos_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "photo_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          category: string
          description: string | null
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          category: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          category?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "platform_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      post_drafts: {
        Row: {
          background_color: string | null
          content: string | null
          created_at: string | null
          feeling: string | null
          id: string
          location: string | null
          media_data: Json | null
          privacy: string | null
          tagged_users: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          background_color?: string | null
          content?: string | null
          created_at?: string | null
          feeling?: string | null
          id?: string
          location?: string | null
          media_data?: Json | null
          privacy?: string | null
          tagged_users?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          background_color?: string | null
          content?: string | null
          created_at?: string | null
          feeling?: string | null
          id?: string
          location?: string | null
          media_data?: Json | null
          privacy?: string | null
          tagged_users?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_drafts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_drafts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      post_media: {
        Row: {
          created_at: string | null
          duration: number | null
          height: number | null
          id: string
          media_order: number
          media_type: string
          media_url: string
          order_index: number
          post_id: string
          size_bytes: number | null
          thumbnail_url: string | null
          width: number | null
        }
        Insert: {
          created_at?: string | null
          duration?: number | null
          height?: number | null
          id?: string
          media_order?: number
          media_type: string
          media_url: string
          order_index?: number
          post_id: string
          size_bytes?: number | null
          thumbnail_url?: string | null
          width?: number | null
        }
        Update: {
          created_at?: string | null
          duration?: number | null
          height?: number | null
          id?: string
          media_order?: number
          media_type?: string
          media_url?: string
          order_index?: number
          post_id?: string
          size_bytes?: number | null
          thumbnail_url?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "post_media_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          reaction_type: Database["public"]["Enums"]["reaction_type"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          reaction_type: Database["public"]["Enums"]["reaction_type"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          reaction_type?: Database["public"]["Enums"]["reaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      post_shares: {
        Row: {
          created_at: string
          id: string
          post_id: string
          share_message: string | null
          share_type: string
          shared_by: string
          shared_with_group_id: string | null
          shared_with_user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          share_message?: string | null
          share_type: string
          shared_by: string
          shared_with_group_id?: string | null
          shared_with_user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          share_message?: string | null
          share_type?: string
          shared_by?: string
          shared_with_group_id?: string | null
          shared_with_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_shares_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_shares_shared_by_fkey"
            columns: ["shared_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_shares_shared_by_fkey"
            columns: ["shared_by"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "post_shares_shared_with_group_id_fkey"
            columns: ["shared_with_group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_shares_shared_with_user_id_fkey"
            columns: ["shared_with_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_shares_shared_with_user_id_fkey"
            columns: ["shared_with_user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      post_stats: {
        Row: {
          comments_count: number
          engagement_score: number
          last_updated_at: string
          likes_count: number
          post_id: string
          shares_count: number
          views_count: number
        }
        Insert: {
          comments_count?: number
          engagement_score?: number
          last_updated_at?: string
          likes_count?: number
          post_id: string
          shares_count?: number
          views_count?: number
        }
        Update: {
          comments_count?: number
          engagement_score?: number
          last_updated_at?: string
          likes_count?: number
          post_id?: string
          shares_count?: number
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "post_stats_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: true
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_tags: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          tagged_by: string
          tagged_user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          tagged_by: string
          tagged_user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          tagged_by?: string
          tagged_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_tags_tagged_by_fkey"
            columns: ["tagged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_tags_tagged_by_fkey"
            columns: ["tagged_by"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "post_tags_tagged_user_id_fkey"
            columns: ["tagged_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_tags_tagged_user_id_fkey"
            columns: ["tagged_user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      post_views: {
        Row: {
          id: string
          post_id: string
          viewed_at: string | null
          viewer_id: string
        }
        Insert: {
          id?: string
          post_id: string
          viewed_at?: string | null
          viewer_id: string
        }
        Update: {
          id?: string
          post_id?: string
          viewed_at?: string | null
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_views_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      posts: {
        Row: {
          background_color: string | null
          content: string
          created_at: string
          edit_history: Json | null
          edited_at: string | null
          feeling: string | null
          id: string
          link_preview: Json | null
          location: string | null
          media_type: Database["public"]["Enums"]["media_type"] | null
          media_url: string | null
          privacy: Database["public"]["Enums"]["post_privacy"]
          scheduled_for: string | null
          share_count: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          background_color?: string | null
          content: string
          created_at?: string
          edit_history?: Json | null
          edited_at?: string | null
          feeling?: string | null
          id?: string
          link_preview?: Json | null
          location?: string | null
          media_type?: Database["public"]["Enums"]["media_type"] | null
          media_url?: string | null
          privacy?: Database["public"]["Enums"]["post_privacy"]
          scheduled_for?: string | null
          share_count?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          background_color?: string | null
          content?: string
          created_at?: string
          edit_history?: Json | null
          edited_at?: string | null
          feeling?: string | null
          id?: string
          link_preview?: Json | null
          location?: string | null
          media_type?: Database["public"]["Enums"]["media_type"] | null
          media_url?: string | null
          privacy?: Database["public"]["Enums"]["post_privacy"]
          scheduled_for?: string | null
          share_count?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          ban_reason: string | null
          ban_until: string | null
          banned_at: string | null
          banned_by: string | null
          bio: string | null
          birthdate: string | null
          city: string | null
          country: string | null
          cover_photo_url: string | null
          created_at: string
          current_city: string | null
          education: string | null
          hometown: string | null
          id: string
          name: string
          phone: string | null
          public_email: string | null
          region: string | null
          relationship_status: string | null
          status: string | null
          username: string
          website: string | null
          work: string | null
        }
        Insert: {
          avatar_url?: string | null
          ban_reason?: string | null
          ban_until?: string | null
          banned_at?: string | null
          banned_by?: string | null
          bio?: string | null
          birthdate?: string | null
          city?: string | null
          country?: string | null
          cover_photo_url?: string | null
          created_at?: string
          current_city?: string | null
          education?: string | null
          hometown?: string | null
          id: string
          name: string
          phone?: string | null
          public_email?: string | null
          region?: string | null
          relationship_status?: string | null
          status?: string | null
          username: string
          website?: string | null
          work?: string | null
        }
        Update: {
          avatar_url?: string | null
          ban_reason?: string | null
          ban_until?: string | null
          banned_at?: string | null
          banned_by?: string | null
          bio?: string | null
          birthdate?: string | null
          city?: string | null
          country?: string | null
          cover_photo_url?: string | null
          created_at?: string
          current_city?: string | null
          education?: string | null
          hometown?: string | null
          id?: string
          name?: string
          phone?: string | null
          public_email?: string | null
          region?: string | null
          relationship_status?: string | null
          status?: string | null
          username?: string
          website?: string | null
          work?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_banned_by_fkey"
            columns: ["banned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_banned_by_fkey"
            columns: ["banned_by"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          request_count: number | null
          user_id: string
          window_start: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          request_count?: number | null
          user_id: string
          window_start?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          request_count?: number | null
          user_id?: string
          window_start?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          id: string
          reason: string
          reporter_id: string
          target_comment_id: string | null
          target_post_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          reporter_id: string
          target_comment_id?: string | null
          target_post_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          reporter_id?: string
          target_comment_id?: string | null
          target_post_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reports_target_comment_id_fkey"
            columns: ["target_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_target_post_id_fkey"
            columns: ["target_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      stories: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          media_type: string
          media_url: string
          text: string | null
          text_color: string | null
          text_position: Json | null
          text_size: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          media_type: string
          media_url: string
          text?: string | null
          text_color?: string | null
          text_position?: Json | null
          text_size?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          media_type?: string
          media_url?: string
          text?: string | null
          text_color?: string | null
          text_position?: Json | null
          text_size?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      story_reactions: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          slider_value: number | null
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string
          slider_value?: number | null
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          slider_value?: number | null
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_reactions_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      story_replies: {
        Row: {
          content: string
          created_at: string | null
          id: string
          story_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          story_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_replies_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_replies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_replies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      story_views: {
        Row: {
          id: string
          story_id: string
          viewed_at: string | null
          viewer_id: string
        }
        Insert: {
          id?: string
          story_id: string
          viewed_at?: string | null
          viewer_id: string
        }
        Update: {
          id?: string
          story_id?: string
          viewed_at?: string | null
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      timeline_items: {
        Row: {
          affinity_score: number | null
          content_type_weight: number | null
          created_at: string | null
          engagement_score: number | null
          id: string
          impression_count: number | null
          last_seen_at: string | null
          post_id: string
          ranking_score: number | null
          recency_decay: number | null
          updated_at: string | null
          user_id: string
          variant: string | null
        }
        Insert: {
          affinity_score?: number | null
          content_type_weight?: number | null
          created_at?: string | null
          engagement_score?: number | null
          id?: string
          impression_count?: number | null
          last_seen_at?: string | null
          post_id: string
          ranking_score?: number | null
          recency_decay?: number | null
          updated_at?: string | null
          user_id: string
          variant?: string | null
        }
        Update: {
          affinity_score?: number | null
          content_type_weight?: number | null
          created_at?: string | null
          engagement_score?: number | null
          id?: string
          impression_count?: number | null
          last_seen_at?: string | null
          post_id?: string
          ranking_score?: number | null
          recency_decay?: number | null
          updated_at?: string | null
          user_id?: string
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timeline_items_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_affinity: {
        Row: {
          affinity_score: number | null
          id: string
          interaction_count: number | null
          last_interaction_at: string | null
          target_user_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          affinity_score?: number | null
          id?: string
          interaction_count?: number | null
          last_interaction_at?: string | null
          target_user_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          affinity_score?: number | null
          id?: string
          interaction_count?: number | null
          last_interaction_at?: string | null
          target_user_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_affinity_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_affinity_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_affinity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_affinity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_content_preferences: {
        Row: {
          content_type: string
          id: string
          preference_score: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content_type: string
          id?: string
          preference_score?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content_type?: string
          id?: string
          preference_score?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_content_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_content_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_engagement_signals: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          signal_type: string
          signal_value: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          signal_type: string
          signal_value?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          signal_type?: string
          signal_value?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_engagement_signals_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_engagement_signals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_engagement_signals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_interactions: {
        Row: {
          created_at: string | null
          id: string
          interaction_type: string
          target_user_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          interaction_type: string
          target_user_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          interaction_type?: string
          target_user_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_interactions_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_interactions_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_interactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_interactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_interests: {
        Row: {
          created_at: string | null
          id: string
          interest: string
          user_id: string
          weight: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          interest: string
          user_id: string
          weight?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          interest?: string
          user_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_interests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_interests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_notification_settings: {
        Row: {
          comments: boolean | null
          created_at: string | null
          email_notifications: boolean | null
          friend_requests: boolean | null
          id: string
          likes: boolean | null
          messages: boolean | null
          push_notifications: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comments?: boolean | null
          created_at?: string | null
          email_notifications?: boolean | null
          friend_requests?: boolean | null
          id?: string
          likes?: boolean | null
          messages?: boolean | null
          push_notifications?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comments?: boolean | null
          created_at?: string | null
          email_notifications?: boolean | null
          friend_requests?: boolean | null
          id?: string
          likes?: boolean | null
          messages?: boolean | null
          push_notifications?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notification_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notification_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_presence: {
        Row: {
          last_seen: string | null
          online: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          last_seen?: string | null
          online?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          last_seen?: string | null
          online?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_presence_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_presence_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          followers_count: number
          following_count: number
          last_updated_at: string
          likes_received: number
          posts_count: number
          user_id: string
        }
        Insert: {
          followers_count?: number
          following_count?: number
          last_updated_at?: string
          likes_received?: number
          posts_count?: number
          user_id: string
        }
        Update: {
          followers_count?: number
          following_count?: number
          last_updated_at?: string
          likes_received?: number
          posts_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      mutual_friends_cache: {
        Row: {
          mutual_count: number | null
          user1_id: string | null
          user2_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "friend_requests_sender_id_fkey"
            columns: ["user1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_requests_sender_id_fkey"
            columns: ["user2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_requests_sender_id_fkey"
            columns: ["user1_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "friend_requests_sender_id_fkey"
            columns: ["user2_id"]
            isOneToOne: false
            referencedRelation: "user_stats_mv"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_stats_mv: {
        Row: {
          followers_count: number | null
          following_count: number | null
          friends_count: number | null
          posts_count: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      are_friends: {
        Args: { user1_id: string; user2_id: string }
        Returns: boolean
      }
      ban_user: {
        Args: { p_duration_days?: number; p_reason: string; p_user_id: string }
        Returns: undefined
      }
      batch_delete_old_messages: {
        Args: { p_conversation_id: string; p_older_than: unknown }
        Returns: number
      }
      batch_mark_notifications_read: {
        Args: { p_notification_ids: string[]; p_user_id: string }
        Returns: undefined
      }
      calculate_affinity_score: {
        Args: { p_author_id: string; p_user_id: string }
        Returns: number
      }
      calculate_engagement_score: {
        Args: { p_post_id: string }
        Returns: number
      }
      calculate_ranking_score: {
        Args: {
          p_affinity_score: number
          p_content_type_weight: number
          p_engagement_score: number
          p_recency_decay: number
          w1?: number
          w2?: number
          w3?: number
          w4?: number
        }
        Returns: number
      }
      calculate_recency_decay: {
        Args: { post_created_at: string }
        Returns: number
      }
      check_can_view_presence: {
        Args: { target_id: string; viewer_id: string }
        Returns: boolean
      }
      check_friendship: {
        Args: { user1_id: string; user2_id: string }
        Returns: boolean
      }
      check_rate_limit: {
        Args: { p_endpoint: string; p_max_requests?: number; p_user_id: string }
        Returns: boolean
      }
      cleanup_old_ended_streams: { Args: never; Returns: undefined }
      cleanup_old_engagement_signals: { Args: never; Returns: undefined }
      cleanup_old_notifications: { Args: never; Returns: undefined }
      cleanup_old_typing_status: { Args: never; Returns: undefined }
      cleanup_orphaned_presence: { Args: never; Returns: undefined }
      cleanup_rate_limits: { Args: never; Returns: undefined }
      create_conversation_with_participant: {
        Args: { other_user_id: string }
        Returns: string
      }
      create_marketplace_order_rpc: {
        Args: {
          p_message?: string
          p_product_id: string
          p_quantity: number
          p_seller_id: string
          p_total_price: number
        }
        Returns: string
      }
      delete_comment_rpc: {
        Args: { target_comment_id: string }
        Returns: undefined
      }
      delete_post_rpc: { Args: { target_post_id: string }; Returns: undefined }
      delete_user_rpc: { Args: { target_user_id: string }; Returns: undefined }
      ensure_system_albums: {
        Args: { user_id_param: string }
        Returns: undefined
      }
      force_reset_unread_count: {
        Args: { p_conversation_id: string; p_user_id: string }
        Returns: undefined
      }
      get_activity_by_hour: {
        Args: { user_id_param: string }
        Returns: {
          activity_count: number
          hour_of_day: number
        }[]
      }
      get_advanced_friend_suggestions: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_user_id: string
          w_common_groups?: number
          w_interactions?: number
          w_interests?: number
          w_location?: number
          w_mutual_friends?: number
        }
        Returns: {
          avatar_url: string
          bio: string
          city: string
          common_groups_count: number
          country: string
          final_score: number
          interaction_score: number
          interest_similarity: number
          location_score: number
          mutual_friends_count: number
          name: string
          region: string
          suggestion_reasons: Json
          user_id: string
          username: string
        }[]
      }
      get_batch_friend_suggestions: {
        Args: {
          limit_param?: number
          offset_param?: number
          user_id_param: string
        }
        Returns: {
          avatar_url: string
          bio: string
          city: string
          country: string
          id: string
          interaction_score: number
          is_new_user: boolean
          mutual_friends_count: number
          name: string
          region: string
          same_location: boolean
          suggestion_score: number
          username: string
        }[]
      }
      get_common_groups_count: {
        Args: { p_candidate_id: string; p_user_id: string }
        Returns: number
      }
      get_content_type_weight: {
        Args: { p_media_type: string }
        Returns: number
      }
      get_conversation_messages_optimized: {
        Args: { p_conversation_id: string; p_limit?: number; p_user_id: string }
        Returns: {
          attachment_name: string
          attachment_type: string
          attachment_url: string
          content: string
          conversation_id: string
          created_at: string
          delivered_at: string
          edited: boolean
          id: string
          pinned_at: string
          pinned_by: string
          reactions: Json
          read: boolean
          read_at: string
          reply_to: string
          sender_avatar_url: string
          sender_id: string
          sender_name: string
          sender_username: string
        }[]
      }
      get_daily_engagement: {
        Args: { days_param?: number; user_id_param: string }
        Returns: {
          comments_count: number
          date: string
          likes_count: number
          posts_count: number
          views_count: number
        }[]
      }
      get_friend_interaction_stats: {
        Args: { p_friend_id: string; p_user_id: string }
        Returns: {
          comments_count: number
          last_interaction: string
          posts_liked: number
        }[]
      }
      get_friend_suggestions: {
        Args: { limit_param?: number; user_id_param: string }
        Returns: {
          avatar_url: string
          bio: string
          city: string
          country: string
          id: string
          mutual_friends_count: number
          name: string
          region: string
          same_location: boolean
          username: string
        }[]
      }
      get_friends_paginated: {
        Args: {
          p_limit?: number
          p_location_filter?: string
          p_offset?: number
          p_search?: string
          p_user_id: string
        }
        Returns: {
          created_at: string
          id: string
          receiver_id: string
          receiver_profile: Json
          sender_id: string
          sender_profile: Json
        }[]
      }
      get_interaction_score: {
        Args: { p_candidate_id: string; p_user_id: string }
        Returns: number
      }
      get_interest_similarity: {
        Args: { p_candidate_id: string; p_user_id: string }
        Returns: number
      }
      get_location_score: {
        Args: { p_candidate_id: string; p_user_id: string }
        Returns: number
      }
      get_mutual_friends_count: {
        Args: { p_candidate_id: string; p_user_id: string }
        Returns: number
      }
      get_mutual_friends_count_cached: {
        Args: { user1_id: string; user2_id: string }
        Returns: number
      }
      get_online_friends_optimized: {
        Args: { user_id_param: string }
        Returns: {
          avatar_url: string
          conversation_id: string
          id: string
          last_seen: string
          name: string
          online: boolean
          unread_count: number
          username: string
        }[]
      }
      get_personalized_feed: {
        Args: {
          filter_type?: string
          limit_param?: number
          offset_param?: number
          user_id_param: string
        }
        Returns: {
          avatar_url: string
          comments_count: number
          content: string
          created_at: string
          id: string
          likes_count: number
          media_type: Database["public"]["Enums"]["media_type"]
          media_url: string
          name: string
          privacy: Database["public"]["Enums"]["post_privacy"]
          relevance_score: number
          updated_at: string
          user_id: string
          user_liked: boolean
          username: string
        }[]
      }
      get_personalized_feed_optimized: {
        Args: {
          filter_type?: string
          limit_param?: number
          offset_param?: number
          user_id_param: string
        }
        Returns: {
          avatar_url: string
          comments_count: number
          content: string
          created_at: string
          id: string
          likes_count: number
          media_type: Database["public"]["Enums"]["media_type"]
          media_url: string
          name: string
          privacy: Database["public"]["Enums"]["post_privacy"]
          relevance_score: number
          updated_at: string
          user_id: string
          user_liked: boolean
          username: string
        }[]
      }
      get_personalized_timeline: {
        Args: { p_limit?: number; p_offset?: number; p_user_id: string }
        Returns: {
          avatar_url: string
          comments_count: number
          content: string
          created_at: string
          id: string
          likes_count: number
          media_type: string
          media_url: string
          name: string
          privacy: string
          ranking_score: number
          shares_count: number
          updated_at: string
          user_id: string
          user_liked: boolean
          username: string
          variant: string
          views_count: number
        }[]
      }
      get_platform_stats: {
        Args: never
        Returns: {
          active_users_today: number
          new_users_this_week: number
          total_messages: number
          total_posts: number
          total_stories: number
          total_users: number
        }[]
      }
      get_profile_completeness: {
        Args: { user_id_param: string }
        Returns: {
          completeness_score: number
          missing_fields: string[]
        }[]
      }
      get_shared_posts_optimized: {
        Args: { limit_param?: number; user_id_param: string }
        Returns: {
          created_at: string
          id: string
          original_post: Json
          post_id: string
          share_message: string
          share_type: string
          shared_by: string
          shared_by_profile: Json
        }[]
      }
      get_smart_feed: {
        Args: {
          filter_type?: string
          limit_param?: number
          offset_param?: number
          user_id_param: string
        }
        Returns: {
          avatar_url: string
          comments_count: number
          content: string
          created_at: string
          engagement_prediction: number
          final_score: number
          id: string
          likes_count: number
          media_type: string
          media_url: string
          name: string
          privacy: string
          relevance_score: number
          shares_count: number
          updated_at: string
          user_id: string
          user_liked: boolean
          username: string
          views_count: number
        }[]
      }
      get_smart_feed_optimized: {
        Args: {
          filter_type?: string
          limit_param?: number
          offset_param?: number
          user_id_param: string
        }
        Returns: {
          avatar_url: string
          comments_count: number
          content: string
          created_at: string
          engagement_prediction: number
          final_score: number
          id: string
          likes_count: number
          media: Json
          media_type: string
          media_url: string
          name: string
          privacy: string
          relevance_score: number
          shares_count: number
          tags: Json
          updated_at: string
          user_id: string
          user_liked: boolean
          username: string
          views_count: number
        }[]
      }
      get_table_sizes: {
        Args: never
        Returns: {
          index_size: string
          row_count: number
          table_name: string
          total_size: string
        }[]
      }
      get_top_posts: {
        Args: { limit_param?: number; user_id_param: string }
        Returns: {
          comments_count: number
          content: string
          created_at: string
          engagement_score: number
          likes_count: number
          post_id: string
          views_count: number
        }[]
      }
      get_total_unread_for_user: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_total_unread_notifications: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_trending_posts: {
        Args: { limit_param?: number }
        Returns: {
          avatar_url: string
          comments_count: number
          content: string
          created_at: string
          engagement_score: number
          id: string
          likes_count: number
          media_url: string
          name: string
          shares_count: number
          user_id: string
          username: string
          views_count: number
        }[]
      }
      get_unread_messages_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_user_analytics: {
        Args: { days_param?: number; user_id_param: string }
        Returns: {
          avg_engagement_rate: number
          likes_growth: number
          posts_growth: number
          total_comments: number
          total_friends: number
          total_likes: number
          total_posts: number
          total_views: number
        }[]
      }
      get_user_stats: {
        Args: { user_id_param: string }
        Returns: {
          followers_count: number
          following_count: number
          friends_count: number
          posts_count: number
        }[]
      }
      get_user_stats_cached: {
        Args: { user_id_param: string }
        Returns: {
          followers_count: number
          following_count: number
          friends_count: number
          posts_count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_user: { Args: { check_user_id: string }; Returns: boolean }
      is_conversation_participant: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_group_admin: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_group_creator: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_group_public: { Args: { _group_id: string }; Returns: boolean }
      log_admin_action: {
        Args: {
          p_action: string
          p_details?: Json
          p_target_id: string
          p_target_type: string
        }
        Returns: string
      }
      mark_all_notifications_read: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      mark_messages_as_read: {
        Args: { p_message_ids: string[]; p_user_id: string }
        Returns: undefined
      }
      populate_timeline_for_user: {
        Args: {
          p_limit?: number
          p_user_id: string
          w1?: number
          w2?: number
          w3?: number
          w4?: number
        }
        Returns: number
      }
      promote_to_admin_rpc: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      publish_scheduled_posts: { Args: never; Returns: undefined }
      record_engagement_signal: {
        Args: {
          p_post_id: string
          p_signal_type: string
          p_signal_value?: number
          p_user_id: string
        }
        Returns: undefined
      }
      refresh_mutual_friends_cache: { Args: never; Returns: undefined }
      refresh_user_stats_mv: { Args: never; Returns: undefined }
      reset_unread_count: {
        Args: { p_conversation_id: string; p_user_id: string }
        Returns: undefined
      }
      sanitize_text: { Args: { input_text: string }; Returns: string }
      send_broadcast_to_users: {
        Args: { p_broadcast_id: string; p_message: string; p_title: string }
        Returns: undefined
      }
      suspend_user_rpc: {
        Args: { p_duration_days: number; p_reason: string; p_user_id: string }
        Returns: undefined
      }
      unban_user: { Args: { p_user_id: string }; Returns: undefined }
      update_typing_status: {
        Args: {
          p_conversation_id: string
          p_is_typing: boolean
          p_user_id: string
        }
        Returns: undefined
      }
      update_typing_status_throttled: {
        Args: {
          p_conversation_id: string
          p_is_typing: boolean
          p_user_id: string
        }
        Returns: undefined
      }
      update_user_presence: {
        Args: { p_online: boolean; p_user_id: string }
        Returns: undefined
      }
      validate_text_content: {
        Args: { content: string; max_length: number }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      media_type: "image" | "video"
      notification_type: "like" | "comment" | "follow" | "live_stream"
      post_privacy: "public" | "friends" | "private"
      reaction_type: "like" | "love" | "haha" | "wow" | "sad" | "angry"
      user_role: "user" | "admin"
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
      app_role: ["admin", "moderator", "user"],
      media_type: ["image", "video"],
      notification_type: ["like", "comment", "follow", "live_stream"],
      post_privacy: ["public", "friends", "private"],
      reaction_type: ["like", "love", "haha", "wow", "sad", "angry"],
      user_role: ["user", "admin"],
    },
  },
} as const
