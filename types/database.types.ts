export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  __InternalSupabase: { PostgrestVersion: "12" };
  public: {
    Tables: {
      amenities: {
        Row: {
          id: string;
          slug: string;
          label: string;
          icon: string | null;
          sort_order: number;
        };
        Insert: {
          id?: string;
          slug: string;
          label: string;
          icon?: string | null;
          sort_order?: number;
        };
        Update: {
          id?: string;
          slug?: string;
          label?: string;
          icon?: string | null;
          sort_order?: number;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: number;
          actor_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id: number;
          actor_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: number;
          actor_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      booking_rules: {
        Row: {
          centre_id: string;
          opening_time: string;
          closing_time: string;
          blocked_dates: string[];
          max_advance_days: number;
          min_duration_min: number;
          max_duration_min: number;
          cancel_cutoff_hours: number;
          grace_period_min: number;
          hold_minutes: number;
          updated_at: string;
        };
        Insert: {
          centre_id: string;
          opening_time?: string;
          closing_time?: string;
          blocked_dates?: string[];
          max_advance_days?: number;
          min_duration_min?: number;
          max_duration_min?: number;
          cancel_cutoff_hours?: number;
          grace_period_min?: number;
          hold_minutes?: number;
          updated_at?: string;
        };
        Update: {
          centre_id?: string;
          opening_time?: string;
          closing_time?: string;
          blocked_dates?: string[];
          max_advance_days?: number;
          min_duration_min?: number;
          max_duration_min?: number;
          cancel_cutoff_hours?: number;
          grace_period_min?: number;
          hold_minutes?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      bookings: {
        Row: {
          id: string;
          centre_id: string;
          resource_id: string;
          user_id: string;
          period: 'hour' | 'day' | 'week' | 'fortnight' | 'month' | 'quarter' | 'half_year' | 'year';
          starts_at: string;
          ends_at: string;
          amount: number;
          status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'checked_in' | 'no_show' | 'expired' | 'refunded';
          payment: 'unpaid' | 'paid' | 'refunded' | 'refund_pending' | 'partially_refunded';
          created_at: string;
          razorpay_order_id: string | null;
          razorpay_payment_id: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          cancel_reason: string | null;
          checked_in_at: string | null;
          completed_at: string | null;
          rescheduled_from: string | null;
          expires_at: string | null;
          invoice_number: string | null;
          invoiced_at: string | null;
          booking_group_id: string | null;
        };
        Insert: {
          id?: string;
          centre_id: string;
          resource_id: string;
          user_id: string;
          period: 'hour' | 'day' | 'week' | 'fortnight' | 'month' | 'quarter' | 'half_year' | 'year';
          starts_at: string;
          ends_at: string;
          amount?: number;
          status?: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'checked_in' | 'no_show' | 'expired' | 'refunded';
          payment?: 'unpaid' | 'paid' | 'refunded' | 'refund_pending' | 'partially_refunded';
          created_at?: string;
          razorpay_order_id?: string | null;
          razorpay_payment_id?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          cancel_reason?: string | null;
          checked_in_at?: string | null;
          completed_at?: string | null;
          rescheduled_from?: string | null;
          expires_at?: string | null;
          invoice_number?: string | null;
          invoiced_at?: string | null;
          booking_group_id?: string | null;
        };
        Update: {
          id?: string;
          centre_id?: string;
          resource_id?: string;
          user_id?: string;
          period?: 'hour' | 'day' | 'week' | 'fortnight' | 'month' | 'quarter' | 'half_year' | 'year';
          starts_at?: string;
          ends_at?: string;
          amount?: number;
          status?: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'checked_in' | 'no_show' | 'expired' | 'refunded';
          payment?: 'unpaid' | 'paid' | 'refunded' | 'refund_pending' | 'partially_refunded';
          created_at?: string;
          razorpay_order_id?: string | null;
          razorpay_payment_id?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          cancel_reason?: string | null;
          checked_in_at?: string | null;
          completed_at?: string | null;
          rescheduled_from?: string | null;
          expires_at?: string | null;
          invoice_number?: string | null;
          invoiced_at?: string | null;
          booking_group_id?: string | null;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          sort_order: number;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          sort_order?: number;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          description?: string | null;
          sort_order?: number;
        };
        Relationships: [];
      };
      centre_amenities: {
        Row: {
          centre_id: string;
          amenity_id: string;
        };
        Insert: {
          centre_id: string;
          amenity_id: string;
        };
        Update: {
          centre_id?: string;
          amenity_id?: string;
        };
        Relationships: [];
      };
      centre_documents: {
        Row: {
          id: string;
          centre_id: string;
          storage_path: string;
          doc_type: string;
          label: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          centre_id: string;
          storage_path: string;
          doc_type?: string;
          label?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          centre_id?: string;
          storage_path?: string;
          doc_type?: string;
          label?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      centres: {
        Row: {
          id: string;
          owner_id: string | null;
          name: string;
          slug: string;
          space_type: 'study_hall' | 'reading_room' | 'coworking' | 'both';
          area: string | null;
          address: string | null;
          lat: number | null;
          lng: number | null;
          capacity: number;
          cover_url: string | null;
          emoji: string;
          rating: number;
          reviews_count: number;
          is_verified: boolean;
          women_safe_verified: boolean;
          is_published: boolean;
          created_at: string;
          status: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'suspended' | 'archived';
          rejection_reason: string | null;
          admin_notes: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          updated_at: string;
          location_id: string | null;
          website: string | null;
          phone: string | null;
          social: Json;
          google_place_id: string | null;
          description: string | null;
          logo_url: string | null;
          city: string | null;
          state: string | null;
          country: string;
          postcode: string | null;
          alt_phone: string | null;
          business_email: string | null;
          tags: string[];
        };
        Insert: {
          id?: string;
          owner_id?: string | null;
          name: string;
          slug: string;
          space_type?: 'study_hall' | 'reading_room' | 'coworking' | 'both';
          area?: string | null;
          address?: string | null;
          lat?: number | null;
          lng?: number | null;
          capacity?: number;
          cover_url?: string | null;
          emoji?: string;
          rating?: number;
          reviews_count?: number;
          is_verified?: boolean;
          women_safe_verified?: boolean;
          is_published?: boolean;
          created_at?: string;
          status?: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'suspended' | 'archived';
          rejection_reason?: string | null;
          admin_notes?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          updated_at?: string;
          location_id?: string | null;
          website?: string | null;
          phone?: string | null;
          social?: Json;
          google_place_id?: string | null;
          description?: string | null;
          logo_url?: string | null;
          city?: string | null;
          state?: string | null;
          country?: string;
          postcode?: string | null;
          alt_phone?: string | null;
          business_email?: string | null;
          tags?: string[];
        };
        Update: {
          id?: string;
          owner_id?: string | null;
          name?: string;
          slug?: string;
          space_type?: 'study_hall' | 'reading_room' | 'coworking' | 'both';
          area?: string | null;
          address?: string | null;
          lat?: number | null;
          lng?: number | null;
          capacity?: number;
          cover_url?: string | null;
          emoji?: string;
          rating?: number;
          reviews_count?: number;
          is_verified?: boolean;
          women_safe_verified?: boolean;
          is_published?: boolean;
          created_at?: string;
          status?: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'suspended' | 'archived';
          rejection_reason?: string | null;
          admin_notes?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          updated_at?: string;
          location_id?: string | null;
          website?: string | null;
          phone?: string | null;
          social?: Json;
          google_place_id?: string | null;
          description?: string | null;
          logo_url?: string | null;
          city?: string | null;
          state?: string | null;
          country?: string;
          postcode?: string | null;
          alt_phone?: string | null;
          business_email?: string | null;
          tags?: string[];
        };
        Relationships: [];
      };
      contact_messages: {
        Row: { id: string; first_name: string; last_name: string; email: string; phone: string | null; message: string; created_at: string };
        Insert: { id?: string; first_name: string; last_name: string; email: string; phone?: string | null; message: string; created_at?: string };
        Update: { id?: string; first_name?: string; last_name?: string; email?: string; phone?: string | null; message?: string; created_at?: string };
        Relationships: [];
      };
      centre_hours: {
        Row: { centre_id: string; day_of_week: number; is_open: boolean; opening_time: string | null; closing_time: string | null };
        Insert: { centre_id: string; day_of_week: number; is_open?: boolean; opening_time?: string | null; closing_time?: string | null };
        Update: { centre_id?: string; day_of_week?: number; is_open?: boolean; opening_time?: string | null; closing_time?: string | null };
        Relationships: [];
      };
      check_ins: {
        Row: {
          id: string;
          centre_id: string;
          user_id: string;
          checked_in_at: string;
          checked_out_at: string | null;
        };
        Insert: {
          id?: string;
          centre_id: string;
          user_id: string;
          checked_in_at?: string;
          checked_out_at?: string | null;
        };
        Update: {
          id?: string;
          centre_id?: string;
          user_id?: string;
          checked_in_at?: string;
          checked_out_at?: string | null;
        };
        Relationships: [];
      };
      email_logs: {
        Row: {
          id: string;
          to_email: string;
          template: string;
          status: string;
          provider_id: string | null;
          error: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          to_email: string;
          template: string;
          status?: string;
          provider_id?: string | null;
          error?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          to_email?: string;
          template?: string;
          status?: string;
          provider_id?: string | null;
          error?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      enquiries: {
        Row: {
          id: string;
          centre_id: string;
          sender_id: string | null;
          name: string;
          email: string;
          phone: string | null;
          message: string;
          status: 'new' | 'read' | 'responded' | 'closed' | 'spam';
          created_at: string;
        };
        Insert: {
          id?: string;
          centre_id: string;
          sender_id?: string | null;
          name: string;
          email: string;
          phone?: string | null;
          message: string;
          status?: 'new' | 'read' | 'responded' | 'closed' | 'spam';
          created_at?: string;
        };
        Update: {
          id?: string;
          centre_id?: string;
          sender_id?: string | null;
          name?: string;
          email?: string;
          phone?: string | null;
          message?: string;
          status?: 'new' | 'read' | 'responded' | 'closed' | 'spam';
          created_at?: string;
        };
        Relationships: [];
      };
      featured_listings: {
        Row: {
          centre_id: string;
          starts_at: string;
          ends_at: string | null;
          created_by: string | null;
        };
        Insert: {
          centre_id: string;
          starts_at?: string;
          ends_at?: string | null;
          created_by?: string | null;
        };
        Update: {
          centre_id?: string;
          starts_at?: string;
          ends_at?: string | null;
          created_by?: string | null;
        };
        Relationships: [];
      };
      listing_categories: {
        Row: {
          centre_id: string;
          category_id: string;
        };
        Insert: {
          centre_id: string;
          category_id: string;
        };
        Update: {
          centre_id?: string;
          category_id?: string;
        };
        Relationships: [];
      };
      listing_claims: {
        Row: {
          id: string;
          centre_id: string;
          claimant_id: string;
          evidence: string | null;
          status: 'pending' | 'approved' | 'rejected';
          reviewed_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          centre_id: string;
          claimant_id: string;
          evidence?: string | null;
          status?: 'pending' | 'approved' | 'rejected';
          reviewed_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          centre_id?: string;
          claimant_id?: string;
          evidence?: string | null;
          status?: 'pending' | 'approved' | 'rejected';
          reviewed_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      listing_images: {
        Row: {
          id: string;
          centre_id: string;
          storage_path: string;
          alt: string | null;
          is_cover: boolean;
          sort_order: number;
          created_at: string;
          category: string | null;
        };
        Insert: {
          id?: string;
          centre_id: string;
          storage_path: string;
          alt?: string | null;
          is_cover?: boolean;
          sort_order?: number;
          created_at?: string;
          category?: string | null;
        };
        Update: {
          id?: string;
          centre_id?: string;
          storage_path?: string;
          alt?: string | null;
          is_cover?: boolean;
          sort_order?: number;
          category?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      locations: {
        Row: {
          id: string;
          slug: string;
          name: string;
          city: string;
          lat: number | null;
          lng: number | null;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          city?: string;
          lat?: number | null;
          lng?: number | null;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          city?: string;
          lat?: number | null;
          lng?: number | null;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          kind: string;
          title: string;
          body: string | null;
          url: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          kind: string;
          title: string;
          body?: string | null;
          url?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          kind?: string;
          title?: string;
          body?: string | null;
          url?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      newsletter_subscribers: {
        Row: { id: string; email: string; created_at: string };
        Insert: { id?: string; email: string; created_at?: string };
        Update: { id?: string; email?: string; created_at?: string };
        Relationships: [];
      };
      onboarding_progress: {
        Row: {
          user_id: string;
          step: string;
          completed: boolean;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          step?: string;
          completed?: boolean;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          step?: string;
          completed?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          role: 'student' | 'owner' | 'admin';
          exam: string | null;
          home_area: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          role?: 'student' | 'owner' | 'admin';
          exam?: string | null;
          home_area?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          phone?: string | null;
          role?: 'student' | 'owner' | 'admin';
          exam?: string | null;
          home_area?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      refunds: {
        Row: {
          id: string;
          booking_id: string;
          amount: number;
          reason: string | null;
          status: string;
          is_partial: boolean;
          razorpay_refund_id: string | null;
          requested_by: string | null;
          processed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          amount: number;
          reason?: string | null;
          status?: string;
          is_partial?: boolean;
          razorpay_refund_id?: string | null;
          requested_by?: string | null;
          processed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          amount?: number;
          reason?: string | null;
          status?: string;
          is_partial?: boolean;
          razorpay_refund_id?: string | null;
          requested_by?: string | null;
          processed_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      resources: {
        Row: {
          id: string;
          centre_id: string;
          resource_type: 'seat' | 'meeting_room' | 'conference_room' | 'cabin';
          tier: 'open' | 'ac' | 'premium' | null;
          label: string;
          unit_count: number;
          pricing: Json;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          centre_id: string;
          resource_type: 'seat' | 'meeting_room' | 'conference_room' | 'cabin';
          tier?: 'open' | 'ac' | 'premium' | null;
          label: string;
          unit_count?: number;
          pricing?: Json;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          centre_id?: string;
          resource_type?: 'seat' | 'meeting_room' | 'conference_room' | 'cabin';
          tier?: 'open' | 'ac' | 'premium' | null;
          label?: string;
          unit_count?: number;
          pricing?: Json;
          is_active?: boolean;
        };
        Relationships: [];
      };
      review_reports: {
        Row: {
          id: string;
          review_id: string;
          reporter_id: string | null;
          reason: string;
          resolved: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          review_id: string;
          reporter_id?: string | null;
          reason: string;
          resolved?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          review_id?: string;
          reporter_id?: string | null;
          reason?: string;
          resolved?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          centre_id: string;
          author_id: string;
          rating: number;
          body: string | null;
          is_verified: boolean;
          status: 'published' | 'pending' | 'removed';
          created_at: string;
        };
        Insert: {
          id?: string;
          centre_id: string;
          author_id: string;
          rating: number;
          body?: string | null;
          is_verified?: boolean;
          status?: 'published' | 'pending' | 'removed';
          created_at?: string;
        };
        Update: {
          id?: string;
          centre_id?: string;
          author_id?: string;
          rating?: number;
          body?: string | null;
          is_verified?: boolean;
          status?: 'published' | 'pending' | 'removed';
          created_at?: string;
        };
        Relationships: [];
      };
      saved_listings: {
        Row: {
          user_id: string;
          centre_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          centre_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          centre_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      waitlist_entries: {
        Row: {
          id: string;
          resource_id: string;
          user_id: string;
          period: 'hour' | 'day' | 'week' | 'fortnight' | 'month' | 'quarter' | 'half_year' | 'year';
          status: string;
          promoted_booking_id: string | null;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          resource_id: string;
          user_id: string;
          period: 'hour' | 'day' | 'week' | 'fortnight' | 'month' | 'quarter' | 'half_year' | 'year';
          status?: string;
          promoted_booking_id?: string | null;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          resource_id?: string;
          user_id?: string;
          period?: 'hour' | 'day' | 'week' | 'fortnight' | 'month' | 'quarter' | 'half_year' | 'year';
          status?: string;
          promoted_booking_id?: string | null;
          expires_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      webhook_events: {
        Row: {
          id: string;
          provider: string;
          processed_at: string;
        };
        Insert: {
          id: string;
          provider?: string;
          processed_at?: string;
        };
        Update: {
          id?: string;
          provider?: string;
          processed_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      centre_live_occupancy: {
        Row: {
          centre_id: string | null;
          capacity: number | null;
          inside_now: number | null;
          seats_free: number | null;
          occ_pct: number | null;
          status: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      admin_set_user_role: { Args: { p_user: string; p_role: string }; Returns: undefined; };
      admin_unlock_account: { Args: { p_user_id: string }; Returns: undefined; };
      approve_claim: { Args: { p_claim_id: string }; Returns: undefined; };
      assign_invoice_number: { Args: Record<string, never>; Returns: unknown; };
      auth_failed_login_count: { Args: Record<string, never>; Returns: number; };
      auth_locked_until: { Args: Record<string, never>; Returns: string | null; };
      auth_role: { Args: Record<string, never>; Returns: unknown; };
      block_self_review: { Args: Record<string, never>; Returns: unknown; };
      book_seat: { Args: { p_centre_id: string; p_resource_id: string; p_period: string; p_starts_at: string; p_ends_at: string; p_amount: number }; Returns: string; };
      book_seat_multi: { Args: { p_centre_id: string; p_resource_id: string; p_date: string; p_hours: number[]; p_amount_per_hour: number }; Returns: string; };
      centre_is_open_on: { Args: { p_centre_id: string; p_date: string }; Returns: boolean; };
      cancel_booking: { Args: { p_booking_id: string; p_reason: string }; Returns: undefined; };
      choose_role: { Args: { p_role: string }; Returns: undefined; };
      distance_chebyshev: { Args: Record<string, never>; Returns: number; };
      distance_taxicab: { Args: Record<string, never>; Returns: number; };
      expire_pending_bookings: { Args: Record<string, never>; Returns: number; };
      g_cube_consistent: { Args: Record<string, never>; Returns: boolean; };
      g_cube_distance: { Args: Record<string, never>; Returns: number; };
      g_cube_penalty: { Args: Record<string, never>; Returns: unknown; };
      g_cube_picksplit: { Args: Record<string, never>; Returns: unknown; };
      g_cube_same: { Args: Record<string, never>; Returns: unknown; };
      g_cube_union: { Args: Record<string, never>; Returns: unknown; };
      gc_to_sec: { Args: { double: string }; Returns: number; };
      gen_random_bytes: { Args: Record<string, never>; Returns: unknown; };
      gen_random_uuid: { Args: Record<string, never>; Returns: string; };
      geo_distance: { Args: Record<string, never>; Returns: number; };
      handle_new_user: { Args: Record<string, never>; Returns: unknown; };
      is_account_locked: { Args: { p_email: string }; Returns: boolean; };
      latitude: { Args: Record<string, never>; Returns: number; };
      log_audit: { Args: { p_action: string; p_entity_type: string; p_entity_id: string; p_metadata: Json }; Returns: undefined; };
      longitude: { Args: Record<string, never>; Returns: number; };
      promote_waitlist: { Args: { p_resource_id: string }; Returns: undefined; };
      record_login_failure: { Args: { p_email: string }; Returns: undefined; };
      record_login_success: { Args: Record<string, never>; Returns: undefined; };
      resource_day_availability: { Args: { p_resource_id: string; p_date: string; p_period: string }; Returns: { taken: number; capacity: number; is_available: boolean }[]; };
      resource_hour_slots: { Args: { p_resource_id: string; p_date: string; p_period?: string }; Returns: { hour: number; taken: number; capacity: number; is_available: boolean; is_past: boolean }[]; };
      search_centres_nearby: { Args: { p_lat: number; p_lng: number; p_radius_km: number; p_space_type: string; p_women_safe: boolean; p_limit: number }; Returns: unknown[]; };
      sec_to_gc: { Args: { double: string }; Returns: number; };
      sync_centre_published: { Args: Record<string, never>; Returns: unknown; };
    };
    Enums: {
      booking_period: 'hour' | 'day' | 'week' | 'fortnight' | 'month' | 'quarter' | 'half_year' | 'year';
      booking_status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'checked_in' | 'no_show' | 'expired' | 'refunded';
      claim_status: 'pending' | 'approved' | 'rejected';
      enquiry_status: 'new' | 'read' | 'responded' | 'closed' | 'spam';
      listing_status: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'suspended' | 'archived';
      payment_status: 'unpaid' | 'paid' | 'refunded' | 'refund_pending' | 'partially_refunded';
      resource_type: 'seat' | 'meeting_room' | 'conference_room' | 'cabin';
      review_status: 'published' | 'pending' | 'removed';
      seat_tier: 'open' | 'ac' | 'premium';
      space_type: 'study_hall' | 'reading_room' | 'coworking' | 'both';
      user_role: 'student' | 'owner' | 'admin';
    };
    CompositeTypes: Record<string, never>;
  };
}


export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T];
