import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  MessageCircle,
  Star,
  Users,
  X,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { apiRequest, formatApiError } from '../lib/api';
import { useSeo } from '../lib/seo';
import {
  formatCurrency,
  formatDateTime,
  formatDuration,
  isAccommodationListing,
  isExperienceListing,
} from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import type { AccommodationListing, Booking, ExperienceListing, ExperienceSession, ListingKind } from '../types';

interface ExperiencePageProps {
  listingIdentifier: string;
  listingKind: ListingKind;
  onNavigate: (page: string, data?: Record<string, unknown>) => void;
}

const formatSessionBadge = (iso: string | null) => {
  if (!iso) return { day: '—', month: '', time: '' };
  const d = new Date(iso);
  return {
    day: String(d.getDate()),
    month: d.toLocaleDateString(undefined, { month: 'short' }).toUpperCase(),
    time: d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
  };
};

export const ExperiencePage = ({
  listingIdentifier,
  listingKind,
  onNavigate,
}: ExperiencePageProps) => {
  const { t, language } = useLanguage();
  const { isAuthenticated, token, user } = useAuth();
  const [listing, setListing] = useState<ExperienceListing | AccommodationListing | null>(null);
  const [sessions, setSessions] = useState<ExperienceSession[]>([]);
  const [related, setRelated] = useState<Array<ExperienceListing | AccommodationListing>>([]);
  const [activeConversationBooking, setActiveConversationBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isSessionsModalOpen, setIsSessionsModalOpen] = useState(false);
  const [sessionFilterDate, setSessionFilterDate] = useState('');

  useEffect(() => {
    let ignore = false;

    async function loadListing() {
      setIsLoading(true);
      setError(null);
      setCurrentImageIndex(0);

      try {
        const locale = encodeURIComponent(language);

        if (listingKind === 'experience') {
          const [detailResponse, sessionsResponse] = await Promise.all([
            apiRequest<{ data: ExperienceListing }>(`/public/experiences/${encodeURIComponent(listingIdentifier)}?locale=${locale}`),
            apiRequest<{ data: ExperienceSession[] }>(`/public/experiences/${encodeURIComponent(listingIdentifier)}/sessions?locale=${locale}`),
          ]);

          if (ignore) return;

          setListing(detailResponse.data);
          setSessions(sessionsResponse.data);

          const relatedResponse = await apiRequest<{ data: ExperienceListing[] }>(
            `/public/experiences?locale=${locale}&per_page=4${detailResponse.data.category?.id ? `&category_id=${detailResponse.data.category.id}` : ''}`,
          );

          if (!ignore) {
            setRelated(relatedResponse.data.filter((item) => item.id !== detailResponse.data.id).slice(0, 3));
          }
        } else {
          const detailResponse = await apiRequest<{ data: AccommodationListing }>(
            `/public/accommodations/${encodeURIComponent(listingIdentifier)}?locale=${locale}`,
          );

          if (ignore) return;

          setListing(detailResponse.data);
          setSessions([]);

          const relatedResponse = await apiRequest<{ data: AccommodationListing[] }>(
            `/public/accommodations?locale=${locale}&per_page=4${detailResponse.data.type?.id ? `&type_id=${detailResponse.data.type.id}` : ''}`,
          );

          if (!ignore) {
            setRelated(relatedResponse.data.filter((item) => item.id !== detailResponse.data.id).slice(0, 3));
          }
        }
      } catch (loadError) {
        if (!ignore) {
          setError(formatApiError(loadError));
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadListing();

    return () => {
      ignore = true;
    };
  }, [language, listingIdentifier, listingKind]);

  useEffect(() => {
    let ignore = false;

    async function loadActiveConversationBooking() {
      setActiveConversationBooking(null);

      if (!listing || !token || !isAuthenticated || !user?.email_verified) {
        return;
      }

      try {
        const response = await apiRequest<{ data: Booking[] }>('/client/bookings', { token });
        if (ignore) return;

        const expectedBookableType = listingKind === 'accommodation' ? 'Accommodation' : 'Experience';
        const matchingBooking =
          response.data.find(
            (booking) =>
              booking.chat_enabled &&
              (booking.status === 'confirmed' || booking.status === 'completed') &&
              booking.bookable_type === expectedBookableType &&
              booking.bookable?.id === listing.id,
          ) ?? null;

        setActiveConversationBooking(matchingBooking);
      } catch {
        if (!ignore) {
          setActiveConversationBooking(null);
        }
      }
    }

    void loadActiveConversationBooking();

    return () => {
      ignore = true;
    };
  }, [isAuthenticated, listing, listingKind, token, user?.email_verified]);

  const images = useMemo(() => {
    if (!listing) return [];
    const source = listing.gallery?.length ? listing.gallery : listing.cover_image ? [listing.cover_image] : [];
    return source.filter(Boolean);
  }, [listing]);

  const nextImage = () => {
    setCurrentImageIndex((current) => (images.length ? (current + 1) % images.length : 0));
  };

  const prevImage = () => {
    setCurrentImageIndex((current) => (images.length ? (current - 1 + images.length) % images.length : 0));
  };

  const goToBooking = (sessionId?: number) => {
    if (!listing) return;
    onNavigate('booking', {
      id: listing.id,
      slug: listing.slug,
      kind: listingKind,
      ...(sessionId ? { sessionId } : {}),
    });
  };

  const goToHostConversation = () => {
    if (!activeConversationBooking) return;
    onNavigate('messages', { bookingId: activeConversationBooking.id });
  };

  const canonicalPath = listing
    ? listingKind === 'experience'
      ? `/experiences/${listing.slug || listing.id}`
      : `/stays/${listing.slug || listing.id}`
    : undefined;

  useSeo({
    title: listing ? listing.title : 'Listare Hodina',
    description: listing?.short_description || listing?.description || 'Descoperă o experiență sau o cazare locală din Moldova pe Hodina.',
    image: images[0] ?? listing?.cover_image,
    canonicalPath,
    jsonLd: listing
      ? {
          '@context': 'https://schema.org',
          '@type': listingKind === 'accommodation' ? 'LodgingBusiness' : 'TouristAttraction',
          name: listing.title,
          description: listing.short_description || listing.description,
          image: images,
          provider: listing.guesthouse?.name
            ? {
                '@type': 'Organization',
                name: listing.guesthouse.name,
              }
            : undefined,
          address: {
            '@type': 'PostalAddress',
            addressCountry: listing.country,
            addressLocality: listing.city,
            streetAddress: listing.address,
          },
          url: typeof window !== 'undefined' ? window.location.href : undefined,
        }
      : null,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen overflow-x-hidden bg-white pb-24 md:pb-0">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="h-[420px] animate-pulse rounded-3xl bg-gray-100" />
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen overflow-x-hidden bg-white pb-24 md:pb-0">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-[#efc4be] bg-[#fff4f1] px-6 py-6 text-[#944236]">
            {error ?? 'Nu am găsit această listare.'}
          </div>
        </div>
      </div>
    );
  }

  const basePrice = isExperienceListing(listing) ? listing.price_amount : listing.nightly_rate;
  const priceUnit =
    listingKind === 'experience'
      ? t.experience.perPerson
      : language === 'ro'
        ? 'pe noapte'
        : language === 'ru'
          ? 'за ночь'
          : 'per night';

  const locationString = [listing.city, listing.country].filter(Boolean).join(', ') || 'Moldova';
  const listingLocationName = isExperienceListing(listing) ? listing.location_name : null;

  return (
    <div className="min-h-screen overflow-x-hidden bg-white pb-28 md:pb-0">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between gap-2">
          <button
            onClick={() => window.history.length > 1 ? window.history.back() : onNavigate('listing')}
            className="flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-gray-400"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>{language === 'ro' ? 'Înapoi' : language === 'ru' ? 'Назад' : 'Back'}</span>
          </button>
        </div>

        <h1 className="mb-3 break-words text-2xl font-bold leading-tight text-gray-900 sm:text-3xl md:text-4xl">
          {listing.title}
        </h1>

        <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-gray-600">
          {(listing.reviews_count ?? 0) > 0 ? (
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="font-semibold text-gray-900">
                {(listing.rating_average ?? 0).toFixed(1)}
              </span>
              <span className="text-gray-500">
                ({listing.reviews_count} {language === 'ro' ? 'recenzii' : language === 'ru' ? 'отзывов' : 'reviews'})
              </span>
            </div>
          ) : null}
          <span className="hidden text-gray-300 sm:inline">·</span>
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            <span className="truncate">{locationString}</span>
          </div>
          <span className="hidden text-gray-300 sm:inline">·</span>
          <button
            onClick={() =>
              listing.guesthouse
                ? onNavigate('guesthouse', {
                    id: listing.guesthouse.id,
                    slug: listing.guesthouse.slug,
                  })
                : undefined
            }
            className="font-medium text-[#002626] underline"
          >
            {listing.guesthouse?.name ?? 'Hodina'}
          </button>
        </div>

        <div className="relative mb-6 overflow-hidden rounded-2xl">
          <div className="group relative h-[240px] sm:h-[360px] md:h-[480px]">
            {images.length ? (
              <img
                src={images[currentImageIndex]}
                alt={listing.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-500">
                Hodina
              </div>
            )}

            {images.length > 1 ? (
              <>
                <button
                  onClick={prevImage}
                  aria-label="Previous image"
                  className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-md transition-opacity hover:bg-white md:opacity-0 md:group-hover:opacity-100"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={nextImage}
                  aria-label="Next image"
                  className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-md transition-opacity hover:bg-white md:opacity-0 md:group-hover:opacity-100"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>

                <div className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
                  {currentImageIndex + 1} / {images.length}
                </div>
              </>
            ) : null}
          </div>

          {images.length > 1 ? (
            <div className="mt-2 hidden grid-cols-6 gap-2 md:grid">
              {images.slice(0, 6).map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`relative h-20 overflow-hidden rounded-lg transition-opacity ${
                    idx === currentImageIndex ? 'ring-2 ring-[#002626]' : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="min-w-0 lg:col-span-2">
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#002626] px-3 py-1 text-sm font-medium text-white">
                {listingKind === 'experience'
                  ? (isExperienceListing(listing) ? listing.category?.name : null) ?? 'Experiență'
                  : (isAccommodationListing(listing) ? listing.type?.name : null) ?? 'Cazare'}
              </span>
              {isExperienceListing(listing) && listing.is_instant_book ? (
                <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-800">
                  ⚡ {language === 'ro' ? 'Confirmare instant' : language === 'ru' ? 'Мгновенное подтверждение' : 'Instant confirm'}
                </span>
              ) : null}
            </div>

            <div className="mb-8 grid grid-cols-2 gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-5 md:grid-cols-4">
              {isExperienceListing(listing) ? (
                <>
                  <div>
                    <div className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-500">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{t.experience.duration}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{formatDuration(listing.duration_minutes)}</p>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-500">
                      <Users className="h-3.5 w-3.5" />
                      <span>{t.experience.groupSize}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      {listing.max_guests ?? 0} {language === 'ro' ? 'persoane' : language === 'ru' ? 'человек' : 'people'}
                    </p>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-500">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{t.experience.meetingPoint}</span>
                    </div>
                    <p className="line-clamp-2 text-sm font-semibold text-gray-900">
                      {listing.meeting_point ?? listing.address ?? (language === 'ro' ? 'Se trimite după rezervare' : language === 'ru' ? 'Отправим после брони' : 'Shared after booking')}
                    </p>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-500">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{language === 'ro' ? 'Program' : language === 'ru' ? 'Расписание' : 'Schedule'}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      {listing.default_start_time && listing.default_end_time
                        ? `${listing.default_start_time} - ${listing.default_end_time}`
                        : language === 'ro'
                          ? 'Vezi sesiunile'
                          : language === 'ru'
                            ? 'См. сеансы'
                            : 'See sessions'}
                    </p>
                  </div>
                </>
              ) : isAccommodationListing(listing) ? (
                <>
                  <div>
                    <p className="mb-1 text-xs font-medium text-gray-500">{language === 'ro' ? 'Oaspeți' : language === 'ru' ? 'Гости' : 'Guests'}</p>
                    <p className="text-sm font-semibold text-gray-900">{listing.max_guests ?? 0}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium text-gray-500">{language === 'ro' ? 'Dormitoare' : language === 'ru' ? 'Спальни' : 'Bedrooms'}</p>
                    <p className="text-sm font-semibold text-gray-900">{listing.bedrooms ?? 0}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium text-gray-500">{language === 'ro' ? 'Paturi' : language === 'ru' ? 'Кровати' : 'Beds'}</p>
                    <p className="text-sm font-semibold text-gray-900">{listing.beds ?? 0}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium text-gray-500">{language === 'ro' ? 'Băi' : language === 'ru' ? 'Ванные' : 'Baths'}</p>
                    <p className="text-sm font-semibold text-gray-900">{listing.bathrooms ?? 0}</p>
                  </div>
                </>
              ) : null}
            </div>

            <section className="mb-8 border-t border-gray-200 pt-8">
              <h2 className="mb-4 text-xl font-bold text-gray-900 sm:text-2xl">{t.experience.overview}</h2>
              {listing.short_description ? (
                <p className="mb-4 text-base font-medium leading-relaxed text-gray-900 sm:text-lg">
                  {listing.short_description}
                </p>
              ) : null}
              {listing.description ? (
                <div className="whitespace-pre-line leading-relaxed text-gray-700">
                  {listing.description}
                </div>
              ) : null}
              {!listing.short_description && !listing.description ? (
                <p className="leading-relaxed text-gray-500">
                  {language === 'ro' ? 'Gazda nu a adăugat încă o descriere completă.' : language === 'ru' ? 'Хозяин ещё не добавил полное описание.' : 'The host has not added a full description yet.'}
                </p>
              ) : null}
            </section>

            {isExperienceListing(listing) && (listing.included_items?.length || listing.excluded_items?.length) ? (
              <section className="mb-8 border-t border-gray-200 pt-8">
                <h2 className="mb-6 text-xl font-bold text-gray-900 sm:text-2xl">{t.experience.whatIncluded}</h2>
                <div className="grid gap-6 md:grid-cols-2">
                  {listing.included_items?.length ? (
                    <div>
                      <h3 className="mb-3 flex items-center gap-2 font-semibold text-green-700">
                        <Check className="h-5 w-5" />
                        {language === 'ro' ? 'Inclus' : language === 'ru' ? 'Включено' : 'Included'}
                      </h3>
                      <ul className="space-y-2">
                        {listing.included_items.map((item) => (
                          <li key={item} className="flex items-start gap-2 text-gray-700">
                            <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                            <span className="break-words">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {listing.excluded_items?.length ? (
                    <div>
                      <h3 className="mb-3 flex items-center gap-2 font-semibold text-red-700">
                        <X className="h-5 w-5" />
                        {t.experience.whatNotIncluded}
                      </h3>
                      <ul className="space-y-2">
                        {listing.excluded_items.map((item) => (
                          <li key={item} className="flex items-start gap-2 text-gray-700">
                            <X className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />
                            <span className="break-words">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}

            {isExperienceListing(listing) && listing.what_to_bring?.length ? (
              <section className="mb-8 border-t border-gray-200 pt-8">
                <h2 className="mb-4 text-xl font-bold text-gray-900 sm:text-2xl">
                  {language === 'ro' ? 'Ce să aduci' : language === 'ru' ? 'Что взять с собой' : 'What to bring'}
                </h2>
                <ul className="space-y-2">
                  {listing.what_to_bring.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-gray-700">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#002626]" />
                      <span className="break-words">{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {isAccommodationListing(listing) && listing.highlights?.length ? (
              <section className="mb-8 border-t border-gray-200 pt-8">
                <h2 className="mb-4 text-xl font-bold text-gray-900 sm:text-2xl">
                  {language === 'ro' ? 'Puncte forte' : language === 'ru' ? 'Преимущества' : 'Highlights'}
                </h2>
                <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {listing.highlights.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-gray-700">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      <span className="break-words">{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {listing.amenities?.length ? (
              <section className="mb-8 border-t border-gray-200 pt-8">
                <h2 className="mb-4 text-xl font-bold text-gray-900 sm:text-2xl">
                  {language === 'ro' ? 'Ce include' : language === 'ru' ? 'Удобства' : 'Amenities'}
                </h2>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {listing.amenities.map((amenity) => (
                    <div
                      key={amenity.id}
                      className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-gray-700"
                    >
                      <Check className="h-4 w-4 flex-shrink-0 text-[#002626]" />
                      <span className="truncate">{amenity.name}</span>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {listingKind === 'experience' ? (
              <section className="mb-8 border-t border-gray-200 pt-8">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
                    {language === 'ro' ? 'Sesiuni disponibile' : language === 'ru' ? 'Доступные сеансы' : 'Available sessions'}
                  </h2>
                  {sessions.length > 0 ? (
                    <span className="text-sm text-gray-500">
                      {sessions.length}{' '}
                      {language === 'ro'
                        ? 'sesiuni'
                        : language === 'ru'
                          ? 'сеансов'
                          : 'sessions'}
                    </span>
                  ) : null}
                </div>

                {sessions.length === 0 ? (
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 px-6 py-5 text-gray-600">
                    {language === 'ro'
                      ? 'Nu sunt sesiuni disponibile acum. Revino în curând.'
                      : language === 'ru'
                        ? 'Сейчас нет доступных сеансов. Зайди позже.'
                        : 'No sessions available right now. Please check back soon.'}
                  </div>
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {sessions.slice(0, 2).map((session) => {
                        const isSoldOut = session.spots_left <= 0;
                        const badge = formatSessionBadge(session.starts_at);
                        return (
                          <button
                            key={session.id}
                            onClick={() => !isSoldOut && goToBooking(session.id)}
                            disabled={isSoldOut}
                            className="group flex items-center gap-4 rounded-2xl border-2 border-gray-200 bg-white p-3 text-left transition-all hover:-translate-y-0.5 hover:border-[#002626] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:border-gray-200 disabled:hover:shadow-none"
                          >
                            <div className="flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center rounded-xl bg-[#fff4f1]">
                              <span className="text-[10px] font-semibold uppercase text-[#944236]">{badge.month}</span>
                              <span className="text-xl font-bold leading-none text-[#002626]">{badge.day}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="truncate font-semibold text-gray-900">{badge.time}</p>
                              <p className={`truncate text-xs font-medium ${isSoldOut ? 'text-red-500' : 'text-gray-600'}`}>
                                {isSoldOut
                                  ? language === 'ro' ? 'Epuizat' : language === 'ru' ? 'Распродано' : 'Sold out'
                                  : `${session.spots_left} ${language === 'ro' ? 'locuri' : language === 'ru' ? 'мест' : 'spots'}`}
                              </p>
                            </div>
                            <ChevronRight className="h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-[#002626]" />
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSessionFilterDate('');
                        setIsSessionsModalOpen(true);
                      }}
                      className="group mt-3 flex w-full items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-gray-300 bg-white p-4 text-left transition-all hover:border-[#002626] hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#002626] text-white">
                          <Calendar className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {language === 'ro'
                              ? 'Vezi toate sesiunile'
                              : language === 'ru'
                                ? 'Все сеансы'
                                : 'View all sessions'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {language === 'ro'
                              ? 'Filtrează după dată și alege ușor'
                              : language === 'ru'
                                ? 'Фильтр по дате и удобный выбор'
                                : 'Filter by date and pick easily'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-[#002626]" />
                    </button>
                  </>
                )}
              </section>
            ) : null}

            {(listing.reviews ?? []).length > 0 ? (
              <section className="mb-8 border-t border-gray-200 pt-8">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
                      {language === 'ro' ? 'Recenzii' : language === 'ru' ? 'Отзывы' : 'Reviews'}
                    </h2>
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold text-gray-900">{(listing.rating_average ?? 0).toFixed(1)}</span>{' '}
                      {language === 'ro' ? 'din 5' : language === 'ru' ? 'из 5' : 'out of 5'} · {listing.reviews_count ?? 0}{' '}
                      {language === 'ro' ? 'verificate' : language === 'ru' ? 'проверено' : 'verified'}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {(listing.reviews ?? []).slice(0, 6).map((review) => (
                    <div key={review.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-gray-900">{review.guest?.name ?? 'Oaspete Hodina'}</p>
                          <p className="text-xs text-gray-500">{formatDateTime(review.published_at ?? review.created_at)}</p>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {review.rating}/5
                        </div>
                      </div>
                      {review.title ? <p className="mt-2 font-medium text-gray-900">{review.title}</p> : null}
                      <p className="mt-2 line-clamp-4 text-sm leading-6 text-gray-700">{review.comment}</p>
                      {review.host_reply ? (
                        <div className="mt-3 rounded-xl bg-gray-50 p-3">
                          <p className="text-xs font-semibold text-gray-900">
                            {language === 'ro' ? 'Răspunsul gazdei' : language === 'ru' ? 'Ответ хозяина' : 'Host reply'}
                          </p>
                          <p className="mt-1 line-clamp-3 text-xs leading-5 text-gray-700">{review.host_reply}</p>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {isExperienceListing(listing) && (listing.cancellation_policy || listing.important_notes) ? (
              <section className="mb-8 border-t border-gray-200 pt-8">
                <h2 className="mb-4 text-xl font-bold text-gray-900 sm:text-2xl">
                  {language === 'ro' ? 'Informații importante' : language === 'ru' ? 'Важная информация' : 'Important information'}
                </h2>
                {listing.cancellation_policy ? (
                  <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
                    <h3 className="mb-2 font-semibold text-gray-900">
                      {language === 'ro' ? 'Politică de anulare' : language === 'ru' ? 'Политика отмены' : 'Cancellation policy'}
                    </h3>
                    <p className="whitespace-pre-line text-sm leading-6 text-gray-700">{listing.cancellation_policy}</p>
                  </div>
                ) : null}
                {listing.important_notes ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <p className="whitespace-pre-line text-sm leading-6 text-amber-900">{listing.important_notes}</p>
                  </div>
                ) : null}
              </section>
            ) : null}

            {related.length > 0 ? (
              <section className="border-t border-gray-200 pt-8">
                <h2 className="mb-6 text-xl font-bold text-gray-900 sm:text-2xl">
                  {language === 'ro' ? 'Mai multe opțiuni similare' : language === 'ru' ? 'Похожие предложения' : 'More like this'}
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {related.map((item) => (
                    <button
                      key={item.id}
                      onClick={() =>
                        onNavigate('experience', {
                          id: item.id,
                          slug: item.slug,
                          kind: isExperienceListing(item) ? 'experience' : 'accommodation',
                        })
                      }
                      className="group overflow-hidden rounded-2xl border border-gray-100 bg-white text-left shadow-sm transition-shadow hover:shadow-xl"
                    >
                      <div className="h-40 overflow-hidden">
                        <img
                          src={item.cover_image ?? 'https://placehold.co/800x500?text=Hodina'}
                          alt={item.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                      <div className="p-3">
                        <h3 className="line-clamp-2 text-sm font-semibold text-gray-900">{item.title}</h3>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <MapPin className="h-3 w-3" />
                            {item.city ?? 'Moldova'}
                          </span>
                          <span className="text-sm font-bold text-[#002626]">
                            {formatCurrency(
                              isExperienceListing(item) ? item.price_amount : item.nightly_rate,
                              item.currency,
                            )}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <div className="hidden lg:col-span-1 lg:block">
            <div className="sticky top-24 rounded-2xl border-2 border-gray-200 bg-white p-6 shadow-lg">
              <div className="mb-6">
                <div className="mb-2 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">
                    {formatCurrency(basePrice, listing.currency)}
                  </span>
                  <span className="text-gray-600">{priceUnit}</span>
                </div>
                <p className="text-sm text-gray-600">
                  {listingKind === 'experience'
                    ? sessions.length > 0
                      ? `${sessions.length} ${language === 'ro' ? 'sesiuni disponibile' : language === 'ru' ? 'сеансов доступно' : 'sessions available'}`
                      : language === 'ro' ? 'Programul se actualizează' : language === 'ru' ? 'Расписание обновляется' : 'Schedule updating'
                    : `${listing.max_guests ?? 0} ${language === 'ro' ? 'oaspeți' : language === 'ru' ? 'гостей' : 'guests'} · ${isAccommodationListing(listing) ? listing.bedrooms ?? 0 : 0} ${language === 'ro' ? 'dormitoare' : language === 'ru' ? 'спальни' : 'bedrooms'}`}
                </p>
              </div>

              <button
                onClick={() => goToBooking()}
                className="mb-3 w-full rounded-xl bg-[#002626] py-4 text-lg font-semibold text-white transition-colors hover:bg-[#003838]"
              >
                {t.experience.reserve}
              </button>

              {activeConversationBooking ? (
                <button
                  onClick={goToHostConversation}
                  className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#002626] py-3 font-semibold text-[#002626] transition-colors hover:bg-[#002626] hover:text-white"
                >
                  <MessageCircle className="h-5 w-5" />
                  {language === 'ro' ? 'Comunică cu hostul' : language === 'ru' ? 'Написать хозяину' : 'Message host'}
                </button>
              ) : null}

              <p className="mb-6 text-center text-sm text-gray-600">
                {language === 'ro' ? 'Plata se face la locație, după confirmare.' : language === 'ru' ? 'Оплата на месте после подтверждения.' : 'Payment on-site after confirmation.'}
              </p>

              <div className="space-y-2 border-t border-gray-100 pt-4 text-sm">
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-gray-600">
                    {listingKind === 'experience'
                      ? language === 'ro' ? 'Confirmare gazdă' : language === 'ru' ? 'Подтверждение хоста' : 'Host confirmation'
                      : language === 'ro' ? 'Rezervare în sistem' : language === 'ru' ? 'Бронирование в системе' : 'System booking'}
                  </span>
                  <Check className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-gray-600">
                    {language === 'ro' ? 'Mesaje după confirmare' : language === 'ru' ? 'Чат после подтверждения' : 'Chat after confirmation'}
                  </span>
                  <Check className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className="fixed inset-x-0 bottom-16 z-40 border-t border-gray-200 bg-white shadow-[0_-8px_20px_rgba(0,0,0,0.08)] lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-gray-900">{formatCurrency(basePrice, listing.currency)}</span>
              <span className="text-xs text-gray-500">{priceUnit}</span>
            </p>
            {(listing.reviews_count ?? 0) > 0 ? (
              <p className="flex items-center gap-1 text-xs text-gray-500">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                <span className="font-semibold text-gray-900">
                  {(listing.rating_average ?? 0).toFixed(1)}
                </span>
                <span>· {listing.reviews_count}</span>
              </p>
            ) : (
              <p className="truncate text-xs text-gray-500">{locationString}</p>
            )}
          </div>
          <button
            onClick={() => goToBooking()}
            className="flex-shrink-0 rounded-xl bg-[#002626] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#003838]"
          >
            {t.experience.reserve}
          </button>
        </div>
      </div>

      {isSessionsModalOpen && listingKind === 'experience' ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-0 sm:items-center sm:px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setIsSessionsModalOpen(false)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-[#002626]" />
                <h3 className="text-lg font-bold text-gray-900">
                  {language === 'ro'
                    ? 'Sesiuni disponibile'
                    : language === 'ru'
                      ? 'Доступные сеансы'
                      : 'Available sessions'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSessionsModalOpen(false)}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="border-b border-gray-100 px-5 py-4">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                {language === 'ro'
                  ? 'Filtrează după dată'
                  : language === 'ru'
                    ? 'Фильтр по дате'
                    : 'Filter by date'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={sessionFilterDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(event) => setSessionFilterDate(event.target.value)}
                  className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-[#002626] focus:outline-none"
                />
                {sessionFilterDate ? (
                  <button
                    type="button"
                    onClick={() => setSessionFilterDate('')}
                    className="rounded-xl border border-gray-300 px-3 py-2.5 text-xs font-semibold text-gray-700 transition-colors hover:border-[#002626] hover:text-[#002626]"
                  >
                    {language === 'ro'
                      ? 'Șterge filtrul'
                      : language === 'ru'
                        ? 'Сбросить'
                        : 'Clear'}
                  </button>
                ) : null}
              </div>
              {(() => {
                const filtered = sessionFilterDate
                  ? sessions.filter((s) => {
                      if (!s.starts_at) return false;
                      return new Date(s.starts_at).toISOString().split('T')[0] === sessionFilterDate;
                    })
                  : sessions;
                return (
                  <p className="mt-2 text-xs text-gray-500">
                    {filtered.length}{' '}
                    {language === 'ro'
                      ? 'sesiuni'
                      : language === 'ru'
                        ? 'сеансов'
                        : 'sessions'}
                  </p>
                );
              })()}
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {(() => {
                const filtered = sessionFilterDate
                  ? sessions.filter((s) => {
                      if (!s.starts_at) return false;
                      return new Date(s.starts_at).toISOString().split('T')[0] === sessionFilterDate;
                    })
                  : sessions;

                if (filtered.length === 0) {
                  return (
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-6 py-10 text-center text-gray-600">
                      {language === 'ro'
                        ? 'Nu există sesiuni pentru această dată.'
                        : language === 'ru'
                          ? 'Нет сеансов на эту дату.'
                          : 'No sessions for this date.'}
                    </div>
                  );
                }

                return (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {filtered.map((session) => {
                      const isSoldOut = session.spots_left <= 0;
                      const badge = formatSessionBadge(session.starts_at);
                      return (
                        <button
                          key={session.id}
                          onClick={() => {
                            if (isSoldOut) return;
                            setIsSessionsModalOpen(false);
                            goToBooking(session.id);
                          }}
                          disabled={isSoldOut}
                          className="group flex items-center gap-4 rounded-2xl border-2 border-gray-200 bg-white p-3 text-left transition-all hover:-translate-y-0.5 hover:border-[#002626] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:border-gray-200 disabled:hover:shadow-none"
                        >
                          <div className="flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center rounded-xl bg-[#fff4f1]">
                            <span className="text-[10px] font-semibold uppercase text-[#944236]">{badge.month}</span>
                            <span className="text-xl font-bold leading-none text-[#002626]">{badge.day}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="truncate font-semibold text-gray-900">{badge.time}</p>
                            <p className={`truncate text-xs font-medium ${isSoldOut ? 'text-red-500' : 'text-gray-600'}`}>
                              {isSoldOut
                                ? language === 'ro' ? 'Epuizat' : language === 'ru' ? 'Распродано' : 'Sold out'
                                : `${session.spots_left} ${language === 'ro' ? 'locuri' : language === 'ru' ? 'мест' : 'spots'}`}
                            </p>
                          </div>
                          <ChevronRight className="h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-[#002626]" />
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
