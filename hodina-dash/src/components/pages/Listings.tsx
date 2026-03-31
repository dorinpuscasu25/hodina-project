import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Grid, List, Plus } from 'lucide-react';
import AddListingModal from '@/components/AddListingModal';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest, formatApiError } from '@/lib/api';
import type { AccommodationListing, ExperienceListing } from '@/lib/types';

type ListingTab = 'All' | 'Homes' | 'Experiences';
type ListingView = 'grid' | 'list';

interface ListingCard {
  id: number;
  type: 'experience' | 'accommodation';
  title: string;
  subtitle: string;
  categoryLabel: string;
  status: string;
  image: string | null;
  location: string;
  priceLabel: string;
  actionPath: string;
}

function formatStatus(status: string) {
  const map: Record<string, string> = {
    draft: 'În lucru',
    published: 'Publicat',
    archived: 'Arhivat',
  };

  return map[status] ?? status;
}

export default function Listings() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [view, setView] = useState<ListingView>('grid');
  const [activeTab, setActiveTab] = useState<ListingTab>('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [items, setItems] = useState<ListingCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadListings() {
      if (!token) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const [experienceResponse, accommodationResponse] = await Promise.all([
          apiRequest<{ data: ExperienceListing[] }>('/host/experiences', { token }),
          apiRequest<{ data: AccommodationListing[] }>('/host/accommodations', { token }),
        ]);

        const nextItems: ListingCard[] = [
          ...experienceResponse.data.map((experience) => ({
            id: experience.id,
            type: 'experience' as const,
            title: experience.title,
            subtitle: experience.short_description ?? 'Experiență locală pregătită pentru rezervări.',
            categoryLabel: experience.category?.name ?? 'Experiență',
            status: experience.status,
            image: experience.cover_image,
            location: [experience.city, experience.country].filter(Boolean).join(', ') || 'Moldova',
            priceLabel:
              experience.price_amount > 0
                ? `${experience.price_amount} ${experience.currency} / persoană`
                : `Preț neconfigurat (${experience.currency})`,
            actionPath: `/dashboard/experiences/${experience.id}/edit`,
          })),
          ...accommodationResponse.data.map((accommodation) => ({
            id: accommodation.id,
            type: 'accommodation' as const,
            title: accommodation.title,
            subtitle: accommodation.short_description ?? 'Unitate de cazare configurată pentru disponibilitate.',
            categoryLabel: accommodation.type?.name ?? 'Cazare',
            status: accommodation.status,
            image: accommodation.cover_image,
            location: [accommodation.city, accommodation.country].filter(Boolean).join(', ') || 'Moldova',
            priceLabel:
              accommodation.nightly_rate > 0
                ? `${accommodation.nightly_rate} ${accommodation.currency} / noapte`
                : `Preț neconfigurat (${accommodation.currency})`,
            actionPath: `/dashboard/accommodations/${accommodation.id}/edit`,
          })),
        ];

        setItems(nextItems);
      } catch (loadError) {
        setError(formatApiError(loadError));
      } finally {
        setIsLoading(false);
      }
    }

    void loadListings();
  }, [token]);

  const filteredItems = items.filter((item) => {
    if (activeTab === 'Experiences') {
      return item.type === 'experience';
    }

    if (activeTab === 'Homes') {
      return item.type === 'accommodation';
    }

    return true;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-[#7e8c83]">Host workspace</p>
          <h1 className="text-4xl font-semibold tracking-tight text-[#17332d]">Your listings</h1>
          <p className="max-w-2xl text-base text-[#66786e]">
            Vezi toate experiențele și cazările tale într-un singur loc.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setView(view === 'grid' ? 'list' : 'grid')}
            className="rounded-2xl border border-gray-300 bg-white p-3 transition hover:bg-gray-50"
          >
            {view === 'grid' ? <List className="h-5 w-5 text-[#17332d]" /> : <Grid className="h-5 w-5 text-[#17332d]" />}
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#17332d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#24443d]"
          >
            <Plus className="h-4 w-4" />
            Add listing
          </button>
        </div>
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        {(['All', 'Homes', 'Experiences'] as ListingTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              activeTab === tab
                ? 'bg-[#17332d] text-white'
                : 'bg-white text-[#5e7066] ring-1 ring-gray-200 hover:bg-gray-50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded-[1.5rem] border border-[#efc4be] bg-[#fff4f2] px-5 py-4 text-sm text-[#914336]">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-[2rem] border border-gray-200 bg-white px-6 py-10 text-center text-[#6e7d75] shadow-sm">
          Se încarcă listările...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
          <h2 className="text-2xl font-semibold text-[#17332d]">Nu ai încă listinguri în această secțiune</h2>
          <p className="mx-auto mt-3 max-w-xl text-[#67786e]">
            Creează prima experiență sau prima cazare și ele vor apărea imediat aici, cu status și acces la calendar.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-6 rounded-2xl bg-[#17332d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#24443d]"
          >
            Creează primul listing
          </button>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {filteredItems.map((item) => (
            <button
              key={`${item.type}-${item.id}`}
              onClick={() => navigate(item.actionPath)}
              className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white text-left shadow-[0_18px_60px_-50px_rgba(23,51,45,0.55)] transition hover:-translate-y-1 hover:shadow-[0_24px_80px_-48px_rgba(23,51,45,0.45)]"
            >
              <div className="relative aspect-[1.35] bg-white">
                {item.image ? (
                  <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,#f1e4c8_0%,#d7e8df_46%,#21443c_100%)]">
                    <span className="text-4xl font-semibold text-white">{item.title.charAt(0).toUpperCase()}</span>
                  </div>
                )}
                <div className="absolute left-4 top-4">
                  <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[#17332d] shadow-sm">
                    {formatStatus(item.status)}
                  </span>
                </div>
              </div>
              <div className="space-y-3 p-5">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7b8c83]">{item.categoryLabel}</p>
                  <h2 className="text-xl font-semibold text-[#17332d]">{item.title}</h2>
                </div>
                <p className="min-h-[3rem] text-sm leading-6 text-[#61736a]">{item.subtitle}</p>
                <div className="flex items-center justify-between text-sm text-[#53645b]">
                  <span>{item.location}</span>
                  <span className="font-medium text-[#17332d]">{item.priceLabel}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm">
          <div className="grid grid-cols-[2.2fr_1fr_1fr_1fr] gap-4 border-b border-gray-200 bg-white px-5 py-4 text-sm font-medium text-[#6d7e74]">
            <div>Listing</div>
            <div>Tip</div>
            <div>Locație</div>
            <div>Preț</div>
          </div>
          {filteredItems.map((item) => (
            <button
              key={`${item.type}-${item.id}`}
              onClick={() => navigate(item.actionPath)}
              className="grid w-full grid-cols-[2.2fr_1fr_1fr_1fr] gap-4 border-b border-gray-200 px-5 py-4 text-left transition hover:bg-gray-50"
            >
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 overflow-hidden rounded-2xl bg-white">
                  {item.image ? (
                    <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-[#17332d] text-lg font-semibold text-white">
                      {item.title.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-[#17332d]">{item.title}</p>
                  <p className="text-sm text-[#6a7a71]">{formatStatus(item.status)}</p>
                </div>
              </div>
              <div className="flex items-center text-sm text-[#566760]">{item.categoryLabel}</div>
              <div className="flex items-center text-sm text-[#566760]">{item.location}</div>
              <div className="flex items-center text-sm font-medium text-[#17332d]">{item.priceLabel}</div>
            </button>
          ))}
        </div>
      )}

      <AddListingModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} activeTab={activeTab} />
    </div>
  );
}
