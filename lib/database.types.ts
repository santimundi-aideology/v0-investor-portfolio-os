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
      ai_investor_summary: {
        Row: {
          active_signals_count: number | null
          avg_occupancy: number | null
          avg_yield: number | null
          budget_max: number | null
          budget_min: number | null
          budget_range: string | null
          created_at: string
          email: string | null
          holdings_count: number | null
          id: string
          investor_id: string
          mandate_summary: string | null
          name: string | null
          org_id: string
          pending_approvals_count: number | null
          portfolio_summary: string | null
          portfolio_value: number | null
          preferred_geos: string[] | null
          preferred_segments: string[] | null
          recommended_properties_count: number | null
          risk_tolerance: string | null
          top_holdings_json: Json | null
          updated_at: string
          yield_target: number | null
        }
        Insert: {
          active_signals_count?: number | null
          avg_occupancy?: number | null
          avg_yield?: number | null
          budget_max?: number | null
          budget_min?: number | null
          budget_range?: string | null
          created_at?: string
          email?: string | null
          holdings_count?: number | null
          id?: string
          investor_id: string
          mandate_summary?: string | null
          name?: string | null
          org_id: string
          pending_approvals_count?: number | null
          portfolio_summary?: string | null
          portfolio_value?: number | null
          preferred_geos?: string[] | null
          preferred_segments?: string[] | null
          recommended_properties_count?: number | null
          risk_tolerance?: string | null
          top_holdings_json?: Json | null
          updated_at?: string
          yield_target?: number | null
        }
        Update: {
          active_signals_count?: number | null
          avg_occupancy?: number | null
          avg_yield?: number | null
          budget_max?: number | null
          budget_min?: number | null
          budget_range?: string | null
          created_at?: string
          email?: string | null
          holdings_count?: number | null
          id?: string
          investor_id?: string
          mandate_summary?: string | null
          name?: string | null
          org_id?: string
          pending_approvals_count?: number | null
          portfolio_summary?: string | null
          portfolio_value?: number | null
          preferred_geos?: string[] | null
          preferred_segments?: string[] | null
          recommended_properties_count?: number | null
          risk_tolerance?: string | null
          top_holdings_json?: Json | null
          updated_at?: string
          yield_target?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_investor_summary_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_investor_summary_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_market_summary: {
        Row: {
          active_listings_count: number | null
          as_of_date: string
          avg_days_on_market: number | null
          created_at: string
          geo_id: string
          geo_name: string
          gross_yield_pct: number | null
          id: string
          median_asking_price: number | null
          median_dld_price: number | null
          median_price_per_sqft: number | null
          median_rent_annual: number | null
          org_id: string
          price_cut_rate_pct: number | null
          price_trend: string | null
          price_vs_truth_pct: number | null
          rent_trend: string | null
          sample_size_listings: number | null
          sample_size_rentals: number | null
          sample_size_sales: number | null
          segment: string
          stale_listings_count: number | null
          summary_text: string | null
          supply_trend: string | null
          updated_at: string
        }
        Insert: {
          active_listings_count?: number | null
          as_of_date: string
          avg_days_on_market?: number | null
          created_at?: string
          geo_id: string
          geo_name: string
          gross_yield_pct?: number | null
          id?: string
          median_asking_price?: number | null
          median_dld_price?: number | null
          median_price_per_sqft?: number | null
          median_rent_annual?: number | null
          org_id: string
          price_cut_rate_pct?: number | null
          price_trend?: string | null
          price_vs_truth_pct?: number | null
          rent_trend?: string | null
          sample_size_listings?: number | null
          sample_size_rentals?: number | null
          sample_size_sales?: number | null
          segment: string
          stale_listings_count?: number | null
          summary_text?: string | null
          supply_trend?: string | null
          updated_at?: string
        }
        Update: {
          active_listings_count?: number | null
          as_of_date?: string
          avg_days_on_market?: number | null
          created_at?: string
          geo_id?: string
          geo_name?: string
          gross_yield_pct?: number | null
          id?: string
          median_asking_price?: number | null
          median_dld_price?: number | null
          median_price_per_sqft?: number | null
          median_rent_annual?: number | null
          org_id?: string
          price_cut_rate_pct?: number | null
          price_trend?: string | null
          price_vs_truth_pct?: number | null
          rent_trend?: string | null
          sample_size_listings?: number | null
          sample_size_rentals?: number | null
          sample_size_sales?: number | null
          segment?: string
          stale_listings_count?: number | null
          summary_text?: string | null
          supply_trend?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_market_summary_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_daily_summary: {
        Row: {
          chat_requests: number | null
          chat_tokens: number | null
          created_at: string
          date: string
          failed_requests: number | null
          id: string
          news_requests: number | null
          news_tokens: number | null
          org_id: string | null
          other_tokens: number | null
          scoring_requests: number | null
          scoring_tokens: number | null
          tools_requests: number | null
          tools_tokens: number | null
          total_cost_usd: number | null
          total_requests: number | null
          total_tokens: number | null
          updated_at: string
        }
        Insert: {
          chat_requests?: number | null
          chat_tokens?: number | null
          created_at?: string
          date: string
          failed_requests?: number | null
          id?: string
          news_requests?: number | null
          news_tokens?: number | null
          org_id?: string | null
          other_tokens?: number | null
          scoring_requests?: number | null
          scoring_tokens?: number | null
          tools_requests?: number | null
          tools_tokens?: number | null
          total_cost_usd?: number | null
          total_requests?: number | null
          total_tokens?: number | null
          updated_at?: string
        }
        Update: {
          chat_requests?: number | null
          chat_tokens?: number | null
          created_at?: string
          date?: string
          failed_requests?: number | null
          id?: string
          news_requests?: number | null
          news_tokens?: number | null
          org_id?: string | null
          other_tokens?: number | null
          scoring_requests?: number | null
          scoring_tokens?: number | null
          tools_requests?: number | null
          tools_tokens?: number | null
          total_cost_usd?: number | null
          total_requests?: number | null
          total_tokens?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_daily_summary_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_log: {
        Row: {
          agent_id: string | null
          cost_usd: number
          created_at: string
          duration_ms: number | null
          endpoint: string | null
          error_message: string | null
          id: string
          input_tokens: number
          model: string
          org_id: string | null
          output_tokens: number
          request_id: string | null
          success: boolean | null
          tool_name: string | null
          total_tokens: number | null
          usage_type: string
          user_id: string | null
        }
        Insert: {
          agent_id?: string | null
          cost_usd?: number
          created_at?: string
          duration_ms?: number | null
          endpoint?: string | null
          error_message?: string | null
          id?: string
          input_tokens?: number
          model?: string
          org_id?: string | null
          output_tokens?: number
          request_id?: string | null
          success?: boolean | null
          tool_name?: string | null
          total_tokens?: number | null
          usage_type: string
          user_id?: string | null
        }
        Update: {
          agent_id?: string | null
          cost_usd?: number
          created_at?: string
          duration_ms?: number | null
          endpoint?: string | null
          error_message?: string | null
          id?: string
          input_tokens?: number
          model?: string
          org_id?: string | null
          output_tokens?: number
          request_id?: string | null
          success?: boolean | null
          tool_name?: string | null
          total_tokens?: number | null
          usage_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      area_news_cache: {
        Row: {
          area: string
          created_at: string
          expires_at: string
          fetched_at: string
          id: string
          key_developments: Json | null
          market_sentiment: string | null
          news_items: Json | null
          opportunities: Json | null
          org_id: string | null
          risks: Json | null
          summary_text: string | null
          updated_at: string
        }
        Insert: {
          area: string
          created_at?: string
          expires_at: string
          fetched_at?: string
          id?: string
          key_developments?: Json | null
          market_sentiment?: string | null
          news_items?: Json | null
          opportunities?: Json | null
          org_id?: string | null
          risks?: Json | null
          summary_text?: string | null
          updated_at?: string
        }
        Update: {
          area?: string
          created_at?: string
          expires_at?: string
          fetched_at?: string
          id?: string
          key_developments?: Json | null
          market_sentiment?: string | null
          news_items?: Json | null
          opportunities?: Json | null
          org_id?: string | null
          risks?: Json | null
          summary_text?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "area_news_cache_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          actor_id: string | null
          actor_role: Database["public"]["Enums"]["platform_role"] | null
          event_id: string
          event_type: string
          ip_address: string | null
          metadata: Json | null
          object_id: string | null
          object_type: string | null
          tenant_id: string | null
          timestamp: string
        }
        Insert: {
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["platform_role"] | null
          event_id?: string
          event_type: string
          ip_address?: string | null
          metadata?: Json | null
          object_id?: string | null
          object_type?: string | null
          tenant_id?: string | null
          timestamp?: string
        }
        Update: {
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["platform_role"] | null
          event_id?: string
          event_type?: string
          ip_address?: string | null
          metadata?: Json | null
          object_id?: string | null
          object_type?: string | null
          tenant_id?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      decisions: {
        Row: {
          condition_text: string | null
          created_at: string
          deadline: string | null
          decision_type: string
          id: string
          investor_id: string
          memo_id: string
          reason_tags: string[] | null
          resolved_at: string | null
          resolved_by: string | null
          resolved_status: string | null
          tenant_id: string
        }
        Insert: {
          condition_text?: string | null
          created_at?: string
          deadline?: string | null
          decision_type: string
          id?: string
          investor_id: string
          memo_id: string
          reason_tags?: string[] | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_status?: string | null
          tenant_id: string
        }
        Update: {
          condition_text?: string | null
          created_at?: string
          deadline?: string | null
          decision_type?: string
          id?: string
          investor_id?: string
          memo_id?: string
          reason_tags?: string[] | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "decisions_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisions_memo_id_fkey"
            columns: ["memo_id"]
            isOneToOne: false
            referencedRelation: "memos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisions_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisions_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      dld_market_signals: {
        Row: {
          area_name_en: string | null
          created_at: string | null
          description: string | null
          detected_at: string | null
          id: string
          is_active: boolean | null
          metrics: Json | null
          property_type_en: string | null
          severity: string | null
          signal_type: string
          title: string
          valid_until: string | null
        }
        Insert: {
          area_name_en?: string | null
          created_at?: string | null
          description?: string | null
          detected_at?: string | null
          id?: string
          is_active?: boolean | null
          metrics?: Json | null
          property_type_en?: string | null
          severity?: string | null
          signal_type: string
          title: string
          valid_until?: string | null
        }
        Update: {
          area_name_en?: string | null
          created_at?: string | null
          description?: string | null
          detected_at?: string | null
          id?: string
          is_active?: boolean | null
          metrics?: Json | null
          property_type_en?: string | null
          severity?: string | null
          signal_type?: string
          title?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      dld_transactions: {
        Row: {
          actual_worth: number | null
          area_id: number | null
          area_name_en: string | null
          building_name_en: string | null
          created_at: string | null
          has_parking: boolean | null
          id: string
          instance_date: string | null
          master_project_en: string | null
          meter_rent_price: number | null
          meter_sale_price: number | null
          nearest_landmark_en: string | null
          nearest_mall_en: string | null
          nearest_metro_en: string | null
          procedure_area: number | null
          procedure_id: number | null
          procedure_name_en: string | null
          project_name_en: string | null
          property_sub_type_en: string | null
          property_type_en: string | null
          property_usage_en: string | null
          reg_type_en: string | null
          rent_value: number | null
          rooms_en: string | null
          trans_group_en: string | null
          transaction_id: string
        }
        Insert: {
          actual_worth?: number | null
          area_id?: number | null
          area_name_en?: string | null
          building_name_en?: string | null
          created_at?: string | null
          has_parking?: boolean | null
          id?: string
          instance_date?: string | null
          master_project_en?: string | null
          meter_rent_price?: number | null
          meter_sale_price?: number | null
          nearest_landmark_en?: string | null
          nearest_mall_en?: string | null
          nearest_metro_en?: string | null
          procedure_area?: number | null
          procedure_id?: number | null
          procedure_name_en?: string | null
          project_name_en?: string | null
          property_sub_type_en?: string | null
          property_type_en?: string | null
          property_usage_en?: string | null
          reg_type_en?: string | null
          rent_value?: number | null
          rooms_en?: string | null
          trans_group_en?: string | null
          transaction_id: string
        }
        Update: {
          actual_worth?: number | null
          area_id?: number | null
          area_name_en?: string | null
          building_name_en?: string | null
          created_at?: string | null
          has_parking?: boolean | null
          id?: string
          instance_date?: string | null
          master_project_en?: string | null
          meter_rent_price?: number | null
          meter_sale_price?: number | null
          nearest_landmark_en?: string | null
          nearest_mall_en?: string | null
          nearest_metro_en?: string | null
          procedure_area?: number | null
          procedure_id?: number | null
          procedure_name_en?: string | null
          project_name_en?: string | null
          property_sub_type_en?: string | null
          property_type_en?: string | null
          property_usage_en?: string | null
          reg_type_en?: string | null
          rent_value?: number | null
          rooms_en?: string | null
          trans_group_en?: string | null
          transaction_id?: string
        }
        Relationships: []
      }
      dubai_area_coordinates: {
        Row: {
          area_name_en: string
          area_type: string | null
          created_at: string | null
          emirate: string | null
          id: string
          latitude: number
          longitude: number
        }
        Insert: {
          area_name_en: string
          area_type?: string | null
          created_at?: string | null
          emirate?: string | null
          id?: string
          latitude: number
          longitude: number
        }
        Update: {
          area_name_en?: string
          area_type?: string | null
          created_at?: string | null
          emirate?: string | null
          id?: string
          latitude?: number
          longitude?: number
        }
        Relationships: []
      }
      holdings: {
        Row: {
          annual_expenses: number
          created_at: string
          current_value: number
          id: string
          investor_id: string
          listing_id: string
          monthly_rent: number
          occupancy_rate: number
          purchase_date: string
          purchase_price: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          annual_expenses?: number
          created_at?: string
          current_value: number
          id?: string
          investor_id: string
          listing_id: string
          monthly_rent?: number
          occupancy_rate?: number
          purchase_date: string
          purchase_price: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          annual_expenses?: number
          created_at?: string
          current_value?: number
          id?: string
          investor_id?: string
          listing_id?: string
          monthly_rent?: number
          occupancy_rate?: number
          purchase_date?: string
          purchase_price?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "holdings_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holdings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holdings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_alert_history: {
        Row: {
          created_at: string
          dismissed: boolean
          id: string
          investor_id: string
          message: string
          read: boolean
          rule_id: string
          tenant_id: string
          title: string
          trigger_data: Json
          trigger_type: string
        }
        Insert: {
          created_at?: string
          dismissed?: boolean
          id?: string
          investor_id: string
          message: string
          read?: boolean
          rule_id: string
          tenant_id: string
          title: string
          trigger_data?: Json
          trigger_type: string
        }
        Update: {
          created_at?: string
          dismissed?: boolean
          id?: string
          investor_id?: string
          message?: string
          read?: boolean
          rule_id?: string
          tenant_id?: string
          title?: string
          trigger_data?: Json
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "investor_alert_history_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_alert_history_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "investor_alert_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_alert_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_alert_rules: {
        Row: {
          areas: Json
          created_at: string
          created_by: string | null
          description: string | null
          enabled: boolean
          frequency: string
          id: string
          investor_id: string
          last_triggered_at: string | null
          max_bedrooms: number | null
          max_price: number | null
          max_size: number | null
          min_bedrooms: number | null
          min_discount_pct: number | null
          min_price: number | null
          min_size: number | null
          min_transaction_volume: number | null
          min_yield_pct: number | null
          name: string
          notify_email: boolean
          notify_in_app: boolean
          notify_whatsapp: boolean
          price_change_direction: string | null
          price_change_pct: number | null
          property_types: Json
          tenant_id: string
          trigger_count: number
          updated_at: string
        }
        Insert: {
          areas?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          enabled?: boolean
          frequency?: string
          id?: string
          investor_id: string
          last_triggered_at?: string | null
          max_bedrooms?: number | null
          max_price?: number | null
          max_size?: number | null
          min_bedrooms?: number | null
          min_discount_pct?: number | null
          min_price?: number | null
          min_size?: number | null
          min_transaction_volume?: number | null
          min_yield_pct?: number | null
          name: string
          notify_email?: boolean
          notify_in_app?: boolean
          notify_whatsapp?: boolean
          price_change_direction?: string | null
          price_change_pct?: number | null
          property_types?: Json
          tenant_id: string
          trigger_count?: number
          updated_at?: string
        }
        Update: {
          areas?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          enabled?: boolean
          frequency?: string
          id?: string
          investor_id?: string
          last_triggered_at?: string | null
          max_bedrooms?: number | null
          max_price?: number | null
          max_size?: number | null
          min_bedrooms?: number | null
          min_discount_pct?: number | null
          min_price?: number | null
          min_size?: number | null
          min_transaction_volume?: number | null
          min_yield_pct?: number | null
          name?: string
          notify_email?: boolean
          notify_in_app?: boolean
          notify_whatsapp?: boolean
          price_change_direction?: string | null
          price_change_pct?: number | null
          property_types?: Json
          tenant_id?: string
          trigger_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "investor_alert_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_alert_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_alert_rules_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_alert_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      investors: {
        Row: {
          assigned_agent_id: string
          avatar: string | null
          company: string | null
          created_at: string
          email: string | null
          id: string
          last_contact: string | null
          mandate: Json | null
          name: string
          owner_user_id: string | null
          phone: string | null
          status: Database["public"]["Enums"]["investor_status"]
          tenant_id: string
          total_deals: number
        }
        Insert: {
          assigned_agent_id: string
          avatar?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_contact?: string | null
          mandate?: Json | null
          name: string
          owner_user_id?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["investor_status"]
          tenant_id: string
          total_deals?: number
        }
        Update: {
          assigned_agent_id?: string
          avatar?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_contact?: string | null
          mandate?: Json | null
          name?: string
          owner_user_id?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["investor_status"]
          tenant_id?: string
          total_deals?: number
        }
        Relationships: [
          {
            foreignKeyName: "investors_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investors_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investors_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investors_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          address: string | null
          area: string | null
          attachments: Json | null
          bathrooms: number | null
          bedrooms: number | null
          created_at: string
          currency: string | null
          developer: string | null
          expected_rent: number | null
          handover_date: string | null
          id: string
          price: number | null
          readiness: string | null
          size: number | null
          status: Database["public"]["Enums"]["property_status"]
          tenant_id: string
          title: string
          type: Database["public"]["Enums"]["property_type"] | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          area?: string | null
          attachments?: Json | null
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string
          currency?: string | null
          developer?: string | null
          expected_rent?: number | null
          handover_date?: string | null
          id?: string
          price?: number | null
          readiness?: string | null
          size?: number | null
          status?: Database["public"]["Enums"]["property_status"]
          tenant_id: string
          title: string
          type?: Database["public"]["Enums"]["property_type"] | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          area?: string | null
          attachments?: Json | null
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string
          currency?: string | null
          developer?: string | null
          expected_rent?: number | null
          handover_date?: string | null
          id?: string
          price?: number | null
          readiness?: string | null
          size?: number | null
          status?: Database["public"]["Enums"]["property_status"]
          tenant_id?: string
          title?: string
          type?: Database["public"]["Enums"]["property_type"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      mandates: {
        Row: {
          created_at: string
          created_by: string | null
          data: Json
          id: string
          investor_id: string
          tenant_id: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data: Json
          id?: string
          investor_id: string
          tenant_id: string
          version: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: Json
          id?: string
          investor_id?: string
          tenant_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "mandates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mandates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mandates_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mandates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      market_metric_snapshot: {
        Row: {
          computed_at: string
          created_at: string
          evidence: Json | null
          geo_id: string
          geo_name: string | null
          geo_type: string
          id: string
          metric: string
          org_id: string
          sample_size: number | null
          segment: string
          source: string
          timeframe: string
          value: number
          window_end: string
          window_start: string
        }
        Insert: {
          computed_at?: string
          created_at?: string
          evidence?: Json | null
          geo_id: string
          geo_name?: string | null
          geo_type: string
          id?: string
          metric: string
          org_id: string
          sample_size?: number | null
          segment: string
          source: string
          timeframe?: string
          value: number
          window_end: string
          window_start: string
        }
        Update: {
          computed_at?: string
          created_at?: string
          evidence?: Json | null
          geo_id?: string
          geo_name?: string | null
          geo_type?: string
          id?: string
          metric?: string
          org_id?: string
          sample_size?: number | null
          segment?: string
          source?: string
          timeframe?: string
          value?: number
          window_end?: string
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_metric_snapshot_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      market_signal: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          confidence_score: number
          created_at: string
          current_value: number | null
          delta_pct: number | null
          delta_value: number | null
          dismissed_at: string | null
          dismissed_by: string | null
          evidence: Json
          geo_id: string
          geo_name: string | null
          geo_type: string
          id: string
          metadata: Json | null
          metric: string
          org_id: string
          prev_value: number | null
          segment: string
          severity: string
          signal_key: string
          source: string
          source_type: string
          status: string
          timeframe: string
          type: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          confidence_score?: number
          created_at?: string
          current_value?: number | null
          delta_pct?: number | null
          delta_value?: number | null
          dismissed_at?: string | null
          dismissed_by?: string | null
          evidence?: Json
          geo_id: string
          geo_name?: string | null
          geo_type: string
          id?: string
          metadata?: Json | null
          metric: string
          org_id: string
          prev_value?: number | null
          segment: string
          severity?: string
          signal_key: string
          source: string
          source_type: string
          status?: string
          timeframe: string
          type: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          confidence_score?: number
          created_at?: string
          current_value?: number | null
          delta_pct?: number | null
          delta_value?: number | null
          dismissed_at?: string | null
          dismissed_by?: string | null
          evidence?: Json
          geo_id?: string
          geo_name?: string | null
          geo_type?: string
          id?: string
          metadata?: Json | null
          metric?: string
          org_id?: string
          prev_value?: number | null
          segment?: string
          severity?: string
          signal_key?: string
          source?: string
          source_type?: string
          status?: string
          timeframe?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_signal_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_signal_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_signal_dismissed_by_fkey"
            columns: ["dismissed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_signal_dismissed_by_fkey"
            columns: ["dismissed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_signal_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      market_signal_target: {
        Row: {
          created_at: string
          id: string
          investor_id: string
          org_id: string
          reason: Json
          relevance_score: number
          signal_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          investor_id: string
          org_id: string
          reason?: Json
          relevance_score?: number
          signal_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          investor_id?: string
          org_id?: string
          reason?: Json
          relevance_score?: number
          signal_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_signal_target_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_signal_target_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_signal_target_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "market_signal"
            referencedColumns: ["id"]
          },
        ]
      }
      memo_share_tokens: {
        Row: {
          clicked_at: string | null
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          investor_id: string
          last_opened_at: string | null
          memo_id: string
          metadata: Json | null
          opened_at: string | null
          opened_count: number
          recipient_contact: string | null
          share_method: string
          tenant_id: string
          token: string
        }
        Insert: {
          clicked_at?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          investor_id: string
          last_opened_at?: string | null
          memo_id: string
          metadata?: Json | null
          opened_at?: string | null
          opened_count?: number
          recipient_contact?: string | null
          share_method: string
          tenant_id: string
          token: string
        }
        Update: {
          clicked_at?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          investor_id?: string
          last_opened_at?: string | null
          memo_id?: string
          metadata?: Json | null
          opened_at?: string | null
          opened_count?: number
          recipient_contact?: string | null
          share_method?: string
          tenant_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "memo_share_tokens_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memo_share_tokens_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memo_share_tokens_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memo_share_tokens_memo_id_fkey"
            columns: ["memo_id"]
            isOneToOne: false
            referencedRelation: "memos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memo_share_tokens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      memo_versions: {
        Row: {
          content: Json | null
          created_at: string
          created_by: string | null
          id: string
          memo_id: string
          version: number
        }
        Insert: {
          content?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          memo_id: string
          version: number
        }
        Update: {
          content?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          memo_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "memo_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memo_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memo_versions_memo_id_fkey"
            columns: ["memo_id"]
            isOneToOne: false
            referencedRelation: "memos"
            referencedColumns: ["id"]
          },
        ]
      }
      memos: {
        Row: {
          created_at: string
          created_by: string | null
          current_version: number
          id: string
          investor_id: string
          listing_id: string | null
          state: Database["public"]["Enums"]["memo_state"]
          tenant_id: string
          underwriting_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_version?: number
          id?: string
          investor_id: string
          listing_id?: string | null
          state?: Database["public"]["Enums"]["memo_state"]
          tenant_id: string
          underwriting_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_version?: number
          id?: string
          investor_id?: string
          listing_id?: string | null
          state?: Database["public"]["Enums"]["memo_state"]
          tenant_id?: string
          underwriting_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "memos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memos_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memos_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memos_underwriting_id_fkey"
            columns: ["underwriting_id"]
            isOneToOne: false
            referencedRelation: "underwritings"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          memo_id: string
          sender_id: string | null
          tenant_id: string
          version_context: number | null
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          memo_id: string
          sender_id?: string | null
          tenant_id: string
          version_context?: number | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          memo_id?: string
          sender_id?: string | null
          tenant_id?: string
          version_context?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_memo_id_fkey"
            columns: ["memo_id"]
            isOneToOne: false
            referencedRelation: "memos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
          notification_key: string | null
          org_id: string
          read_at: string | null
          recipient_user_id: string
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
          notification_key?: string | null
          org_id: string
          read_at?: string | null
          recipient_user_id: string
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
          notification_key?: string | null
          org_id?: string
          read_at?: string | null
          recipient_user_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_listing_snapshot: {
        Row: {
          active_listings: number
          as_of_date: string
          created_at: string
          evidence: Json
          geo_id: string
          geo_name: string | null
          geo_type: string
          id: string
          median_ask_price: number | null
          median_ask_price_psf: number | null
          new_listings_count: number | null
          org_id: string
          portal: string
          price_cuts_count: number | null
          segment: string
          stale_listings_count: number | null
          timeframe: string
        }
        Insert: {
          active_listings: number
          as_of_date: string
          created_at?: string
          evidence?: Json
          geo_id: string
          geo_name?: string | null
          geo_type: string
          id?: string
          median_ask_price?: number | null
          median_ask_price_psf?: number | null
          new_listings_count?: number | null
          org_id: string
          portal: string
          price_cuts_count?: number | null
          segment: string
          stale_listings_count?: number | null
          timeframe?: string
        }
        Update: {
          active_listings?: number
          as_of_date?: string
          created_at?: string
          evidence?: Json
          geo_id?: string
          geo_name?: string | null
          geo_type?: string
          id?: string
          median_ask_price?: number | null
          median_ask_price_psf?: number | null
          new_listings_count?: number | null
          org_id?: string
          portal?: string
          price_cuts_count?: number | null
          segment?: string
          stale_listings_count?: number | null
          timeframe?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_listing_snapshot_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_listings: {
        Row: {
          agency_name: string | null
          agent_name: string | null
          amenities: string[] | null
          area_name: string
          asking_price: number | null
          bathrooms: number | null
          bedrooms: number | null
          building_name: string | null
          created_at: string | null
          furnished: string | null
          has_parking: boolean | null
          id: string
          is_active: boolean | null
          listed_date: string | null
          listing_id: string | null
          listing_type: string
          listing_url: string | null
          portal: string
          price_per_sqm: number | null
          project_name: string | null
          property_type: string | null
          scraped_at: string | null
          size_sqm: number | null
        }
        Insert: {
          agency_name?: string | null
          agent_name?: string | null
          amenities?: string[] | null
          area_name: string
          asking_price?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          building_name?: string | null
          created_at?: string | null
          furnished?: string | null
          has_parking?: boolean | null
          id?: string
          is_active?: boolean | null
          listed_date?: string | null
          listing_id?: string | null
          listing_type: string
          listing_url?: string | null
          portal: string
          price_per_sqm?: number | null
          project_name?: string | null
          property_type?: string | null
          scraped_at?: string | null
          size_sqm?: number | null
        }
        Update: {
          agency_name?: string | null
          agent_name?: string | null
          amenities?: string[] | null
          area_name?: string
          asking_price?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          building_name?: string | null
          created_at?: string | null
          furnished?: string | null
          has_parking?: boolean | null
          id?: string
          is_active?: boolean | null
          listed_date?: string | null
          listing_id?: string | null
          listing_type?: string
          listing_url?: string | null
          portal?: string
          price_per_sqm?: number | null
          project_name?: string | null
          property_type?: string | null
          scraped_at?: string | null
          size_sqm?: number | null
        }
        Relationships: []
      }
      raw_dld_transactions: {
        Row: {
          area_sqft: number | null
          currency: string | null
          external_id: string
          geo_id: string
          geo_name: string | null
          geo_type: string
          id: string
          ingested_at: string
          metadata: Json | null
          org_id: string
          sale_price: number
          segment: string
          transaction_date: string
        }
        Insert: {
          area_sqft?: number | null
          currency?: string | null
          external_id: string
          geo_id: string
          geo_name?: string | null
          geo_type: string
          id?: string
          ingested_at?: string
          metadata?: Json | null
          org_id: string
          sale_price: number
          segment: string
          transaction_date: string
        }
        Update: {
          area_sqft?: number | null
          currency?: string | null
          external_id?: string
          geo_id?: string
          geo_name?: string | null
          geo_type?: string
          id?: string
          ingested_at?: string
          metadata?: Json | null
          org_id?: string
          sale_price?: number
          segment?: string
          transaction_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "raw_dld_transactions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      raw_ejari_contracts: {
        Row: {
          annual_rent: number
          contract_end: string | null
          contract_start: string
          currency: string | null
          external_id: string
          geo_id: string
          geo_name: string | null
          geo_type: string
          id: string
          ingested_at: string
          metadata: Json | null
          org_id: string
          segment: string
        }
        Insert: {
          annual_rent: number
          contract_end?: string | null
          contract_start: string
          currency?: string | null
          external_id: string
          geo_id: string
          geo_name?: string | null
          geo_type: string
          id?: string
          ingested_at?: string
          metadata?: Json | null
          org_id: string
          segment: string
        }
        Update: {
          annual_rent?: number
          contract_end?: string | null
          contract_start?: string
          currency?: string | null
          external_id?: string
          geo_id?: string
          geo_name?: string | null
          geo_type?: string
          id?: string
          ingested_at?: string
          metadata?: Json | null
          org_id?: string
          segment?: string
        }
        Relationships: [
          {
            foreignKeyName: "raw_ejari_contracts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      raw_portal_listings: {
        Row: {
          as_of_date: string
          days_on_market: number | null
          geo_id: string
          geo_name: string | null
          geo_type: string
          had_price_cut: boolean
          id: string
          ingested_at: string
          is_active: boolean
          listing_id: string
          metadata: Json | null
          org_id: string
          portal: string
          price: number | null
          segment: string
        }
        Insert: {
          as_of_date: string
          days_on_market?: number | null
          geo_id: string
          geo_name?: string | null
          geo_type: string
          had_price_cut?: boolean
          id?: string
          ingested_at?: string
          is_active?: boolean
          listing_id: string
          metadata?: Json | null
          org_id: string
          portal: string
          price?: number | null
          segment: string
        }
        Update: {
          as_of_date?: string
          days_on_market?: number | null
          geo_id?: string
          geo_name?: string | null
          geo_type?: string
          had_price_cut?: boolean
          id?: string
          ingested_at?: string
          is_active?: boolean
          listing_id?: string
          metadata?: Json | null
          org_id?: string
          portal?: string
          price?: number | null
          segment?: string
        }
        Relationships: [
          {
            foreignKeyName: "raw_portal_listings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      shortlist_items: {
        Row: {
          added_at: string
          added_by: string | null
          agent_notes: string | null
          id: string
          listing_id: string
          match_explanation: string | null
          match_score: number | null
          pinned: boolean
          rank: number
          shortlist_id: string
          tenant_id: string
          tradeoffs: string[] | null
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          agent_notes?: string | null
          id?: string
          listing_id: string
          match_explanation?: string | null
          match_score?: number | null
          pinned?: boolean
          rank?: number
          shortlist_id: string
          tenant_id: string
          tradeoffs?: string[] | null
        }
        Update: {
          added_at?: string
          added_by?: string | null
          agent_notes?: string | null
          id?: string
          listing_id?: string
          match_explanation?: string | null
          match_score?: number | null
          pinned?: boolean
          rank?: number
          shortlist_id?: string
          tenant_id?: string
          tradeoffs?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "shortlist_items_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shortlist_items_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shortlist_items_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shortlist_items_shortlist_id_fkey"
            columns: ["shortlist_id"]
            isOneToOne: false
            referencedRelation: "shortlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shortlist_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      shortlists: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          investor_id: string
          mandate_version_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          investor_id: string
          mandate_version_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          investor_id?: string
          mandate_version_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shortlists_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shortlists_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shortlists_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: true
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shortlists_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          investor_id: string | null
          listing_id: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          status: Database["public"]["Enums"]["task_status"]
          tenant_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          investor_id?: string | null
          listing_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          tenant_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          investor_id?: string | null
          listing_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          tenant_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
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
      trust_records: {
        Row: {
          evidence_id: string | null
          id: string
          listing_id: string
          reason: string | null
          status: Database["public"]["Enums"]["trust_status"]
          tenant_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          evidence_id?: string | null
          id?: string
          listing_id: string
          reason?: string | null
          status?: Database["public"]["Enums"]["trust_status"]
          tenant_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          evidence_id?: string | null
          id?: string
          listing_id?: string
          reason?: string | null
          status?: Database["public"]["Enums"]["trust_status"]
          tenant_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trust_records_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_records_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_records_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      underwriting_comps: {
        Row: {
          added_at: string
          added_by: string | null
          attachment_id: string | null
          description: string
          id: string
          observed_date: string | null
          price: number | null
          price_per_sqft: number | null
          rent_per_year: number | null
          source: string
          source_detail: string | null
          tenant_id: string
          underwriting_id: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          attachment_id?: string | null
          description: string
          id?: string
          observed_date?: string | null
          price?: number | null
          price_per_sqft?: number | null
          rent_per_year?: number | null
          source: string
          source_detail?: string | null
          tenant_id: string
          underwriting_id: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          attachment_id?: string | null
          description?: string
          id?: string
          observed_date?: string | null
          price?: number | null
          price_per_sqft?: number | null
          rent_per_year?: number | null
          source?: string
          source_detail?: string | null
          tenant_id?: string
          underwriting_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "underwriting_comps_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "underwriting_comps_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "underwriting_comps_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "underwriting_comps_underwriting_id_fkey"
            columns: ["underwriting_id"]
            isOneToOne: false
            referencedRelation: "underwritings"
            referencedColumns: ["id"]
          },
        ]
      }
      underwritings: {
        Row: {
          confidence: string | null
          created_at: string
          created_by: string | null
          id: string
          inputs: Json | null
          listing_id: string | null
          scenarios: Json | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          confidence?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          inputs?: Json | null
          listing_id?: string | null
          scenarios?: Json | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          confidence?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          inputs?: Json | null
          listing_id?: string | null
          scenarios?: Json | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "underwritings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "underwritings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "underwritings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "underwritings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_user_id: string | null
          avatar_url: string | null
          created_at: string
          email: string
          email_verified: boolean | null
          id: string
          is_active: boolean | null
          last_sign_in_at: string | null
          name: string
          phone: string | null
          role: Database["public"]["Enums"]["platform_role"]
          tenant_id: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          auth_user_id?: string | null
          avatar_url?: string | null
          created_at?: string
          email: string
          email_verified?: boolean | null
          id?: string
          is_active?: boolean | null
          last_sign_in_at?: string | null
          name: string
          phone?: string | null
          role: Database["public"]["Enums"]["platform_role"]
          tenant_id?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          auth_user_id?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string
          email_verified?: boolean | null
          id?: string
          is_active?: boolean | null
          last_sign_in_at?: string | null
          name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["platform_role"]
          tenant_id?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      area_liquidity_metrics: {
        Row: {
          active_listings: number | null
          area_name: string | null
          avg_asking_price: number | null
          avg_days_on_market: number | null
          avg_price_per_sqm: number | null
          fresh_listings_count: number | null
          liquidity_score: number | null
          median_asking_price: number | null
          median_days_on_market: number | null
          median_price_per_sqm: number | null
          property_type: string | null
          stale_listings_count: number | null
          total_listings: number | null
        }
        Relationships: []
      }
      dld_area_medians: {
        Row: {
          area_name_en: string | null
          avg_price: number | null
          avg_price_per_sqm: number | null
          avg_time_weight: number | null
          earliest_date: string | null
          latest_date: string | null
          max_price: number | null
          max_price_per_sqm: number | null
          median_price: number | null
          median_price_per_sqm: number | null
          median_size_sqm: number | null
          min_price: number | null
          min_price_per_sqm: number | null
          property_type_en: string | null
          recency_score: number | null
          rooms_en: string | null
          time_weighted_avg_psm: number | null
          transaction_count: number | null
        }
        Relationships: []
      }
      dld_area_stats: {
        Row: {
          area_name_en: string | null
          avg_price: number | null
          avg_price_per_sqm: number | null
          latest_transaction: string | null
          max_price: number | null
          min_price: number | null
          property_type_en: string | null
          transaction_count: number | null
        }
        Relationships: []
      }
      dld_monthly_trends: {
        Row: {
          area_name_en: string | null
          avg_price: number | null
          avg_price_per_sqm: number | null
          month: string | null
          total_volume: number | null
          transaction_count: number | null
        }
        Relationships: []
      }
      dld_premium_transactions: {
        Row: {
          area_name_en: string | null
          building_name_en: string | null
          instance_date: string | null
          price_aed: number | null
          price_per_sqm: number | null
          project_name_en: string | null
          property_type_en: string | null
          rooms_en: string | null
          size_sqm: number | null
          transaction_id: string | null
        }
        Insert: {
          area_name_en?: string | null
          building_name_en?: string | null
          instance_date?: string | null
          price_aed?: number | null
          price_per_sqm?: number | null
          project_name_en?: string | null
          property_type_en?: string | null
          rooms_en?: string | null
          size_sqm?: number | null
          transaction_id?: string | null
        }
        Update: {
          area_name_en?: string | null
          building_name_en?: string | null
          instance_date?: string | null
          price_aed?: number | null
          price_per_sqm?: number | null
          project_name_en?: string | null
          property_type_en?: string | null
          rooms_en?: string | null
          size_sqm?: number | null
          transaction_id?: string | null
        }
        Relationships: []
      }
      dld_sales: {
        Row: {
          actual_worth: number | null
          area_id: number | null
          area_name_en: string | null
          building_name_en: string | null
          created_at: string | null
          has_parking: boolean | null
          id: string | null
          instance_date: string | null
          master_project_en: string | null
          meter_rent_price: number | null
          meter_sale_price: number | null
          nearest_landmark_en: string | null
          nearest_mall_en: string | null
          nearest_metro_en: string | null
          procedure_area: number | null
          procedure_id: number | null
          procedure_name_en: string | null
          project_name_en: string | null
          property_sub_type_en: string | null
          property_type_en: string | null
          property_usage_en: string | null
          reg_type_en: string | null
          rent_value: number | null
          rooms_en: string | null
          trans_group_en: string | null
          transaction_id: string | null
        }
        Insert: {
          actual_worth?: number | null
          area_id?: number | null
          area_name_en?: string | null
          building_name_en?: string | null
          created_at?: string | null
          has_parking?: boolean | null
          id?: string | null
          instance_date?: string | null
          master_project_en?: string | null
          meter_rent_price?: number | null
          meter_sale_price?: number | null
          nearest_landmark_en?: string | null
          nearest_mall_en?: string | null
          nearest_metro_en?: string | null
          procedure_area?: number | null
          procedure_id?: number | null
          procedure_name_en?: string | null
          project_name_en?: string | null
          property_sub_type_en?: string | null
          property_type_en?: string | null
          property_usage_en?: string | null
          reg_type_en?: string | null
          rent_value?: number | null
          rooms_en?: string | null
          trans_group_en?: string | null
          transaction_id?: string | null
        }
        Update: {
          actual_worth?: number | null
          area_id?: number | null
          area_name_en?: string | null
          building_name_en?: string | null
          created_at?: string | null
          has_parking?: boolean | null
          id?: string | null
          instance_date?: string | null
          master_project_en?: string | null
          meter_rent_price?: number | null
          meter_sale_price?: number | null
          nearest_landmark_en?: string | null
          nearest_mall_en?: string | null
          nearest_metro_en?: string | null
          procedure_area?: number | null
          procedure_id?: number | null
          procedure_name_en?: string | null
          project_name_en?: string | null
          property_sub_type_en?: string | null
          property_type_en?: string | null
          property_usage_en?: string | null
          reg_type_en?: string | null
          rent_value?: number | null
          rooms_en?: string | null
          trans_group_en?: string | null
          transaction_id?: string | null
        }
        Relationships: []
      }
      dld_signals_with_coords: {
        Row: {
          area_name_en: string | null
          area_type: string | null
          created_at: string | null
          description: string | null
          detected_at: string | null
          id: string | null
          is_active: boolean | null
          latitude: number | null
          longitude: number | null
          metrics: Json | null
          property_type_en: string | null
          severity: string | null
          signal_type: string | null
          title: string | null
          valid_until: string | null
        }
        Relationships: []
      }
      dld_transactions_with_coords: {
        Row: {
          area_name_en: string | null
          area_type: string | null
          building_name_en: string | null
          instance_date: string | null
          latitude: number | null
          longitude: number | null
          price_aed: number | null
          price_per_sqm: number | null
          project_name_en: string | null
          property_type_en: string | null
          rooms_en: string | null
          size_sqm: number | null
          trans_group_en: string | null
          transaction_id: string | null
        }
        Relationships: []
      }
      market_price_comparison: {
        Row: {
          area_name: string | null
          dld_avg_price: number | null
          dld_avg_psm: number | null
          dld_transaction_count: number | null
          portal: string | null
          portal_avg_price: number | null
          portal_avg_psm: number | null
          portal_listing_count: number | null
          price_gap_pct: number | null
          property_type: string | null
          psm_gap_pct: number | null
        }
        Relationships: []
      }
      portal_area_summary: {
        Row: {
          area_name: string | null
          avg_price: number | null
          avg_price_per_sqm: number | null
          listing_count: number | null
          max_price: number | null
          min_price: number | null
          property_type: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          auth_user_id: string | null
          avatar_url: string | null
          created_at: string | null
          email: string | null
          email_verified: boolean | null
          id: string | null
          is_active: boolean | null
          last_sign_in_at: string | null
          name: string | null
          phone: string | null
          role: Database["public"]["Enums"]["platform_role"] | null
          tenant_id: string | null
          tenant_name: string | null
          updated_at: string | null
          whatsapp: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      compare_listing_to_dld: {
        Args: {
          p_area_name: string
          p_asking_price: number
          p_property_type: string
          p_size_sqm: number
        }
        Returns: {
          comparable_count: number
          confidence: string
          dld_median_price: number
          dld_median_psm: number
          is_good_deal: boolean
          price_discount_pct: number
        }[]
      }
      find_best_comparables: {
        Args: {
          p_area_name: string
          p_bedrooms: string
          p_building_name?: string
          p_property_type: string
          p_size_sqm: number
        }
        Returns: {
          avg_size_sqm: number
          comparable_count: number
          confidence_score: number
          latest_date: string
          match_description: string
          match_tier: number
          median_price: number
          median_price_per_sqm: number
          price_range_max: number
          price_range_min: number
          recency_score: number
          time_weighted_avg_psm: number
        }[]
      }
      get_user_by_auth_id: {
        Args: { p_auth_user_id: string }
        Returns: {
          avatar_url: string
          email: string
          id: string
          is_active: boolean
          name: string
          phone: string
          role: string
          tenant_id: string
          whatsapp: string
        }[]
      }
      get_user_tenant_id: { Args: never; Returns: string }
      is_admin_or_manager: { Args: never; Returns: boolean }
      refresh_dld_area_medians: { Args: never; Returns: undefined }
    }
    Enums: {
      investor_status: "active" | "pending" | "inactive"
      memo_state:
        | "draft"
        | "pending_review"
        | "ready"
        | "sent"
        | "opened"
        | "decided"
      platform_role: "agent" | "manager" | "investor" | "super_admin"
      property_status: "available" | "under-offer" | "sold" | "off-market"
      property_type: "residential" | "commercial" | "mixed-use" | "land"
      task_priority: "low" | "medium" | "high"
      task_status: "open" | "in-progress" | "done"
      trust_status: "verified" | "unknown" | "flagged"
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
      investor_status: ["active", "pending", "inactive"],
      memo_state: [
        "draft",
        "pending_review",
        "ready",
        "sent",
        "opened",
        "decided",
      ],
      platform_role: ["agent", "manager", "investor", "super_admin"],
      property_status: ["available", "under-offer", "sold", "off-market"],
      property_type: ["residential", "commercial", "mixed-use", "land"],
      task_priority: ["low", "medium", "high"],
      task_status: ["open", "in-progress", "done"],
      trust_status: ["verified", "unknown", "flagged"],
    },
  },
} as const
