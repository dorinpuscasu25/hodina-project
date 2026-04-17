import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, Home, Sparkles, Star, Wallet, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest, formatApiError } from '@/lib/api';
import type { Booking, DashboardSummary } from '@/lib/types';

function formatDate(value: string | null) {
  if (!value) {
    return 'TBD';
  }

  return new Intl.DateTimeFormat('ro-RO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function getBookingTimestamp(value: string | null) {
  if (!value) {
    return Number.MAX_SAFE_INTEGER;
  }

  const parsed = new Date(value).getTime();

  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
}

export default function Today() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming'>('today');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionBookingId, setActionBookingId] = useState<number | null>(null);

  async function loadData() {
    if (!token) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [summaryResponse, bookingsResponse] = await Promise.all([
        apiRequest<{ data: DashboardSummary }>('/host/dashboard', { token }),
        apiRequest<{ data: Booking[] }>('/host/bookings', { token }),
      ]);

      setSummary(summaryResponse.data);
      setBookings(bookingsResponse.data);
    } catch (loadError) {
      setError(formatApiError(loadError));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [token]);

  const handleAction = async (bookingId: number, action: 'confirm' | 'reject') => {
    if (!token) {
      return;
    }

    setActionBookingId(bookingId);

    try {
      await apiRequest(`/host/bookings/${bookingId}/${action}`, {
        token,
        method: 'POST',
      });
      await loadData();
    } catch (actionError) {
      setError(formatApiError(actionError));
    } finally {
      setActionBookingId(null);
    }
  };

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setHours(23, 59, 59, 999);

  const sortedBookings = [...bookings].sort((left, right) => {
    if (left.status === 'pending' && right.status !== 'pending') {
      return -1;
    }

    if (left.status !== 'pending' && right.status === 'pending') {
      return 1;
    }

    return getBookingTimestamp(left.starts_at) - getBookingTimestamp(right.starts_at);
  });

  const upcomingBookings = sortedBookings.filter((booking) => {
    if (booking.status === 'pending') {
      return false;
    }

    if (!booking.starts_at) {
      return true;
    }

    const bookingDate = new Date(booking.starts_at);

    return bookingDate > dayEnd;
  });

  const filteredBookings = sortedBookings.filter((booking) => {
    if (activeTab === 'today') {
      if (booking.status === 'pending') {
        return true;
      }

      if (!booking.starts_at) {
        return false;
      }

      const bookingDate = new Date(booking.starts_at);

      return bookingDate >= dayStart && bookingDate <= dayEnd;
    }

    if (booking.status === 'pending') {
      return false;
    }

    if (!booking.starts_at) {
      return true;
    }

    const bookingDate = new Date(booking.starts_at);

    return bookingDate > dayEnd;
  });

  const statCards = [
    {
      label: 'Experiențe',
      value: summary?.counts.experiences ?? 0,
      icon: <Sparkles className="h-5 w-5" />,
    },
    {
      label: 'Cazări',
      value: summary?.counts.accommodations ?? 0,
      icon: <Home className="h-5 w-5" />,
    },
    {
      label: 'Pending',
      value: summary?.counts.pending_bookings ?? 0,
      icon: <Clock3 className="h-5 w-5" />,
    },
    {
      label: 'Confirmate',
      value: summary?.counts.confirmed_bookings ?? 0,
      icon: <CalendarDays className="h-5 w-5" />,
    },
    {
      label: 'Încasat',
      value: `${summary?.financials.paid_revenue ?? 0} ${summary?.guesthouse.currency ?? 'MDL'}`,
      icon: <Wallet className="h-5 w-5" />,
    },
    {
      label: 'Rating',
      value: (summary?.highlights.average_rating ?? 0).toFixed(1),
      icon: <Star className="h-5 w-5" />,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#7e8c83]">Operations</p>
          <h1 className="text-4xl font-semibold tracking-tight text-[#17332d]">Today</h1>
          <p className="max-w-2xl text-base text-[#64766d]">
            Vezi ce rezervări vin astăzi, ce ai de confirmat și câte listări sunt active în host.
          </p>
        </div>
      </div>

      {error ? (
        <div className="mb-6 rounded-[1.5rem] border border-[#efc4be] bg-[#fff4f1] px-5 py-4 text-sm text-[#944236]">
          {error}
        </div>
      ) : null}

      <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#718279]">{card.label}</span>
              <span className="rounded-full bg-white p-2 text-[#17332d]">{card.icon}</span>
            </div>
            <p className="mt-5 text-3xl font-semibold text-[#17332d]">{card.value}</p>
          </div>
        ))}
      </div>

      {summary ? (
        <div className="mb-8 grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
          <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-[#17332d]">Performanță în perioada curentă</h2>
                <p className="text-sm text-[#6a7a71]">{summary.statistics_preview.period.label}</p>
              </div>
              <button
                onClick={() => navigate('/dashboard/statistics')}
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-[#17332d] transition hover:bg-gray-50"
              >
                Vezi toate statisticile
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-[1.5rem] bg-[#f6faf8] p-4">
                <p className="text-sm text-[#6f7f76]">Rezervări</p>
                <p className="mt-2 text-3xl font-semibold text-[#17332d]">{summary.statistics_preview.overview.bookings_total}</p>
              </div>
              <div className="rounded-[1.5rem] bg-[#fff8ef] p-4">
                <p className="text-sm text-[#7d7567]">Venit brut</p>
                <p className="mt-2 text-3xl font-semibold text-[#17332d]">
                  {summary.statistics_preview.overview.gross_revenue} {summary.guesthouse.currency}
                </p>
              </div>
              <div className="rounded-[1.5rem] bg-[#eef6ff] p-4">
                <p className="text-sm text-[#647486]">Încasat</p>
                <p className="mt-2 text-3xl font-semibold text-[#17332d]">
                  {summary.statistics_preview.overview.paid_revenue} {summary.guesthouse.currency}
                </p>
              </div>
              <div className="rounded-[1.5rem] bg-[#fff3f1] p-4">
                <p className="text-sm text-[#85615a]">Clienți unici</p>
                <p className="mt-2 text-3xl font-semibold text-[#17332d]">{summary.statistics_preview.overview.unique_clients}</p>
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium text-[#17332d]">Trend rezervări și venituri</p>
                <p className="text-xs text-[#6b7a72]">{summary.statistics_preview.period.group_by}</p>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {summary.statistics_preview.trend.map((point) => {
                  const maxBookings = Math.max(...summary.statistics_preview.trend.map((item) => item.bookings), 1);
                  const height = Math.max((point.bookings / maxBookings) * 120, point.bookings > 0 ? 14 : 6);

                  return (
                    <div key={`${point.start}-${point.label}`} className="flex min-w-14 flex-col items-center gap-2">
                      <div className="flex h-32 w-14 items-end justify-center rounded-2xl bg-[#f7faf8] px-1 py-2">
                        <div
                          className="w-full rounded-full bg-[#17332d]"
                          style={{ height }}
                          title={`${point.label}: ${point.bookings} rezervări`}
                        />
                      </div>
                      <span className="text-[11px] text-[#697a71]">{point.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-[#17332d]">Feedback recent</h2>
            <p className="mt-1 text-sm text-[#6a7a71]">Ultimele review-uri lăsate de oaspeți.</p>

            <div className="mt-5 space-y-4">
              {summary.recent_reviews.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-[#6a7a71]">
                  Încă nu există review-uri publicate.
                </div>
              ) : (
                summary.recent_reviews.map((review) => (
                  <div key={review.id} className="rounded-[1.5rem] border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[#17332d]">{review.guest?.name ?? 'Oaspete Hodina'}</p>
                        <p className="text-xs text-[#6d7c74]">{formatDate(review.published_at ?? review.created_at)}</p>
                      </div>
                      <div className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
                        {review.rating}/5
                      </div>
                    </div>
                    {review.title ? <p className="mt-3 text-sm font-medium text-[#17332d]">{review.title}</p> : null}
                    <p className="mt-2 text-sm leading-6 text-[#5d6f66]">{review.comment}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-[#17332d]">Rezervări</h2>
            <p className="text-sm text-[#6a7a71]">Poți confirma sau respinge direct de aici.</p>
          </div>
          <div className="flex rounded-full bg-white p-1">
            {([
              { id: 'today', label: 'Astăzi' },
              { id: 'upcoming', label: 'Următoarele' },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  activeTab === tab.id ? 'bg-[#17332d] text-white' : 'text-[#61736a]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-[1.5rem] bg-white px-5 py-8 text-center text-[#6d7d74]">
            Se încarcă rezervările...
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-gray-300 bg-white px-5 py-10 text-center">
            <p className="text-lg font-semibold text-[#17332d]">Nu ai rezervări în această secțiune.</p>
            {activeTab === 'today' && upcomingBookings.length > 0 ? (
              <button
                onClick={() => setActiveTab('upcoming')}
                className="mt-4 inline-flex items-center rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-[#17332d] transition hover:bg-gray-50"
              >
                Vezi următoarele rezervări
              </button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking) => (
              <div
                key={booking.id}
                className="rounded-[1.5rem] border border-gray-200 bg-white p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#6e7e75]">
                        {booking.bookable_type}
                      </span>
                      <span className="rounded-full bg-[#17332d] px-3 py-1 text-xs font-semibold text-white">
                        {booking.status}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold text-[#17332d]">{booking.contact_name}</h3>
                    <p className="text-sm text-[#64756c]">
                      {booking.bookable?.title ?? 'Rezervare Hodina'} | {formatDate(booking.starts_at)}
                    </p>
                    <p className="text-sm text-[#64756c]">
                      {booking.adults + booking.children} persoane | {booking.total_amount} {booking.currency}
                    </p>
                    {booking.special_requests ? (
                      <p className="text-sm text-[#8a6752]">Cereri speciale: {booking.special_requests}</p>
                    ) : null}
                  </div>

                  {booking.status === 'pending' ? (
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => handleAction(booking.id, 'confirm')}
                        disabled={actionBookingId === booking.id}
                        className="inline-flex items-center gap-2 rounded-2xl bg-[#17332d] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#24443d]"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Confirmă
                      </button>
                      <button
                        onClick={() => handleAction(booking.id, 'reject')}
                        disabled={actionBookingId === booking.id}
                        className="inline-flex items-center gap-2 rounded-2xl border border-[#d7c9bd] bg-white px-4 py-3 text-sm font-semibold text-[#7d3e34] transition hover:bg-[#fff2ee]"
                      >
                        <XCircle className="h-4 w-4" />
                        Respinge
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-white px-4 py-3 text-sm text-[#62736b]">
                      {booking.chat_enabled ? 'Chat activ după confirmare' : 'Așteaptă confirmarea pentru chat'}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
