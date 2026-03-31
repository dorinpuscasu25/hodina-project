import type {
  AccommodationListing,
  Booking,
  ExperienceListing,
  ListingKind,
  PublicListing,
} from '../types';

export function formatCurrency(amount: number, currency = 'MDL', locale = 'ro-MD') {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toFixed(0)} ${currency}`;
  }
}

export function formatDate(
  value: string | null | undefined,
  locale = 'ro-RO',
  options: Intl.DateTimeFormatOptions = {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  },
) {
  if (!value) {
    return 'Nespecificat';
  }

  return new Date(value).toLocaleDateString(locale, options);
}

export function formatDateTime(value: string | null | undefined, locale = 'ro-RO') {
  if (!value) {
    return 'Nespecificat';
  }

  return new Date(value).toLocaleString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDuration(minutes: number | null | undefined) {
  if (!minutes) {
    return 'Durată flexibilă';
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (!remainingMinutes) {
    return `${hours} h`;
  }

  return `${hours} h ${remainingMinutes} min`;
}

export function humanizeStatus(status: string) {
  return {
    pending: 'În așteptare',
    confirmed: 'Confirmată',
    rejected: 'Respinsă',
    cancelled: 'Anulată',
    completed: 'Finalizată',
    draft: 'Draft',
    published: 'Publicată',
    archived: 'Arhivată',
    scheduled: 'Programată',
  }[status] ?? status;
}

export function bookingTabStatus(booking: Booking): 'upcoming' | 'past' | 'cancelled' {
  if (booking.status === 'cancelled' || booking.status === 'rejected') {
    return 'cancelled';
  }

  if (booking.status === 'completed') {
    return 'past';
  }

  if (booking.ends_at && new Date(booking.ends_at).getTime() < Date.now()) {
    return 'past';
  }

  return 'upcoming';
}

export function isExperienceListing(
  listing: ExperienceListing | AccommodationListing | null | undefined,
): listing is ExperienceListing {
  return Boolean(listing && 'price_amount' in listing);
}

export function isAccommodationListing(
  listing: ExperienceListing | AccommodationListing | null | undefined,
): listing is AccommodationListing {
  return Boolean(listing && 'nightly_rate' in listing);
}

export function toPublicListing(listing: ExperienceListing | AccommodationListing): PublicListing {
  if (isExperienceListing(listing)) {
    return {
      kind: 'experience',
      data: listing,
    };
  }

  return {
    kind: 'accommodation',
    data: listing,
  };
}

export function getListingKind(listing: ExperienceListing | AccommodationListing): ListingKind {
  return isExperienceListing(listing) ? 'experience' : 'accommodation';
}

export function getListingPrice(listing: ExperienceListing | AccommodationListing) {
  return isExperienceListing(listing) ? listing.price_amount : listing.nightly_rate;
}

export function getListingLocation(listing: ExperienceListing | AccommodationListing) {
  return [listing.city, listing.country].filter(Boolean).join(', ') || 'Moldova';
}
