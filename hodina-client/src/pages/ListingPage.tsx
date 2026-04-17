import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Grid3x3, Home, Map as MapIcon, Search, SlidersHorizontal, Star, X } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { apiRequest, formatApiError } from '../lib/api';
import { useSeo } from '../lib/seo';
import { COUNTRIES, findCities } from '../lib/locations';
import {
  formatCurrency,
  formatDuration,
  getListingLocation,
  getListingPrice,
} from '../lib/utils';
import type {
  AccommodationListing,
  AttributeDef,
  BootstrapData,
  ExperienceListing,
  PublicListing,
} from '../types';

interface ListingPageProps {
  onNavigate: (page: string, data?: Record<string, unknown>) => void;
}

type AttributeFilterValue = string | number | boolean | string[] | { min?: number; max?: number };

const parseAttributeParam = (raw: string, attr: AttributeDef): AttributeFilterValue | null => {
  switch (attr.input_type) {
    case 'boolean':
      return raw === '1' || raw === 'true';
    case 'number':
      return Number(raw);
    case 'range': {
      const parts = raw.split(',');
      const min = parts[0] ? Number(parts[0]) : undefined;
      const max = parts[1] ? Number(parts[1]) : undefined;
      return { min, max };
    }
    case 'multiselect':
      return raw.split(',').filter(Boolean);
    default:
      return raw;
  }
};

const serializeAttributeValue = (
  attr: AttributeDef,
  value: AttributeFilterValue,
): string | null => {
  if (value === null || value === undefined) return null;

  switch (attr.input_type) {
    case 'boolean':
      return value ? '1' : null;
    case 'range': {
      const { min, max } = value as { min?: number; max?: number };
      if (min === undefined && max === undefined) return null;
      return `${min ?? ''},${max ?? ''}`;
    }
    case 'multiselect': {
      const arr = value as string[];
      return arr.length > 0 ? arr.join(',') : null;
    }
    case 'number':
      return String(value);
    default:
      return String(value).trim() ? String(value).trim() : null;
  }
};

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
  const [priceRange, setPriceRange] = useState<[number, number]>([
    Number(searchParams.get('min_price') ?? 0),
    Number(searchParams.get('max_price') ?? 5000),
  ]);
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
  const [dateFrom, setDateFrom] = useState(searchParams.get('date_from') ?? '');
  const [dateTo, setDateTo] = useState(searchParams.get('date_to') ?? '');
  const [guests, setGuests] = useState(searchParams.get('guests') ?? '');
  const [selectedCountry, setSelectedCountry] = useState(searchParams.get('country') ?? '');
  const [selectedCity, setSelectedCity] = useState(searchParams.get('city') ?? '');
  const [attributeFilters, setAttributeFilters] = useState<Record<number, AttributeFilterValue>>({});

  const filterAttributes = bootstrap?.filter_attributes ?? [];

  useEffect(() => {
    if (filterAttributes.length === 0) {
      return;
    }

    const next: Record<number, AttributeFilterValue> = {};
    filterAttributes.forEach((attr) => {
      const raw = searchParams.get(`attr_${attr.id}`);
      if (raw !== null) {
        const parsed = parseAttributeParam(raw, attr);
        if (parsed !== null) {
          next[attr.id] = parsed;
        }
      }
    });
    setAttributeFilters(next);
  }, [filterAttributes, searchParams]);

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

    if (searchQuery.trim()) nextParams.set('q', searchQuery.trim());
    if (listingType !== 'all') nextParams.set('kind', listingType);
    if (selectedExperienceCategoryId) nextParams.set('category', String(selectedExperienceCategoryId));
    if (selectedAccommodationTypeId) nextParams.set('type', String(selectedAccommodationTypeId));
    if (sortBy !== 'recommended') nextParams.set('sort', sortBy);
    if (showMap) nextParams.set('view', 'map');
    if (dateFrom) nextParams.set('date_from', dateFrom);
    if (dateTo) nextParams.set('date_to', dateTo);
    if (guests) nextParams.set('guests', guests);
    if (selectedCountry) nextParams.set('country', selectedCountry);
    if (selectedCity) nextParams.set('city', selectedCity);
    if (priceRange[0] > 0) nextParams.set('min_price', String(priceRange[0]));
    if (priceRange[1] < 5000) nextParams.set('max_price', String(priceRange[1]));

    filterAttributes.forEach((attr) => {
      const value = attributeFilters[attr.id];
      if (value === undefined) return;
      const serialized = serializeAttributeValue(attr, value);
      if (serialized) nextParams.set(`attr_${attr.id}`, serialized);
    });

    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [
    attributeFilters,
    dateFrom,
    dateTo,
    filterAttributes,
    guests,
    listingType,
    priceRange,
    searchParams,
    searchQuery,
    selectedAccommodationTypeId,
    selectedCity,
    selectedCountry,
    selectedExperienceCategoryId,
    setSearchParams,
    showMap,
    sortBy,
  ]);

  const buildQueryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('locale', language);
    params.set('per_page', '50');
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    if (guests) params.set('guests', guests);
    if (selectedCountry) params.set('country', selectedCountry);
    if (selectedCity) params.set('city', selectedCity);
    if (priceRange[0] > 0) params.set('min_price', String(priceRange[0]));
    if (priceRange[1] < 5000) params.set('max_price', String(priceRange[1]));

    filterAttributes.forEach((attr) => {
      const value = attributeFilters[attr.id];
      if (value === undefined) return;
      const serialized = serializeAttributeValue(attr, value);
      if (!serialized) return;

      if (attr.input_type === 'multiselect') {
        (value as string[]).forEach((v) => params.append(`attributes[${attr.id}][]`, v));
      } else if (attr.input_type === 'range') {
        const { min, max } = value as { min?: number; max?: number };
        if (min !== undefined) params.set(`attributes[${attr.id}][min]`, String(min));
        if (max !== undefined) params.set(`attributes[${attr.id}][max]`, String(max));
      } else {
        params.set(`attributes[${attr.id}]`, serialized);
      }
    });

    return params.toString();
  }, [
    attributeFilters,
    dateFrom,
    dateTo,
    filterAttributes,
    guests,
    language,
    priceRange,
    selectedCity,
    selectedCountry,
  ]);

  useEffect(() => {
    let ignore = false;

    async function loadListings() {
      setIsLoading(true);
      setError(null);

      try {
        const qs = buildQueryString;
        const [bootstrapResponse, experienceResponse, accommodationResponse] = await Promise.all([
          apiRequest<{ data: BootstrapData }>(`/public/bootstrap?locale=${encodeURIComponent(language)}`),
          apiRequest<{ data: ExperienceListing[] }>(`/public/experiences?${qs}`),
          apiRequest<{ data: AccommodationListing[] }>(`/public/accommodations?${qs}`),
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
  }, [buildQueryString, language]);

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
      : 'Explorează experiențe autentice, hosts și cazări locale din Moldova pe Hodina.';

  useSeo({
    title:
      listingType === 'experience'
        ? 'Experiențe în Moldova'
        : listingType === 'accommodation'
          ? 'Cazări și hosts în Moldova'
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

  const cityOptions = selectedCountry ? findCities(selectedCountry) : [];

  const setAttributeValue = (attr: AttributeDef, value: AttributeFilterValue | undefined) => {
    setAttributeFilters((current) => {
      const next = { ...current };
      if (value === undefined || value === null || value === '') {
        delete next[attr.id];
      } else {
        next[attr.id] = value;
      }
      return next;
    });
  };

  const renderAttributeFilter = (attr: AttributeDef) => {
    const value = attributeFilters[attr.id];

    if (attr.input_type === 'boolean') {
      return (
        <label key={attr.id} className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={value === true}
            onChange={(e) => setAttributeValue(attr, e.target.checked ? true : undefined)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <span>{attr.label}</span>
        </label>
      );
    }

    if (attr.input_type === 'select' || attr.input_type === 'radio') {
      return (
        <div key={attr.id}>
          <label className="mb-2 block text-sm font-medium text-gray-700">{attr.label}</label>
          <select
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => setAttributeValue(attr, e.target.value || undefined)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-[#002626] focus:outline-none"
          >
            <option value="">—</option>
            {attr.options.map((opt) => (
              <option key={opt.id} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      );
    }

    if (attr.input_type === 'multiselect') {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div key={attr.id}>
          <label className="mb-2 block text-sm font-medium text-gray-700">{attr.label}</label>
          <div className="flex flex-wrap gap-2">
            {attr.options.map((opt) => {
              const isSelected = arr.includes(opt.value);
              return (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => {
                    const nextArr = isSelected
                      ? arr.filter((v) => v !== opt.value)
                      : [...arr, opt.value];
                    setAttributeValue(attr, nextArr.length > 0 ? nextArr : undefined);
                  }}
                  className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                    isSelected
                      ? 'border-[#002626] bg-[#002626] text-white'
                      : 'border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (attr.input_type === 'number') {
      return (
        <div key={attr.id}>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            {attr.label}
            {attr.unit ? <span className="ml-1 text-gray-400">({attr.unit})</span> : null}
          </label>
          <input
            type="number"
            value={typeof value === 'number' ? value : ''}
            min={attr.config?.min}
            max={attr.config?.max}
            step={attr.config?.step ?? 1}
            onChange={(e) =>
              setAttributeValue(attr, e.target.value === '' ? undefined : Number(e.target.value))
            }
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-[#002626] focus:outline-none"
          />
        </div>
      );
    }

    if (attr.input_type === 'range') {
      const obj = (value ?? {}) as { min?: number; max?: number };
      return (
        <div key={attr.id}>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            {attr.label}
            {attr.unit ? <span className="ml-1 text-gray-400">({attr.unit})</span> : null}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Min"
              value={obj.min ?? ''}
              min={attr.config?.min}
              max={attr.config?.max}
              onChange={(e) => {
                const min = e.target.value === '' ? undefined : Number(e.target.value);
                const next = { ...obj, min };
                setAttributeValue(
                  attr,
                  next.min === undefined && next.max === undefined ? undefined : next,
                );
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#002626] focus:outline-none"
            />
            <span className="text-gray-400">—</span>
            <input
              type="number"
              placeholder="Max"
              value={obj.max ?? ''}
              min={attr.config?.min}
              max={attr.config?.max}
              onChange={(e) => {
                const max = e.target.value === '' ? undefined : Number(e.target.value);
                const next = { ...obj, max };
                setAttributeValue(
                  attr,
                  next.min === undefined && next.max === undefined ? undefined : next,
                );
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#002626] focus:outline-none"
            />
          </div>
        </div>
      );
    }

    if (attr.input_type === 'date') {
      return (
        <div key={attr.id}>
          <label className="mb-2 block text-sm font-medium text-gray-700">{attr.label}</label>
          <input
            type="date"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => setAttributeValue(attr, e.target.value || undefined)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-[#002626] focus:outline-none"
          />
        </div>
      );
    }

    return (
      <div key={attr.id}>
        <label className="mb-2 block text-sm font-medium text-gray-700">{attr.label}</label>
        <input
          type="text"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => setAttributeValue(attr, e.target.value || undefined)}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-[#002626] focus:outline-none"
        />
      </div>
    );
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedExperienceCategoryId(null);
    setSelectedAccommodationTypeId(null);
    setPriceRange([0, 5000]);
    setListingType('all');
    setDateFrom('');
    setDateTo('');
    setGuests('');
    setSelectedCountry('');
    setSelectedCity('');
    setAttributeFilters({});
  };

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
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="text-sm font-medium text-gray-600 underline hover:text-gray-900"
                    >
                      {language === 'ro' ? 'Resetează' : language === 'ru' ? 'Сбросить' : 'Reset'}
                    </button>
                    <button onClick={() => setShowFilters(false)}>
                      <X className="h-5 w-5 text-gray-500" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      {language === 'ro' ? 'Data sosirii' : language === 'ru' ? 'Дата заезда' : 'Check-in'}
                    </label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(event) => setDateFrom(event.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-[#002626] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      {language === 'ro' ? 'Data plecării' : language === 'ru' ? 'Дата выезда' : 'Check-out'}
                    </label>
                    <input
                      type="date"
                      value={dateTo}
                      min={dateFrom || undefined}
                      onChange={(event) => setDateTo(event.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-[#002626] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      {language === 'ro' ? 'Oaspeți' : language === 'ru' ? 'Гости' : 'Guests'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={guests}
                      onChange={(event) => setGuests(event.target.value)}
                      placeholder="1"
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-[#002626] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      {language === 'ro' ? 'Țara' : language === 'ru' ? 'Страна' : 'Country'}
                    </label>
                    <select
                      value={selectedCountry}
                      onChange={(event) => {
                        setSelectedCountry(event.target.value);
                        setSelectedCity('');
                      }}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-[#002626] focus:outline-none"
                    >
                      <option value="">—</option>
                      {COUNTRIES.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      {language === 'ro' ? 'Oraș' : language === 'ru' ? 'Город' : 'City'}
                    </label>
                    <select
                      value={selectedCity}
                      onChange={(event) => setSelectedCity(event.target.value)}
                      disabled={!selectedCountry}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-[#002626] focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      <option value="">—</option>
                      {cityOptions.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </div>

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

                  <div className="md:col-span-2 lg:col-span-3">
                    <label className="mb-2 block text-sm font-medium text-gray-700">{t.listing.priceRange}</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="0"
                        max="5000"
                        value={priceRange[0]}
                        onChange={(event) =>
                          setPriceRange([Number(event.target.value) || 0, priceRange[1]])
                        }
                        className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#002626] focus:outline-none"
                      />
                      <span className="text-gray-400">—</span>
                      <input
                        type="number"
                        min="0"
                        max="5000"
                        value={priceRange[1]}
                        onChange={(event) =>
                          setPriceRange([priceRange[0], Number(event.target.value) || 5000])
                        }
                        className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#002626] focus:outline-none"
                      />
                      <div className="flex-1 text-right text-sm text-gray-500">
                        {formatCurrency(priceRange[0])} – {formatCurrency(priceRange[1])}
                      </div>
                    </div>
                  </div>

                  {filterAttributes
                    .filter((attr) => {
                      if (listingType === 'experience') return attr.entity_type !== 'accommodation';
                      if (listingType === 'accommodation') return attr.entity_type !== 'experience';
                      return true;
                    })
                    .map(renderAttributeFilter)}
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
                onClick={resetFilters}
                className="mt-4 rounded-full bg-[#002626] px-6 py-3 font-semibold text-white"
              >
                {language === 'ro' ? 'Resetează filtrele' : language === 'ru' ? 'Сбросить фильтры' : 'Reset filters'}
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
