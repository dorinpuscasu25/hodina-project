export type Language = 'en' | 'ro' | 'ru';
export type ListingKind = 'experience' | 'accommodation';

export interface Category {
  id: number;
  type: string;
  code: string | null;
  name: string;
  description: string | null;
  slug: string | null;
  image: string | null;
  sort_order: number;
  settings: {
    card_background?: string;
    accent_color?: string;
  };
}

export interface Guesthouse {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  public_email: string | null;
  public_phone: string | null;
  locale: Language;
  currency: string;
  country: string | null;
  city: string | null;
  address: string | null;
  latitude: string | null;
  longitude: string | null;
  cover_image: string | null;
  gallery: string[];
  check_in_notes?: string | null;
  house_rules?: string | null;
}

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  guesthouse_role: string | null;
  locale: Language;
  timezone: string;
  email_verified: boolean;
  guesthouse_id: number | null;
  is_active: boolean;
}

export interface AuthPayload {
  token: string;
  user: UserProfile;
  guesthouse: Guesthouse | null;
  requires_email_verification: boolean;
}

export interface BootstrapData {
  locales: Record<string, string>;
  experience_categories: Category[];
  accommodation_types: Category[];
  amenities: Category[];
}

export interface ExperienceListing {
  id: number;
  slug: string;
  status: string;
  title: string;
  short_description: string | null;
  description?: string | null;
  price_amount: number;
  currency: string;
  price_mode?: string | null;
  duration_minutes: number | null;
  max_guests: number | null;
  min_age?: number | null;
  difficulty?: string | null;
  city: string | null;
  country: string | null;
  address?: string | null;
  location_name?: string | null;
  meeting_point?: string | null;
  cover_image: string | null;
  category: Category | null;
  guesthouse: Guesthouse | null;
  default_start_time?: string | null;
  default_end_time?: string | null;
  available_days?: string[];
  is_instant_book?: boolean;
  gallery?: string[];
  video_url?: string | null;
  included_items?: string[];
  excluded_items?: string[];
  what_to_bring?: string[];
  cancellation_policy?: string | null;
  important_notes?: string | null;
  amenities?: Category[];
}

export interface AccommodationListing {
  id: number;
  slug: string;
  status: string;
  title: string;
  short_description: string | null;
  description?: string | null;
  nightly_rate: number;
  cleaning_fee: number;
  currency: string;
  city: string | null;
  country: string | null;
  address?: string | null;
  max_guests: number | null;
  bedrooms: number | null;
  beds: number | null;
  bathrooms: number | null;
  units_total: number | null;
  min_nights?: number | null;
  max_nights?: number | null;
  check_in_from?: string | null;
  check_out_until?: string | null;
  is_instant_book?: boolean;
  cover_image: string | null;
  guesthouse: Guesthouse | null;
  type: Category | null;
  gallery?: string[];
  highlights?: string[];
  house_rules?: string[];
  cancellation_policy?: string | null;
  amenities?: Category[];
  available_units?: number;
}

export interface ExperienceSession {
  id: number;
  starts_at: string | null;
  ends_at: string | null;
  status: string;
  spots_left: number;
  capacity: number | null;
  reserved_guests: number;
  title: string | null;
  title_override?: string | null;
  description?: string | null;
  experience_id: number;
  experience_title: string | null;
}

export interface Booking {
  id: number;
  booking_number: string;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  adults: number;
  children: number;
  infants: number;
  units: number;
  currency: string;
  subtotal_amount: number;
  total_amount: number;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  special_requests: string | null;
  host_response: string | null;
  chat_enabled: boolean;
  confirmed_at: string | null;
  cancelled_at: string | null;
  guest: UserProfile | null;
  guesthouse: Guesthouse | null;
  bookable_type: string | null;
  bookable: ExperienceListing | AccommodationListing | null;
  experience_session: ExperienceSession | null;
}

export interface BookingMessage {
  id: number;
  body: string;
  read_at: string | null;
  created_at: string | null;
  sender: UserProfile | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export type PublicListing =
  | {
      kind: 'experience';
      data: ExperienceListing;
    }
  | {
      kind: 'accommodation';
      data: AccommodationListing;
    };

export interface GuesthousePublicPageData {
  guesthouse: Guesthouse;
  counts: {
    experiences: number;
    accommodations: number;
  };
  experiences: ExperienceListing[];
  accommodations: AccommodationListing[];
}
