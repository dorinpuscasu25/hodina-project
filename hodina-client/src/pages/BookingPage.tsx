import { useEffect, useMemo, useState } from 'react';
import { Calendar, Check, Loader2, Users } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { apiRequest, formatApiError } from '../lib/api';
import { useSeo } from '../lib/seo';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatDuration,
  isAccommodationListing,
  isExperienceListing,
} from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import type { AccommodationListing, Booking, ExperienceListing, ExperienceSession, ListingKind } from '../types';

interface BookingPageProps {
  listingIdentifier: string;
  listingKind: ListingKind;
  onNavigate: (page: string, data?: Record<string, unknown>) => void;
  onRequestAuth: (mode?: 'login' | 'register') => void;
  onNotice: (message: string | null) => void;
}

export const BookingPage = ({
  listingIdentifier,
  listingKind,
  onNavigate,
  onRequestAuth,
  onNotice,
}: BookingPageProps) => {
  const { t, language } = useLanguage();
  const { isAuthenticated, token, user } = useAuth();
  const [listing, setListing] = useState<ExperienceListing | AccommodationListing | null>(null);
  const [sessions, setSessions] = useState<ExperienceSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [units, setUnits] = useState(1);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [availableUnits, setAvailableUnits] = useState<number | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadBookingData() {
      setIsLoading(true);
      setError(null);

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
          setSelectedSessionId((current) => current ?? sessionsResponse.data[0]?.id ?? null);
        } else {
          const detailResponse = await apiRequest<{ data: AccommodationListing }>(
            `/public/accommodations/${encodeURIComponent(listingIdentifier)}?locale=${locale}`,
          );

          if (ignore) {
            return;
          }

          setListing(detailResponse.data);
          setSessions([]);
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

    void loadBookingData();

    return () => {
      ignore = true;
    };
  }, [language, listingIdentifier, listingKind]);

  useEffect(() => {
    setContactName((current) => current || user?.name || '');
    setContactEmail((current) => current || user?.email || '');
    setContactPhone((current) => current || user?.phone || '');
  }, [user?.email, user?.name, user?.phone]);

  useEffect(() => {
    if (listingKind !== 'accommodation' || !startsAt || !endsAt) {
      setAvailableUnits(undefined);
      return;
    }

    let ignore = false;

    async function checkAvailability() {
      setAvailabilityLoading(true);

      try {
        const locale = encodeURIComponent(language);
        const response = await apiRequest<{ data: AccommodationListing }>(
          `/public/accommodations/${encodeURIComponent(listingIdentifier)}?locale=${locale}&starts_at=${encodeURIComponent(startsAt)}&ends_at=${encodeURIComponent(endsAt)}`,
        );

        if (!ignore) {
          setAvailableUnits(response.data.available_units ?? null);
        }
      } catch {
        if (!ignore) {
          setAvailableUnits(null);
        }
      } finally {
        if (!ignore) {
          setAvailabilityLoading(false);
        }
      }
    }

    void checkAvailability();

    return () => {
      ignore = true;
    };
  }, [endsAt, language, listingIdentifier, listingKind, startsAt]);

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) ?? null,
    [selectedSessionId, sessions],
  );

  const partySize = Math.max(adults + children, 1);
  const nights = startsAt && endsAt ? Math.max(Math.ceil((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 86400000), 1) : 0;

  const subtotal = useMemo(() => {
    if (!listing) {
      return 0;
    }

    if (listingKind === 'experience' && isExperienceListing(listing)) {
      if (listing.price_mode === 'per_group') {
        return listing.price_amount;
      }

      return listing.price_amount * partySize;
    }

    if (isAccommodationListing(listing)) {
      return (listing.nightly_rate * nights * units) + listing.cleaning_fee;
    }

    return 0;
  }, [listing, listingKind, nights, partySize, units]);

  useSeo({
    title: listing ? `Rezervă ${listing.title}` : 'Rezervare Hodina',
    description: listing ? `Trimite cererea de rezervare pentru ${listing.title} pe Hodina.` : 'Finalizează rezervarea pe Hodina.',
    canonicalPath:
      listing && listingKind === 'experience'
        ? `/book/experiences/${listing.slug || listing.id}`
        : listing
          ? `/book/stays/${listing.slug || listing.id}`
          : undefined,
    noindex: true,
  });

  const handleSubmit = async () => {
    if (!listing) {
      return;
    }

    if (!isAuthenticated) {
      onNotice('Intră în cont pentru a trimite rezervarea.');
      onRequestAuth('login');
      return;
    }

    if (!user?.email_verified) {
      onNotice('Confirmă emailul înainte să trimiți rezervarea.');
      onNavigate('profile');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let response;

      if (listingKind === 'experience') {
        if (!selectedSessionId) {
          setError('Alege o sesiune disponibilă.');
          setIsSubmitting(false);
          return;
        }

        response = await apiRequest<{ data: Booking }>(`/client/bookings/experiences/${selectedSessionId}`, {
          token,
          method: 'POST',
          body: {
            adults,
            children,
            infants,
            contact_name: contactName,
            contact_email: contactEmail,
            contact_phone: contactPhone,
            special_requests: specialRequests,
          },
        });
      } else {
        response = await apiRequest<{ data: Booking }>(`/client/bookings/accommodations/${listing.id}`, {
          token,
          method: 'POST',
          body: {
            starts_at: startsAt,
            ends_at: endsAt,
            adults,
            children,
            infants,
            units,
            contact_name: contactName,
            contact_email: contactEmail,
            contact_phone: contactPhone,
            special_requests: specialRequests,
          },
        });
      }

      onNotice(
        response.data.status === 'confirmed'
          ? 'Rezervarea a fost confirmată.'
          : 'Cererea a fost trimisă și așteaptă confirmarea pensiunii.',
      );
      onNavigate('bookings');
    } catch (submissionError) {
      setError(formatApiError(submissionError));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20 md:pb-8">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="h-64 animate-pulse rounded-3xl bg-gray-100" />
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20 md:pb-8">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-[#efc4be] bg-[#fff4f1] px-6 py-6 text-[#944236]">
            {error ?? 'Nu am putut încărca rezervarea.'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-8">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <button
          onClick={() => onNavigate('experience', { id: listing.id, slug: listing.slug, kind: listingKind })}
          className="mb-6 font-semibold text-[#002626] hover:underline"
        >
          ← Înapoi la listare
        </button>

        <h1 className="mb-8 text-3xl font-bold text-gray-900 md:text-4xl">{t.booking.title}</h1>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-bold text-gray-900">
                {listingKind === 'experience' ? 'Experiența ta' : 'Cazarea ta'}
              </h2>
              <div className="flex gap-4">
                <img
                  src={listing.cover_image ?? 'https://placehold.co/800x500?text=Hodina'}
                  alt={listing.title}
                  className="h-24 w-24 rounded-xl object-cover"
                />
                <div>
                  <h3 className="mb-1 font-semibold text-gray-900">{listing.title}</h3>
                  <p className="text-sm text-gray-600">{listing.city ?? 'Moldova'}</p>
                  <p className="text-sm text-gray-600">
                    {listingKind === 'experience'
                      ? formatDuration((listing as ExperienceListing).duration_minutes)
                      : `${(listing as AccommodationListing).bedrooms ?? 0} dormitoare`}
                  </p>
                </div>
              </div>
            </div>

            {listingKind === 'experience' ? (
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <Calendar className="h-6 w-6 text-[#002626]" />
                  <h2 className="text-xl font-bold text-gray-900">Alege sesiunea</h2>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {sessions.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => setSelectedSessionId(session.id)}
                      className={`rounded-2xl border-2 p-4 text-left transition-all ${
                        selectedSessionId === session.id
                          ? 'border-[#002626] bg-[#002626] text-white'
                          : 'border-gray-200 hover:border-[#002626]'
                      }`}
                    >
                      <p className="font-semibold">{formatDateTime(session.starts_at)}</p>
                      <p className={`mt-1 text-sm ${selectedSessionId === session.id ? 'text-white/80' : 'text-gray-600'}`}>
                        {session.spots_left} locuri libere
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <Calendar className="h-6 w-6 text-[#002626]" />
                  <h2 className="text-xl font-bold text-gray-900">Perioada rezervării</h2>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Check-in</label>
                    <input
                      type="date"
                      value={startsAt}
                      onChange={(event) => setStartsAt(event.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-[#002626] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Check-out</label>
                    <input
                      type="date"
                      value={endsAt}
                      onChange={(event) => setEndsAt(event.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-[#002626] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-700">
                  {availabilityLoading
                    ? 'Verific disponibilitatea...'
                    : availableUnits === undefined
                      ? 'Selectează perioada pentru a vedea unitățile libere.'
                      : availableUnits === null
                        ? 'Nu am putut verifica disponibilitatea pentru perioada aleasă.'
                        : `Unități libere în această perioadă: ${availableUnits}`}
                </div>

                <div className="mt-4">
                  <label className="mb-2 block text-sm font-medium text-gray-700">Unități</label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setUnits((current) => Math.max(1, current - 1))}
                      className="h-10 w-10 rounded-full border-2 border-gray-300 transition-colors hover:border-[#002626]"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-medium">{units}</span>
                    <button
                      onClick={() => setUnits((current) => current + 1)}
                      className="h-10 w-10 rounded-full border-2 border-gray-300 transition-colors hover:border-[#002626]"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <Users className="h-6 w-6 text-[#002626]" />
                <h2 className="text-xl font-bold text-gray-900">{t.booking.guests}</h2>
              </div>

              <div className="space-y-4">
                {[
                  { label: t.booking.adults, value: adults, setter: setAdults, min: 1 },
                  { label: t.booking.children, value: children, setter: setChildren, min: 0 },
                  { label: t.booking.infantsLabel, value: infants, setter: setInfants, min: 0 },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <p className="font-medium text-gray-900">{item.label}</p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => item.setter((current) => Math.max(item.min, current - 1))}
                        className="h-8 w-8 rounded-full border-2 border-gray-300 transition-colors hover:border-[#002626]"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-medium">{item.value}</span>
                      <button
                        onClick={() => item.setter((current) => current + 1)}
                        className="h-8 w-8 rounded-full border-2 border-gray-300 transition-colors hover:border-[#002626]"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-bold text-gray-900">{t.booking.contactInfo}</h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Nume complet</label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(event) => setContactName(event.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-[#002626] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">{t.account.email}</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(event) => setContactEmail(event.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-[#002626] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">{t.account.phone}</label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(event) => setContactPhone(event.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-[#002626] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Mesaj pentru pensiune</label>
                  <textarea
                    value={specialRequests}
                    onChange={(event) => setSpecialRequests(event.target.value)}
                    rows={4}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-[#002626] focus:outline-none"
                    placeholder="Orice detaliu util pentru rezervare."
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-2xl border-2 border-gray-200 bg-white p-6 shadow-lg">
              <h2 className="mb-6 text-xl font-bold text-gray-900">{t.booking.priceDetails}</h2>

              <div className="mb-6 space-y-4 text-sm">
                {listingKind === 'experience' ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">
                        {formatCurrency((listing as ExperienceListing).price_amount, listing.currency)} × {partySize}
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(subtotal, listing.currency)}
                      </span>
                    </div>
                    {selectedSession ? (
                      <div className="flex items-center gap-2 text-gray-700">
                        <Check className="h-5 w-5 text-green-600" />
                        <span>{formatDateTime(selectedSession.starts_at)}</span>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">
                        {formatCurrency((listing as AccommodationListing).nightly_rate, listing.currency)} × {nights || 0} nopți × {units}
                      </span>
                      <span className="font-semibold">
                        {formatCurrency((listing as AccommodationListing).nightly_rate * nights * units, listing.currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Curățenie</span>
                      <span className="font-semibold">
                        {formatCurrency((listing as AccommodationListing).cleaning_fee, listing.currency)}
                      </span>
                    </div>
                    {startsAt ? (
                      <div className="flex items-center gap-2 text-gray-700">
                        <Check className="h-5 w-5 text-green-600" />
                        <span>{formatDate(startsAt)}</span>
                      </div>
                    ) : null}
                    {endsAt ? (
                      <div className="flex items-center gap-2 text-gray-700">
                        <Check className="h-5 w-5 text-green-600" />
                        <span>{formatDate(endsAt)}</span>
                      </div>
                    ) : null}
                  </>
                )}

                <div className="flex items-center gap-2 text-gray-700">
                  <Check className="h-5 w-5 text-green-600" />
                  <span>{partySize + infants} persoane</span>
                </div>
              </div>

              <div className="mb-6 border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold text-gray-900">{t.booking.total}</span>
                  <span className="text-2xl font-bold text-[#002626]">
                    {formatCurrency(subtotal, listing.currency)}
                  </span>
                </div>
              </div>

              <div className="mb-6 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-700">
                Plata se face la locație. După trimitere, pensiunea confirmă rezervarea și activează mesajele.
              </div>

              {error ? (
                <div className="mb-4 rounded-2xl border border-[#efc4be] bg-[#fff4f1] px-4 py-3 text-sm text-[#944236]">
                  {error}
                </div>
              ) : null}

              <button
                onClick={() => void handleSubmit()}
                disabled={
                  isSubmitting ||
                  !contactName ||
                  !contactEmail ||
                  (listingKind === 'experience' ? !selectedSessionId : !startsAt || !endsAt)
                }
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#002626] py-4 text-lg font-semibold text-white transition-colors hover:bg-[#003838] disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                {t.booking.confirmBook}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
