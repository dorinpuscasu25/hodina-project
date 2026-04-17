import { useEffect, useMemo, useState } from 'react';
import { Calendar, Check, Clock, Loader2, Minus, Plus, Users } from 'lucide-react';
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

const RequiredMark = () => <span className="ml-0.5 text-red-500">*</span>;

const formatSessionDate = (iso: string | null): { day: string; month: string; weekday: string; time: string } => {
  if (!iso) return { day: '—', month: '', weekday: '', time: '' };
  const date = new Date(iso);
  return {
    day: String(date.getDate()),
    month: date.toLocaleDateString(undefined, { month: 'short' }).toUpperCase(),
    weekday: date.toLocaleDateString(undefined, { weekday: 'short' }),
    time: date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
  };
};

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
  const [validationError, setValidationError] = useState<string | null>(null);

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
  const totalGuests = adults + children + infants;
  const nights = startsAt && endsAt ? Math.max(Math.ceil((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 86400000), 1) : 0;

  const maxGuestsForListing = useMemo(() => {
    if (!listing) return null;

    if (listingKind === 'experience') {
      if (selectedSession?.capacity) {
        return Math.min(
          selectedSession.spots_left,
          (listing as ExperienceListing).max_guests ?? selectedSession.capacity,
        );
      }
      return (listing as ExperienceListing).max_guests ?? null;
    }

    return (listing as AccommodationListing).max_guests ?? null;
  }, [listing, listingKind, selectedSession]);

  const maxGuestsExceeded = maxGuestsForListing !== null && adults + children > maxGuestsForListing;

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

  const labels = useMemo(() => {
    const ro = language === 'ro';
    const ru = language === 'ru';
    return {
      pickSession: ro ? 'Alege sesiunea' : ru ? 'Выберите сеанс' : 'Choose a session',
      period: ro ? 'Perioada rezervării' : ru ? 'Период бронирования' : 'Stay dates',
      spotsLeft: ro ? 'locuri libere' : ru ? 'мест' : 'spots left',
      soldOut: ro ? 'Epuizat' : ru ? 'Распродано' : 'Sold out',
      instant: ro ? 'Confirmare instant' : ru ? 'Мгновенное подтверждение' : 'Instant confirmation',
      max: ro ? 'maxim' : ru ? 'максимум' : 'max',
      guests: ro ? 'oaspeți' : ru ? 'гостей' : 'guests',
      tooMany: ro
        ? `Ai depășit numărul maxim de oaspeți (${maxGuestsForListing}). Reduce numărul de oaspeți.`
        : ru
          ? `Превышено максимальное количество гостей (${maxGuestsForListing}).`
          : `You exceeded the guest limit (${maxGuestsForListing}). Please reduce the party size.`,
      validationName: ro ? 'Numele este obligatoriu.' : ru ? 'Имя обязательно.' : 'Name is required.',
      validationEmail: ro ? 'Emailul este obligatoriu.' : ru ? 'Email обязателен.' : 'Email is required.',
      validationPhone: ro ? 'Telefonul este obligatoriu.' : ru ? 'Телефон обязателен.' : 'Phone is required.',
      validationSession: ro ? 'Alege o sesiune disponibilă.' : ru ? 'Выберите доступный сеанс.' : 'Pick an available session.',
      validationDates: ro ? 'Selectează check-in și check-out.' : ru ? 'Выберите даты заезда и выезда.' : 'Select check-in and check-out.',
      requiredTag: ro ? 'Câmpuri obligatorii' : ru ? 'Обязательные поля' : 'Required fields',
    };
  }, [language, maxGuestsForListing]);

  const handleSubmit = async () => {
    if (!listing) return;

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

    setValidationError(null);

    if (!contactName.trim()) {
      setValidationError(labels.validationName);
      return;
    }
    if (!contactEmail.trim()) {
      setValidationError(labels.validationEmail);
      return;
    }
    if (!contactPhone.trim()) {
      setValidationError(labels.validationPhone);
      return;
    }
    if (listingKind === 'experience' && !selectedSessionId) {
      setValidationError(labels.validationSession);
      return;
    }
    if (listingKind === 'accommodation' && (!startsAt || !endsAt)) {
      setValidationError(labels.validationDates);
      return;
    }
    if (maxGuestsExceeded) {
      setValidationError(labels.tooMany);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let response;

      if (listingKind === 'experience') {
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
          : 'Cererea a fost trimisă și așteaptă confirmarea hostsi.',
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

  const experiencePrice = listingKind === 'experience' ? (listing as ExperienceListing).price_amount : 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-8">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <button
          onClick={() => onNavigate('experience', { id: listing.id, slug: listing.slug, kind: listingKind })}
          className="mb-6 font-semibold text-[#002626] hover:underline"
        >
          ← Înapoi la listare
        </button>

        <h1 className="mb-2 text-3xl font-bold text-gray-900 md:text-4xl">{t.booking.title}</h1>
        <p className="mb-8 text-sm text-gray-500">
          <span className="text-red-500">*</span> {labels.requiredTag}
        </p>

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
                  {maxGuestsForListing !== null ? (
                    <p className="mt-1 text-xs font-medium text-gray-500">
                      {labels.max} {maxGuestsForListing} {labels.guests}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            {listingKind === 'experience' ? (
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center gap-3">
                  <Calendar className="h-6 w-6 text-[#002626]" />
                  <h2 className="text-xl font-bold text-gray-900">
                    {labels.pickSession}
                    <RequiredMark />
                  </h2>
                </div>

                {sessions.length === 0 ? (
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 px-6 py-8 text-center text-gray-600">
                    {language === 'ro'
                      ? 'Nu există sesiuni disponibile momentan.'
                      : language === 'ru'
                        ? 'Пока нет доступных сеансов.'
                        : 'No sessions available right now.'}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {sessions.map((session) => {
                      const isSelected = selectedSessionId === session.id;
                      const isSoldOut = session.spots_left <= 0;
                      const pieces = formatSessionDate(session.starts_at);
                      const totalCap = session.capacity ?? session.spots_left + session.reserved_guests;
                      const filledPct =
                        totalCap > 0
                          ? Math.max(0, Math.min(100, (session.reserved_guests / totalCap) * 100))
                          : 0;

                      return (
                        <button
                          key={session.id}
                          onClick={() => !isSoldOut && setSelectedSessionId(session.id)}
                          disabled={isSoldOut}
                          className={`group relative overflow-hidden rounded-2xl border-2 p-4 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                            isSelected
                              ? 'border-[#002626] bg-[#002626] text-white shadow-lg'
                              : isSoldOut
                                ? 'border-gray-200 bg-gray-50'
                                : 'border-gray-200 bg-white hover:-translate-y-0.5 hover:border-[#002626] hover:shadow-md'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <div
                              className={`flex h-16 w-16 flex-shrink-0 flex-col items-center justify-center rounded-xl ${
                                isSelected ? 'bg-white/10' : 'bg-[#fff4f1]'
                              }`}
                            >
                              <span
                                className={`text-xs font-semibold uppercase tracking-wide ${
                                  isSelected ? 'text-white/80' : 'text-[#944236]'
                                }`}
                              >
                                {pieces.month}
                              </span>
                              <span
                                className={`text-2xl font-bold leading-none ${
                                  isSelected ? 'text-white' : 'text-[#002626]'
                                }`}
                              >
                                {pieces.day}
                              </span>
                              <span
                                className={`mt-0.5 text-[10px] uppercase ${
                                  isSelected ? 'text-white/70' : 'text-gray-500'
                                }`}
                              >
                                {pieces.weekday}
                              </span>
                            </div>

                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Clock
                                  className={`h-4 w-4 ${
                                    isSelected ? 'text-white/80' : 'text-gray-500'
                                  }`}
                                />
                                <span className="text-base font-semibold">{pieces.time}</span>
                              </div>
                              {session.title_override || session.title ? (
                                <p
                                  className={`mt-1 line-clamp-1 text-sm ${
                                    isSelected ? 'text-white/90' : 'text-gray-700'
                                  }`}
                                >
                                  {session.title_override || session.title}
                                </p>
                              ) : null}

                              <div
                                className={`mt-2 h-1.5 w-full overflow-hidden rounded-full ${
                                  isSelected ? 'bg-white/20' : 'bg-gray-100'
                                }`}
                              >
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    isSelected
                                      ? 'bg-white'
                                      : filledPct > 80
                                        ? 'bg-red-400'
                                        : filledPct > 50
                                          ? 'bg-amber-400'
                                          : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${filledPct}%` }}
                                />
                              </div>

                              <div className="mt-2 flex items-center justify-between">
                                <span
                                  className={`text-xs font-medium ${
                                    isSelected
                                      ? 'text-white/90'
                                      : isSoldOut
                                        ? 'text-red-500'
                                        : 'text-gray-600'
                                  }`}
                                >
                                  {isSoldOut
                                    ? labels.soldOut
                                    : `${session.spots_left} ${labels.spotsLeft}`}
                                </span>
                                <span
                                  className={`text-sm font-bold ${
                                    isSelected ? 'text-white' : 'text-[#002626]'
                                  }`}
                                >
                                  {formatCurrency(experiencePrice, listing.currency)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {isSelected ? (
                            <div className="absolute right-3 top-3 rounded-full bg-white p-1 text-[#002626]">
                              <Check className="h-3 w-3" strokeWidth={3} />
                            </div>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <Calendar className="h-6 w-6 text-[#002626]" />
                  <h2 className="text-xl font-bold text-gray-900">{labels.period}</h2>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Check-in
                      <RequiredMark />
                    </label>
                    <input
                      type="date"
                      value={startsAt}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(event) => setStartsAt(event.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-[#002626] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Check-out
                      <RequiredMark />
                    </label>
                    <input
                      type="date"
                      value={endsAt}
                      min={startsAt || new Date().toISOString().split('T')[0]}
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
                      className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-gray-300 transition-colors hover:border-[#002626]"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center font-medium">{units}</span>
                    <button
                      onClick={() =>
                        setUnits((current) => {
                          if (availableUnits && current + 1 > availableUnits) return current;
                          return current + 1;
                        })
                      }
                      className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-gray-300 transition-colors hover:border-[#002626]"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <Users className="h-6 w-6 text-[#002626]" />
                <h2 className="text-xl font-bold text-gray-900">{t.booking.guests}</h2>
                {maxGuestsForListing !== null ? (
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                    {labels.max} {maxGuestsForListing}
                  </span>
                ) : null}
              </div>

              <div className="space-y-4">
                {[
                  {
                    label: t.booking.adults,
                    value: adults,
                    setter: setAdults,
                    min: 1,
                    countsTowardMax: true,
                  },
                  {
                    label: t.booking.children,
                    value: children,
                    setter: setChildren,
                    min: 0,
                    countsTowardMax: true,
                  },
                  {
                    label: t.booking.infantsLabel,
                    value: infants,
                    setter: setInfants,
                    min: 0,
                    countsTowardMax: false,
                  },
                ].map((item) => {
                  const payingGuests = adults + children;
                  const atMax = item.countsTowardMax && maxGuestsForListing !== null && payingGuests >= maxGuestsForListing;

                  return (
                    <div key={item.label} className="flex items-center justify-between">
                      <p className="font-medium text-gray-900">{item.label}</p>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => item.setter((current) => Math.max(item.min, current - 1))}
                          disabled={item.value <= item.min}
                          className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-300 transition-colors hover:border-[#002626] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-8 text-center font-medium">{item.value}</span>
                        <button
                          onClick={() => item.setter((current) => current + 1)}
                          disabled={atMax}
                          className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-300 transition-colors hover:border-[#002626] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {maxGuestsExceeded ? (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {labels.tooMany}
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-bold text-gray-900">{t.booking.contactInfo}</h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Nume complet
                    <RequiredMark />
                  </label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(event) => setContactName(event.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-[#002626] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    {t.account.email}
                    <RequiredMark />
                  </label>
                  <input
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(event) => setContactEmail(event.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-[#002626] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    {t.account.phone}
                    <RequiredMark />
                  </label>
                  <input
                    type="tel"
                    required
                    value={contactPhone}
                    onChange={(event) => setContactPhone(event.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-[#002626] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Mesaj pentru host</label>
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
                  <span>{totalGuests} persoane</span>
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
                Plata se face la locație. După trimitere, hosta confirmă rezervarea și activează mesajele.
              </div>

              {validationError ? (
                <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {validationError}
                </div>
              ) : null}

              {error ? (
                <div className="mb-4 rounded-2xl border border-[#efc4be] bg-[#fff4f1] px-4 py-3 text-sm text-[#944236]">
                  {error}
                </div>
              ) : null}

              <button
                onClick={() => void handleSubmit()}
                disabled={
                  isSubmitting ||
                  !contactName.trim() ||
                  !contactEmail.trim() ||
                  !contactPhone.trim() ||
                  maxGuestsExceeded ||
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
