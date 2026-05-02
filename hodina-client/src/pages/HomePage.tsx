import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Clock, Home, MapPin, Star } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { apiRequest, formatApiError } from '../lib/api';
import { useSeo } from '../lib/seo';
import { formatCurrency, formatDuration } from '../lib/utils';
import type { AccommodationListing, BootstrapData, ExperienceListing } from '../types';
import { AiPlanner } from '../components/AiPlanner';
import { AiChatWidget } from '../components/AiChatWidget';
import type { AiChatMessage, AiSuggestion } from '../components/AiPlanner';

interface HomePageProps {
  onNavigate: (page: string, data?: Record<string, unknown>) => void;
}

export const HomePage = ({ onNavigate }: HomePageProps) => {
  const { t, language } = useLanguage();
  const [bootstrap, setBootstrap] = useState<BootstrapData | null>(null);
  const [experiences, setExperiences] = useState<ExperienceListing[]>([]);
  const [accommodations, setAccommodations] = useState<AccommodationListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiMessages, setAiMessages] = useState<AiChatMessage[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const handleSuggestionClick = (suggestion: AiSuggestion) => {
    onNavigate('experience', {
      id: suggestion.id,
      slug: suggestion.slug,
      kind: suggestion.kind,
    });
  };

  useEffect(() => {
    let ignore = false;

    async function loadHome() {
      setIsLoading(true);
      setError(null);

      try {
        const locale = encodeURIComponent(language);
        const [bootstrapResponse, experienceResponse, accommodationResponse] = await Promise.all([
          apiRequest<{ data: BootstrapData }>(`/public/bootstrap?locale=${locale}`),
          apiRequest<{ data: ExperienceListing[] }>(`/public/experiences?locale=${locale}&per_page=6`),
          apiRequest<{ data: AccommodationListing[] }>(`/public/accommodations?locale=${locale}&per_page=6`),
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

    void loadHome();

    return () => {
      ignore = true;
    };
  }, [language]);

  const destinations = useMemo(() => {
    return Array.from(
      new Set(
        [...experiences, ...accommodations]
          .map((item) => item.city)
          .filter((item): item is string => Boolean(item)),
      ),
    ).slice(0, 6);
  }, [accommodations, experiences]);

  const featuredCategories = bootstrap?.experience_categories.slice(0, 5) ?? [];

  useSeo({
    title: language === 'ro' ? 'Experiențe și cazări în Moldova' : language === 'ru' ? 'Впечатления и проживание в Молдове' : 'Experiences and stays in Moldova',
    description:
      language === 'ro'
        ? 'Rezervă experiențe autentice, hosts locale și cazări din Moldova direct pe Hodina.'
        : language === 'ru'
          ? 'Бронируй аутентичные впечатления и гостевые дома в Молдове через Hodina.'
          : 'Book authentic experiences and local guesthouses across Moldova with Hodina.',
    canonicalPath: '/',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Hodina',
      url: typeof window !== 'undefined' ? window.location.origin : undefined,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${typeof window !== 'undefined' ? window.location.origin : 'https://hodina.local'}/explore?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
  });

  const limitedOffers = [
    {
      id: 1,
      title: language === 'ro' ? 'Rezervă din timp' : language === 'ru' ? 'Бронируй заранее' : 'Early Booking',
      discount: '20% OFF',
      subtitle:
        language === 'ro'
          ? 'Pentru experiențe selectate'
          : language === 'ru'
            ? 'Для выбранных впечатлений'
            : 'Selected experiences only',
      image: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg',
      badge: language === 'ro' ? 'Limitat' : language === 'ru' ? 'Ограничено' : 'Limited',
    },
    {
      id: 2,
      title: language === 'ro' ? 'Weekend în Moldova' : language === 'ru' ? 'Уикенд в Молдове' : 'Weekend in Moldova',
      discount: '15% OFF',
      subtitle:
        language === 'ro'
          ? 'Sâmbătă și duminică'
          : language === 'ru'
            ? 'Суббота и воскресенье'
            : 'Saturday and Sunday',
      image: 'https://images.pexels.com/photos/3184183/pexels-photo-3184183.jpeg',
      badge: language === 'ro' ? 'Weekend' : language === 'ru' ? 'Выходные' : 'Weekend',
    },
    {
      id: 3,
      title: language === 'ro' ? 'Grupuri mici' : language === 'ru' ? 'Небольшие группы' : 'Small Groups',
      discount: '10% OFF',
      subtitle:
        language === 'ro'
          ? 'Pentru rezervări multiple'
          : language === 'ru'
            ? 'Для нескольких мест'
            : 'For multi-seat bookings',
      image: 'https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg',
      badge: language === 'ro' ? 'Popular' : language === 'ru' ? 'Популярно' : 'Popular',
    },
  ];

  return (
    <div className="min-h-screen bg-white pb-20 md:pb-0">
      <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <AiPlanner
          variant="hero"
          messages={aiMessages}
          setMessages={setAiMessages}
          onSuggestionClick={handleSuggestionClick}
        />
      </section>

      {error ? (
        <div className="mx-auto mt-8 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-[#efc4be] bg-[#fff4f1] px-6 py-5 text-[#944236]">
            <p>{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 rounded-full bg-white px-5 py-2 font-semibold text-[#17332d]"
            >
              {t.common.tryAgain}
            </button>
          </div>
        </div>
      ) : null}

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold text-gray-900 md:text-4xl">{t.home.limitedOffers}</h2>
          <p className="text-lg text-gray-600">{t.home.limitedOffersSubtitle}</p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {limitedOffers.map((offer) => (
            <div
              key={offer.id}
              className="group relative h-64 cursor-pointer overflow-hidden rounded-2xl"
              onClick={() => onNavigate('listing')}
            >
              <img
                src={offer.image}
                alt={offer.title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute left-4 top-4">
                <span className="rounded-full bg-red-500 px-3 py-1 text-sm font-semibold text-white">
                  {offer.badge}
                </span>
              </div>
              <div className="absolute bottom-4 left-4 text-white">
                <h3 className="mb-1 text-2xl font-bold">{offer.discount}</h3>
                <p className="text-lg">{offer.title}</p>
                <p className="text-sm opacity-90">{offer.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold text-gray-900 md:text-4xl">{t.home.tasteJapan}</h2>
            <p className="text-lg text-gray-600">{t.home.tasteJapanSubtitle}</p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
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
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {experiences.map((experience) => (
                <div
                  key={experience.id}
                  onClick={() => onNavigate('experience', { id: experience.id, slug: experience.slug, kind: 'experience' })}
                  className="group cursor-pointer overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow hover:shadow-xl"
                >
                  <div className="h-56 overflow-hidden">
                    <img
                      src={experience.cover_image ?? 'https://placehold.co/800x500?text=Hodina'}
                      alt={experience.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  </div>
                  <div className="p-4">
                    <p className="mb-1 text-sm text-gray-500">{experience.category?.name ?? 'Experiență'}</p>
                    <h3 className="line-clamp-2 text-lg font-semibold text-gray-900">{experience.title}</h3>
                    <p className="mb-3 mt-2 line-clamp-2 text-sm text-gray-600">{experience.short_description}</p>
                    <div className="mb-3 flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{formatDuration(experience.duration_minutes)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>{experience.city ?? 'Moldova'}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span>Nou în platformă</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-gray-500">{t.experience.from} </span>
                        <span className="text-lg font-bold text-[#002626]">
                          {formatCurrency(experience.price_amount, experience.currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-10 text-center">
            <button
              onClick={() => onNavigate('listing')}
              className="inline-flex items-center gap-2 rounded-full bg-[#002626] px-8 py-3 font-semibold text-white transition-colors hover:bg-[#003838]"
            >
              {t.home.viewAll}
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold text-gray-900 md:text-4xl">
            {language === 'ro' ? 'Cazări locale' : language === 'ru' ? 'Проживание' : 'Stay with local hosts'}
          </h2>
          <p className="text-lg text-gray-600">
            {language === 'ro'
              ? 'Vezi hosts și case gata pentru următoarea rezervare.'
              : language === 'ru'
                ? 'Открой для себя варианты проживания по всей Молдове.'
                : 'Discover accommodation options across Moldova.'}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {accommodations.slice(0, 3).map((accommodation) => (
            <div
              key={accommodation.id}
              onClick={() => onNavigate('experience', { id: accommodation.id, slug: accommodation.slug, kind: 'accommodation' })}
              className="group cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-xl"
            >
              <div className="relative h-56 overflow-hidden">
                <img
                  src={accommodation.cover_image ?? 'https://placehold.co/800x500?text=Hodina'}
                  alt={accommodation.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-sm font-semibold text-[#17332d]">
                  {accommodation.type?.name ?? 'Cazare'}
                </span>
              </div>
              <div className="p-4">
                <h3 className="line-clamp-2 text-lg font-semibold text-gray-900">{accommodation.title}</h3>
                <p className="mb-3 mt-2 line-clamp-2 text-sm text-gray-600">{accommodation.short_description}</p>
                <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                  <span>{accommodation.max_guests ?? 0} oaspeți</span>
                  <span>{accommodation.bedrooms ?? 0} dormitoare</span>
                  <span>{accommodation.beds ?? 0} paturi</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Home className="h-4 w-4" />
                    <span>{accommodation.city ?? 'Moldova'}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-gray-500">
                      {language === 'ro' ? 'de la' : language === 'ru' ? 'от' : 'from'}{' '}
                    </span>
                    <span className="text-lg font-bold text-[#002626]">
                      {formatCurrency(accommodation.nightly_rate, accommodation.currency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold text-gray-900 md:text-4xl">{t.home.trendingExperiences}</h2>
          </div>

          <div className="mb-6 flex gap-4 overflow-x-auto pb-2">
            <button
              onClick={() => onNavigate('listing')}
              className="rounded-full bg-[#002626] px-6 py-2 font-medium text-white"
            >
              All
            </button>
            {featuredCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => onNavigate('listing', { categoryId: category.id, kind: 'experience' })}
                className="whitespace-nowrap rounded-full bg-white px-6 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-200"
              >
                {category.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {destinations.map((city) => (
              <button
                key={city}
                onClick={() => onNavigate('listing', { query: city })}
                className="rounded-2xl border border-gray-200 bg-white px-4 py-6 text-left transition-colors hover:border-[#002626]"
              >
                <p className="font-semibold text-gray-900">{city}</p>
                <p className="mt-2 text-sm text-gray-500">
                  {language === 'ro' ? 'Vezi ce poți rezerva' : language === 'ru' ? 'Смотреть варианты' : 'See what is available'}
                </p>
              </button>
            ))}
          </div>
        </div>
      </section>

      <AiChatWidget
        messages={aiMessages}
        setMessages={setAiMessages}
        onSuggestionClick={handleSuggestionClick}
        isOpen={isChatOpen}
        onOpen={() => setIsChatOpen(true)}
        onClose={() => setIsChatOpen(false)}
      />
    </div>
  );
};
