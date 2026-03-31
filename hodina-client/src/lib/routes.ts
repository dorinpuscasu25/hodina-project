import type { ListingKind } from '../types';

export type ClientPage =
  | 'home'
  | 'listing'
  | 'experience'
  | 'booking'
  | 'bookings'
  | 'profile'
  | 'become-host'
  | 'messages'
  | 'guesthouse';

export interface NavigationData {
  id?: number | string;
  slug?: string | null;
  kind?: ListingKind;
  query?: string;
  categoryId?: number;
  typeId?: number;
  bookingId?: number;
}

function resolveIdentifier(data?: NavigationData) {
  return data?.slug || data?.id?.toString() || '';
}

export function buildClientPath(page: ClientPage, data: NavigationData = {}) {
  const params = new URLSearchParams();

  switch (page) {
    case 'home':
      return '/';
    case 'listing':
      if (data.query?.trim()) {
        params.set('q', data.query.trim());
      }

      if (data.categoryId) {
        params.set('category', String(data.categoryId));
      }

      if (data.typeId) {
        params.set('type', String(data.typeId));
      }

      if (data.kind) {
        params.set('kind', data.kind);
      }

      return `/explore${params.toString() ? `?${params.toString()}` : ''}`;
    case 'experience':
      return data.kind === 'accommodation'
        ? `/stays/${resolveIdentifier(data)}`
        : `/experiences/${resolveIdentifier(data)}`;
    case 'booking':
      return data.kind === 'accommodation'
        ? `/book/stays/${resolveIdentifier(data)}`
        : `/book/experiences/${resolveIdentifier(data)}`;
    case 'guesthouse':
      return `/guesthouses/${resolveIdentifier(data)}`;
    case 'bookings':
      return '/account/bookings';
    case 'profile':
      return '/account/profile';
    case 'become-host':
      return '/become-host';
    case 'messages':
      if (data.bookingId) {
        params.set('booking', String(data.bookingId));
      }

      return `/account/messages${params.toString() ? `?${params.toString()}` : ''}`;
    default:
      return '/';
  }
}

export function resolveCurrentPage(pathname: string): ClientPage {
  if (pathname === '/') {
    return 'home';
  }

  if (pathname.startsWith('/account/messages')) {
    return 'messages';
  }

  if (pathname.startsWith('/account/bookings')) {
    return 'bookings';
  }

  if (pathname.startsWith('/account/profile')) {
    return 'profile';
  }

  if (pathname.startsWith('/become-host')) {
    return 'become-host';
  }

  if (
    pathname.startsWith('/explore') ||
    pathname.startsWith('/experiences/') ||
    pathname.startsWith('/stays/') ||
    pathname.startsWith('/guesthouses/') ||
    pathname.startsWith('/book/')
  ) {
    return 'listing';
  }

  return 'home';
}
