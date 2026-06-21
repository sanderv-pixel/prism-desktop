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
      advertiser_transactions: {
        Row: {
          advertiser_id: string
          amount_cents: number
          balance_after_cents: number
          campaign_id: string | null
          created_at: string
          description: string | null
          id: string
          is_test: boolean
          stripe_payment_intent_id: string | null
          type: string
        }
        Insert: {
          advertiser_id: string
          amount_cents: number
          balance_after_cents: number
          campaign_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_test?: boolean
          stripe_payment_intent_id?: string | null
          type: string
        }
        Update: {
          advertiser_id?: string
          amount_cents?: number
          balance_after_cents?: number
          campaign_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_test?: boolean
          stripe_payment_intent_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "advertiser_transactions_advertiser_id_fkey"
            columns: ["advertiser_id"]
            isOneToOne: false
            referencedRelation: "advertisers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advertiser_transactions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      advertisers: {
        Row: {
          auto_recharge_amount_cents: number
          auto_recharge_enabled: boolean
          auto_recharge_threshold_cents: number
          balance_cents: number
          balance_millicents: number
          conversion_api_key: string | null
          created_at: string
          default_payment_method_id: string | null
          email: string
          last_auto_recharge_at: string | null
          id: string
          lifetime_deposits_cents: number
          name: string
          notify_budget: boolean
          notify_campaign_status: boolean
          notify_low_balance: boolean
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          balance_cents?: number
          balance_millicents?: number
          auto_recharge_amount_cents?: number
          auto_recharge_enabled?: boolean
          auto_recharge_threshold_cents?: number
          conversion_api_key?: string | null
          created_at?: string
          default_payment_method_id?: string | null
          last_auto_recharge_at?: string | null
          email: string
          id?: string
          lifetime_deposits_cents?: number
          notify_budget?: boolean
          notify_campaign_status?: boolean
          notify_low_balance?: boolean
          name: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          balance_cents?: number
          balance_millicents?: number
          auto_recharge_amount_cents?: number
          auto_recharge_enabled?: boolean
          auto_recharge_threshold_cents?: number
          conversion_api_key?: string | null
          created_at?: string
          default_payment_method_id?: string | null
          last_auto_recharge_at?: string | null
          email?: string
          id?: string
          lifetime_deposits_cents?: number
          notify_budget?: boolean
          notify_campaign_status?: boolean
          notify_low_balance?: boolean
          name?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      anomaly_events: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string
          details: Json | null
          id: string
          severity: string
          type: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          severity: string
          type: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          severity?: string
          type?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      builder_identities: {
        Row: {
          anonymous_user_id: string
          auth_user_id: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          anonymous_user_id: string
          auth_user_id: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          anonymous_user_id?: string
          auth_user_id?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      builder_payout_settings: {
        Row: {
          auth_user_id: string
          charges_enabled: boolean
          country: string | null
          created_at: string
          currency: string | null
          id: string
          kyc_status: string
          notify_payout: boolean
          notify_product: boolean
          onboarding_complete: boolean
          payout_provider: string | null
          payouts_enabled: boolean
          recipient_details: Json | null
          stripe_connect_account_id: string | null
          updated_at: string
        }
        Insert: {
          auth_user_id: string
          charges_enabled?: boolean
          country?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          kyc_status?: string
          notify_payout?: boolean
          notify_product?: boolean
          onboarding_complete?: boolean
          payout_provider?: string | null
          payouts_enabled?: boolean
          recipient_details?: Json | null
          stripe_connect_account_id?: string | null
          updated_at?: string
        }
        Update: {
          auth_user_id?: string
          charges_enabled?: boolean
          country?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          kyc_status?: string
          notify_payout?: boolean
          notify_product?: boolean
          onboarding_complete?: boolean
          payout_provider?: string | null
          payouts_enabled?: boolean
          recipient_details?: Json | null
          stripe_connect_account_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      campaign_creatives: {
        Row: {
          brand_name: string | null
          campaign_id: string
          click_count: number
          copy: string
          created_at: string
          icon_url: string | null
          id: string
          impression_count: number
          status: string
          url: string
        }
        Insert: {
          brand_name?: string | null
          campaign_id: string
          click_count?: number
          copy: string
          created_at?: string
          icon_url?: string | null
          id?: string
          impression_count?: number
          status?: string
          url: string
        }
        Update: {
          brand_name?: string | null
          campaign_id?: string
          click_count?: number
          copy?: string
          created_at?: string
          icon_url?: string | null
          id?: string
          impression_count?: number
          status?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_creatives_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_daily_spend: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          impressions: number
          spend_date: string
          spent_cents: number
          spent_millicents: number
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          impressions?: number
          spend_date: string
          spent_cents?: number
          spent_millicents?: number
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          impressions?: number
          spend_date?: string
          spent_cents?: number
          spent_millicents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_daily_spend_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          advertiser_id: string
          bid_type: string
          brand_name: string | null
          budget_cents: number
          click_count: number
          contexts: string[]
          copy: string
          created_at: string
          daily_budget_cents: number | null
          end_date: string | null
          frequency_cap: number | null
          frequency_window_hours: number | null
          icon_url: string | null
          id: string
          impression_count: number
          max_bid_cpm: number
          objective: string
          reviewed_at: string | null
          reviewed_by: string | null
          spent_cents: number
          spent_millicents: number
          start_date: string | null
          status: string
          target_sources: string[] | null
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          advertiser_id: string
          bid_type?: string
          brand_name?: string | null
          budget_cents: number
          click_count?: number
          contexts?: string[]
          copy: string
          created_at?: string
          daily_budget_cents?: number | null
          end_date?: string | null
          frequency_cap?: number | null
          frequency_window_hours?: number | null
          icon_url?: string | null
          id?: string
          impression_count?: number
          max_bid_cpm: number
          objective?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          spent_cents?: number
          spent_millicents?: number
          start_date?: string | null
          status?: string
          target_sources?: string[] | null
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          advertiser_id?: string
          bid_type?: string
          brand_name?: string | null
          budget_cents?: number
          click_count?: number
          contexts?: string[]
          copy?: string
          created_at?: string
          daily_budget_cents?: number | null
          end_date?: string | null
          frequency_cap?: number | null
          frequency_window_hours?: number | null
          icon_url?: string | null
          id?: string
          impression_count?: number
          max_bid_cpm?: number
          objective?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          spent_cents?: number
          spent_millicents?: number
          start_date?: string | null
          status?: string
          target_sources?: string[] | null
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_advertiser_id_fkey"
            columns: ["advertiser_id"]
            isOneToOne: false
            referencedRelation: "advertisers"
            referencedColumns: ["id"]
          },
        ]
      }
      clicks: {
        Row: {
          campaign_id: string
          client_ip: string | null
          context: string | null
          created_at: string
          creative_id: string | null
          fraud_flags: string[]
          id: string
          impression_id: string | null
          redirected: boolean
          session_id: string | null
          token_nonce: string | null
          url: string
          user_id: string | null
        }
        Insert: {
          campaign_id: string
          client_ip?: string | null
          context?: string | null
          created_at?: string
          creative_id?: string | null
          fraud_flags?: string[]
          id?: string
          impression_id?: string | null
          redirected?: boolean
          session_id?: string | null
          token_nonce?: string | null
          url: string
          user_id?: string | null
        }
        Update: {
          campaign_id?: string
          client_ip?: string | null
          context?: string | null
          created_at?: string
          creative_id?: string | null
          fraud_flags?: string[]
          id?: string
          impression_id?: string | null
          redirected?: boolean
          session_id?: string | null
          token_nonce?: string | null
          url?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clicks_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clicks_impression_id_fkey"
            columns: ["impression_id"]
            isOneToOne: false
            referencedRelation: "impressions"
            referencedColumns: ["id"]
          },
        ]
      }
      conversions: {
        Row: {
          attribution_window_hours: number
          campaign_id: string
          click_id: string | null
          created_at: string
          currency: string
          event_name: string
          id: string
          session_id: string | null
          user_id: string | null
          value_cents: number
        }
        Insert: {
          attribution_window_hours?: number
          campaign_id: string
          click_id?: string | null
          created_at?: string
          currency?: string
          event_name: string
          id?: string
          session_id?: string | null
          user_id?: string | null
          value_cents?: number
        }
        Update: {
          attribution_window_hours?: number
          campaign_id?: string
          click_id?: string | null
          created_at?: string
          currency?: string
          event_name?: string
          id?: string
          session_id?: string | null
          user_id?: string | null
          value_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "conversions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversions_click_id_fkey"
            columns: ["click_id"]
            isOneToOne: false
            referencedRelation: "clicks"
            referencedColumns: ["id"]
          },
        ]
      }
      device_credentials: {
        Row: {
          anonymous_user_id: string
          api_key_hash: string
          created_at: string
          fingerprint_hash: string | null
          fingerprint_mismatch_count: number
          id: string
          last_seen_ip: string | null
          last_used_at: string | null
          revoked: boolean
        }
        Insert: {
          anonymous_user_id: string
          api_key_hash: string
          created_at?: string
          fingerprint_hash?: string | null
          fingerprint_mismatch_count?: number
          id?: string
          last_seen_ip?: string | null
          last_used_at?: string | null
          revoked?: boolean
        }
        Update: {
          anonymous_user_id?: string
          api_key_hash?: string
          created_at?: string
          fingerprint_hash?: string | null
          fingerprint_mismatch_count?: number
          id?: string
          last_seen_ip?: string | null
          last_used_at?: string | null
          revoked?: boolean
        }
        Relationships: []
      }
      impressions: {
        Row: {
          auction_price_cpm: number
          campaign_id: string
          click_id: string | null
          client_ip: string | null
          context: string | null
          context_hash: string | null
          created_at: string
          creative_id: string | null
          currency: string
          duration_ms: number | null
          fraud_flags: string[]
          fraud_score: number
          id: string
          payout_cents: number
          payout_hold: boolean
          payout_millicents: number
          referrer_payout_cents: number
          referrer_payout_millicents: number
          referrer_user_id: string | null
          session_id: string | null
          source: string | null
          token_nonce: string | null
          user_id: string | null
          validated: boolean
        }
        Insert: {
          auction_price_cpm?: number
          campaign_id: string
          click_id?: string | null
          client_ip?: string | null
          context?: string | null
          context_hash?: string | null
          created_at?: string
          creative_id?: string | null
          currency?: string
          duration_ms?: number | null
          fraud_flags?: string[]
          fraud_score?: number
          id?: string
          payout_cents?: number
          payout_hold?: boolean
          payout_millicents?: number
          referrer_payout_cents?: number
          referrer_payout_millicents?: number
          referrer_user_id?: string | null
          session_id?: string | null
          source?: string | null
          token_nonce?: string | null
          user_id?: string | null
          validated?: boolean
        }
        Update: {
          auction_price_cpm?: number
          campaign_id?: string
          click_id?: string | null
          client_ip?: string | null
          context?: string | null
          context_hash?: string | null
          created_at?: string
          creative_id?: string | null
          currency?: string
          duration_ms?: number | null
          fraud_flags?: string[]
          fraud_score?: number
          id?: string
          payout_cents?: number
          payout_hold?: boolean
          payout_millicents?: number
          referrer_payout_cents?: number
          referrer_payout_millicents?: number
          referrer_user_id?: string | null
          session_id?: string | null
          source?: string | null
          token_nonce?: string | null
          user_id?: string | null
          validated?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "impressions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      market_floors: {
        Row: {
          context: string
          effective_at: string
          floor_cpm: number
          updated_at: string
        }
        Insert: {
          context: string
          effective_at?: string
          floor_cpm: number
          updated_at?: string
        }
        Update: {
          context?: string
          effective_at?: string
          floor_cpm?: number
          updated_at?: string
        }
        Relationships: []
      }
      payouts: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          paid_at: string | null
          provider: string | null
          provider_payout_id: string | null
          provider_response: Json | null
          recipient_details: Json | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          stripe_transfer_id: string | null
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          id?: string
          paid_at?: string | null
          provider?: string | null
          provider_payout_id?: string | null
          provider_response?: Json | null
          recipient_details?: Json | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          stripe_transfer_id?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          paid_at?: string | null
          provider?: string | null
          provider_payout_id?: string | null
          provider_response?: Json | null
          recipient_details?: Json | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          stripe_transfer_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      processed_stripe_events: {
        Row: {
          id: string
          processed_at: string
          stripe_event_id: string
        }
        Insert: {
          id?: string
          processed_at?: string
          stripe_event_id: string
        }
        Update: {
          id?: string
          processed_at?: string
          stripe_event_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referral_code: string
          referred_by: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          referral_code: string
          referred_by?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          referral_code?: string
          referred_by?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_trust: {
        Row: {
          created_at: string
          first_seen_at: string
          flagged_count: number
          id: string
          impression_count: number
          last_seen_at: string
          payout_hold: boolean
          trust_score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          first_seen_at?: string
          flagged_count?: number
          id?: string
          impression_count?: number
          last_seen_at?: string
          payout_hold?: boolean
          trust_score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          first_seen_at?: string
          flagged_count?: number
          id?: string
          impression_count?: number
          last_seen_at?: string
          payout_hold?: boolean
          trust_score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      visits: {
        Row: {
          country: string | null
          created_at: string
          id: string
          ip: string | null
          path: string
          referrer: string | null
          user_agent: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          path: string
          referrer?: string | null
          user_agent?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          path?: string
          referrer?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
          source: string | null
          type: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          source?: string | null
          type?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          source?: string | null
          type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bump_creative_counts: {
        Args: { p_clk?: number; p_creative_id: string; p_imp?: number }
        Returns: undefined
      }
      campaign_analytics_breakdowns: {
        Args: { p_campaign_ids: string[]; p_since?: string }
        Returns: Json
      }
      creator_daily_earnings: {
        Args: { p_user_ids: string[]; p_since?: string }
        Returns: { day: string; impressions: number; earnings_millicents: number }[]
      }
      credit_advertiser_balance:
        | {
            Args: {
              p_advertiser_id: string
              p_amount_cents: number
              p_description: string
              p_stripe_payment_intent_id?: string
            }
            Returns: number
          }
        | {
            Args: {
              p_advertiser_id: string
              p_amount_cents: number
              p_description: string
              p_is_test?: boolean
              p_stripe_payment_intent_id?: string
            }
            Returns: number
          }
      decrease_campaign_budget: {
        Args: {
          p_advertiser_id: string
          p_campaign_id: string
          p_reduction_cents: number
        }
        Returns: number
      }
      generate_referral_code: { Args: never; Returns: string }
      get_admin_metrics: { Args: never; Returns: Json }
      get_admin_revenue_timeseries: { Args: { p_days?: number }; Returns: Json }
      get_admin_visits_timeseries: { Args: { p_days?: number }; Returns: Json }
      increase_campaign_budget: {
        Args: {
          p_additional_cents: number
          p_advertiser_id: string
          p_campaign_id: string
        }
        Returns: number
      }
      increment_campaign_click_count: {
        Args: { p_campaign_id: string }
        Returns: undefined
      }
      increment_campaign_daily_spend: {
        Args: {
          p_amount: number
          p_campaign_id: string
          p_cap: number
          p_spend_date: string
        }
        Returns: boolean
      }
      increment_campaign_daily_spend_mc: {
        Args: {
          p_amount_mc: number
          p_campaign_id: string
          p_cap_mc: number
          p_spend_date: string
        }
        Returns: boolean
      }
      increment_campaign_spent: {
        Args: { p_amount: number; p_campaign_id: string }
        Returns: number
      }
      increment_campaign_spent_mc: {
        Args: { p_amount_mc: number; p_campaign_id: string }
        Returns: number
      }
      increment_fingerprint_mismatch: {
        Args: { p_anonymous_user_id: string }
        Returns: number
      }
      is_admin_user: { Args: { user_id: string }; Returns: boolean }
      release_campaign_budget: {
        Args: { p_advertiser_id: string; p_campaign_id: string }
        Returns: number
      }
      reserve_campaign_budget: {
        Args: {
          p_advertiser_id: string
          p_amount_cents: number
          p_campaign_id: string
        }
        Returns: number
      }
      safe_context_key: { Args: { p: string }; Returns: string }
      set_payout_hold: {
        Args: { p_hold: boolean; p_user_id: string }
        Returns: undefined
      }
      update_user_trust_atomic: {
        Args: { p_flagged: boolean; p_user_id: string }
        Returns: {
          flagged_count: number
          impression_count: number
          payout_hold: boolean
          trust_score: number
        }[]
      }
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
