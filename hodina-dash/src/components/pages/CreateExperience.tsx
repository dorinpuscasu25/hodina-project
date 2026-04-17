import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ImagePlus, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest, createMultipartPayload, formatApiError } from '@/lib/api';
import type {
  AttributeDef,
  AttributeValuePayload,
  ExperienceListing,
} from '@/lib/types';
import { COUNTRIES, findCities } from '@/lib/locations';

const weekDays = [
  { value: 'monday', label: 'Luni' },
  { value: 'tuesday', label: 'Marți' },
  { value: 'wednesday', label: 'Miercuri' },
  { value: 'thursday', label: 'Joi' },
  { value: 'friday', label: 'Vineri' },
  { value: 'saturday', label: 'Sâmbătă' },
  { value: 'sunday', label: 'Duminică' },
];

const MAX_CATEGORIES = 3;

interface ExperienceFormState {
  title: string;
  short_description: string;
  description: string;
  category_ids: string[];
  status: string;
  location_name: string;
  meeting_point: string;
  address: string;
  city: string;
  country_code: string;
  duration_minutes: string;
  max_guests: string;
  min_age: string;
  availability_start: string;
  availability_end: string;
  price_amount: string;
  price_mode: string;
  default_start_time: string;
  default_end_time: string;
  available_days: string[];
  is_instant_book: boolean;
  amenity_ids: string[];
  cover_image_file: File | null;
  gallery_files: File[];
  existing_gallery: string[];
  attributes: Record<string, unknown>;
}

const initialForm: ExperienceFormState = {
  title: '',
  short_description: '',
  description: '',
  category_ids: [],
  status: 'draft',
  location_name: '',
  meeting_point: '',
  address: '',
  city: '',
  country_code: 'MD',
  duration_minutes: '120',
  max_guests: '10',
  min_age: '0',
  availability_start: '',
  availability_end: '',
  price_amount: '0',
  price_mode: 'per_person',
  default_start_time: '10:00',
  default_end_time: '12:00',
  available_days: [],
  is_instant_book: false,
  amenity_ids: [],
  cover_image_file: null,
  gallery_files: [],
  existing_gallery: [],
  attributes: {},
};

function flattenCategories(
  categories: Array<{ id: number; name: string; children?: Array<{ id: number; name: string }> }>,
): Array<{ id: number; name: string; parentName?: string }> {
  const result: Array<{ id: number; name: string; parentName?: string }> = [];
  categories.forEach((category) => {
    result.push({ id: category.id, name: category.name });
    (category.children ?? []).forEach((child) => {
      result.push({ id: child.id, name: child.name, parentName: category.name });
    });
  });
  return result;
}

function countryNameFromCode(code: string): string {
  return COUNTRIES.find((country) => country.code === code)?.name ?? code;
}

function countryCodeFromName(name: string | null | undefined): string {
  if (!name) {
    return 'MD';
  }
  const normalized = name.trim().toLowerCase();
  const match = COUNTRIES.find(
    (country) =>
      country.name.toLowerCase() === normalized || country.code.toLowerCase() === normalized,
  );
  return match?.code ?? 'MD';
}

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

  const flattenedCategories = useMemo(
    () => flattenCategories(bootstrap?.experience_categories ?? []),
    [bootstrap?.experience_categories],
  );

  const experienceAttributes = useMemo<AttributeDef[]>(() => {
    const all = bootstrap?.attributes ?? [];
    const selectedIds = form.category_ids.map((idStr) => Number(idStr));
    return all
      .filter((attr) => attr.entity_type === 'experience' || attr.entity_type === 'both')
      .filter((attr) => {
        if (!attr.category_ids || attr.category_ids.length === 0) {
          return true;
        }
        if (selectedIds.length === 0) {
          return false;
        }
        return attr.category_ids.some((cid) => selectedIds.includes(cid));
      });
  }, [bootstrap?.attributes, form.category_ids]);

  useEffect(() => {
    const selectedCategory = searchParams.get('category');
    if (!id && selectedCategory) {
      setForm((current) => ({ ...current, category_ids: [selectedCategory] }));
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

        const categoryIds = (experience.categories ?? []).map((cat) => String(cat.id));
        const finalCategoryIds =
          categoryIds.length > 0
            ? categoryIds
            : experience.category?.id
              ? [String(experience.category.id)]
              : [];

        const attributeValues: Record<string, unknown> = {};
        (experience.attributes ?? []).forEach((attr) => {
          attributeValues[String(attr.attribute_id)] = attr.value;
        });

        setForm({
          title: experience.title ?? '',
          short_description: experience.short_description ?? '',
          description: experience.description ?? '',
          category_ids: finalCategoryIds,
          status: experience.status ?? 'draft',
          location_name: experience.location_name ?? '',
          meeting_point: experience.meeting_point ?? '',
          address: experience.address ?? '',
          city: experience.city ?? '',
          country_code: countryCodeFromName(experience.country),
          duration_minutes: experience.duration_minutes ? String(experience.duration_minutes) : '120',
          max_guests: experience.max_guests ? String(experience.max_guests) : '10',
          min_age: experience.min_age ? String(experience.min_age) : '0',
          availability_start: experience.availability_start ?? '',
          availability_end: experience.availability_end ?? '',
          price_amount: String(experience.price_amount ?? 0),
          price_mode: experience.price_mode ?? 'per_person',
          default_start_time: experience.default_start_time ?? '10:00',
          default_end_time: experience.default_end_time ?? '12:00',
          available_days: experience.available_days ?? [],
          is_instant_book: Boolean(experience.is_instant_book),
          amenity_ids: (experience.amenities ?? []).map((item) => String(item.id)),
          cover_image_file: null,
          gallery_files: [],
          existing_gallery: experience.gallery ?? [],
          attributes: attributeValues,
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

  const toggleCategory = (categoryId: string) => {
    setForm((current) => {
      const exists = current.category_ids.includes(categoryId);
      if (exists) {
        return { ...current, category_ids: current.category_ids.filter((cid) => cid !== categoryId) };
      }
      if (current.category_ids.length >= MAX_CATEGORIES) {
        return current;
      }
      return { ...current, category_ids: [...current.category_ids, categoryId] };
    });
  };

  const toggleArrayValue = (key: 'available_days' | 'amenity_ids', value: string) => {
    setForm((current) => ({
      ...current,
      [key]: current[key].includes(value)
        ? current[key].filter((item) => item !== value)
        : [...current[key], value],
    }));
  };

  const updateAttribute = (attributeId: number, value: unknown) => {
    setForm((current) => ({
      ...current,
      attributes: { ...current.attributes, [String(attributeId)]: value },
    }));
  };

  const removeExistingGalleryItem = (url: string) => {
    setForm((current) => ({
      ...current,
      existing_gallery: current.existing_gallery.filter((item) => item !== url),
    }));
  };

  const addGalleryFiles = (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }
    setForm((current) => ({
      ...current,
      gallery_files: [...current.gallery_files, ...Array.from(files)],
    }));
  };

  const removeGalleryFile = (index: number) => {
    setForm((current) => ({
      ...current,
      gallery_files: current.gallery_files.filter((_, idx) => idx !== index),
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    if (form.category_ids.length === 0) {
      setError('Alege cel puțin o categorie (maxim 3).');
      return;
    }

    setIsSaving(true);
    setError(null);

    const attributesPayload: AttributeValuePayload[] = Object.entries(form.attributes)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([attributeId, value]) => ({ attribute_id: Number(attributeId), value }));

    const payload = createMultipartPayload({
      title: form.title,
      short_description: form.short_description,
      description: form.description,
      category_ids: form.category_ids,
      status: form.status,
      location_name: form.location_name,
      meeting_point: form.meeting_point,
      address: form.address,
      city: form.city,
      country: countryNameFromCode(form.country_code),
      duration_minutes: form.duration_minutes,
      max_guests: form.max_guests,
      min_age: form.min_age,
      availability_start: form.availability_start || undefined,
      availability_end: form.availability_end || undefined,
      price_amount: form.price_amount,
      currency: guesthouse?.currency ?? 'MDL',
      price_mode: form.price_mode,
      default_start_time: form.default_start_time,
      default_end_time: form.default_end_time,
      available_days: form.available_days,
      is_instant_book: form.is_instant_book ? '1' : '0',
      amenity_ids: form.amenity_ids,
      cover_image_file: form.cover_image_file,
      gallery_files: form.gallery_files,
      gallery: form.existing_gallery,
    });

    attributesPayload.forEach((item, index) => {
      payload.append(`attributes[${index}][attribute_id]`, String(item.attribute_id));
      const value = item.value;
      if (Array.isArray(value)) {
        value.forEach((entry, j) => {
          payload.append(`attributes[${index}][value][${j}]`, String(entry));
        });
      } else if (value && typeof value === 'object') {
        Object.entries(value as Record<string, unknown>).forEach(([k, v]) => {
          payload.append(`attributes[${index}][value][${k}]`, String(v));
        });
      } else {
        payload.append(`attributes[${index}][value]`, String(value));
      }
    });

    try {
      if (isEdit) {
        payload.append('_method', 'PUT');
        await apiRequest(`/host/experiences/${id}`, { token, method: 'POST', body: payload });
      } else {
        await apiRequest('/host/experiences', { token, method: 'POST', body: payload });
      }

      await refreshBootstrap();
      navigate('/dashboard/listings');
    } catch (submissionError) {
      setError(formatApiError(submissionError));
    } finally {
      setIsSaving(false);
    }
  };

  const cities = findCities(form.country_code);

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
            Textul se salvează în limba activă: <span className="font-semibold">{localeLabel}</span>.
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
        <form onSubmit={handleSubmit} className="space-y-6">
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
                <p className="mb-2 text-xs text-[#7d8c83]">
                  Un rezumat captivant (max 2-3 rânduri) care apare în listări și cardurile de rezultate.
                </p>
                <textarea
                  value={form.short_description}
                  onChange={(event) => updateField('short_description', event.target.value)}
                  rows={3}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-[#17332d]">Descriere completă</label>
                <p className="mb-2 text-xs text-[#7d8c83]">
                  Povestea completă a experienței — ce vor face oaspeții, la ce să se aștepte, cine e gazda.
                  Apare pe pagina detaliată.
                </p>
                <textarea
                  value={form.description}
                  onChange={(event) => updateField('description', event.target.value)}
                  rows={6}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-[#17332d]">
                  Categorii (maxim {MAX_CATEGORIES})
                </label>
                <p className="mb-3 text-xs text-[#7d8c83]">
                  Alege până la {MAX_CATEGORIES} categorii/subcategorii reprezentative pentru experiență.
                </p>
                <div className="flex flex-wrap gap-2">
                  {flattenedCategories.map((category) => {
                    const idStr = String(category.id);
                    const selected = form.category_ids.includes(idStr);
                    const disabled = !selected && form.category_ids.length >= MAX_CATEGORIES;
                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => toggleCategory(idStr)}
                        disabled={disabled}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                          selected
                            ? 'bg-[#17332d] text-white'
                            : disabled
                              ? 'cursor-not-allowed bg-gray-100 text-[#a0a9a5]'
                              : 'bg-white text-[#55675f] hover:bg-[#eefbf2]'
                        }`}
                      >
                        {category.parentName ? `${category.parentName} · ${category.name}` : category.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#17332d]">Status</label>
                <select
                  value={form.status}
                  onChange={(event) => updateField('status', event.target.value)}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Publicată</option>
                  <option value="archived">Arhivată</option>
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
                <label className="mb-2 block text-sm font-medium text-[#17332d]">Țară</label>
                <select
                  value={form.country_code}
                  onChange={(event) => {
                    updateField('country_code', event.target.value);
                    updateField('city', '');
                  }}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                >
                  {COUNTRIES.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#17332d]">Oraș</label>
                <select
                  value={form.city}
                  onChange={(event) => updateField('city', event.target.value)}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                >
                  <option value="">Alege orașul</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
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
                <label className="mb-2 block text-sm font-medium text-[#17332d]">
                  Preț ({guesthouse?.currency ?? 'MDL'})
                </label>
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
                  <option value="per_person">Per persoană</option>
                  <option value="per_group">Per grup</option>
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

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#17332d]">
                  Disponibil de la
                </label>
                <input
                  type="date"
                  value={form.availability_start}
                  onChange={(event) => updateField('availability_start', event.target.value)}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[#17332d]">
                  Disponibil până la
                </label>
                <input
                  type="date"
                  value={form.availability_end}
                  min={form.availability_start || undefined}
                  onChange={(event) => updateField('availability_end', event.target.value)}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                />
              </div>
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

          {experienceAttributes.length > 0 ? (
            <section className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-[#17332d]">Atribute</h2>
              <p className="mt-1 text-sm text-[#6f7d76]">
                Detalii configurabile folosite în filtrele de căutare.
              </p>
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                {experienceAttributes.map((attribute) => (
                  <AttributeField
                    key={attribute.id}
                    attribute={attribute}
                    value={form.attributes[String(attribute.id)]}
                    onChange={(value) => updateAttribute(attribute.id, value)}
                  />
                ))}
              </div>
            </section>
          ) : null}

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
                <label className="mb-2 block text-sm font-medium text-[#17332d]">Imagine principală (cover)</label>
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
                    alt="Cover actuală"
                    className="mt-3 h-40 w-full rounded-[1.5rem] object-cover"
                  />
                ) : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#17332d]">Galerie foto</label>
                <p className="mb-3 text-xs text-[#7d8c83]">
                  Adaugă mai multe imagini pentru un carousel frumos pe pagina experienței.
                </p>
                <label className="flex cursor-pointer items-center gap-3 rounded-[1.5rem] border border-dashed border-gray-300 bg-white px-4 py-5 text-sm text-[#62746b] transition hover:border-[#17332d]">
                  <ImagePlus className="h-5 w-5 text-[#17332d]" />
                  <span>Încarcă imagini adiționale</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(event) => addGalleryFiles(event.target.files)}
                  />
                </label>

                {(form.existing_gallery.length > 0 || form.gallery_files.length > 0) ? (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {form.existing_gallery.map((url) => (
                      <div key={url} className="group relative overflow-hidden rounded-[1rem]">
                        <img src={url} alt="Imagine galerie" className="h-28 w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeExistingGalleryItem(url)}
                          className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {form.gallery_files.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="group relative overflow-hidden rounded-[1rem] border border-gray-200 bg-[#f1f5f3]"
                      >
                        <div className="flex h-28 items-center justify-center px-2 text-center text-xs text-[#55675f]">
                          {file.name}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeGalleryFile(index)}
                          className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <div className="sticky bottom-0 z-10 flex flex-col gap-3 rounded-[2rem] border border-gray-200 bg-white p-5 shadow-lg sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[#6f7d76]">
              Salvează schimbările pentru ca experiența să apară în calendar și în căutare.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  updateField('status', 'draft');
                }}
                className="rounded-[1.25rem] border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-[#17332d] transition hover:bg-[#eefbf2]"
              >
                Marchează ca draft
              </button>
              <button
                type="submit"
                disabled={isSaving}
                onClick={() => {
                  if (form.status === 'draft') {
                    updateField('status', 'published');
                  }
                }}
                className="rounded-[1.25rem] bg-[#17332d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#24443d] disabled:cursor-not-allowed disabled:bg-[#73847b]"
              >
                {isSaving ? 'Se salvează...' : isEdit ? 'Salvează' : 'Publică experiența'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

interface AttributeFieldProps {
  attribute: AttributeDef;
  value: unknown;
  onChange: (value: unknown) => void;
}

function AttributeField({ attribute, value, onChange }: AttributeFieldProps) {
  const label = (
    <label className="mb-2 block text-sm font-medium text-[#17332d]">
      {attribute.label}
      {attribute.unit ? <span className="ml-2 text-xs text-[#7d8c83]">({attribute.unit})</span> : null}
      {attribute.is_required ? <span className="ml-1 text-[#c94b3e]">*</span> : null}
    </label>
  );

  const fieldClass =
    'w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]';

  switch (attribute.input_type) {
    case 'text':
      return (
        <div>
          {label}
          <input
            type="text"
            value={(value as string) ?? ''}
            onChange={(event) => onChange(event.target.value)}
            className={fieldClass}
          />
        </div>
      );
    case 'number':
      return (
        <div>
          {label}
          <input
            type="number"
            min={attribute.config?.min}
            max={attribute.config?.max}
            step={attribute.config?.step}
            value={(value as string | number) ?? ''}
            onChange={(event) => onChange(event.target.value)}
            className={fieldClass}
          />
        </div>
      );
    case 'boolean':
      return (
        <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-[#17332d]">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => onChange(event.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-[#17332d]"
          />
          {attribute.label}
        </label>
      );
    case 'select':
    case 'radio':
      return (
        <div>
          {label}
          <select
            value={(value as string) ?? ''}
            onChange={(event) => onChange(event.target.value)}
            className={fieldClass}
          >
            <option value="">—</option>
            {attribute.options.map((option) => (
              <option key={option.id} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      );
    case 'multiselect': {
      const values = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div>
          {label}
          <div className="flex flex-wrap gap-2">
            {attribute.options.map((option) => {
              const selected = values.includes(option.value);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() =>
                    onChange(
                      selected
                        ? values.filter((v) => v !== option.value)
                        : [...values, option.value],
                    )
                  }
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    selected ? 'bg-[#17332d] text-white' : 'bg-white text-[#55675f]'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      );
    }
    case 'range': {
      const rangeValue = (value as { min?: string; max?: string }) ?? {};
      return (
        <div>
          {label}
          <div className="flex gap-3">
            <input
              type="number"
              placeholder="Min"
              min={attribute.config?.min}
              max={attribute.config?.max}
              step={attribute.config?.step}
              value={rangeValue.min ?? ''}
              onChange={(event) => onChange({ ...rangeValue, min: event.target.value })}
              className={fieldClass}
            />
            <input
              type="number"
              placeholder="Max"
              min={attribute.config?.min}
              max={attribute.config?.max}
              step={attribute.config?.step}
              value={rangeValue.max ?? ''}
              onChange={(event) => onChange({ ...rangeValue, max: event.target.value })}
              className={fieldClass}
            />
          </div>
        </div>
      );
    }
    case 'date':
      return (
        <div>
          {label}
          <input
            type="date"
            value={(value as string) ?? ''}
            onChange={(event) => onChange(event.target.value)}
            className={fieldClass}
          />
        </div>
      );
    default:
      return null;
  }
}
