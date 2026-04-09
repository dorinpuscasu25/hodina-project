import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Home,
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
import type { AccommodationListing, ExperienceListing, ExperienceSession, ListingKind } from '../types';

interface ExperiencePageProps {
  listingIdentifier: string;
  listingKind: ListingKind;
  onNavigate: (page: string, data?: Record<string, unknown>) => void;
  onRequestAuth: (mode?: 'login' | 'register') => void;
}

export const ExperiencePage = ({
  listingIdentifier,
  listingKind,
  onNavigate,
  onRequestAuth,
}: ExperiencePageProps) => {
  const { t, language } = useLanguage();
  const { isAuthenticated, user } = useAuth();
  const [listing, setListing] = useState<ExperienceListing | AccommodationListing | null>(null);
  const [sessions, setSessions] = useState<ExperienceSession[]>([]);
  const [related, setRelated] = useState<Array<ExperienceListing | AccommodationListing>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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

          if (ignore) {
            return;
          }

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

          if (ignore) {
            return;
          }

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

  const images = useMemo(() => {
    if (!listing) {
      return [];
    }

    const source = listing.gallery?.length ? listing.gallery : listing.cover_image ? [listing.cover_image] : [];
    return source.filter(Boolean);
  }, [listing]);

  const nextImage = () => {
    setCurrentImageIndex((current) => (images.length ? (current + 1) % images.length : 0));
  };

  const prevImage = () => {
    setCurrentImageIndex((current) => (images.length ? (current - 1 + images.length) % images.length : 0));
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
      <div className="min-h-screen bg-white pb-20 md:pb-0">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="h-[420px] animate-pulse rounded-3xl bg-gray-100" />
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-white pb-20 md:pb-0">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-[#efc4be] bg-[#fff4f1] px-6 py-6 text-[#944236]">
            {error ?? 'Nu am găsit această listare.'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-20 md:pb-0">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="group relative mb-6 h-[400px] overflow-hidden rounded-2xl md:h-[500px]">
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
                    className="absolute left-4 top-1/2 rounded-full bg-white/90 p-2 opacity-0 transition-opacity hover:bg-white group-hover:opacity-100"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 rounded-full bg-white/90 p-2 opacity-0 transition-opacity hover:bg-white group-hover:opacity-100"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                  <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
                    {images.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`h-2 w-2 rounded-full ${index === currentImageIndex ? 'bg-white' : 'bg-white/50'}`}
                      />
                    ))}
                  </div>
                </>
              ) : null}
            </div>

            <div className="mb-6">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#002626] px-3 py-1 text-sm font-medium text-white">
                  {listingKind === 'experience'
                    ? (isExperienceListing(listing) ? listing.category?.name : null) ?? 'Experiență'
                    : (isAccommodationListing(listing) ? listing.type?.name : null) ?? 'Cazare'}
                </span>
                <button
                  onClick={() =>
                    listing.guesthouse
                      ? onNavigate('guesthouse', {
                          id: listing.guesthouse.id,
                          slug: listing.guesthouse.slug,
                        })
                      : undefined
                  }
                  className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
                >
                  {listing.guesthouse?.name ?? 'Hodina'}
                </button>
              </div>
              <h1 className="mb-4 text-3xl font-bold text-gray-900 md:text-4xl">{listing.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-gray-600">
                {(listing.reviews_count ?? 0) > 0 ? (
                  <div className="flex items-center gap-1">
                    <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                    <span>
                      {(listing.rating_average ?? 0).toFixed(1)} · {listing.reviews_count} review-uri
                    </span>
                  </div>
                ) : null}
                <div className="flex items-center gap-1">
                  <MapPin className="h-5 w-5" />
                  <span>{[listing.city, listing.country].filter(Boolean).join(', ') || 'Moldova'}</span>
                </div>
                {isExperienceListing(listing) ? (
                  <div className="flex items-center gap-1">
                    <Clock className="h-5 w-5" />
                    <span>{formatDuration(listing.duration_minutes)}</span>
                  </div>
                ) : null}
                {isAccommodationListing(listing) ? (
                  <div className="flex items-center gap-1">
                    <Home className="h-5 w-5" />
                    <span>{listing.bedrooms ?? 0} dormitoare</span>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mb-8 border-t border-gray-200 pt-8">
              <h2 className="mb-4 text-2xl font-bold text-gray-900">{t.experience.overview}</h2>
              <p className="leading-relaxed text-gray-700">{listing.description ?? listing.short_description}</p>
            </div>

            {(listing.reviews ?? []).length > 0 ? (
              <div className="mb-8 border-t border-gray-200 pt-8">
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Review-uri</h2>
                    <p className="text-sm text-gray-600">
                      {(listing.rating_average ?? 0).toFixed(1)} din 5 · {listing.reviews_count ?? 0} review-uri verificate
                    </p>
                  </div>
                  <div className="rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
                    Oaspeți reali, rezervări reale
                  </div>
                </div>

                <div className="space-y-4">
                  {(listing.reviews ?? []).slice(0, 6).map((review) => (
                    <div key={review.id} className="rounded-2xl border border-gray-200 bg-white p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-gray-900">{review.guest?.name ?? 'Oaspete Hodina'}</p>
                          <p className="text-sm text-gray-500">{formatDateTime(review.published_at ?? review.created_at)}</p>
                        </div>
                        <div className="flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                          {review.rating}/5
                        </div>
                      </div>
                      {review.title ? <p className="mt-3 font-medium text-gray-900">{review.title}</p> : null}
                      <p className="mt-2 leading-7 text-gray-700">{review.comment}</p>
                      {review.host_reply ? (
                        <div className="mt-4 rounded-2xl bg-gray-50 p-4">
                          <p className="text-sm font-semibold text-gray-900">Răspunsul gazdei</p>
                          <p className="mt-2 text-sm leading-6 text-gray-700">{review.host_reply}</p>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {isExperienceListing(listing) ? (
              <>
                <div className="mb-8 border-t border-gray-200 pt-8">
                  <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                    <div>
                      <div className="mb-1 flex items-center gap-2 text-gray-600">
                        <Clock className="h-5 w-5" />
                        <span className="font-medium">{t.experience.duration}</span>
                      </div>
                      <p className="text-gray-900">{formatDuration(listing.duration_minutes)}</p>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center gap-2 text-gray-600">
                        <Users className="h-5 w-5" />
                        <span className="font-medium">{t.experience.groupSize}</span>
                      </div>
                      <p className="text-gray-900">{listing.max_guests ?? 0} persoane</p>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center gap-2 text-gray-600">
                        <MapPin className="h-5 w-5" />
                        <span className="font-medium">{t.experience.meetingPoint}</span>
                      </div>
                      <p className="text-gray-900">{listing.meeting_point ?? listing.address ?? 'Se trimite după rezervare'}</p>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center gap-2 text-gray-600">
                        <Calendar className="h-5 w-5" />
                        <span className="font-medium">Program</span>
                      </div>
                      <p className="text-gray-900">
                        {listing.default_start_time && listing.default_end_time
                          ? `${listing.default_start_time} - ${listing.default_end_time}`
                          : 'Vezi sesiunile disponibile'}
                      </p>
                    </div>
                  </div>
                </div>

                {listing.included_items?.length || listing.excluded_items?.length ? (
                  <div className="mb-8 border-t border-gray-200 pt-8">
                    <h2 className="mb-6 text-2xl font-bold text-gray-900">{t.experience.whatIncluded}</h2>
                    <div className="grid gap-8 md:grid-cols-2">
                      <div>
                        <h3 className="mb-3 flex items-center gap-2 font-semibold text-green-600">
                          <Check className="h-5 w-5" />
                          Included
                        </h3>
                        <ul className="space-y-2">
                          {(listing.included_items ?? []).map((item) => (
                            <li key={item} className="flex items-start gap-2 text-gray-700">
                              <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-600" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h3 className="mb-3 flex items-center gap-2 font-semibold text-red-600">
                          <X className="h-5 w-5" />
                          {t.experience.whatNotIncluded}
                        </h3>
                        <ul className="space-y-2">
                          {(listing.excluded_items ?? []).map((item) => (
                            <li key={item} className="flex items-start gap-2 text-gray-700">
                              <X className="mt-1 h-4 w-4 flex-shrink-0 text-red-600" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="mb-8 border-t border-gray-200 pt-8">
                  <h2 className="mb-6 text-2xl font-bold text-gray-900">Sesiuni disponibile</h2>
                  {sessions.length === 0 ? (
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-6 py-5 text-gray-600">
                      Nu sunt sesiuni disponibile acum. Revino în curând.
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {sessions.slice(0, 4).map((session) => (
                        <div key={session.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                          <p className="font-semibold text-gray-900">{formatDateTime(session.starts_at)}</p>
                          <p className="mt-1 text-sm text-gray-600">
                            {session.spots_left} locuri libere din {session.capacity ?? 0}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : null}

            {isAccommodationListing(listing) ? (
              <>
                <div className="mb-8 border-t border-gray-200 pt-8">
                  <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Oaspeți</p>
                      <p className="mt-1 text-gray-900">{listing.max_guests ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Dormitoare</p>
                      <p className="mt-1 text-gray-900">{listing.bedrooms ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Paturi</p>
                      <p className="mt-1 text-gray-900">{listing.beds ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Băi</p>
                      <p className="mt-1 text-gray-900">{listing.bathrooms ?? 0}</p>
                    </div>
                  </div>
                </div>

                {listing.highlights?.length ? (
                  <div className="mb-8 border-t border-gray-200 pt-8">
                    <h2 className="mb-4 text-2xl font-bold text-gray-900">Puncte forte</h2>
                    <ul className="space-y-2">
                      {listing.highlights.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-gray-700">
                          <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-600" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            ) : null}

            {listing.amenities?.length ? (
              <div className="mb-8 border-t border-gray-200 pt-8">
                <h2 className="mb-6 text-2xl font-bold text-gray-900">Amenities</h2>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {listing.amenities.map((amenity) => (
                    <div key={amenity.id} className="rounded-xl border border-gray-200 px-4 py-3 text-gray-700">
                      {amenity.name}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="border-t border-gray-200 pt-8">
              <h2 className="mb-6 text-2xl font-bold text-gray-900">Mai multe opțiuni similare</h2>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {related.map((item) => (
                  <div
                    key={item.id}
                    onClick={() =>
                      onNavigate('experience', {
                        id: item.id,
                        slug: item.slug,
                        kind: isExperienceListing(item) ? 'experience' : 'accommodation',
                      })
                    }
                    className="group cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-xl"
                  >
                    <div className="h-48 overflow-hidden">
                      <img
                        src={item.cover_image ?? 'https://placehold.co/800x500?text=Hodina'}
                        alt={item.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="line-clamp-2 text-lg font-semibold text-gray-900">{item.title}</h3>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-sm text-gray-500">{item.city ?? 'Moldova'}</span>
                        <span className="font-bold text-[#002626]">
                          {formatCurrency(
                            isExperienceListing(item) ? item.price_amount : item.nightly_rate,
                            item.currency,
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-2xl border-2 border-gray-200 bg-white p-6 shadow-lg">
              <div className="mb-6">
                <div className="mb-2 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">
                    {formatCurrency(
                      isExperienceListing(listing) ? listing.price_amount : listing.nightly_rate,
                      listing.currency,
                    )}
                  </span>
                  <span className="text-gray-600">
                    {listingKind === 'experience'
                      ? t.experience.perPerson
                      : language === 'ro'
                        ? 'pe noapte'
                        : language === 'ru'
                          ? 'за ночь'
                          : 'per night'}
                  </span>
                </div>
                  <p className="text-sm text-gray-600">
                    {listingKind === 'experience'
                      ? sessions.length > 0
                        ? `${sessions.length} sesiuni disponibile`
                        : 'Programul se actualizează continuu'
                      : `${listing.max_guests ?? 0} oaspeți · ${isAccommodationListing(listing) ? listing.bedrooms ?? 0 : 0} dormitoare`}
                  </p>
                </div>

              <button
                onClick={() => onNavigate('booking', { id: listing.id, slug: listing.slug, kind: listingKind })}
                className="mb-3 w-full rounded-xl bg-[#002626] py-4 text-lg font-semibold text-white transition-colors hover:bg-[#003838]"
              >
                {t.experience.reserve}
              </button>

              {isAuthenticated ? (
                <button
                  onClick={() => onNavigate('bookings')}
                  className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#002626] py-3 font-semibold text-[#002626] transition-colors hover:bg-[#002626] hover:text-white"
                >
                  <MessageCircle className="h-5 w-5" />
                  {user?.email_verified ? 'Rezervările mele' : 'Confirmă emailul pentru mesaje'}
                </button>
              ) : (
                <button
                  onClick={() => onRequestAuth('login')}
                  className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#002626] py-3 font-semibold text-[#002626] transition-colors hover:bg-[#002626] hover:text-white"
                >
                  <MessageCircle className="h-5 w-5" />
                  Intră în cont
                </button>
              )}

              <p className="mb-6 text-center text-sm text-gray-600">Plata se face la locație, după confirmare.</p>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between border-b border-gray-100 py-2">
                  <span className="text-gray-600">
                    {listingKind === 'experience' ? 'Confirmare de la gazdă' : 'Rezervare în sistem'}
                  </span>
                  <Check className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex items-center justify-between border-b border-gray-100 py-2">
                  <span className="text-gray-600">Mesajele se activează după confirmare</span>
                  <Check className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-600">{listing.guesthouse?.name ?? 'Pensiune locală'}</span>
                  <span className="font-medium text-gray-900">{listing.city ?? 'Moldova'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
