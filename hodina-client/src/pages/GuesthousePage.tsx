import { useEffect, useMemo, useState } from 'react';
import { Mail, MapPin, Phone, Sparkles, Home } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { apiRequest, formatApiError } from '../lib/api';
import { useSeo } from '../lib/seo';
import { formatCurrency, formatDuration } from '../lib/utils';
import type { GuesthousePublicPageData, PublicListing } from '../types';

interface GuesthousePageProps {
  guesthouseIdentifier: string;
  onNavigate: (page: string, data?: Record<string, unknown>) => void;
}

export const GuesthousePage = ({ guesthouseIdentifier, onNavigate }: GuesthousePageProps) => {
  const { language } = useLanguage();
  const [payload, setPayload] = useState<GuesthousePublicPageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadGuesthouse() {
      setIsLoading(true);
      setError(null);

      try {
        const locale = encodeURIComponent(language);
        const response = await apiRequest<{ data: GuesthousePublicPageData }>(
          `/public/guesthouses/${encodeURIComponent(guesthouseIdentifier)}?locale=${locale}`,
        );

        if (!ignore) {
          setPayload(response.data);
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

    void loadGuesthouse();

    return () => {
      ignore = true;
    };
  }, [guesthouseIdentifier, language]);

  const gallery = useMemo(() => {
    if (!payload) {
      return [];
    }

    const images = payload.guesthouse.gallery?.length
      ? payload.guesthouse.gallery
      : payload.guesthouse.cover_image
        ? [payload.guesthouse.cover_image]
        : [];

    return images.filter(Boolean);
  }, [payload]);

  useSeo({
    title: payload ? `${payload.guesthouse.name} in ${payload.guesthouse.city ?? 'Moldova'}` : 'Pensiune în Moldova',
    description:
      payload?.guesthouse.description ||
      'Descoperă experiențele și cazăriile unei pensiuni locale din Moldova pe Hodina.',
    image: payload?.guesthouse.cover_image,
    canonicalPath: `/guesthouses/${payload?.guesthouse.slug ?? guesthouseIdentifier}`,
    jsonLd: payload
      ? {
          '@context': 'https://schema.org',
          '@type': 'LodgingBusiness',
          name: payload.guesthouse.name,
          description: payload.guesthouse.description,
          image: gallery,
          telephone: payload.guesthouse.public_phone,
          email: payload.guesthouse.public_email,
          address: {
            '@type': 'PostalAddress',
            addressCountry: payload.guesthouse.country,
            addressLocality: payload.guesthouse.city,
            streetAddress: payload.guesthouse.address,
          },
          url: typeof window !== 'undefined' ? window.location.href : undefined,
        }
      : null,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white pb-20 md:pb-0">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="h-72 animate-pulse rounded-3xl bg-gray-100" />
        </div>
      </div>
    );
  }

  if (error || !payload) {
    return (
      <div className="min-h-screen bg-white pb-20 md:pb-0">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-[#efc4be] bg-[#fff4f1] px-6 py-6 text-[#944236]">
            {error ?? 'Nu am găsit această pensiune.'}
          </div>
        </div>
      </div>
    );
  }

  const { guesthouse, counts, experiences, accommodations } = payload;
  const highlightedListings: PublicListing[] = [
    ...experiences.map((item) => ({ kind: 'experience' as const, data: item })),
    ...accommodations.map((item) => ({ kind: 'accommodation' as const, data: item })),
  ];

  return (
    <div className="min-h-screen bg-white pb-20 md:pb-0">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm">
          <div className="relative h-72 md:h-96">
            <img
              src={guesthouse.cover_image ?? gallery[0] ?? 'https://placehold.co/1400x700?text=Hodina'}
              alt={guesthouse.name}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/70">Pensiune parteneră</p>
              <h1 className="mt-2 text-3xl font-bold text-white md:text-5xl">{guesthouse.name}</h1>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-white/90">
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {[guesthouse.city, guesthouse.country].filter(Boolean).join(', ') || 'Moldova'}
                </span>
                {guesthouse.public_phone ? (
                  <span className="inline-flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {guesthouse.public_phone}
                  </span>
                ) : null}
                {guesthouse.public_email ? (
                  <span className="inline-flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {guesthouse.public_email}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_360px]">
          <div className="space-y-6">
            <section className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold text-gray-900">Despre pensiune</h2>
              <p className="mt-4 leading-7 text-gray-600">
                {guesthouse.description || 'Această pensiune își pregătește acum descrierea publică.'}
              </p>
            </section>

            {gallery.length > 1 ? (
              <section className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-semibold text-gray-900">Galerie</h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {gallery.slice(0, 6).map((image) => (
                    <img
                      key={image}
                      src={image}
                      alt={guesthouse.name}
                      className="h-52 w-full rounded-2xl object-cover"
                    />
                  ))}
                </div>
              </section>
            ) : null}

            <section className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-2xl font-semibold text-gray-900">Ce poți rezerva aici</h2>
                <button
                  onClick={() => onNavigate('listing', { query: guesthouse.name })}
                  className="rounded-full border border-gray-300 px-5 py-2 text-sm font-semibold text-[#002626] transition-colors hover:border-[#002626]"
                >
                  Vezi tot
                </button>
              </div>

              {highlightedListings.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-dashed border-gray-300 px-6 py-10 text-center text-gray-500">
                  Această pensiune va publica în curând experiențe și cazări.
                </div>
              ) : (
                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  {highlightedListings.map((listing) => (
                    <div
                      key={`${listing.kind}-${listing.data.id}`}
                      onClick={() =>
                        onNavigate('experience', {
                          id: listing.data.id,
                          slug: listing.data.slug,
                          kind: listing.kind,
                        })
                      }
                      className="group cursor-pointer overflow-hidden rounded-2xl border border-gray-200 bg-white transition-shadow hover:shadow-md"
                    >
                      <img
                        src={listing.data.cover_image ?? 'https://placehold.co/800x500?text=Hodina'}
                        alt={listing.data.title}
                        className="h-52 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                      <div className="p-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-gray-600">
                            {listing.kind === 'experience' ? 'Experiență' : 'Cazare'}
                          </span>
                          <span className="font-semibold text-[#002626]">
                            {formatCurrency(
                              listing.kind === 'experience'
                                ? listing.data.price_amount
                                : listing.data.nightly_rate,
                              listing.data.currency,
                            )}
                          </span>
                        </div>
                        <h3 className="mt-3 text-lg font-semibold text-gray-900">{listing.data.title}</h3>
                        <p className="mt-2 line-clamp-2 text-sm text-gray-600">{listing.data.short_description}</p>
                        <div className="mt-3 flex flex-wrap gap-3 text-sm text-gray-500">
                          {listing.kind === 'experience' ? (
                            <>
                              <span>{formatDuration(listing.data.duration_minutes)}</span>
                              <span>{listing.data.max_guests ?? 0} persoane</span>
                            </>
                          ) : (
                            <>
                              <span>{listing.data.max_guests ?? 0} oaspeți</span>
                              <span>{listing.data.bedrooms ?? 0} dormitoare</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-6">
            <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-gray-500">Rezumat</p>
              <div className="mt-5 grid gap-4">
                <div className="rounded-2xl bg-gray-50 px-4 py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Experiențe publicate</span>
                    <Sparkles className="h-4 w-4 text-[#002626]" />
                  </div>
                  <p className="mt-3 text-3xl font-semibold text-gray-900">{counts.experiences}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 px-4 py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Cazări publicate</span>
                    <Home className="h-4 w-4 text-[#002626]" />
                  </div>
                  <p className="mt-3 text-3xl font-semibold text-gray-900">{counts.accommodations}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-gray-500">Adresă</p>
              <p className="mt-4 text-gray-700">
                {[guesthouse.address, guesthouse.city, guesthouse.country].filter(Boolean).join(', ') || 'Moldova'}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
