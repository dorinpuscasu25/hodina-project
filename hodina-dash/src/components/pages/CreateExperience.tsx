import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ImagePlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest, createMultipartPayload, formatApiError } from '@/lib/api';
import type { ExperienceListing } from '@/lib/types';

const weekDays = [
  { value: 'monday', label: 'Luni' },
  { value: 'tuesday', label: 'Marți' },
  { value: 'wednesday', label: 'Miercuri' },
  { value: 'thursday', label: 'Joi' },
  { value: 'friday', label: 'Vineri' },
  { value: 'saturday', label: 'Sâmbătă' },
  { value: 'sunday', label: 'Duminică' },
];

interface ExperienceFormState {
  title: string;
  short_description: string;
  description: string;
  category_id: string;
  status: string;
  location_name: string;
  meeting_point: string;
  address: string;
  city: string;
  country: string;
  duration_minutes: string;
  max_guests: string;
  min_age: string;
  difficulty: string;
  price_amount: string;
  price_mode: string;
  default_start_time: string;
  default_end_time: string;
  available_days: string[];
  is_instant_book: boolean;
  amenity_ids: string[];
  cover_image_file: File | null;
}

const initialForm: ExperienceFormState = {
  title: '',
  short_description: '',
  description: '',
  category_id: '',
  status: 'draft',
  location_name: '',
  meeting_point: '',
  address: '',
  city: '',
  country: 'Moldova',
  duration_minutes: '120',
  max_guests: '10',
  min_age: '0',
  difficulty: 'easy',
  price_amount: '0',
  price_mode: 'per_person',
  default_start_time: '10:00',
  default_end_time: '12:00',
  available_days: [],
  is_instant_book: false,
  amenity_ids: [],
  cover_image_file: null,
};

export default function CreateExperience() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { token, bootstrap, guesthouse, refreshBootstrap } = useAuth();
  const [form, setForm] = useState<ExperienceFormState>(initialForm);
  const [existingImage, setExistingImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(id));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(id);
  const localeLabel = guesthouse?.locale?.toUpperCase() ?? 'RO';

  useEffect(() => {
    const selectedCategory = searchParams.get('category');

    if (!id && selectedCategory) {
      setForm((current) => ({ ...current, category_id: selectedCategory }));
    }
  }, [id, searchParams]);

  useEffect(() => {
    async function loadExperience() {
      if (!id || !token) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await apiRequest<{ data: ExperienceListing }>(`/host/experiences/${id}`, { token });
        const experience = response.data;

        setForm({
          title: experience.title ?? '',
          short_description: experience.short_description ?? '',
          description: experience.description ?? '',
          category_id: experience.category?.id ? String(experience.category.id) : '',
          status: experience.status ?? 'draft',
          location_name: experience.location_name ?? '',
          meeting_point: experience.meeting_point ?? '',
          address: experience.address ?? '',
          city: experience.city ?? '',
          country: experience.country ?? 'Moldova',
          duration_minutes: experience.duration_minutes ? String(experience.duration_minutes) : '120',
          max_guests: experience.max_guests ? String(experience.max_guests) : '10',
          min_age: experience.min_age ? String(experience.min_age) : '0',
          difficulty: experience.difficulty ?? 'easy',
          price_amount: String(experience.price_amount ?? 0),
          price_mode: experience.price_mode ?? 'per_person',
          default_start_time: experience.default_start_time ?? '10:00',
          default_end_time: experience.default_end_time ?? '12:00',
          available_days: experience.available_days ?? [],
          is_instant_book: Boolean(experience.is_instant_book),
          amenity_ids: (experience.amenities ?? []).map((item) => String(item.id)),
          cover_image_file: null,
        });
        setExistingImage(experience.cover_image);
      } catch (loadError) {
        setError(formatApiError(loadError));
      } finally {
        setIsLoading(false);
      }
    }

    void loadExperience();
  }, [id, token]);

  const updateField = <K extends keyof ExperienceFormState>(key: K, value: ExperienceFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const toggleArrayValue = (key: 'available_days' | 'amenity_ids', value: string) => {
    setForm((current) => ({
      ...current,
      [key]: current[key].includes(value)
        ? current[key].filter((item) => item !== value)
        : [...current[key], value],
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
      category_id: form.category_id,
      status: form.status,
      location_name: form.location_name,
      meeting_point: form.meeting_point,
      address: form.address,
      city: form.city,
      country: form.country,
      duration_minutes: form.duration_minutes,
      max_guests: form.max_guests,
      min_age: form.min_age,
      difficulty: form.difficulty,
      price_amount: form.price_amount,
      currency: guesthouse?.currency ?? 'MDL',
      price_mode: form.price_mode,
      default_start_time: form.default_start_time,
      default_end_time: form.default_end_time,
      available_days: form.available_days,
      is_instant_book: form.is_instant_book ? '1' : '0',
      amenity_ids: form.amenity_ids,
      cover_image_file: form.cover_image_file,
    });

    try {
      if (isEdit) {
        payload.append('_method', 'PUT');
        await apiRequest(`/host/experiences/${id}`, {
          token,
          method: 'POST',
          body: payload,
        });
      } else {
        await apiRequest('/host/experiences', {
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

  const selectedCategory = bootstrap?.experience_categories.find(
    (category) => String(category.id) === form.category_id,
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <button
        onClick={() => navigate('/dashboard/listings')}
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#51645b] transition hover:text-[#17332d]"
      >
        <ArrowLeft className="h-4 w-4" />
        Înapoi la listări
      </button>

      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#7d8c83]">Experience builder</p>
          <h1 className="text-4xl font-semibold tracking-tight text-[#17332d]">
            {isEdit ? 'Editează experiența' : 'Creează o experiență'}
          </h1>
          <p className="max-w-2xl text-base text-[#64766d]">
            Textul se salvează în limba activă a pensiunii tale: <span className="font-semibold">{localeLabel}</span>.
          </p>
        </div>
      </div>

      {error ? (
        <div className="mb-6 rounded-[1.5rem] border border-[#efc4be] bg-[#fff3f1] px-5 py-4 text-sm text-[#944236]">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-[2rem] border border-gray-200 bg-white px-6 py-10 text-center text-[#6f7d76] shadow-sm">
          Se încarcă experiența...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <section className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-[#17332d]">Date de bază</h2>
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-[#17332d]">Titlu</label>
                  <input
                    value={form.title}
                    onChange={(event) => updateField('title', event.target.value)}
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                    placeholder="ex: Degustare de vin la cramă"
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
                  <label className="mb-2 block text-sm font-medium text-[#17332d]">Categorie</label>
                  <select
                    value={form.category_id}
                    onChange={(event) => updateField('category_id', event.target.value)}
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                    required
                  >
                    <option value="">Alege categoria</option>
                    {(bootstrap?.experience_categories ?? []).map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
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
              <h2 className="text-xl font-semibold text-[#17332d]">Locație și organizare</h2>
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#17332d]">Locația afișată</label>
                  <input
                    value={form.location_name}
                    onChange={(event) => updateField('location_name', event.target.value)}
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                    placeholder="ex: Orheiul Vechi"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#17332d]">Punct de întâlnire</label>
                  <input
                    value={form.meeting_point}
                    onChange={(event) => updateField('meeting_point', event.target.value)}
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                  />
                </div>

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
              </div>
            </section>

            <section className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-[#17332d]">Capacitate, preț și program</h2>
              <div className="mt-5 grid gap-5 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#17332d]">Durată (minute)</label>
                  <input
                    type="number"
                    min="15"
                    value={form.duration_minutes}
                    onChange={(event) => updateField('duration_minutes', event.target.value)}
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#17332d]">Participanți max</label>
                  <input
                    type="number"
                    min="1"
                    value={form.max_guests}
                    onChange={(event) => updateField('max_guests', event.target.value)}
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#17332d]">Vârstă minimă</label>
                  <input
                    type="number"
                    min="0"
                    value={form.min_age}
                    onChange={(event) => updateField('min_age', event.target.value)}
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#17332d]">Dificultate</label>
                  <select
                    value={form.difficulty}
                    onChange={(event) => updateField('difficulty', event.target.value)}
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                  >
                    <option value="easy">Ușor</option>
                    <option value="medium">Mediu</option>
                    <option value="hard">Avansat</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#17332d]">Preț ({guesthouse?.currency ?? 'MDL'})</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price_amount}
                    onChange={(event) => updateField('price_amount', event.target.value)}
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#17332d]">Mod preț</label>
                  <select
                    value={form.price_mode}
                    onChange={(event) => updateField('price_mode', event.target.value)}
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                  >
                    <option value="per_person">Per person</option>
                    <option value="per_group">Per group</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#17332d]">Ora început</label>
                  <input
                    type="time"
                    value={form.default_start_time}
                    onChange={(event) => updateField('default_start_time', event.target.value)}
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#17332d]">Ora sfârșit</label>
                  <input
                    type="time"
                    value={form.default_end_time}
                    onChange={(event) => updateField('default_end_time', event.target.value)}
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                  />
                </div>
                <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-[#17332d] md:col-span-3">
                  <input
                    type="checkbox"
                    checked={form.is_instant_book}
                    onChange={(event) => updateField('is_instant_book', event.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-[#17332d]"
                  />
                  Permite confirmare instantă
                </label>
              </div>

              <div className="mt-5">
                <p className="mb-3 text-sm font-medium text-[#17332d]">Zile disponibile</p>
                <div className="flex flex-wrap gap-2">
                  {weekDays.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleArrayValue('available_days', day.value)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                        form.available_days.includes(day.value)
                          ? 'bg-[#17332d] text-white'
                          : 'bg-white text-[#55675f]'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-[#17332d]">Amenities și media</h2>
              <div className="mt-5 space-y-5">
                <div>
                  <p className="mb-3 text-sm font-medium text-[#17332d]">Amenities</p>
                  <div className="flex flex-wrap gap-2">
                    {(bootstrap?.amenities ?? []).map((amenity) => (
                      <button
                        key={amenity.id}
                        type="button"
                        onClick={() => toggleArrayValue('amenity_ids', String(amenity.id))}
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
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#7b8b83]">Categorie selectată</p>
              {selectedCategory ? (
                <div className="mt-4 flex items-center gap-4 rounded-[1.5rem] border border-gray-200 bg-white p-4">
                  <div
                    className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl"
                    style={{ backgroundColor: selectedCategory.settings.card_background ?? '#eefbf2' }}
                  >
                    {selectedCategory.image ? (
                      <img src={selectedCategory.image} alt={selectedCategory.name} className="h-full w-full object-cover" />
                    ) : (
                      <span
                        className="text-xl font-semibold"
                        style={{ color: selectedCategory.settings.accent_color ?? '#0f8f47' }}
                      >
                        {selectedCategory.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-[#17332d]">{selectedCategory.name}</p>
                    <p className="text-sm text-[#67776d]">{selectedCategory.description ?? 'Categorie gata de folosit.'}</p>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-[#687970]">Alege o categorie ca să fie clar cum va apărea experiența.</p>
              )}
            </div>

            <div className="rounded-[2rem] border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#7b8b83]">Ce se salvează acum</p>
              <ul className="mt-4 space-y-3 text-sm text-[#66776e]">
                <li>Categoria și facilitățile selectate</li>
                <li>Programul de bază pentru sesiuni în calendar</li>
                <li>Status draft/published și instant book</li>
                <li>Imaginea principală a experienței</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full rounded-[1.5rem] bg-[#17332d] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#24443d] disabled:cursor-not-allowed disabled:bg-[#73847b]"
            >
              {isSaving ? 'Se salvează...' : isEdit ? 'Salvează experiența' : 'Creează experiența'}
            </button>
          </aside>
        </form>
      )}
    </div>
  );
}
