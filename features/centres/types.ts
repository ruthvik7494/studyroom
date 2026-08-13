import type { Tables, Enums } from '@/types/database.types';

export type Centre = Tables<'centres'>;
export type Resource = Tables<'resources'>;
export type SpaceType = Enums<'space_type'>;

/** A centre enriched with live occupancy + cheapest monthly price for cards. */
export interface CentreListItem
  extends Pick<Centre, 'id' | 'slug' | 'name' | 'area' | 'emoji' | 'cover_url' | 'rating' | 'reviews_count' | 'women_safe_verified' | 'is_verified' | 'space_type'> {
  fromMonthly: number | null;
  occupancy: { seatsFree: number; status: 'open' | 'filling' | 'full' | 'unknown' } | null;
}

export interface CentreImage {
  id: string;
  storage_path: string;
  alt: string | null;
  is_cover: boolean;
  sort_order: number;
}

export interface CentreAmenity {
  slug: string;
  label: string;
  icon: string | null;
}

export interface CentreDetail extends Centre {
  fromMonthly?: number | null;
  resources: Resource[];
  occupancy: CentreListItem['occupancy'];
  gallery: CentreImage[];
  amenities: CentreAmenity[];
  social: Record<string, string>;
  similar: CentreListItem[];
}

/** Keyset cursor: rating + id uniquely orders the feed. */
export interface FeedCursor {
  rating: number;
  id: string;
}

export interface CentrePage {
  items: CentreListItem[];
  nextCursor: FeedCursor | null;
}
