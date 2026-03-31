import React, { useEffect, useRef, useState } from 'react';
import type { DatesSetArg, DateSelectArg, EventClickArg, EventInput } from '@fullcalendar/core';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import timeGridPlugin from '@fullcalendar/timegrid';
import { Calendar as CalendarIcon, ChevronDown, MessageCircle, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest, formatApiError } from '@/lib/api';
import type { AccommodationListing, CalendarCollection, ExperienceListing } from '@/lib/types';

interface CalendarFormState {
  kind: 'experience' | 'custom' | 'maintenance';
  title: string;
  description: string;
  starts_at: string;
  ends_at: string;
  experience_id: string;
  accommodation_id: string;
  capacity: string;
  blocks_inventory: boolean;
  units_blocked: string;
}

interface CalendarEventMeta {
  sourceType: 'session' | 'booking' | 'event';
  entityId: number;
  title: string;
  description: string;
  subtitle: string;
  status: string;
  editable: boolean;
  deletable: boolean;
  startsAt: string | null;
  endsAt: string | null;
  experienceId?: number;
  experienceTitle?: string | null;
  titleOverride?: string | null;
  capacity?: number | null;
  isManual?: boolean;
  bookingNumber?: string;
  contactName?: string;
  chatEnabled?: boolean;
  bookableTitle?: string | null;
  accommodationId?: number | null;
  accommodationTitle?: string | null;
  blocksInventory?: boolean;
  unitsBlocked?: number;
  kind?: 'custom' | 'maintenance' | 'experience';
}

const initialForm: CalendarFormState = {
  kind: 'experience',
  title: '',
  description: '',
  starts_at: '',
  ends_at: '',
  experience_id: '',
  accommodation_id: '',
  capacity: '',
  blocks_inventory: false,
  units_blocked: '0',
};

function toLocalDateTime(value: Date) {
  const offset = value.getTimezoneOffset();
  const localDate = new Date(value.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function fromApiDateTime(value: string | null) {
  if (!value) {
    return '';
  }

  return toLocalDateTime(new Date(value));
}

function mapCalendarToEvents(calendar: CalendarCollection): EventInput[] {
  return [
    ...calendar.sessions.map((session) => ({
      id: session.id,
      title: session.title,
      start: session.start ?? undefined,
      end: session.end ?? undefined,
      backgroundColor: session.status === 'blocked' ? '#7b4336' : '#17332d',
      borderColor: session.status === 'blocked' ? '#7b4336' : '#17332d',
      textColor: '#ffffff',
      extendedProps: {
        sourceType: 'session',
        entityId: session.entity_id,
        title: session.title,
        description: session.description ?? '',
        subtitle: session.spots_left !== null ? `${session.spots_left} locuri libere` : '',
        status: session.status,
        editable: session.editable,
        deletable: session.deletable,
        startsAt: session.start,
        endsAt: session.end,
        experienceId: session.experience_id,
        experienceTitle: session.experience_title,
        titleOverride: session.title_override,
        capacity: session.capacity,
        isManual: session.is_manual,
        kind: 'experience',
      } satisfies CalendarEventMeta,
    })),
    ...calendar.bookings.map((booking) => ({
      id: booking.id,
      title: booking.title,
      start: booking.start ?? undefined,
      end: booking.end ?? undefined,
      backgroundColor: booking.status === 'pending' ? '#c97b2b' : '#275d4c',
      borderColor: booking.status === 'pending' ? '#c97b2b' : '#275d4c',
      textColor: '#ffffff',
      extendedProps: {
        sourceType: 'booking',
        entityId: booking.entity_id,
        title: booking.title,
        description: booking.bookable?.title ?? '',
        subtitle: booking.bookable?.title ?? '',
        status: booking.status,
        editable: false,
        deletable: false,
        startsAt: booking.start,
        endsAt: booking.end,
        bookingNumber: booking.booking_number,
        contactName: booking.contact_name,
        chatEnabled: booking.chat_enabled,
        bookableTitle: booking.bookable?.title ?? null,
      } satisfies CalendarEventMeta,
    })),
    ...calendar.events.map((event) => ({
      id: event.id,
      title: event.title,
      start: event.start ?? undefined,
      end: event.end ?? undefined,
      backgroundColor: event.type === 'maintenance' ? '#7b4336' : '#6a7b71',
      borderColor: event.type === 'maintenance' ? '#7b4336' : '#6a7b71',
      textColor: '#ffffff',
      extendedProps: {
        sourceType: 'event',
        entityId: event.entity_id,
        title: event.title,
        description: event.description ?? '',
        subtitle: event.accommodation_title ?? '',
        status: event.type,
        editable: event.editable,
        deletable: event.deletable,
        startsAt: event.start,
        endsAt: event.end,
        accommodationId: event.accommodation_id,
        accommodationTitle: event.accommodation_title,
        blocksInventory: event.blocks_inventory,
        unitsBlocked: event.units_blocked,
        kind: event.type as 'custom' | 'maintenance',
      } satisfies CalendarEventMeta,
    })),
  ];
}

export default function Calendar() {
  const calendarRef = useRef<FullCalendar | null>(null);
  const lastRangeKeyRef = useRef<string | null>(null);
  const navigate = useNavigate();
  const { token } = useAuth();
  const [currentView, setCurrentView] = useState('dayGridMonth');
  const [events, setEvents] = useState<EventInput[]>([]);
  const [experiences, setExperiences] = useState<ExperienceListing[]>([]);
  const [accommodations, setAccommodations] = useState<AccommodationListing[]>([]);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view' | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventMeta | null>(null);
  const [form, setForm] = useState<CalendarFormState>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function loadReferenceData() {
    if (!token) {
      return;
    }

    try {
      const [experienceResponse, accommodationResponse] = await Promise.all([
        apiRequest<{ data: ExperienceListing[] }>('/host/experiences', { token }),
        apiRequest<{ data: AccommodationListing[] }>('/host/accommodations', { token }),
      ]);

      setExperiences(experienceResponse.data);
      setAccommodations(accommodationResponse.data);
    } catch (loadError) {
      setError(formatApiError(loadError));
    }
  }

  async function loadCalendar(rangeStart?: string, rangeEnd?: string, force = false) {
    if (!token) {
      return;
    }

    const rangeKey = `${rangeStart ?? 'default'}::${rangeEnd ?? 'default'}`;

    if (!force && lastRangeKeyRef.current === rangeKey) {
      return;
    }

    lastRangeKeyRef.current = rangeKey;
    setIsLoading(true);

    try {
      const query = new URLSearchParams();
      if (rangeStart) {
        query.set('starts_at', rangeStart);
      }
      if (rangeEnd) {
        query.set('ends_at', rangeEnd);
      }

      const response = await apiRequest<{ data: CalendarCollection }>(
        `/host/calendar${query.toString() ? `?${query.toString()}` : ''}`,
        { token },
      );

      setEvents(mapCalendarToEvents(response.data));
    } catch (loadError) {
      setError(formatApiError(loadError));
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshCalendar(force = true) {
    const api = calendarRef.current?.getApi();

    await loadCalendar(
      api?.view.activeStart.toISOString(),
      api?.view.activeEnd.toISOString(),
      force,
    );
  }

  function closeModal() {
    setModalMode(null);
    setSelectedEvent(null);
    setForm(initialForm);
    setIsDeleting(false);
  }

  function openCreateModal(partial?: Partial<CalendarFormState>) {
    setSelectedEvent(null);
    setForm({
      ...initialForm,
      ...partial,
    });
    setModalMode('create');
  }

  function openEditModal(meta: CalendarEventMeta) {
    setSelectedEvent(meta);
    setForm({
      kind: meta.sourceType === 'session' ? 'experience' : meta.kind ?? 'custom',
      title: meta.sourceType === 'session' ? meta.titleOverride ?? '' : meta.title,
      description: meta.description ?? '',
      starts_at: fromApiDateTime(meta.startsAt),
      ends_at: fromApiDateTime(meta.endsAt),
      experience_id: meta.experienceId ? String(meta.experienceId) : '',
      accommodation_id: meta.accommodationId ? String(meta.accommodationId) : '',
      capacity: meta.capacity ? String(meta.capacity) : '',
      blocks_inventory: Boolean(meta.blocksInventory),
      units_blocked: String(meta.unitsBlocked ?? 0),
    });
    setModalMode('edit');
  }

  useEffect(() => {
    lastRangeKeyRef.current = null;
    void loadReferenceData();
  }, [token]);

  const handleRangeChange = (arg: DatesSetArg) => {
    setCurrentView((current) => (current === arg.view.type ? current : arg.view.type));
    void loadCalendar(arg.startStr, arg.endStr);
  };

  const handleSelect = (arg: DateSelectArg) => {
    openCreateModal({
      starts_at: toLocalDateTime(arg.start),
      ends_at: toLocalDateTime(arg.end ?? new Date(arg.start.getTime() + 60 * 60 * 1000)),
    });
  };

  const handleDateClick = (arg: { date: Date }) => {
    const start = arg.date;
    const end = new Date(arg.date.getTime() + 60 * 60 * 1000);

    openCreateModal({
      starts_at: toLocalDateTime(start),
      ends_at: toLocalDateTime(end),
    });
  };

  const handleEventClick = (arg: EventClickArg) => {
    const meta = {
      ...(arg.event.extendedProps as CalendarEventMeta),
      title: arg.event.title,
    };

    if ((meta.sourceType === 'event' || meta.sourceType === 'session') && meta.editable) {
      openEditModal(meta);
      return;
    }

    setSelectedEvent(meta);
    setModalMode('view');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !modalMode) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      if (modalMode === 'edit' && selectedEvent?.sourceType === 'session') {
        await apiRequest(`/host/calendar/sessions/${selectedEvent.entityId}`, {
          token,
          method: 'PATCH',
          body: {
            title: form.title || undefined,
            description: form.description || undefined,
            starts_at: form.starts_at,
            ends_at: form.ends_at,
            capacity: form.capacity || undefined,
          },
        });
      } else {
        const body =
          form.kind === 'experience'
            ? {
                kind: 'experience',
                title: form.title || undefined,
                description: form.description || undefined,
                starts_at: form.starts_at,
                ends_at: form.ends_at,
                experience_id: form.experience_id,
                capacity: form.capacity || undefined,
              }
            : {
                kind: form.kind,
                title: form.title,
                description: form.description || undefined,
                starts_at: form.starts_at,
                ends_at: form.ends_at,
                accommodation_id: form.accommodation_id || undefined,
                blocks_inventory: form.blocks_inventory,
                units_blocked: form.blocks_inventory ? form.units_blocked : undefined,
              };

        if (modalMode === 'edit' && selectedEvent?.sourceType === 'event') {
          await apiRequest(`/host/calendar/events/${selectedEvent.entityId}`, {
            token,
            method: 'PATCH',
            body,
          });
        } else {
          await apiRequest('/host/calendar/events', {
            token,
            method: 'POST',
            body,
          });
        }
      }

      closeModal();
      await refreshCalendar();
    } catch (submissionError) {
      setError(formatApiError(submissionError));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !selectedEvent || !selectedEvent.deletable) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const path =
        selectedEvent.sourceType === 'session'
          ? `/host/calendar/sessions/${selectedEvent.entityId}`
          : `/host/calendar/events/${selectedEvent.entityId}`;

      await apiRequest(path, {
        token,
        method: 'DELETE',
      });

      closeModal();
      await refreshCalendar();
    } catch (deleteError) {
      setError(formatApiError(deleteError));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleViewAction = () => {
    if (!selectedEvent) {
      return;
    }

    if (selectedEvent.sourceType === 'booking') {
      if (selectedEvent.chatEnabled) {
        navigate(`/dashboard/messages?booking=${selectedEvent.entityId}`);
      } else {
        navigate('/dashboard/today');
      }
      closeModal();
      return;
    }

    if (selectedEvent.sourceType === 'session' && selectedEvent.experienceId) {
      navigate(`/dashboard/experiences/${selectedEvent.experienceId}/edit`);
      closeModal();
    }
  };

  const isFormModalOpen = modalMode === 'create' || modalMode === 'edit';
  const isEditingExistingItem = modalMode === 'edit' && selectedEvent !== null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#7e8c83]">Disponibilitate</p>
          <h1 className="text-4xl font-semibold tracking-tight text-[#17332d]">Calendar</h1>
          <p className="max-w-2xl text-base text-[#64766d]">
            Aici gestionezi rezervările, sesiunile și blocările manuale.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={currentView}
              onChange={(event) => calendarRef.current?.getApi().changeView(event.target.value)}
              className="appearance-none rounded-2xl border border-gray-300 bg-white px-4 py-3 pr-10 text-sm text-[#17332d] outline-none transition focus:border-[#17332d]"
            >
              <option value="dayGridMonth">Month</option>
              <option value="timeGridWeek">Week</option>
              <option value="timeGridDay">Day</option>
              <option value="listWeek">List</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#73837a]" />
          </div>

          <button
            onClick={() => calendarRef.current?.getApi().today()}
            className="rounded-2xl border border-gray-300 bg-white p-3 transition hover:bg-gray-50"
          >
            <CalendarIcon className="h-5 w-5 text-[#17332d]" />
          </button>

          <button
            onClick={() => openCreateModal()}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#17332d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#24443d]"
          >
            <Plus className="h-4 w-4" />
            Add event
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-6 rounded-[1.5rem] border border-[#efc4be] bg-[#fff4f1] px-5 py-4 text-sm text-[#944236]">
          {error}
        </div>
      ) : null}

      <div className="relative overflow-hidden rounded-[2rem] border border-gray-200 bg-white p-4 shadow-sm">
        {isLoading ? (
          <div className="pointer-events-none absolute inset-4 z-10 flex items-center justify-center rounded-[1.5rem] bg-white/90 text-center text-[#6f7d75] backdrop-blur-[1px]">
            Se încarcă evenimentele...
          </div>
        ) : null}

        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          initialView={currentView}
          events={events}
          selectable
          editable={false}
          dateClick={handleDateClick}
          select={handleSelect}
          eventClick={handleEventClick}
          datesSet={handleRangeChange}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: '',
          }}
          height="auto"
          slotMinTime="06:00:00"
          slotMaxTime="23:00:00"
          eventDisplay="block"
          dayMaxEvents={3}
        />
      </div>

      {isFormModalOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 px-4 py-8">
          <div className="w-full max-w-xl rounded-[2rem] border border-gray-200 bg-white shadow-[0_30px_90px_-45px_rgba(23,51,45,0.55)]">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-semibold text-[#17332d]">
                  {isEditingExistingItem ? 'Editează evenimentul' : 'Adaugă eveniment'}
                </h2>
                <p className="text-sm text-[#6e7f75]">
                  {form.kind === 'experience'
                    ? 'Programezi sau ajustezi o sesiune de experiență.'
                    : 'Configurezi o blocare sau un eveniment personalizat.'}
                </p>
              </div>
              <button onClick={closeModal} className="rounded-full p-2 transition hover:bg-gray-50">
                <X className="h-5 w-5 text-[#6e7f75]" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
              <div className="grid gap-3 sm:grid-cols-3">
                {([
                  { value: 'experience', label: 'Experiență' },
                  { value: 'custom', label: 'Custom' },
                  { value: 'maintenance', label: 'Maintenance' },
                ] as const).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    disabled={isEditingExistingItem && form.kind === 'experience'}
                    onClick={() => setForm((current) => ({ ...current, kind: option.value }))}
                    className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                      form.kind === option.value
                        ? 'border-[#17332d] bg-[#17332d] text-white'
                        : 'border-gray-200 bg-white text-[#17332d]'
                    } disabled:cursor-not-allowed disabled:opacity-70`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {form.kind === 'experience' ? (
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-[#17332d]">Experiență</label>
                    <select
                      value={form.experience_id}
                      onChange={(event) => setForm((current) => ({ ...current, experience_id: event.target.value }))}
                      className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                      required
                      disabled={isEditingExistingItem}
                    >
                      <option value="">Alege experiența</option>
                      {experiences.map((experience) => (
                        <option key={experience.id} value={experience.id}>
                          {experience.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#17332d]">Titlu personalizat</label>
                    <input
                      value={form.title}
                      onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                      className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#17332d]">Capacitate</label>
                    <input
                      type="number"
                      min="1"
                      value={form.capacity}
                      onChange={(event) => setForm((current) => ({ ...current, capacity: event.target.value }))}
                      className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-[#17332d]">Titlu</label>
                    <input
                      value={form.title}
                      onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                      className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-[#17332d]">Descriere</label>
                    <textarea
                      value={form.description}
                      onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                      rows={3}
                      className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-[#17332d]">Asociază cu o cazare</label>
                    <select
                      value={form.accommodation_id}
                      onChange={(event) => setForm((current) => ({ ...current, accommodation_id: event.target.value }))}
                      className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                    >
                      <option value="">Fără cazare asociată</option>
                      {accommodations.map((accommodation) => (
                        <option key={accommodation.id} value={accommodation.id}>
                          {accommodation.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-[#17332d] md:col-span-2">
                    <input
                      type="checkbox"
                      checked={form.blocks_inventory}
                      onChange={(event) => setForm((current) => ({ ...current, blocks_inventory: event.target.checked }))}
                      className="h-4 w-4 rounded border-gray-300 text-[#17332d]"
                    />
                    Blochează inventarul / locurile
                  </label>
                  {form.blocks_inventory ? (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#17332d]">Unități blocate</label>
                      <input
                        type="number"
                        min="0"
                        value={form.units_blocked}
                        onChange={(event) => setForm((current) => ({ ...current, units_blocked: event.target.value }))}
                        className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                      />
                    </div>
                  ) : null}
                </div>
              )}

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#17332d]">Începe la</label>
                  <input
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={(event) => setForm((current) => ({ ...current, starts_at: event.target.value }))}
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#17332d]">Se termină la</label>
                  <input
                    type="datetime-local"
                    value={form.ends_at}
                    onChange={(event) => setForm((current) => ({ ...current, ends_at: event.target.value }))}
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-3">
                  {isEditingExistingItem && selectedEvent?.deletable ? (
                    <button
                      type="button"
                      onClick={() => void handleDelete()}
                      disabled={isDeleting || isSaving}
                      className="inline-flex items-center gap-2 rounded-[1.5rem] border border-[#e6c6be] bg-white px-4 py-3 text-sm font-semibold text-[#8b4336] transition hover:bg-[#fff3ef] disabled:cursor-not-allowed"
                    >
                      <Trash2 className="h-4 w-4" />
                      {isDeleting ? 'Se șterge...' : 'Șterge'}
                    </button>
                  ) : null}
                </div>

                <button
                  type="submit"
                  disabled={isSaving || isDeleting}
                  className="inline-flex items-center justify-center gap-2 rounded-[1.5rem] bg-[#17332d] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#24443d] disabled:cursor-not-allowed disabled:bg-[#76867d]"
                >
                  <Pencil className="h-4 w-4" />
                  {isSaving ? 'Se salvează...' : isEditingExistingItem ? 'Salvează modificările' : 'Salvează evenimentul'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {modalMode === 'view' && selectedEvent ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 px-4 py-8">
          <div className="w-full max-w-xl rounded-[2rem] border border-gray-200 bg-white shadow-[0_30px_90px_-45px_rgba(23,51,45,0.55)]">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-semibold text-[#17332d]">
                  {selectedEvent.sourceType === 'booking' ? 'Detalii rezervare' : 'Detalii sesiune'}
                </h2>
                <p className="text-sm text-[#6e7f75]">
                  {selectedEvent.sourceType === 'booking'
                    ? 'Poți deschide conversația sau merge la rezervări.'
                    : 'Sesiunile generate automat se ajustează din experiență.'}
                </p>
              </div>
              <button onClick={closeModal} className="rounded-full p-2 transition hover:bg-gray-50">
                <X className="h-5 w-5 text-[#6e7f75]" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-6">
              <div className="rounded-[1.5rem] border border-gray-200 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7d8c83]">{selectedEvent.status}</p>
                <h3 className="mt-2 text-2xl font-semibold text-[#17332d]">{selectedEvent.title}</h3>
                {selectedEvent.subtitle ? (
                  <p className="mt-2 text-sm text-[#64766d]">{selectedEvent.subtitle}</p>
                ) : null}
                {selectedEvent.description ? (
                  <p className="mt-4 text-sm leading-6 text-[#5f7167]">{selectedEvent.description}</p>
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[1.5rem] border border-gray-200 bg-white p-4">
                  <p className="text-sm text-[#7a8a82]">Începe</p>
                  <p className="mt-1 font-medium text-[#17332d]">{selectedEvent.startsAt ? new Date(selectedEvent.startsAt).toLocaleString('ro-RO') : 'Nesetat'}</p>
                </div>
                <div className="rounded-[1.5rem] border border-gray-200 bg-white p-4">
                  <p className="text-sm text-[#7a8a82]">Se termină</p>
                  <p className="mt-1 font-medium text-[#17332d]">{selectedEvent.endsAt ? new Date(selectedEvent.endsAt).toLocaleString('ro-RO') : 'Nesetat'}</p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-[1.5rem] border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-[#17332d] transition hover:bg-gray-50"
                >
                  Închide
                </button>
                <button
                  type="button"
                  onClick={handleViewAction}
                  className="inline-flex items-center justify-center gap-2 rounded-[1.5rem] bg-[#17332d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#24443d]"
                >
                  {selectedEvent.sourceType === 'booking' ? <MessageCircle className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                  {selectedEvent.sourceType === 'booking'
                    ? selectedEvent.chatEnabled
                      ? 'Deschide conversația'
                      : 'Vezi rezervarea'
                    : 'Editează experiența'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
