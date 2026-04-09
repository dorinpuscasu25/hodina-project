import { useEffect, useMemo, useState } from 'react';
import { Calendar, MessageCircle, XCircle } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { apiRequest, formatApiError } from '../lib/api';
import { useSeo } from '../lib/seo';
import { bookingTabStatus, formatCurrency, formatDateTime, humanizeStatus, isExperienceListing } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { ReviewModal } from '../components/ReviewModal';
import type { Booking } from '../types';

interface BookingsPageProps {
  onNavigate: (page: string, data?: Record<string, unknown>) => void;
  onRequestAuth: (mode?: 'login' | 'register') => void;
  onNotice: (message: string | null) => void;
}

export const BookingsPage = ({ onNavigate, onRequestAuth, onNotice }: BookingsPageProps) => {
  const { t } = useLanguage();
  const { isAuthenticated, token, user, resendVerification } = useAuth();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [processingBookingId, setProcessingBookingId] = useState<number | null>(null);
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBookings = async () => {
    if (!token || !user?.email_verified) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiRequest<{ data: Booking[] }>('/client/bookings', { token });
      setBookings(response.data);
    } catch (loadError) {
      setError(formatApiError(loadError));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadBookings();
  }, [token, user?.email_verified]);

  const filteredBookings = useMemo(
    () => bookings.filter((booking) => bookingTabStatus(booking) === activeTab),
    [activeTab, bookings],
  );

  useSeo({
    title: 'Rezervările mele',
    description: 'Vezi rezervările tale active, trecute și anulate pe Hodina.',
    canonicalPath: '/account/bookings',
    noindex: true,
  });

  const handleCancel = async (booking: Booking) => {
    if (!token) {
      return;
    }

    setProcessingBookingId(booking.id);

    try {
      await apiRequest(`/client/bookings/${booking.id}/cancel`, {
        token,
        method: 'POST',
      });

      onNotice('Rezervarea a fost anulată.');
      await loadBookings();
    } catch (cancelError) {
      setError(formatApiError(cancelError));
    } finally {
      setProcessingBookingId(null);
    }
  };

  const handleResend = async () => {
    setIsResending(true);

    try {
      await resendVerification();
      onNotice('Am retrimis emailul de confirmare.');
    } catch (resendError) {
      setError(formatApiError(resendError));
    } finally {
      setIsResending(false);
    }
  };

  const handleReviewSubmit = async (review: { rating: number; title: string; comment: string }) => {
    if (!token || !reviewBooking) {
      return;
    }

    setIsSavingReview(true);

    try {
      await apiRequest(`/client/bookings/${reviewBooking.id}/review`, {
        token,
        method: reviewBooking.review ? 'PUT' : 'POST',
        body: review,
      });

      onNotice(reviewBooking.review ? 'Review-ul a fost actualizat.' : 'Review-ul a fost publicat.');
      await loadBookings();
      setReviewBooking(null);
    } catch (reviewError) {
      setError(formatApiError(reviewError));
      throw reviewError;
    } finally {
      setIsSavingReview(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20 md:pb-8">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-gray-200 bg-white px-8 py-12 shadow-sm">
            <Calendar className="mx-auto mb-4 h-14 w-14 text-gray-300" />
            <h2 className="text-2xl font-bold text-gray-900">Intră în cont pentru rezervările tale</h2>
            <button
              onClick={() => onRequestAuth('login')}
              className="mt-6 rounded-full bg-[#002626] px-8 py-3 font-semibold text-white"
            >
              Intră în cont
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user?.email_verified) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20 md:pb-8">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-gray-200 bg-white px-8 py-12 text-center shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900">Confirmă emailul pentru a vedea rezervările</h2>
            <p className="mt-3 text-gray-600">
              După confirmare se activează rezervările, mesajele și istoricul rezervărilor.
            </p>
            <button
              onClick={() => void handleResend()}
              disabled={isResending}
              className="mt-6 rounded-full bg-[#002626] px-8 py-3 font-semibold text-white disabled:bg-gray-300"
            >
              {isResending ? 'Se trimite...' : 'Retrimite emailul'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-8">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-3xl font-bold text-gray-900 md:text-4xl">{t.account.myBookings}</h1>

        {error ? (
          <div className="mb-6 rounded-2xl border border-[#efc4be] bg-[#fff4f1] px-5 py-4 text-sm text-[#944236]">
            {error}
          </div>
        ) : null}

        <div className="mb-8 flex gap-4 border-b border-gray-200">
          {[
            { key: 'upcoming' as const, label: t.account.upcoming },
            { key: 'past' as const, label: t.account.past },
            { key: 'cancelled' as const, label: t.account.cancelled },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative px-2 pb-4 font-semibold transition-colors ${
                activeTab === tab.key ? 'text-[#002626]' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {activeTab === tab.key ? <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#002626]" /> : null}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-48 animate-pulse rounded-2xl bg-white shadow-sm" />
            ))}
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="rounded-3xl border border-gray-200 bg-white px-8 py-14 text-center shadow-sm">
            <Calendar className="mx-auto mb-4 h-14 w-14 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-900">Nu ai rezervări aici încă</h3>
            <button
              onClick={() => onNavigate('listing')}
              className="mt-6 rounded-full bg-[#002626] px-8 py-3 font-semibold text-white"
            >
              Explorează listările
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredBookings.map((booking) => {
              const listingKind = booking.bookable_type === 'Accommodation' ? 'accommodation' : 'experience';

              return (
                <div key={booking.id} className="overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow hover:shadow-md">
                  <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-4">
                    <div className="md:col-span-1">
                      <img
                        src={booking.bookable?.cover_image ?? 'https://placehold.co/800x500?text=Hodina'}
                        alt={booking.bookable?.title ?? booking.booking_number}
                        className="h-48 w-full rounded-xl object-cover md:h-full"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <div className="mb-4 flex items-start justify-between gap-4">
                        <div>
                          <span className="mb-2 inline-block rounded-full bg-[#002626] px-3 py-1 text-sm font-medium text-white">
                            {listingKind === 'experience'
                              ? (isExperienceListing(booking.bookable) ? booking.bookable.category?.name : null) ?? 'Experiență'
                              : (!isExperienceListing(booking.bookable) ? booking.bookable?.type?.name : null) ?? 'Cazare'}
                          </span>
                          <h3 className="mb-2 text-xl font-bold text-gray-900">
                            {booking.bookable?.title ?? booking.booking_number}
                          </h3>
                          <p className="text-sm text-gray-500">{booking.booking_number}</p>
                        </div>
                        <span className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700">
                          {humanizeStatus(booking.status)}
                        </span>
                      </div>

                      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div className="text-gray-600">
                          <p className="text-sm font-medium text-gray-500">Început</p>
                          <p>{formatDateTime(booking.starts_at)}</p>
                        </div>
                        <div className="text-gray-600">
                          <p className="text-sm font-medium text-gray-500">Final</p>
                          <p>{formatDateTime(booking.ends_at)}</p>
                        </div>
                        <div className="text-gray-600">
                          <p className="text-sm font-medium text-gray-500">Participanți</p>
                          <p>{booking.adults + booking.children + booking.infants} persoane</p>
                        </div>
                      </div>

                      <div className="mb-4 text-gray-600">
                        {[booking.bookable?.guesthouse?.name, booking.bookable?.city, booking.bookable?.country]
                          .filter(Boolean)
                          .join(' · ')}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 pt-4">
                        <div>
                          <span className="text-gray-600">Total: </span>
                          <span className="text-2xl font-bold text-[#002626]">
                            {formatCurrency(booking.total_amount, booking.currency)}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={() =>
                              onNavigate('experience', {
                                id: booking.bookable?.id,
                                slug: booking.bookable?.slug,
                                kind: listingKind,
                              })
                            }
                            className="rounded-full border-2 border-[#002626] px-6 py-2 font-semibold text-[#002626] transition-colors hover:bg-[#002626] hover:text-white"
                          >
                            {t.common.view}
                          </button>

                          {booking.chat_enabled ? (
                            <button
                              onClick={() => onNavigate('messages', { bookingId: booking.id })}
                              className="inline-flex items-center gap-2 rounded-full bg-[#002626] px-6 py-2 font-semibold text-white transition-colors hover:bg-[#003838]"
                            >
                              <MessageCircle className="h-4 w-4" />
                              {t.messages.title}
                            </button>
                          ) : null}

                          {(booking.status === 'pending' || booking.status === 'confirmed') ? (
                            <button
                              onClick={() => void handleCancel(booking)}
                              disabled={processingBookingId === booking.id}
                              className="inline-flex items-center gap-2 rounded-full bg-red-500 px-6 py-2 font-semibold text-white transition-colors hover:bg-red-600 disabled:bg-gray-300"
                            >
                              <XCircle className="h-4 w-4" />
                              {processingBookingId === booking.id ? 'Se anulează...' : t.common.cancel}
                            </button>
                          ) : null}

                          {(booking.can_review || booking.review) ? (
                            <button
                              onClick={() => setReviewBooking(booking)}
                              className="rounded-full border-2 border-amber-300 px-6 py-2 font-semibold text-amber-700 transition-colors hover:bg-amber-50"
                            >
                              {booking.review ? 'Editează review' : 'Lasă review'}
                            </button>
                          ) : null}
                        </div>
                      </div>

                      {booking.review ? (
                        <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-[#17332d]">
                                Review-ul tău: {booking.review.rating}/5
                              </p>
                              {booking.review.title ? (
                                <p className="mt-1 text-sm font-medium text-[#17332d]">{booking.review.title}</p>
                              ) : null}
                            </div>
                            <span className="text-xs text-[#6c7a72]">
                              {formatDateTime(booking.review.published_at ?? booking.review.created_at)}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-[#55675f]">{booking.review.comment}</p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {reviewBooking ? (
        <ReviewModal
          experienceTitle={reviewBooking.bookable?.title ?? reviewBooking.booking_number}
          initialReview={reviewBooking.review}
          isSubmitting={isSavingReview}
          onClose={() => setReviewBooking(null)}
          onSubmit={handleReviewSubmit}
        />
      ) : null}
    </div>
  );
};
