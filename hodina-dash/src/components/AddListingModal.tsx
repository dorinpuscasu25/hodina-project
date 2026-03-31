import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Compass, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface AddListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'All' | 'Homes' | 'Experiences';
}

export default function AddListingModal({ isOpen, onClose, activeTab }: AddListingModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { bootstrap } = useAuth();
  const [mode, setMode] = useState<'experience' | 'accommodation'>(
    activeTab === 'Homes' ? 'accommodation' : 'experience',
  );

  useEffect(() => {
    setMode(activeTab === 'Homes' ? 'accommodation' : 'experience');
  }, [activeTab, isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const categories = bootstrap?.experience_categories ?? [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto px-4 py-8">
      <div className="fixed inset-0 bg-black/50" />

      <div className="relative mx-auto max-w-2xl">
        <div
          ref={modalRef}
          className="relative overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-[0_30px_90px_-45px_rgba(23,51,45,0.55)]"
        >
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
            <div>
              <h2 className="text-2xl font-semibold text-[#17332d]">Adaugă listing nou</h2>
              <p className="text-sm text-[#6c7d73]">Alege tipul listingului și apoi completează formularul.</p>
            </div>
            <button onClick={onClose} className="rounded-full p-2 transition hover:bg-white">
              <X className="h-5 w-5 text-[#6c7d73]" />
            </button>
          </div>

          <div className="space-y-6 px-6 py-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => setMode('experience')}
                className={`rounded-[1.5rem] border p-4 text-left transition ${
                  mode === 'experience'
                    ? 'border-[#17332d] bg-[#17332d] text-white'
                    : 'border-gray-200 bg-white text-[#17332d] hover:bg-white'
                }`}
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                  <Compass className="h-5 w-5" />
                </div>
                <p className="text-lg font-semibold">Experiență</p>
                <p className={`mt-1 text-sm ${mode === 'experience' ? 'text-white/80' : 'text-[#687970]'}`}>
                  Activități, degustări, tururi și experiențe locale rezervabile.
                </p>
              </button>

              <button
                onClick={() => setMode('accommodation')}
                className={`rounded-[1.5rem] border p-4 text-left transition ${
                  mode === 'accommodation'
                    ? 'border-[#17332d] bg-[#17332d] text-white'
                    : 'border-gray-200 bg-white text-[#17332d] hover:bg-white'
                }`}
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                  <Building2 className="h-5 w-5" />
                </div>
                <p className="text-lg font-semibold">Cazare</p>
                <p className={`mt-1 text-sm ${mode === 'accommodation' ? 'text-white/80' : 'text-[#687970]'}`}>
                  Camere, case întregi sau alte unități de cazare cu disponibilitate.
                </p>
              </button>
            </div>

            {mode === 'accommodation' ? (
              <div className="space-y-4 rounded-[1.75rem] border border-gray-200 bg-white p-5">
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-[#17332d]">Creează o cazare</h3>
                  <p className="text-sm text-[#6a7b71]">
                    Vei alege tipul de cazare din formular și poți seta imediat locurile disponibile, prețul și regulile.
                  </p>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    navigate('/dashboard/accommodations/create');
                  }}
                  className="rounded-2xl bg-[#17332d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#24443d]"
                >
                  Deschide formularul de cazare
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  <h3 className="text-xl font-semibold text-[#17332d]">Alege categoria experienței</h3>
                  <p className="text-sm text-[#6a7b71]">
                    Categoriile vin din admin și te ajută să pornești formularul cu contextul potrivit.
                  </p>
                </div>

                {categories.length === 0 ? (
                  <div className="rounded-[1.5rem] border border-dashed border-gray-300 bg-white px-5 py-6 text-sm text-[#6d7d73]">
                    Nu există încă nicio categorie activă pentru experiențe.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => {
                          onClose();
                          navigate(`/dashboard/experiences/create?category=${category.id}`);
                        }}
                        className="flex w-full items-start gap-4 rounded-[1.5rem] border border-gray-200 bg-white px-4 py-4 text-left transition hover:border-[#17332d] hover:shadow-sm"
                      >
                        <div
                          className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl"
                          style={{
                            backgroundColor: category.settings.card_background ?? '#eefbf2',
                          }}
                        >
                          {category.image ? (
                            <img src={category.image} alt={category.name} className="h-full w-full object-cover" />
                          ) : (
                            <span
                              className="text-xl font-semibold"
                              style={{
                                color: category.settings.accent_color ?? '#0f8f47',
                              }}
                            >
                              {category.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="text-lg font-semibold text-[#17332d]">{category.name}</p>
                          <p className="text-sm text-[#63756b]">
                            {category.description ?? 'Categorie pregătită în admin, gata de folosit în formular.'}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
