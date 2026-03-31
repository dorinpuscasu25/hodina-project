import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImagePlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest, createMultipartPayload, formatApiError } from '@/lib/api';
import type { AccommodationListing } from '@/lib/types';

interface AccommodationFormState {
  title: string;
  short_description: string;
  description: string;
  type_id: string;
  status: string;
  address: string;
  city: string;
  country: string;
  max_guests: string;
  bedrooms: string;
  beds: string;
  bathrooms: string;
  units_total: string;
  min_nights: string;
  max_nights: string;
  nightly_rate: string;
  cleaning_fee: string;
  check_in_from: string;
  check_out_until: string;
  is_instant_book: boolean;
  amenity_ids: string[];
  cover_image_file: File | null;
}

const initialForm: AccommodationFormState = {
  title: '',
  short_description: '',
  description: '',
  type_id: '',
  status: 'draft',
  address: '',
  city: '',
  country: 'Moldova',
  max_guests: '2',
  bedrooms: '1',
  beds: '1',
  bathrooms: '1',
  units_total: '1',
  min_nights: '1',
  max_nights: '14',
  nightly_rate: '0',
  cleaning_fee: '0',
  check_in_from: '15:00',
  check_out_until: '11:00',
  is_instant_book: false,
  amenity_ids: [],
  cover_image_file: null,
};

export default function CreateAccommodation() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { token, bootstrap, guesthouse, refreshBootstrap } = useAuth();
  const [form, setForm] = useState<AccommodationFormState>(initialForm);
  const [existingImage, setExistingImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(id));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(id);

  useEffect(() => {
    async function loadAccommodation() {
      if (!id || !token) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await apiRequest<{ data: AccommodationListing }>(`/host/accommodations/${id}`, { token });
        const accommodation = response.data;

        setForm({
          title: accommodation.title ?? '',
          short_description: accommodation.short_description ?? '',
          description: accommodation.description ?? '',
          type_id: accommodation.type?.id ? String(accommodation.type.id) : '',
          status: accommodation.status ?? 'draft',
          address: accommodation.address ?? '',
          city: accommodation.city ?? '',
          country: accommodation.country ?? 'Moldova',
          max_guests: accommodation.max_guests ? String(accommodation.max_guests) : '2',
          bedrooms: accommodation.bedrooms ? String(accommodation.bedrooms) : '1',
          beds: accommodation.beds ? String(accommodation.beds) : '1',
          bathrooms: accommodation.bathrooms ? String(accommodation.bathrooms) : '1',
          units_total: accommodation.units_total ? String(accommodation.units_total) : '1',
          min_nights: accommodation.min_nights ? String(accommodation.min_nights) : '1',
          max_nights: accommodation.max_nights ? String(accommodation.max_nights) : '14',
          nightly_rate: String(accommodation.nightly_rate ?? 0),
          cleaning_fee: String(accommodation.cleaning_fee ?? 0),
          check_in_from: accommodation.check_in_from ?? '15:00',
          check_out_until: accommodation.check_out_until ?? '11:00',
          is_instant_book: Boolean(accommodation.is_instant_book),
          amenity_ids: (accommodation.amenities ?? []).map((item) => String(item.id)),
          cover_image_file: null,
        });
        setExistingImage(accommodation.cover_image);
      } catch (loadError) {
        setError(formatApiError(loadError));
      } finally {
        setIsLoading(false);
      }
    }

    void loadAccommodation();
  }, [id, token]);

  const updateField = <K extends keyof AccommodationFormState>(key: K, value: AccommodationFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const toggleAmenity = (value: string) => {
    setForm((current) => ({
      ...current,
      amenity_ids: current.amenity_ids.includes(value)
        ? current.amenity_ids.filter((item) => item !== value)
        : [...current.amenity_ids, value],
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    setIsSaving(true);
    setError(null);

    const payload = createMultipartPayload({
      title: form.title,
      short_description: form.short_description,
      description: form.description,
      type_id: form.type_id,
      status: form.status,
      address: form.address,
      city: form.city,
      country: form.country,
      max_guests: form.max_guests,
      bedrooms: form.bedrooms,
      beds: form.beds,
      bathrooms: form.bathrooms,
      units_total: form.units_total,
      min_nights: form.min_nights,
      max_nights: form.max_nights,
      nightly_rate: form.nightly_rate,
      cleaning_fee: form.cleaning_fee,
      currency: guesthouse?.currency ?? 'MDL',
      check_in_from: form.check_in_from,
      check_out_until: form.check_out_until,
      is_instant_book: form.is_instant_book ? '1' : '0',
      amenity_ids: form.amenity_ids,
      cover_image_file: form.cover_image_file,
    });

    try {
      if (isEdit) {
        payload.append('_method', 'PUT');
        await apiRequest(`/host/accommodations/${id}`, {
          token,
          method: 'POST',
          body: payload,
        });
      } else {
        await apiRequest('/host/accommodations', {
          token,
          method: 'POST',
          body: payload,
        });
      }

      await refreshBootstrap();
      navigate('/dashboard/listings');
    } catch (submissionError) {
      setError(formatApiError(submissionError));
    } finally {
      setIsSaving(false);
    }
  };

  const selectedType = bootstrap?.accommodation_types.find((type) => String(type.id) === form.type_id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <button
        onClick={() => navigate('/dashboard/listings')}
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#51645b] transition hover:text-[#17332d]"
      >
        <ArrowLeft className="h-4 w-4" />
        Înapoi la listări
      </button>

      <div className="mb-8 space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#7d8c83]">Accommodation builder</p>
        <h1 className="text-4xl font-semibold tracking-tight text-[#17332d]">
          {isEdit ? 'Editează cazarea' : 'Creează o cazare'}
        </h1>
        <p className="max-w-2xl text-base text-[#64766d]">
          Configurezi tipul, numărul de unități, prețul și disponibilitatea într-un singur formular.
        </p>
      </div>

      {error ? (
        <div className="mb-6 rounded-[1.5rem] border border-[#efc4be] bg-[#fff3f1] px-5 py-4 text-sm text-[#944236]">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-[2rem] border border-gray-200 bg-white px-6 py-10 text-center text-[#6f7d76] shadow-sm">
          Se încarcă datele cazării...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <section className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-[#17332d]">Detalii de bază</h2>
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-[#17332d]">Titlu</label>
                  <input
                    value={form.title}
                    onChange={(event) => updateField('title', event.target.value)}
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-[#17332d]">Descriere scurtă</label>
                  <textarea
                    value={form.short_description}
                    onChange={(event) => updateField('short_description', event.target.value)}
                    rows={3}
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-[#17332d]">Descriere completă</label>
                  <textarea
                    value={form.description}
                    onChange={(event) => updateField('description', event.target.value)}
                    rows={6}
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#17332d]">Tip de cazare</label>
                  <select
                    value={form.type_id}
                    onChange={(event) => updateField('type_id', event.target.value)}
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                    required
                  >
                    <option value="">Alege tipul</option>
                    {(bootstrap?.accommodation_types ?? []).map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#17332d]">Status</label>
                  <select
                    value={form.status}
                    onChange={(event) => updateField('status', event.target.value)}
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-[#17332d]">Locație și capacitate</h2>
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-[#17332d]">Adresă</label>
                  <input
                    value={form.address}
                    onChange={(event) => updateField('address', event.target.value)}
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#17332d]">Oraș</label>
                  <input
                    value={form.city}
                    onChange={(event) => updateField('city', event.target.value)}
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#17332d]">Țară</label>
                  <input
                    value={form.country}
                    onChange={(event) => updateField('country', event.target.value)}
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#17332d]">Număr unități</label>
                  <input
                    type="number"
                    min="1"
                    value={form.units_total}
                    onChange={(event) => updateField('units_total', event.target.value)}
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#17332d]">Oaspeți max</label>
                  <input
                    type="number"
                    min="1"
                    value={form.max_guests}
                    onChange={(event) => updateField('max_guests', event.target.value)}
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#17332d]">Dormitoare</label>
                  <input
                    type="number"
                    min="1"
                    value={form.bedrooms}
                    onChange={(event) => updateField('bedrooms', event.target.value)}
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#17332d]">Paturi</label>
                  <input
                    type="number"
                    min="1"
                    value={form.beds}
                    onChange={(event) => updateField('beds', event.target.value)}
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#17332d]">Băi</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={form.bathrooms}
                    onChange={(event) => updateField('bathrooms', event.target.value)}
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                  />
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-[#17332d]">Preț și reguli</h2>
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#17332d]">Preț / noapte ({guesthouse?.currency ?? 'MDL'})</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.nightly_rate}
                    onChange={(event) => updateField('nightly_rate', event.target.value)}
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#17332d]">Taxă curățenie</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.cleaning_fee}
                    onChange={(event) => updateField('cleaning_fee', event.target.value)}
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#17332d]">Minim nopți</label>
                  <input
                    type="number"
                    min="1"
                    value={form.min_nights}
                    onChange={(event) => updateField('min_nights', event.target.value)}
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#17332d]">Maxim nopți</label>
                  <input
                    type="number"
                    min="1"
                    value={form.max_nights}
                    onChange={(event) => updateField('max_nights', event.target.value)}
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#17332d]">Check-in de la</label>
                  <input
                    type="time"
                    value={form.check_in_from}
                    onChange={(event) => updateField('check_in_from', event.target.value)}
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#17332d]">Check-out până la</label>
                  <input
                    type="time"
                    value={form.check_out_until}
                    onChange={(event) => updateField('check_out_until', event.target.value)}
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                  />
                </div>
                <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-[#17332d] md:col-span-2">
                  <input
                    type="checkbox"
                    checked={form.is_instant_book}
                    onChange={(event) => updateField('is_instant_book', event.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-[#17332d]"
                  />
                  Permite rezervare instantă
                </label>
              </div>
            </section>

            <section className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-[#17332d]">Amenities și imagine</h2>
              <div className="mt-5 space-y-5">
                <div className="flex flex-wrap gap-2">
                  {(bootstrap?.amenities ?? []).map((amenity) => (
                    <button
                      key={amenity.id}
                      type="button"
                      onClick={() => toggleAmenity(String(amenity.id))}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                        form.amenity_ids.includes(String(amenity.id))
                          ? 'bg-[#17332d] text-white'
                          : 'bg-white text-[#55675f]'
                      }`}
                    >
                      {amenity.name}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#17332d]">Cover image</label>
                  <label className="flex cursor-pointer items-center gap-3 rounded-[1.5rem] border border-dashed border-gray-300 bg-white px-4 py-5 text-sm text-[#62746b] transition hover:border-[#17332d]">
                    <ImagePlus className="h-5 w-5 text-[#17332d]" />
                    <span>{form.cover_image_file?.name ?? 'Încarcă imagine din calculator'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => updateField('cover_image_file', event.target.files?.[0] ?? null)}
                    />
                  </label>
                  {existingImage && !form.cover_image_file ? (
                    <img
                      src={existingImage}
                      alt="Current cover"
                      className="mt-3 h-40 w-full rounded-[1.5rem] object-cover"
                    />
                  ) : null}
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <div className="rounded-[2rem] border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#7b8b83]">Tip selectat</p>
              {selectedType ? (
                <div className="mt-4 space-y-2">
                  <p className="text-xl font-semibold text-[#17332d]">{selectedType.name}</p>
                  <p className="text-sm text-[#67776d]">{selectedType.description ?? 'Tip activ configurat din admin.'}</p>
                </div>
              ) : (
                <p className="mt-4 text-sm text-[#67776d]">Alege un tip de cazare ca să poți continua cu configurarea completă.</p>
              )}
            </div>

            <div className="rounded-[2rem] border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#7b8b83]">Disponibilitate</p>
              <ul className="mt-4 space-y-3 text-sm text-[#66776e]">
                <li>Calendarul va ține cont de unități și blocări</li>
                <li>Rezervările active scad din `units_total`</li>
                <li>Poți bloca manual locuri direct din calendar</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full rounded-[1.5rem] bg-[#17332d] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#24443d] disabled:cursor-not-allowed disabled:bg-[#73847b]"
            >
              {isSaving ? 'Se salvează...' : isEdit ? 'Salvează cazarea' : 'Creează cazarea'}
            </button>
          </aside>
        </form>
      )}
    </div>
  );
}
