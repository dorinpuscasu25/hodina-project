import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Grid3x3, Home, Map as MapIcon, Search, SlidersHorizontal, Star, X } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { apiRequest, formatApiError } from '../lib/api';
import { useSeo } from '../lib/seo';
import {
  formatCurrency,
  formatDuration,
  getListingLocation,
  getListingPrice,
} from '../lib/utils';
import type { AccommodationListing, BootstrapData, ExperienceListing, PublicListing } from '../types';

interface ListingPageProps {
  onNavigate: (page: string, data?: Record<string, unknown>) => void;
}

export const ListingPage = ({ onNavigate }: ListingPageProps) => {
  const { t, language } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showMap, setShowMap] = useState(searchParams.get('view') === 'map');
  const [showFilters, setShowFilters] = useState(false);
  const [listingType, setListingType] = useState<'all' | 'experience' | 'accommodation'>(
    searchParams.get('kind') === 'experience' || searchParams.get('kind') === 'accommodation'
      ? (searchParams.get('kind') as 'experience' | 'accommodation')
      : 'all',
  );
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') ?? '');
  const [selectedExperienceCategoryId, setSelectedExperienceCategoryId] = useState<number | null>(
    searchParams.get('category') ? Number(searchParams.get('category')) : null,
  );
  const [selectedAccommodationTypeId, setSelectedAccommodationTypeId] = useState<number | null>(
    searchParams.get('type') ? Number(searchParams.get('type')) : null,
  );
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000]);
  const [sortBy, setSortBy] = useState<'recommended' | 'price-low' | 'price-high'>(
    searchParams.get('sort') === 'price-low' || searchParams.get('sort') === 'price-high'
      ? (searchParams.get('sort') as 'price-low' | 'price-high')
      : 'recommended',
  );
  const [bootstrap, setBootstrap] = useState<BootstrapData | null>(null);
  const [experiences, setExperiences] = useState<ExperienceListing[]>([]);
  const [accommodations, setAccommodations] = useState<AccommodationListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const query = searchParams.get('q') ?? '';
    const kind = searchParams.get('kind');
    const categoryId = searchParams.get('category');
    const typeId = searchParams.get('type');
    const sort = searchParams.get('sort');

    setSearchQuery(query);
    setShowMap(searchParams.get('view') === 'map');
    setListingType(kind === 'experience' || kind === 'accommodation' ? kind : 'all');
    setSelectedExperienceCategoryId(categoryId ? Number(categoryId) : null);
    setSelectedAccommodationTypeId(typeId ? Number(typeId) : null);
    setSortBy(sort === 'price-low' || sort === 'price-high' ? sort : 'recommended');
  }, [searchParams]);

  useEffect(() => {
    const nextParams = new URLSearchParams();

    if (searchQuery.trim()) {
      nextParams.set('q', searchQuery.trim());
    }

    if (listingType !== 'all') {
      nextParams.set('kind', listingType);
    }

    if (selectedExperienceCategoryId) {
      nextParams.set('category', String(selectedExperienceCategoryId));
    }

    if (selectedAccommodationTypeId) {
      nextParams.set('type', String(selectedAccommodationTypeId));
    }

    if (sortBy !== 'recommended') {
      nextParams.set('sort', sortBy);
    }

    if (showMap) {
      nextParams.set('view', 'map');
    }

    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [
    listingType,
    searchParams,
    searchQuery,
    selectedAccommodationTypeId,
    selectedExperienceCategoryId,
    setSearchParams,
    showMap,
    sortBy,
  ]);

  useEffect(() => {
    let ignore = false;

    async function loadListings() {
      setIsLoading(true);
      setError(null);

      try {
        const locale = encodeURIComponent(language);
        const [bootstrapResponse, experienceResponse, accommodationResponse] = await Promise.all([
          apiRequest<{ data: BootstrapData }>(`/public/bootstrap?locale=${locale}`),
          apiRequest<{ data: ExperienceListing[] }>(`/public/experiences?locale=${locale}&per_page=50`),
          apiRequest<{ data: AccommodationListing[] }>(`/public/accommodations?locale=${locale}&per_page=50`),
        ]);

        if (ignore) {
          return;
        }

        setBootstrap(bootstrapResponse.data);
        setExperiences(experienceResponse.data);
        setAccommodations(accommodationResponse.data);
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

    void loadListings();

    return () => {
      ignore = true;
    };
  }, [language]);

  const listings = useMemo(() => {
    const items: PublicListing[] = [];

    if (listingType === 'all' || listingType === 'experience') {
      items.push(
        ...experiences.map((experience) => ({
          kind: 'experience' as const,
          data: experience,
        })),
      );
    }

    if (listingType === 'all' || listingType === 'accommodation') {
      items.push(
        ...accommodations.map((accommodation) => ({
          kind: 'accommodation' as const,
          data: accommodation,
        })),
      );
    }

    const needle = searchQuery.trim().toLowerCase();

    return items
      .filter((item) => {
        if (needle) {
          const haystack = [
            item.data.title,
            item.data.short_description ?? '',
            item.data.city ?? '',
            item.data.country ?? '',
            item.data.guesthouse?.name ?? '',
          ]
            .join(' ')
            .toLowerCase();

          if (!haystack.includes(needle)) {
            return false;
          }
        }

        if (
          item.kind === 'experience' &&
          selectedExperienceCategoryId &&
          item.data.category?.id !== selectedExperienceCategoryId
        ) {
          return false;
        }

        if (
          item.kind === 'accommodation' &&
          selectedAccommodationTypeId &&
          item.data.type?.id !== selectedAccommodationTypeId
        ) {
          return false;
        }

        const price = getListingPrice(item.data);

        if (price < priceRange[0] || price > priceRange[1]) {
          return false;
        }

        return true;
      })
      .sort((left, right) => {
        if (sortBy === 'price-low') {
          return getListingPrice(left.data) - getListingPrice(right.data);
        }

        if (sortBy === 'price-high') {
          return getListingPrice(right.data) - getListingPrice(left.data);
        }

        return 0;
      });
  }, [
    accommodations,
    experiences,
    listingType,
    priceRange,
    searchQuery,
    selectedAccommodationTypeId,
    selectedExperienceCategoryId,
    sortBy,
  ]);

  const filterPills =
    listingType === 'accommodation'
      ? bootstrap?.accommodation_types ?? []
      : bootstrap?.experience_categories ?? [];

  const seoDescription =
    searchQuery.trim()
      ? `Rezultate pentru ${searchQuery.trim()} pe Hodina: experiențe și cazări locale din Moldova.`
      : 'Explorează experiențe autentice, pensiuni și cazări locale din Moldova pe Hodina.';

  useSeo({
    title:
      listingType === 'experience'
        ? 'Experiențe în Moldova'
        : listingType === 'accommodation'
          ? 'Cazări și pensiuni în Moldova'
          : 'Explorează Moldova',
    description: seoDescription,
    canonicalPath: `/explore${searchParams.toString() ? `?${searchParams.toString()}` : ''}`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Hodina Explore',
      description: seoDescription,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    },
  });

  const noResultsText =
    language === 'ro'
      ? 'Nu am găsit rezultate pentru filtrele curente.'
      : language === 'ru'
        ? 'По текущим фильтрам ничего не найдено.'
        : 'No results match your current filters.';

  return (
    <div className="min-h-screen bg-white pb-20 md:pb-0">
      <div className="sticky top-16 z-40 border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowFilters((current) => !current)}
                  className="flex items-center gap-2 rounded-full border border-gray-300 px-4 py-2 transition-colors hover:border-gray-400"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  <span className="font-medium">{t.listing.filters}</span>
                </button>

                {[
                  { key: 'all' as const, label: 'All' },
                  { key: 'experience' as const, label: language === 'ro' ? 'Experiențe' : language === 'ru' ? 'Впечатления' : 'Experiences' },
                  { key: 'accommodation' as const, label: language === 'ro' ? 'Cazări' : language === 'ru' ? 'Проживание' : 'Homes' },
                ].map((option) => (
                  <button
                    key={option.key}
                    onClick={() => setListingType(option.key)}
                    className={`rounded-full px-4 py-2 font-medium transition-colors ${
                      listingType === option.key
                        ? 'bg-[#002626] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as 'recommended' | 'price-low' | 'price-high')}
                  className="rounded-full border border-gray-300 px-4 py-2 font-medium focus:border-[#002626] focus:outline-none"
                >
                  <option value="recommended">{t.listing.sortBy}: Recommended</option>
                  <option value="price-low">{t.listing.sortBy}: Price (Low)</option>
                  <option value="price-high">{t.listing.sortBy}: Price (High)</option>
                </select>

                <button
                  onClick={() => setShowMap((current) => !current)}
                  className={`hidden items-center gap-2 rounded-full px-4 py-2 font-medium transition-colors md:flex ${
                    showMap ? 'bg-[#002626] text-white' : 'border border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {showMap ? <Grid3x3 className="h-4 w-4" /> : <MapIcon className="h-4 w-4" />}
                  <span>{showMap ? t.listing.hideMap : t.listing.showMap}</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative max-w-xl flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={t.search.placeholder}
                  className="w-full rounded-full border border-gray-300 py-3 pl-11 pr-4 focus:border-[#002626] focus:outline-none"
                />
              </div>

              <div className="hidden items-center gap-2 overflow-x-auto pb-1 md:flex">
                <button
                  onClick={() => {
                    setSelectedExperienceCategoryId(null);
                    setSelectedAccommodationTypeId(null);
                  }}
                  className={`whitespace-nowrap rounded-full px-4 py-2 font-medium transition-colors ${
                    !selectedExperienceCategoryId && !selectedAccommodationTypeId
                      ? 'bg-[#002626] text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  All
                </button>
                {filterPills.map((category) => {
                  const isSelected =
                    listingType === 'accommodation'
                      ? selectedAccommodationTypeId === category.id
                      : selectedExperienceCategoryId === category.id;

                  return (
                    <button
                      key={category.id}
                      onClick={() => {
                        if (listingType === 'accommodation') {
                          setSelectedAccommodationTypeId(category.id);
                        } else {
                          setSelectedExperienceCategoryId(category.id);
                        }
                      }}
                      className={`whitespace-nowrap rounded-full px-4 py-2 font-medium transition-colors ${
                        isSelected ? 'bg-[#002626] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {category.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {showFilters ? (
              <div className="rounded-2xl bg-gray-50 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{t.listing.filters}</h3>
                  <button onClick={() => setShowFilters(false)}>
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">{t.listing.category}</label>
                    <select
                      value={
                        listingType === 'accommodation'
                          ? selectedAccommodationTypeId?.toString() ?? ''
                          : selectedExperienceCategoryId?.toString() ?? ''
                      }
                      onChange={(event) => {
                        const value = event.target.value ? Number(event.target.value) : null;

                        if (listingType === 'accommodation') {
                          setSelectedAccommodationTypeId(value);
                        } else {
                          setSelectedExperienceCategoryId(value);
                        }
                      }}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-[#002626] focus:outline-none"
                    >
                      <option value="">All</option>
                      {filterPills.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">{t.listing.priceRange}</label>
                    <div className="space-y-2">
                      <input
                        type="range"
                        min="0"
                        max="5000"
                        step="50"
                        value={priceRange[1]}
                        onChange={(event) => setPriceRange([priceRange[0], Number(event.target.value)])}
                        className="w-full"
                      />
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>{formatCurrency(priceRange[0])}</span>
                        <span>{formatCurrency(priceRange[1])}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Tip</label>
                    <select
                      value={listingType}
                      onChange={(event) =>
                        setListingType(event.target.value as 'all' | 'experience' | 'accommodation')
                      }
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-[#002626] focus:outline-none"
                    >
                      <option value="all">All</option>
                      <option value="experience">Experiences</option>
                      <option value="accommodation">Homes</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {error ? (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-[#efc4be] bg-[#fff4f1] px-6 py-5 text-[#944236]">
            {error}
          </div>
        </div>
      ) : null}

      <div className={`mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 ${showMap ? 'flex gap-6' : ''}`}>
        {showMap ? (
          <div className="sticky top-48 hidden h-[calc(100vh-12rem)] w-1/2 md:block">
            <div className="relative h-full w-full overflow-hidden rounded-2xl bg-gray-100">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <MapIcon className="mx-auto mb-4 h-16 w-16 text-gray-400" />
                  <p className="text-gray-600">Map view</p>
                  <p className="mt-2 text-sm text-gray-500">{listings.length} rezultate</p>
                </div>
              </div>
              {listings.slice(0, 9).map((listing, index) => (
                <button
                  key={`${listing.kind}-${listing.data.id}`}
                  onClick={() =>
                    onNavigate('experience', {
                      id: listing.data.id,
                      slug: listing.data.slug,
                      kind: listing.kind,
                    })
                  }
                  className="absolute rounded-full bg-[#002626] px-3 py-1 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-110"
                  style={{
                    left: `${18 + (index % 3) * 28}%`,
                    top: `${18 + Math.floor(index / 3) * 22}%`,
                  }}
                >
                  {formatCurrency(getListingPrice(listing.data), listing.data.currency)}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className={showMap ? 'w-full md:w-1/2' : 'w-full'}>
          <div className="mb-4 text-gray-600">{listings.length} {t.listing.experiences}</div>

          {isLoading ? (
            <div className={`grid gap-6 ${showMap ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                  <div className="h-56 animate-pulse bg-gray-100" />
                  <div className="space-y-3 p-4">
                    <div className="h-4 animate-pulse rounded bg-gray-100" />
                    <div className="h-6 animate-pulse rounded bg-gray-100" />
                    <div className="h-4 animate-pulse rounded bg-gray-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="rounded-3xl border border-gray-200 bg-white px-6 py-12 text-center">
              <p className="text-lg font-semibold text-gray-900">{noResultsText}</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedExperienceCategoryId(null);
                  setSelectedAccommodationTypeId(null);
                  setPriceRange([0, 5000]);
                  setListingType('all');
                }}
                className="mt-4 rounded-full bg-[#002626] px-6 py-3 font-semibold text-white"
              >
                Resetează filtrele
              </button>
            </div>
          ) : (
            <div className={`grid gap-6 ${showMap ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
              {listings.map((listing) => (
                <div
                  key={`${listing.kind}-${listing.data.id}`}
                  onClick={() =>
                    onNavigate('experience', {
                      id: listing.data.id,
                      slug: listing.data.slug,
                      kind: listing.kind,
                    })
                  }
                  className="group cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-xl"
                >
                  <div className="relative h-56 overflow-hidden">
                    <img
                      src={listing.data.cover_image ?? 'https://placehold.co/800x500?text=Hodina'}
                      alt={listing.data.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                    <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-sm font-semibold text-[#17332d]">
                      {listing.kind === 'experience'
                        ? listing.data.category?.name ?? 'Experiență'
                        : listing.data.type?.name ?? 'Cazare'}
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="mb-1 text-sm text-gray-500">
                      {listing.kind === 'experience'
                        ? listing.data.guesthouse?.name ?? 'Hodina'
                        : listing.data.guesthouse?.name ?? 'Hodina'}
                    </p>
                    <h3 className="line-clamp-2 text-lg font-semibold text-gray-900">{listing.data.title}</h3>
                    <p className="mb-3 mt-2 line-clamp-2 text-sm text-gray-600">{listing.data.short_description}</p>
                    <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                      {listing.kind === 'experience' ? (
                        <>
                          <span>{formatDuration(listing.data.duration_minutes)}</span>
                          <span>{listing.data.max_guests ?? 0} oaspeți</span>
                        </>
                      ) : (
                        <>
                          <span>{listing.data.max_guests ?? 0} oaspeți</span>
                          <span>{listing.data.bedrooms ?? 0} dormitoare</span>
                          <span>{listing.data.beds ?? 0} paturi</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        {listing.kind === 'experience' ? (
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        ) : (
                          <Home className="h-4 w-4" />
                        )}
                        <span>{getListingLocation(listing.data)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-gray-500">{t.experience.from} </span>
                        <span className="text-xl font-bold text-[#002626]">
                          {formatCurrency(getListingPrice(listing.data), listing.data.currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
