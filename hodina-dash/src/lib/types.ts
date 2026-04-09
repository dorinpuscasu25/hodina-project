export interface Category {
  id: number;
  type: string;
  code: string | null;
  parent_id: number | null;
  name: string;
  description: string | null;
  slug: string | null;
  image: string | null;
  sort_order: number;
  settings: {
    card_background?: string;
    accent_color?: string;
  };
  children?: Category[];
}

export interface Guesthouse {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  public_email: string | null;
  public_phone: string | null;
  locale: string;
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
  locale: string;
  timezone: string;
  email_verified: boolean;
  guesthouse_id: number | null;
  is_active: boolean;
}

export interface AuthResponse {
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
  rating_average?: number | null;
  reviews_count?: number;
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
  reviews?: Review[];
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
  rating_average?: number | null;
  reviews_count?: number;
  gallery?: string[];
  highlights?: string[];
  house_rules?: string[];
  cancellation_policy?: string | null;
  amenities?: Category[];
  reviews?: Review[];
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
  payment_status: string;
  paid_amount: number;
  refunded_amount: number;
  paid_at: string | null;
  refunded_at: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  special_requests: string | null;
  host_response: string | null;
  chat_enabled: boolean;
  can_review: boolean;
  confirmed_at: string | null;
  cancelled_at: string | null;
  guest: UserProfile | null;
  guesthouse: Guesthouse | null;
  bookable_type: string | null;
  bookable: ExperienceListing | AccommodationListing | null;
  experience_session: {
    id: number;
    starts_at: string | null;
    ends_at: string | null;
    status: string;
    title_override?: string | null;
  } | null;
  review: Review | null;
}

export interface Review {
  id: number;
  rating: number;
  title: string | null;
  comment: string;
  host_reply: string | null;
  host_replied_at: string | null;
  published_at: string | null;
  created_at: string | null;
  guest: {
    id: number;
    name: string;
  } | null;
}

export interface BookingMessage {
  id: number;
  body: string;
  read_at: string | null;
  created_at: string | null;
  sender: UserProfile | null;
}

export interface CalendarCollection {
  sessions: Array<{
    id: string;
    entity_id: number;
    type: string;
    title: string;
    start: string | null;
    end: string | null;
    status: string;
    spots_left: number | null;
    capacity: number | null;
    reserved_guests: number | null;
    experience_id: number;
    experience_title: string | null;
    description: string | null;
    title_override: string | null;
    is_manual: boolean;
    editable: boolean;
    deletable: boolean;
  }>;
  bookings: Array<{
    id: string;
    entity_id: number;
    type: string;
    title: string;
    start: string | null;
    end: string | null;
    status: string;
    contact_name: string;
    booking_number: string;
    chat_enabled: boolean;
    bookable: ExperienceListing | AccommodationListing | null;
  }>;
  events: Array<{
    id: string;
    entity_id: number;
    type: string;
    title: string;
    description: string | null;
    start: string | null;
    end: string | null;
    blocks_inventory: boolean;
    units_blocked: number;
    accommodation_id: number | null;
    accommodation_title: string | null;
    editable: boolean;
    deletable: boolean;
  }>;
}

export interface DashboardSummary {
  guesthouse: Guesthouse;
  counts: {
    experiences: number;
    accommodations: number;
    pending_bookings: number;
    confirmed_bookings: number;
  };
  financials: {
    gross_revenue: number;
    paid_revenue: number;
    refunded_amount: number;
    outstanding_amount: number;
  };
  highlights: {
    today_check_ins: number;
    today_check_outs: number;
    unique_clients: number;
    average_rating: number;
    reviews_count: number;
  };
  statistics_preview: DashboardStatistics;
  recent_reviews: Review[];
  upcoming_bookings: Booking[];
}

export interface DashboardStatistics {
  period: {
    preset: string;
    group_by: 'day' | 'week' | 'month';
    start_date: string;
    end_date: string;
    label: string;
  };
  overview: {
    bookings_total: number;
    confirmed_bookings: number;
    pending_bookings: number;
    cancelled_bookings: number;
    completed_stays: number;
    guests_total: number;
    unique_clients: number;
    gross_revenue: number;
    paid_revenue: number;
    refunded_amount: number;
    outstanding_amount: number;
    average_booking_value: number;
    reviews_count: number;
    average_rating: number;
    confirmation_rate: number;
  };
  trend: Array<{
    start: string;
    end: string;
    label: string;
    bookings: number;
    guests: number;
    gross_revenue: number;
    paid_revenue: number;
  }>;
  booking_statuses: Array<{
    status: string;
    label: string;
    value: number;
  }>;
  bookable_types: Array<{
    type: string;
    label: string;
    value: number;
    gross_revenue: number;
    paid_revenue: number;
  }>;
  top_listings: Array<{
    id: number;
    type: string;
    title: string | null;
    cover_image: string | null;
    bookings: number;
    gross_revenue: number;
    paid_revenue: number;
    reviews_count: number;
    average_rating: number;
  }>;
  recent_reviews: Review[];
}

export interface OrganizationMember extends UserProfile {
  status: string;
  last_login_at: string | null;
}

export interface OrganizationData {
  guesthouse: Guesthouse;
  members: OrganizationMember[];
  role_options: Array<{
    value: string;
    label: string;
  }>;
  permissions: {
    can_manage_team: boolean;
    can_manage_settings: boolean;
  };
  availability: {
    accommodations: Array<{
      id: number;
      title: string;
      units_total: number | null;
      units_reserved: number;
      units_available: number | null;
      status: string;
      active_bookings: number;
      pending_bookings: number;
      confirmed_bookings: number;
      next_check_in: string | null;
    }>;
    summary: {
      accommodation_count: number;
      units_total: number;
      units_reserved: number;
      units_available: number;
      active_bookings: number;
      upcoming_experience_sessions: number;
    };
    schedule: {
      working_days: string[];
      opening_time: string | null;
      closing_time: string | null;
      days_off: string[];
      note: string | null;
    };
    upcoming_experience_sessions: number;
  };
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
