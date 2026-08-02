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
      amenities: {
        Row: {
          icon: string | null
          id: string
          label: string
          slug: string
          sort_order: number
        }
        Insert: {
          icon?: string | null
          id?: string
          label: string
          slug: string
          sort_order?: number
        }
        Update: {
          icon?: string | null
          id?: string
          label?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: number
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: never
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: never
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_rules: {
        Row: {
          blocked_dates: string[]
          cancel_cutoff_hours: number
          centre_id: string
          closing_time: string
          grace_period_min: number
          hold_minutes: number
          max_advance_days: number
          max_duration_min: number
          min_duration_min: number
          opening_time: string
          updated_at: string
        }
        Insert: {
          blocked_dates?: string[]
          cancel_cutoff_hours?: number
          centre_id: string
          closing_time?: string
          grace_period_min?: number
          hold_minutes?: number
          max_advance_days?: number
          max_duration_min?: number
          min_duration_min?: number
          opening_time?: string
          updated_at?: string
        }
        Update: {
          blocked_dates?: string[]
          cancel_cutoff_hours?: number
          centre_id?: string
          closing_time?: string
          grace_period_min?: number
          hold_minutes?: number
          max_advance_days?: number
          max_duration_min?: number
          min_duration_min?: number
          opening_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_rules_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: true
            referencedRelation: "centre_live_occupancy"
            referencedColumns: ["centre_id"]
          },
          {
            foreignKeyName: "booking_rules_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: true
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          amount: number
          booking_group_id: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          centre_id: string
          checked_in_at: string | null
          completed_at: string | null
          created_at: string
          ends_at: string
          expires_at: string | null
          id: string
          invoice_number: string | null
          invoiced_at: string | null
          payment: Database["public"]["Enums"]["payment_status"]
          period: Database["public"]["Enums"]["booking_period"]
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          rescheduled_from: string | null
          resource_id: string
          starts_at: string
          status: Database["public"]["Enums"]["booking_status"]
          user_id: string
        }
        Insert: {
          amount?: number
          booking_group_id?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          centre_id: string
          checked_in_at?: string | null
          completed_at?: string | null
          created_at?: string
          ends_at: string
          expires_at?: string | null
          id?: string
          invoice_number?: string | null
          invoiced_at?: string | null
          payment?: Database["public"]["Enums"]["payment_status"]
          period: Database["public"]["Enums"]["booking_period"]
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          rescheduled_from?: string | null
          resource_id: string
          starts_at: string
          status?: Database["public"]["Enums"]["booking_status"]
          user_id: string
        }
        Update: {
          amount?: number
          booking_group_id?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          centre_id?: string
          checked_in_at?: string | null
          completed_at?: string | null
          created_at?: string
          ends_at?: string
          expires_at?: string | null
          id?: string
          invoice_number?: string | null
          invoiced_at?: string | null
          payment?: Database["public"]["Enums"]["payment_status"]
          period?: Database["public"]["Enums"]["booking_period"]
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          rescheduled_from?: string | null
          resource_id?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["booking_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centre_live_occupancy"
            referencedColumns: ["centre_id"]
          },
          {
            foreignKeyName: "bookings_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_rescheduled_from_fkey"
            columns: ["rescheduled_from"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          description: string | null
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          description?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      centre_amenities: {
        Row: {
          amenity_id: string
          centre_id: string
        }
        Insert: {
          amenity_id: string
          centre_id: string
        }
        Update: {
          amenity_id?: string
          centre_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "centre_amenities_amenity_id_fkey"
            columns: ["amenity_id"]
            isOneToOne: false
            referencedRelation: "amenities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "centre_amenities_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centre_live_occupancy"
            referencedColumns: ["centre_id"]
          },
          {
            foreignKeyName: "centre_amenities_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
        ]
      }
      centre_documents: {
        Row: {
          centre_id: string
          created_at: string
          doc_type: string
          id: string
          label: string | null
          storage_path: string
        }
        Insert: {
          centre_id: string
          created_at?: string
          doc_type?: string
          id?: string
          label?: string | null
          storage_path: string
        }
        Update: {
          centre_id?: string
          created_at?: string
          doc_type?: string
          id?: string
          label?: string | null
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "centre_documents_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centre_live_occupancy"
            referencedColumns: ["centre_id"]
          },
          {
            foreignKeyName: "centre_documents_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
        ]
      }
      centre_hours: {
        Row: {
          centre_id: string
          closing_time: string | null
          day_of_week: number
          is_open: boolean
          opening_time: string | null
        }
        Insert: {
          centre_id: string
          closing_time?: string | null
          day_of_week: number
          is_open?: boolean
          opening_time?: string | null
        }
        Update: {
          centre_id?: string
          closing_time?: string | null
          day_of_week?: number
          is_open?: boolean
          opening_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "centre_hours_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centre_live_occupancy"
            referencedColumns: ["centre_id"]
          },
          {
            foreignKeyName: "centre_hours_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
        ]
      }
      centres: {
        Row: {
          address: string | null
          admin_notes: string | null
          alt_phone: string | null
          area: string | null
          business_email: string | null
          capacity: number
          city: string | null
          country: string
          cover_url: string | null
          created_at: string
          description: string | null
          emoji: string
          google_place_id: string | null
          id: string
          is_published: boolean
          is_verified: boolean
          lat: number | null
          lng: number | null
          location_id: string | null
          logo_url: string | null
          name: string
          owner_id: string | null
          phone: string | null
          postcode: string | null
          rating: number
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviews_count: number
          slug: string
          social: Json
          space_type: Database["public"]["Enums"]["space_type"]
          state: string | null
          status: Database["public"]["Enums"]["listing_status"]
          tags: string[]
          updated_at: string
          website: string | null
          women_safe_verified: boolean
        }
        Insert: {
          address?: string | null
          admin_notes?: string | null
          alt_phone?: string | null
          area?: string | null
          business_email?: string | null
          capacity?: number
          city?: string | null
          country?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          emoji?: string
          google_place_id?: string | null
          id?: string
          is_published?: boolean
          is_verified?: boolean
          lat?: number | null
          lng?: number | null
          location_id?: string | null
          logo_url?: string | null
          name: string
          owner_id?: string | null
          phone?: string | null
          postcode?: string | null
          rating?: number
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviews_count?: number
          slug: string
          social?: Json
          space_type?: Database["public"]["Enums"]["space_type"]
          state?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          tags?: string[]
          updated_at?: string
          website?: string | null
          women_safe_verified?: boolean
        }
        Update: {
          address?: string | null
          admin_notes?: string | null
          alt_phone?: string | null
          area?: string | null
          business_email?: string | null
          capacity?: number
          city?: string | null
          country?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          emoji?: string
          google_place_id?: string | null
          id?: string
          is_published?: boolean
          is_verified?: boolean
          lat?: number | null
          lng?: number | null
          location_id?: string | null
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          phone?: string | null
          postcode?: string | null
          rating?: number
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviews_count?: number
          slug?: string
          social?: Json
          space_type?: Database["public"]["Enums"]["space_type"]
          state?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          tags?: string[]
          updated_at?: string
          website?: string | null
          women_safe_verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "centres_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "centres_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "centres_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      check_ins: {
        Row: {
          centre_id: string
          checked_in_at: string
          checked_out_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          centre_id: string
          checked_in_at?: string
          checked_out_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          centre_id?: string
          checked_in_at?: string
          checked_out_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centre_live_occupancy"
            referencedColumns: ["centre_id"]
          },
          {
            foreignKeyName: "check_ins_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          message: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          message: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          message?: string
          phone?: string | null
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          created_at: string
          error: string | null
          id: string
          provider_id: string | null
          status: string
          template: string
          to_email: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          provider_id?: string | null
          status?: string
          template: string
          to_email: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          provider_id?: string | null
          status?: string
          template?: string
          to_email?: string
        }
        Relationships: []
      }
      enquiries: {
        Row: {
          centre_id: string
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          sender_id: string | null
          status: Database["public"]["Enums"]["enquiry_status"]
        }
        Insert: {
          centre_id: string
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          sender_id?: string | null
          status?: Database["public"]["Enums"]["enquiry_status"]
        }
        Update: {
          centre_id?: string
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          sender_id?: string | null
          status?: Database["public"]["Enums"]["enquiry_status"]
        }
        Relationships: [
          {
            foreignKeyName: "enquiries_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centre_live_occupancy"
            referencedColumns: ["centre_id"]
          },
          {
            foreignKeyName: "enquiries_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquiries_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_listings: {
        Row: {
          centre_id: string
          created_by: string | null
          ends_at: string | null
          starts_at: string
        }
        Insert: {
          centre_id: string
          created_by?: string | null
          ends_at?: string | null
          starts_at?: string
        }
        Update: {
          centre_id?: string
          created_by?: string | null
          ends_at?: string | null
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "featured_listings_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: true
            referencedRelation: "centre_live_occupancy"
            referencedColumns: ["centre_id"]
          },
          {
            foreignKeyName: "featured_listings_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: true
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "featured_listings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_categories: {
        Row: {
          category_id: string
          centre_id: string
        }
        Insert: {
          category_id: string
          centre_id: string
        }
        Update: {
          category_id?: string
          centre_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_categories_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centre_live_occupancy"
            referencedColumns: ["centre_id"]
          },
          {
            foreignKeyName: "listing_categories_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_claims: {
        Row: {
          centre_id: string
          claimant_id: string
          created_at: string
          evidence: string | null
          id: string
          reviewed_by: string | null
          status: Database["public"]["Enums"]["claim_status"]
        }
        Insert: {
          centre_id: string
          claimant_id: string
          created_at?: string
          evidence?: string | null
          id?: string
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["claim_status"]
        }
        Update: {
          centre_id?: string
          claimant_id?: string
          created_at?: string
          evidence?: string | null
          id?: string
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["claim_status"]
        }
        Relationships: [
          {
            foreignKeyName: "listing_claims_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centre_live_occupancy"
            referencedColumns: ["centre_id"]
          },
          {
            foreignKeyName: "listing_claims_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_claims_claimant_id_fkey"
            columns: ["claimant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_claims_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_images: {
        Row: {
          alt: string | null
          category: string | null
          centre_id: string
          created_at: string
          id: string
          is_cover: boolean
          sort_order: number
          storage_path: string
        }
        Insert: {
          alt?: string | null
          category?: string | null
          centre_id: string
          created_at?: string
          id?: string
          is_cover?: boolean
          sort_order?: number
          storage_path: string
        }
        Update: {
          alt?: string | null
          category?: string | null
          centre_id?: string
          created_at?: string
          id?: string
          is_cover?: boolean
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_images_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centre_live_occupancy"
            referencedColumns: ["centre_id"]
          },
          {
            foreignKeyName: "listing_images_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          city: string
          id: string
          lat: number | null
          lng: number | null
          name: string
          slug: string
        }
        Insert: {
          city: string
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          slug: string
        }
        Update: {
          city?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          read_at: string | null
          title: string
          url: string | null
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          read_at?: string | null
          title: string
          url?: string | null
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          read_at?: string | null
          title?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_progress: {
        Row: {
          completed: boolean
          step: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          step?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          step?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: string
          avatar_url: string | null
          created_at: string
          exam: string | null
          failed_login_count: number
          full_name: string | null
          home_area: string | null
          id: string
          locked_until: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          account_status?: string
          avatar_url?: string | null
          created_at?: string
          exam?: string | null
          failed_login_count?: number
          full_name?: string | null
          home_area?: string | null
          id: string
          locked_until?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          account_status?: string
          avatar_url?: string | null
          created_at?: string
          exam?: string | null
          failed_login_count?: number
          full_name?: string | null
          home_area?: string | null
          id?: string
          locked_until?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      refunds: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          id: string
          is_partial: boolean
          processed_at: string | null
          razorpay_refund_id: string | null
          reason: string | null
          requested_by: string | null
          status: string
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string
          id?: string
          is_partial?: boolean
          processed_at?: string | null
          razorpay_refund_id?: string | null
          reason?: string | null
          requested_by?: string | null
          status?: string
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          id?: string
          is_partial?: boolean
          processed_at?: string | null
          razorpay_refund_id?: string | null
          reason?: string | null
          requested_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          centre_id: string
          id: string
          is_active: boolean
          label: string
          pricing: Json
          resource_type: Database["public"]["Enums"]["resource_type"]
          tier: Database["public"]["Enums"]["seat_tier"] | null
          unit_count: number
        }
        Insert: {
          centre_id: string
          id?: string
          is_active?: boolean
          label: string
          pricing?: Json
          resource_type: Database["public"]["Enums"]["resource_type"]
          tier?: Database["public"]["Enums"]["seat_tier"] | null
          unit_count?: number
        }
        Update: {
          centre_id?: string
          id?: string
          is_active?: boolean
          label?: string
          pricing?: Json
          resource_type?: Database["public"]["Enums"]["resource_type"]
          tier?: Database["public"]["Enums"]["seat_tier"] | null
          unit_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "resources_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centre_live_occupancy"
            referencedColumns: ["centre_id"]
          },
          {
            foreignKeyName: "resources_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
        ]
      }
      review_reports: {
        Row: {
          created_at: string
          id: string
          reason: string
          reporter_id: string | null
          resolved: boolean
          review_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          reporter_id?: string | null
          resolved?: boolean
          review_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          reporter_id?: string | null
          resolved?: boolean
          review_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_reports_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          author_id: string
          body: string | null
          centre_id: string
          created_at: string
          id: string
          is_verified: boolean
          owner_responded_at: string | null
          owner_response: string | null
          rating: number
          status: Database["public"]["Enums"]["review_status"]
          updated_at: string
        }
        Insert: {
          author_id: string
          body?: string | null
          centre_id: string
          created_at?: string
          id?: string
          is_verified?: boolean
          owner_responded_at?: string | null
          owner_response?: string | null
          rating: number
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string | null
          centre_id?: string
          created_at?: string
          id?: string
          is_verified?: boolean
          owner_responded_at?: string | null
          owner_response?: string | null
          rating?: number
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centre_live_occupancy"
            referencedColumns: ["centre_id"]
          },
          {
            foreignKeyName: "reviews_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_listings: {
        Row: {
          centre_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          centre_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          centre_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_listings_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centre_live_occupancy"
            referencedColumns: ["centre_id"]
          },
          {
            foreignKeyName: "saved_listings_centre_id_fkey"
            columns: ["centre_id"]
            isOneToOne: false
            referencedRelation: "centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_listings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_entries: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          period: Database["public"]["Enums"]["booking_period"]
          promoted_booking_id: string | null
          resource_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          period: Database["public"]["Enums"]["booking_period"]
          promoted_booking_id?: string | null
          resource_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          period?: Database["public"]["Enums"]["booking_period"]
          promoted_booking_id?: string | null
          resource_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_entries_promoted_booking_id_fkey"
            columns: ["promoted_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_entries_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          id: string
          processed_at: string
          provider: string
        }
        Insert: {
          id: string
          processed_at?: string
          provider?: string
        }
        Update: {
          id?: string
          processed_at?: string
          provider?: string
        }
        Relationships: []
      }
    }
    Views: {
      centre_live_occupancy: {
        Row: {
          capacity: number | null
          centre_id: string | null
          inside_now: number | null
          occ_pct: number | null
          seats_free: number | null
          status: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_set_account_status: {
        Args: { p_status: string; p_user_id: string }
        Returns: undefined
      }
      admin_set_user_role: {
        Args: {
          p_role: Database["public"]["Enums"]["user_role"]
          p_user: string
        }
        Returns: undefined
      }
      admin_unlock_account: { Args: { p_user_id: string }; Returns: undefined }
      approve_claim: { Args: { p_claim_id: string }; Returns: undefined }
      archive_centre: { Args: { p_centre_id: string }; Returns: undefined }
      auth_failed_login_count: { Args: never; Returns: number }
      auth_locked_until: { Args: never; Returns: string }
      auth_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      book_seat: {
        Args: {
          p_amount: number
          p_centre_id: string
          p_ends_at: string
          p_period: Database["public"]["Enums"]["booking_period"]
          p_resource_id: string
          p_starts_at: string
        }
        Returns: string
      }
      book_seat_multi: {
        Args: {
          p_amount_per_hour: number
          p_centre_id: string
          p_date: string
          p_hours: number[]
          p_resource_id: string
        }
        Returns: string
      }
      cancel_booking: {
        Args: { p_booking_id: string; p_reason: string }
        Returns: undefined
      }
      centre_is_open_on: {
        Args: { p_centre_id: string; p_date: string }
        Returns: boolean
      }
      choose_role: { Args: { p_role: string }; Returns: undefined }
      complete_refund: {
        Args: { p_razorpay_refund_id?: string; p_refund_id: string }
        Returns: undefined
      }
      earth: { Args: never; Returns: number }
      expire_pending_bookings: { Args: never; Returns: number }
      is_account_locked: { Args: { p_email: string }; Returns: boolean }
      log_audit: {
        Args: {
          p_action: string
          p_entity_id: string
          p_entity_type: string
          p_metadata?: Json
        }
        Returns: undefined
      }
      period_days: {
        Args: { p_period: Database["public"]["Enums"]["booking_period"] }
        Returns: number
      }
      promote_waitlist: { Args: { p_resource_id: string }; Returns: undefined }
      record_login_failure: { Args: { p_email: string }; Returns: undefined }
      record_login_success: { Args: never; Returns: undefined }
      reschedule_booking_group: {
        Args: { p_booking_group_id: string; p_new_starts_at: string }
        Returns: string
      }
      resource_day_availability: {
        Args: {
          p_date: string
          p_period: Database["public"]["Enums"]["booking_period"]
          p_resource_id: string
        }
        Returns: {
          capacity: number
          is_available: boolean
          taken: number
        }[]
      }
      resource_day_plus_count: {
        Args: { p_date: string; p_resource_id: string }
        Returns: number
      }
      resource_day_worst_hour_taken: {
        Args: {
          p_close_hour: number
          p_date: string
          p_open_hour: number
          p_resource_id: string
        }
        Returns: number
      }
      resource_hour_slots: {
        Args: {
          p_date: string
          p_period?: Database["public"]["Enums"]["booking_period"]
          p_resource_id: string
        }
        Returns: {
          capacity: number
          hour: number
          is_available: boolean
          is_past: boolean
          taken: number
        }[]
      }
      resource_hour_taken: {
        Args: { p_date: string; p_hour: number; p_resource_id: string }
        Returns: number
      }
      respond_to_review: {
        Args: { p_response: string; p_review_id: string }
        Returns: undefined
      }
      review_refund: {
        Args: { p_approve: boolean; p_note?: string; p_refund_id: string }
        Returns: undefined
      }
      search_centres_by_text: {
        Args: { p_query: string }
        Returns: {
          id: string
        }[]
      }
      search_centres_nearby: {
        Args: {
          p_lat: number
          p_limit?: number
          p_lng: number
          p_radius_km?: number
          p_space_type?: Database["public"]["Enums"]["space_type"]
          p_women_safe?: boolean
        }
        Returns: {
          area: string
          cover_url: string
          distance_m: number
          emoji: string
          id: string
          is_verified: boolean
          lat: number
          lng: number
          name: string
          rating: number
          reviews_count: number
          slug: string
          space_type: string
          women_safe_verified: boolean
        }[]
      }
      set_centre_published: {
        Args: { p_centre_id: string; p_published: boolean }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      unarchive_centre: { Args: { p_centre_id: string }; Returns: undefined }
    }
    Enums: {
      booking_period:
        | "hour"
        | "day"
        | "month"
        | "week"
        | "fortnight"
        | "quarter"
        | "half_year"
        | "year"
      booking_status:
        | "pending"
        | "confirmed"
        | "cancelled"
        | "completed"
        | "checked_in"
        | "no_show"
        | "expired"
        | "refunded"
      claim_status: "pending" | "approved" | "rejected"
      enquiry_status: "new" | "read" | "responded" | "closed" | "spam"
      listing_status:
        | "draft"
        | "pending_review"
        | "approved"
        | "rejected"
        | "suspended"
        | "archived"
      payment_status:
        | "unpaid"
        | "paid"
        | "refunded"
        | "refund_pending"
        | "partially_refunded"
        | "failed"
      resource_type: "seat" | "meeting_room" | "conference_room" | "cabin"
      review_status: "published" | "pending" | "removed"
      seat_tier: "open" | "ac" | "premium"
      space_type: "study_hall" | "reading_room" | "coworking" | "both"
      user_role: "student" | "owner" | "admin"
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
      booking_period: [
        "hour",
        "day",
        "month",
        "week",
        "fortnight",
        "quarter",
        "half_year",
        "year",
      ],
      booking_status: [
        "pending",
        "confirmed",
        "cancelled",
        "completed",
        "checked_in",
        "no_show",
        "expired",
        "refunded",
      ],
      claim_status: ["pending", "approved", "rejected"],
      enquiry_status: ["new", "read", "responded", "closed", "spam"],
      listing_status: [
        "draft",
        "pending_review",
        "approved",
        "rejected",
        "suspended",
        "archived",
      ],
      payment_status: [
        "unpaid",
        "paid",
        "refunded",
        "refund_pending",
        "partially_refunded",
        "failed",
      ],
      resource_type: ["seat", "meeting_room", "conference_room", "cabin"],
      review_status: ["published", "pending", "removed"],
      seat_tier: ["open", "ac", "premium"],
      space_type: ["study_hall", "reading_room", "coworking", "both"],
      user_role: ["student", "owner", "admin"],
    },
  },
} as const
