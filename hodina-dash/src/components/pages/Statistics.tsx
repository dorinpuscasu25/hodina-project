import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, CalendarRange, RefreshCw, Star, Users, Wallet } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest, formatApiError } from '@/lib/api';
import type { DashboardStatistics } from '@/lib/types';

function formatMoney(amount: number, currency = 'MDL') {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

const presetOptions = [
  { value: 'today', label: 'Astăzi' },
  { value: '7d', label: '7 zile' },
  { value: '30d', label: '30 zile' },
  { value: 'month', label: 'Luna curentă' },
  { value: 'custom', label: 'Custom' },
] as const;

export default function Statistics() {
  const { token, guesthouse } = useAuth();
  const [preset, setPreset] = useState<(typeof presetOptions)[number]['value']>('month');
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [stats, setStats] = useState<DashboardStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    async function loadStatistics() {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        preset,
        group_by: groupBy,
      });

      if (preset === 'custom') {
        if (startDate) {
          params.set('start_date', startDate);
        }

        if (endDate) {
          params.set('end_date', endDate);
        }
      }

      try {
        const response = await apiRequest<{ data: DashboardStatistics }>(`/host/dashboard/statistics?${params.toString()}`, {
          token,
        });

        setStats(response.data);
      } catch (loadError) {
        setError(formatApiError(loadError));
      } finally {
        setIsLoading(false);
      }
    }

    void loadStatistics();
  }, [token, preset, groupBy, startDate, endDate]);

  const chartMax = useMemo(
    () => Math.max(...(stats?.trend ?? []).map((point) => point.paid_revenue || point.bookings), 1),
    [stats?.trend],
  );

  const cards = stats ? [
    {
      label: 'Rezervări totale',
      value: stats.overview.bookings_total.toString(),
      helper: `${stats.overview.confirmed_bookings} confirmate`,
      icon: <BarChart3 className="h-5 w-5" />,
    },
    {
      label: 'Venit brut',
      value: formatMoney(stats.overview.gross_revenue, guesthouse?.currency ?? 'MDL'),
      helper: `${formatMoney(stats.overview.outstanding_amount, guesthouse?.currency ?? 'MDL')} de încasat`,
      icon: <Wallet className="h-5 w-5" />,
    },
    {
      label: 'Încasat',
      value: formatMoney(stats.overview.paid_revenue, guesthouse?.currency ?? 'MDL'),
      helper: `${formatMoney(stats.overview.refunded_amount, guesthouse?.currency ?? 'MDL')} returnat`,
      icon: <RefreshCw className="h-5 w-5" />,
    },
    {
      label: 'Clienți unici',
      value: stats.overview.unique_clients.toString(),
      helper: `${stats.overview.guests_total} oaspeți procesați`,
      icon: <Users className="h-5 w-5" />,
    },
    {
      label: 'Rating mediu',
      value: stats.overview.average_rating.toFixed(1),
      helper: `${stats.overview.reviews_count} review-uri`,
      icon: <Star className="h-5 w-5" />,
    },
    {
      label: 'Rată confirmare',
      value: `${stats.overview.confirmation_rate}%`,
      helper: `${stats.overview.pending_bookings} pending`,
      icon: <CalendarRange className="h-5 w-5" />,
    },
  ] : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-[#7e8c83]">Business intelligence</p>
          <h1 className="text-4xl font-semibold tracking-tight text-[#17332d]">Statistici</h1>
          <p className="max-w-2xl text-base text-[#66786e]">
            Vezi performanța rezervărilor, încasările, clienții și review-urile pe intervalul care te interesează.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {presetOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setPreset(option.value)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                preset === option.value ? 'bg-[#17332d] text-white' : 'bg-white text-[#5d7066] ring-1 ring-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6 rounded-[2rem] border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-[#17332d]">Grupare</label>
            <select
              value={groupBy}
              onChange={(event) => setGroupBy(event.target.value as 'day' | 'week' | 'month')}
              className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none transition focus:border-[#17332d]"
            >
              <option value="day">Pe zile</option>
              <option value="week">Pe săptămâni</option>
              <option value="month">Pe luni</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[#17332d]">Start</label>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              disabled={preset !== 'custom'}
              className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none transition focus:border-[#17332d] disabled:bg-gray-50"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[#17332d]">End</label>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              disabled={preset !== 'custom'}
              className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none transition focus:border-[#17332d] disabled:bg-gray-50"
            />
          </div>

          <div className="flex items-end">
            <div className="w-full rounded-[1.5rem] bg-[#f7faf8] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-[#7b8b83]">Perioada activă</p>
              <p className="mt-2 font-semibold text-[#17332d]">{stats?.period.label ?? 'Se încarcă...'}</p>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="mb-6 rounded-[1.5rem] border border-[#efc4be] bg-[#fff4f2] px-5 py-4 text-sm text-[#914336]">
          {error}
        </div>
      ) : null}

      {isLoading || !stats ? (
        <div className="rounded-[2rem] border border-gray-200 bg-white px-6 py-12 text-center text-[#6e7d75] shadow-sm">
          Se încarcă statisticile...
        </div>
      ) : (
        <>
          <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => (
              <div key={card.label} className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#718279]">{card.label}</span>
                  <span className="rounded-full bg-[#f7faf8] p-2 text-[#17332d]">{card.icon}</span>
                </div>
                <p className="mt-5 text-3xl font-semibold text-[#17332d]">{card.value}</p>
                <p className="mt-2 text-sm text-[#66786e]">{card.helper}</p>
              </div>
            ))}
          </div>

          <div className="mb-8 grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
            <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold text-[#17332d]">Trend venituri și rezervări</h2>
              <p className="mt-1 text-sm text-[#6a7a71]">Bare pe intervalul selectat. Hover-ul folosește tooltipul nativ al browserului.</p>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_160px]">
                <div className="grid grid-cols-12 gap-2">
                  {stats.trend.map((point) => {
                    const height = Math.max((Math.max(point.paid_revenue, point.bookings) / chartMax) * 180, point.bookings > 0 ? 18 : 6);

                    return (
                      <div key={`${point.start}-${point.label}`} className="flex flex-col items-center gap-2">
                        <div className="flex h-48 w-full items-end justify-center rounded-2xl bg-[#f7faf8] px-2 py-3">
                          <div
                            className="w-full rounded-full bg-gradient-to-t from-[#17332d] to-[#63a375]"
                            style={{ height }}
                            title={`${point.label}: ${point.bookings} rezervări · ${formatMoney(point.paid_revenue, guesthouse?.currency ?? 'MDL')}`}
                          />
                        </div>
                        <span className="text-[11px] text-[#697a71]">{point.label}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-3 rounded-[1.5rem] bg-[#f7faf8] p-4">
                  <p className="text-sm font-semibold text-[#17332d]">Snapshot</p>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-[#7b8b83]">Ticket mediu</p>
                    <p className="mt-1 text-xl font-semibold text-[#17332d]">
                      {formatMoney(stats.overview.average_booking_value, guesthouse?.currency ?? 'MDL')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-[#7b8b83]">Sejururi finalizate</p>
                    <p className="mt-1 text-xl font-semibold text-[#17332d]">{stats.overview.completed_stays}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-[#7b8b83]">Rezervări anulate</p>
                    <p className="mt-1 text-xl font-semibold text-[#17332d]">{stats.overview.cancelled_bookings}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold text-[#17332d]">Distribuții rapide</h2>
              <div className="mt-6 space-y-6">
                <div>
                  <p className="mb-3 text-sm font-medium text-[#17332d]">Status rezervări</p>
                  <div className="space-y-3">
                    {stats.booking_statuses.map((item) => {
                      const max = Math.max(...stats.booking_statuses.map((entry) => entry.value), 1);
                      return (
                        <div key={item.status}>
                          <div className="mb-1 flex items-center justify-between text-sm text-[#5e7066]">
                            <span>{item.label}</span>
                            <span>{item.value}</span>
                          </div>
                          <div className="h-2 rounded-full bg-[#edf2ef]">
                            <div
                              className="h-2 rounded-full bg-[#17332d]"
                              style={{ width: `${(item.value / max) * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-sm font-medium text-[#17332d]">Experiențe vs cazări</p>
                  <div className="space-y-3">
                    {stats.bookable_types.map((item) => (
                      <div key={item.type} className="rounded-[1.25rem] bg-[#f7faf8] p-4">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-[#17332d]">{item.label}</p>
                          <span className="text-sm text-[#5e7066]">{item.value} rezervări</span>
                        </div>
                        <p className="mt-2 text-sm text-[#5e7066]">
                          {formatMoney(item.paid_revenue, guesthouse?.currency ?? 'MDL')} încasați
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-8 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold text-[#17332d]">Top listări</h2>
              <div className="mt-5 space-y-4">
                {stats.top_listings.length === 0 ? (
                  <div className="rounded-[1.5rem] border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-[#6a7a71]">
                    Nu există încă suficiente rezervări în perioada selectată.
                  </div>
                ) : (
                  stats.top_listings.map((listing) => (
                    <div key={`${listing.type}-${listing.id}`} className="flex gap-4 rounded-[1.5rem] border border-gray-200 p-4">
                      <div className="h-16 w-16 overflow-hidden rounded-2xl bg-[#17332d]">
                        {listing.cover_image ? (
                          <img src={listing.cover_image} alt={listing.title ?? 'Listing'} className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-[#17332d]">{listing.title ?? 'Listing fără titlu'}</p>
                            <p className="text-sm text-[#6a7a71]">{listing.type}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-[#17332d]">{listing.bookings} rezervări</p>
                            <p className="text-sm text-[#6a7a71]">{formatMoney(listing.paid_revenue, guesthouse?.currency ?? 'MDL')}</p>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-3 text-sm text-[#5e7066]">
                          <span>{listing.reviews_count} review-uri</span>
                          <span>{listing.average_rating ? `${listing.average_rating.toFixed(1)}/5` : 'Fără rating'}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold text-[#17332d]">Review-uri recente</h2>
              <div className="mt-5 space-y-4">
                {stats.recent_reviews.length === 0 ? (
                  <div className="rounded-[1.5rem] border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-[#6a7a71]">
                    Nu există review-uri în perioada selectată.
                  </div>
                ) : (
                  stats.recent_reviews.map((review) => (
                    <div key={review.id} className="rounded-[1.5rem] border border-gray-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-[#17332d]">{review.guest?.name ?? 'Oaspete Hodina'}</p>
                          <p className="text-xs text-[#6d7c74]">{review.published_at ?? review.created_at}</p>
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
        </>
      )}
    </div>
  );
}
