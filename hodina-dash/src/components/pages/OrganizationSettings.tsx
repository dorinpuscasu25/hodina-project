import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Calendar, Clock3, Globe2, KeyRound, Mail, Phone, Plus, Save, Search, Shield, ShieldCheck, Trash2, Users, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest, createMultipartPayload, formatApiError } from '@/lib/api';
import type { OrganizationData, OrganizationMember } from '@/lib/types';

type OrganizationTab = 'company' | 'users' | 'availability' | 'account' | 'security';

interface MemberFormState {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  guesthouse_role: string;
  locale: string;
  timezone: string;
}

const initialMemberForm: MemberFormState = {
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
  guesthouse_role: 'editor',
  locale: 'ro',
  timezone: 'Europe/Chisinau',
};

const weekDayOptions = [
  { value: 'monday', label: 'Luni' },
  { value: 'tuesday', label: 'Marți' },
  { value: 'wednesday', label: 'Miercuri' },
  { value: 'thursday', label: 'Joi' },
  { value: 'friday', label: 'Vineri' },
  { value: 'saturday', label: 'Sâmbătă' },
  { value: 'sunday', label: 'Duminică' },
];

export default function OrganizationSettings() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { token, guesthouse, refreshProfile, user } = useAuth();
  const [activeTab, setActiveTab] = useState<OrganizationTab>(() => {
    const requestedTab = searchParams.get('tab');

    if (
      requestedTab === 'users' ||
      requestedTab === 'availability' ||
      requestedTab === 'account' ||
      requestedTab === 'security'
    ) {
      return requestedTab;
    }

    return 'company';
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [organization, setOrganization] = useState<OrganizationData | null>(null);
  const [companyCoverFile, setCompanyCoverFile] = useState<File | null>(null);
  const [companyForm, setCompanyForm] = useState({
    name: '',
    description: '',
    public_email: '',
    public_phone: '',
    locale: 'ro',
    currency: 'MDL',
    country: 'Moldova',
    city: '',
    address: '',
    check_in_notes: '',
    house_rules: '',
  });
  const [memberForm, setMemberForm] = useState<MemberFormState>(initialMemberForm);
  const [accountForm, setAccountForm] = useState({
    name: '',
    phone: '',
    locale: 'ro',
    timezone: 'Europe/Chisinau',
  });
  const [securityForm, setSecurityForm] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  });
  const [availabilityForm, setAvailabilityForm] = useState({
    working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    opening_time: '09:00',
    closing_time: '18:00',
    days_off: [] as string[],
    note: '',
  });
  const [newDayOff, setNewDayOff] = useState('');
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [isSavingMember, setIsSavingMember] = useState(false);
  const [isSavingAvailability, setIsSavingAvailability] = useState(false);
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [isSavingSecurity, setIsSavingSecurity] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadOrganization() {
    if (!token) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiRequest<{ data: OrganizationData }>('/host/organization', { token });

      setOrganization(response.data);
      setCompanyForm({
        name: response.data.guesthouse.name ?? '',
        description: response.data.guesthouse.description ?? '',
        public_email: response.data.guesthouse.public_email ?? '',
        public_phone: response.data.guesthouse.public_phone ?? '',
        locale: response.data.guesthouse.locale ?? 'ro',
        currency: response.data.guesthouse.currency ?? 'MDL',
        country: response.data.guesthouse.country ?? 'Moldova',
        city: response.data.guesthouse.city ?? '',
        address: response.data.guesthouse.address ?? '',
        check_in_notes: response.data.guesthouse.check_in_notes ?? '',
        house_rules: response.data.guesthouse.house_rules ?? '',
      });
      setMemberForm((current) => ({
        ...current,
        locale: response.data.guesthouse.locale ?? 'ro',
      }));
      setAvailabilityForm({
        working_days: response.data.availability.schedule.working_days,
        opening_time: response.data.availability.schedule.opening_time ?? '09:00',
        closing_time: response.data.availability.schedule.closing_time ?? '18:00',
        days_off: response.data.availability.schedule.days_off,
        note: response.data.availability.schedule.note ?? '',
      });
    } catch (loadError) {
      setError(formatApiError(loadError));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadOrganization();
  }, [token]);

  useEffect(() => {
    const requestedTab = searchParams.get('tab');

    if (
      requestedTab === 'users' ||
      requestedTab === 'availability' ||
      requestedTab === 'company' ||
      requestedTab === 'account' ||
      requestedTab === 'security'
    ) {
      setActiveTab(requestedTab);
    }
  }, [searchParams]);

  useEffect(() => {
    setAccountForm({
      name: user?.name ?? '',
      phone: user?.phone ?? '',
      locale: user?.locale ?? 'ro',
      timezone: user?.timezone ?? 'Europe/Chisinau',
    });
  }, [user]);

  const filteredMembers = useMemo(() => {
    const source = organization?.members ?? [];
    const needle = searchTerm.trim().toLowerCase();

    if (!needle) {
      return source;
    }

    return source.filter((member) =>
      [member.name, member.email, member.guesthouse_role ?? '']
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }, [organization?.members, searchTerm]);

  const changeTab = (tab: OrganizationTab) => {
    setActiveTab(tab);
    setSearchParams({ tab }, { replace: true });
  };

  const handleCompanySubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    setIsSavingCompany(true);
    setError(null);
    setSuccessMessage(null);

    const payload = createMultipartPayload({
      ...companyForm,
      cover_image_file: companyCoverFile,
    });

    try {
      await apiRequest('/host/organization', {
        token,
        method: 'PATCH',
        body: payload,
      });

      await Promise.all([loadOrganization(), refreshProfile()]);
      setCompanyCoverFile(null);
      setSuccessMessage('Setările organizației au fost salvate.');
    } catch (submissionError) {
      setError(formatApiError(submissionError));
    } finally {
      setIsSavingCompany(false);
    }
  };

  const handleMemberCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    setIsSavingMember(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await apiRequest('/host/organization/members', {
        token,
        method: 'POST',
        body: memberForm,
      });

      setMemberForm({
        ...initialMemberForm,
        guesthouse_role: organization?.role_options[0]?.value ?? 'editor',
        locale: companyForm.locale,
      });
      setShowMemberModal(false);
      await loadOrganization();
      setSuccessMessage('Utilizatorul a fost adăugat.');
    } catch (submissionError) {
      setError(formatApiError(submissionError));
    } finally {
      setIsSavingMember(false);
    }
  };

  const handleAvailabilitySubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    setIsSavingAvailability(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await apiRequest('/host/organization/availability', {
        token,
        method: 'PATCH',
        body: availabilityForm,
      });
      await loadOrganization();
      setSuccessMessage('Disponibilitatea a fost salvată.');
    } catch (submissionError) {
      setError(formatApiError(submissionError));
    } finally {
      setIsSavingAvailability(false);
    }
  };

  const toggleWorkingDay = (value: string) => {
    setAvailabilityForm((current) => ({
      ...current,
      working_days: current.working_days.includes(value)
        ? current.working_days.filter((day) => day !== value)
        : [...current.working_days, value],
    }));
  };

  const addDayOff = () => {
    if (!newDayOff) {
      return;
    }

    setAvailabilityForm((current) => ({
      ...current,
      days_off: current.days_off.includes(newDayOff) ? current.days_off : [...current.days_off, newDayOff].sort(),
    }));
    setNewDayOff('');
  };

  const removeDayOff = (value: string) => {
    setAvailabilityForm((current) => ({
      ...current,
      days_off: current.days_off.filter((day) => day !== value),
    }));
  };

  const updateMember = async (member: OrganizationMember, updates: Partial<OrganizationMember> & { password?: string; password_confirmation?: string }) => {
    if (!token) {
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);
      await apiRequest(`/host/organization/members/${member.id}`, {
        token,
        method: 'PATCH',
        body: updates,
      });
      await loadOrganization();
      setSuccessMessage('Utilizatorul a fost actualizat.');
    } catch (updateError) {
      setError(formatApiError(updateError));
    }
  };

  const deactivateMember = async (member: OrganizationMember) => {
    if (!token) {
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);
      await apiRequest(`/host/organization/members/${member.id}`, {
        token,
        method: 'DELETE',
      });
      await loadOrganization();
      setSuccessMessage('Utilizatorul a fost dezactivat.');
    } catch (deleteError) {
      setError(formatApiError(deleteError));
    }
  };

  const handleAccountSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    setIsSavingAccount(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await apiRequest('/auth/me', {
        token,
        method: 'PATCH',
        body: accountForm,
      });

      await refreshProfile();
      setSuccessMessage('Datele contului au fost actualizate.');
    } catch (submissionError) {
      setError(formatApiError(submissionError));
    } finally {
      setIsSavingAccount(false);
    }
  };

  const handleSecuritySubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    setIsSavingSecurity(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await apiRequest('/auth/password', {
        token,
        method: 'PATCH',
        body: securityForm,
      });

      setSecurityForm({
        current_password: '',
        password: '',
        password_confirmation: '',
      });
      setSuccessMessage('Parola a fost schimbată.');
    } catch (submissionError) {
      setError(formatApiError(submissionError));
    } finally {
      setIsSavingSecurity(false);
    }
  };

  const handleResendVerification = async () => {
    if (!token) {
      return;
    }

    setIsResendingVerification(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await apiRequest('/auth/email/resend', {
        token,
        method: 'POST',
      });
      setSuccessMessage('Am retrimis emailul de confirmare.');
    } catch (submissionError) {
      setError(formatApiError(submissionError));
    } finally {
      setIsResendingVerification(false);
    }
  };

  const tabs = [
    {
      id: 'company' as const,
      title: 'Date companie',
      description: 'Profilul pensiunii și informațiile publice',
      icon: <Building2 className="h-5 w-5" />,
    },
    {
      id: 'users' as const,
      title: 'Utilizatori',
      description: 'Echipa cu roluri diferite și acces separat',
      icon: <Users className="h-5 w-5" />,
    },
    {
      id: 'availability' as const,
      title: 'Disponibilitate',
      description: 'Program, zile libere și calendar',
      icon: <Calendar className="h-5 w-5" />,
    },
    {
      id: 'account' as const,
      title: 'Setări cont',
      description: 'Date personale și preferințe',
      icon: <Users className="h-5 w-5" />,
    },
    {
      id: 'security' as const,
      title: 'Securitate',
      description: 'Parolă și confirmare email',
      icon: <Shield className="h-5 w-5" />,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#7e8c83]">Settings</p>
        <h1 className="text-4xl font-semibold tracking-tight text-[#17332d]">Setări</h1>
        <p className="max-w-2xl text-base text-[#64766d]">
          Aici gestionezi pensiunea, contul și securitatea într-un singur loc.
        </p>
      </div>

      {error ? (
        <div className="mb-6 rounded-[1.5rem] border border-[#efc4be] bg-[#fff4f1] px-5 py-4 text-sm text-[#944236]">
          {error}
        </div>
      ) : null}

      {successMessage ? (
        <div className="mb-6 rounded-[1.5rem] border border-[#c8ddd3] bg-[#f5fbf8] px-5 py-4 text-sm text-[#295646]">
          {successMessage}
        </div>
      ) : null}

      {isLoading || !organization ? (
        <div className="rounded-[2rem] border border-gray-200 bg-white px-6 py-10 text-center text-[#6f7d76] shadow-sm">
          Se încarcă setările organizației...
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="space-y-3 rounded-[2rem] border border-gray-200 bg-white p-4 shadow-sm">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => changeTab(tab.id)}
                className={`w-full rounded-[1.5rem] px-4 py-4 text-left transition ${
                  activeTab === tab.id ? 'bg-[#17332d] text-white' : 'bg-white text-[#17332d]'
                }`}
              >
                <div className="flex items-start gap-4">
                  <span className={activeTab === tab.id ? 'text-white' : 'text-[#5b6d64]'}>{tab.icon}</span>
                  <div>
                    <p className="font-semibold">{tab.title}</p>
                    <p className={`mt-1 text-sm ${activeTab === tab.id ? 'text-white/80' : 'text-[#67776e]'}`}>
                      {tab.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </aside>

          <section className="space-y-6">
            {activeTab === 'company' ? (
              <form onSubmit={handleCompanySubmit} className="space-y-6">
                <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="text-2xl font-semibold text-[#17332d]">Date companie</h2>
                  <div className="mt-5 grid gap-5 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-medium text-[#17332d]">Nume pensiune</label>
                      <input
                        value={companyForm.name}
                        onChange={(event) => setCompanyForm((current) => ({ ...current, name: event.target.value }))}
                        className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-medium text-[#17332d]">Descriere</label>
                      <textarea
                        value={companyForm.description}
                        onChange={(event) => setCompanyForm((current) => ({ ...current, description: event.target.value }))}
                        rows={4}
                        className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#17332d]">Email public</label>
                      <input
                        value={companyForm.public_email}
                        onChange={(event) => setCompanyForm((current) => ({ ...current, public_email: event.target.value }))}
                        className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#17332d]">Telefon public</label>
                      <input
                        value={companyForm.public_phone}
                        onChange={(event) => setCompanyForm((current) => ({ ...current, public_phone: event.target.value }))}
                        className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#17332d]">Limba profilului</label>
                      <select
                        value={companyForm.locale}
                        onChange={(event) => setCompanyForm((current) => ({ ...current, locale: event.target.value }))}
                        className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                      >
                        <option value="ro">Română</option>
                        <option value="en">English</option>
                        <option value="ru">Русский</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#17332d]">Monedă</label>
                      <input
                        value={companyForm.currency}
                        onChange={(event) => setCompanyForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))}
                        className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 uppercase outline-none transition focus:border-[#17332d]"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#17332d]">Țară</label>
                      <input
                        value={companyForm.country}
                        onChange={(event) => setCompanyForm((current) => ({ ...current, country: event.target.value }))}
                        className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#17332d]">Oraș</label>
                      <input
                        value={companyForm.city}
                        onChange={(event) => setCompanyForm((current) => ({ ...current, city: event.target.value }))}
                        className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-medium text-[#17332d]">Adresă</label>
                      <input
                        value={companyForm.address}
                        onChange={(event) => setCompanyForm((current) => ({ ...current, address: event.target.value }))}
                        className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-medium text-[#17332d]">Note check-in</label>
                      <textarea
                        value={companyForm.check_in_notes}
                        onChange={(event) => setCompanyForm((current) => ({ ...current, check_in_notes: event.target.value }))}
                        rows={3}
                        className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-medium text-[#17332d]">Reguli casă</label>
                      <textarea
                        value={companyForm.house_rules}
                        onChange={(event) => setCompanyForm((current) => ({ ...current, house_rules: event.target.value }))}
                        rows={3}
                        className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-medium text-[#17332d]">Imagine principală</label>
                      <label className="flex cursor-pointer items-center gap-3 rounded-[1.5rem] border border-dashed border-gray-300 bg-white px-4 py-5 text-sm text-[#62746b] transition hover:border-[#17332d]">
                        <Save className="h-5 w-5 text-[#17332d]" />
                        <span>{companyCoverFile?.name ?? 'Încarcă logo sau cover din calculator'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => setCompanyCoverFile(event.target.files?.[0] ?? null)}
                        />
                      </label>
                      {organization.guesthouse.cover_image && !companyCoverFile ? (
                        <img
                          src={organization.guesthouse.cover_image}
                          alt={organization.guesthouse.name}
                          className="mt-3 h-40 w-full rounded-[1.5rem] object-cover"
                        />
                      ) : null}
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSavingCompany || !organization.permissions.can_manage_settings}
                  className="inline-flex items-center gap-2 rounded-[1.5rem] bg-[#17332d] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#24443d] disabled:cursor-not-allowed disabled:bg-[#76867d]"
                >
                  <Save className="h-4 w-4" />
                  {isSavingCompany ? 'Se salvează...' : 'Salvează setările'}
                </button>
              </form>
            ) : null}

            {activeTab === 'users' ? (
              <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold text-[#17332d]">Membrii echipei</h2>
                    <p className="text-sm text-[#6a7a71]">Mai mulți oameni pot lucra în aceeași pensiune, fiecare cu rol diferit.</p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative w-full sm:w-72">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9990]" />
                      <input
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Caută utilizatori..."
                        className="w-full rounded-2xl border border-gray-300 bg-white py-3 pl-10 pr-4 outline-none transition focus:border-[#17332d]"
                      />
                    </div>

                    {organization.permissions.can_manage_team ? (
                      <button
                        type="button"
                        onClick={() => setShowMemberModal(true)}
                        className="inline-flex items-center justify-center gap-2 rounded-[1.5rem] bg-[#17332d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#24443d]"
                      >
                        <Plus className="h-4 w-4" />
                        Adaugă utilizator
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-4">
                  {filteredMembers.map((member) => (
                    <div key={member.id} className="rounded-[1.5rem] border border-gray-200 bg-white p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="text-lg font-semibold text-[#17332d]">{member.name}</p>
                            {member.guesthouse_role === 'owner' ? <Shield className="h-4 w-4 text-[#d0a11d]" /> : null}
                          </div>
                          <p className="text-sm text-[#67776d]">{member.email}</p>
                          <p className="text-xs uppercase tracking-[0.18em] text-[#8a9990]">
                            {member.guesthouse_role} | {member.status}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <select
                            value={member.guesthouse_role ?? 'viewer'}
                            disabled={!organization.permissions.can_manage_team}
                            onChange={(event) =>
                              void updateMember(member, {
                                guesthouse_role: event.target.value,
                              })
                            }
                            className="rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#17332d]"
                          >
                            {organization.role_options.map((role) => (
                              <option key={role.value} value={role.value}>
                                {role.label}
                              </option>
                            ))}
                          </select>

                          <button
                            onClick={() =>
                              void updateMember(member, {
                                is_active: !member.is_active,
                              })
                            }
                            disabled={!organization.permissions.can_manage_team}
                            className="rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-[#17332d] transition hover:bg-gray-50 disabled:cursor-not-allowed"
                          >
                            {member.is_active ? 'Dezactivează' : 'Activează'}
                          </button>

                          <button
                            onClick={() => void deactivateMember(member)}
                            disabled={!organization.permissions.can_manage_team}
                            className="rounded-2xl border border-[#e6c6be] bg-white px-4 py-3 text-sm font-medium text-[#8b4336] transition hover:bg-[#fff3ef] disabled:cursor-not-allowed"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {activeTab === 'availability' ? (
              <form onSubmit={handleAvailabilitySubmit} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm">
                    <p className="text-sm font-medium text-[#718279]">Zile lucrătoare</p>
                    <p className="mt-4 text-3xl font-semibold text-[#17332d]">{availabilityForm.working_days.length}</p>
                  </div>
                  <div className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm">
                    <p className="text-sm font-medium text-[#718279]">Zile libere</p>
                    <p className="mt-4 text-3xl font-semibold text-[#17332d]">{availabilityForm.days_off.length}</p>
                  </div>
                  <div className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm">
                    <p className="text-sm font-medium text-[#718279]">Rezervări active</p>
                    <p className="mt-4 text-3xl font-semibold text-[#17332d]">{organization.availability.summary.active_bookings}</p>
                  </div>
                  <div className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm">
                    <p className="text-sm font-medium text-[#718279]">Sesiuni viitoare</p>
                    <p className="mt-4 text-3xl font-semibold text-[#17332d]">{organization.availability.summary.upcoming_experience_sessions}</p>
                  </div>
                </div>

                <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="text-2xl font-semibold text-[#17332d]">Program general</h2>

                  <div className="mt-5 grid gap-5 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#17332d]">Deschidere</label>
                      <div className="relative">
                        <Clock3 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7b8c83]" />
                        <input
                          type="time"
                          value={availabilityForm.opening_time}
                          onChange={(event) => setAvailabilityForm((current) => ({ ...current, opening_time: event.target.value }))}
                          className="w-full rounded-2xl border border-gray-300 bg-white py-3 pl-11 pr-4 outline-none transition focus:border-[#17332d]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#17332d]">Închidere</label>
                      <div className="relative">
                        <Clock3 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7b8c83]" />
                        <input
                          type="time"
                          value={availabilityForm.closing_time}
                          onChange={(event) => setAvailabilityForm((current) => ({ ...current, closing_time: event.target.value }))}
                          className="w-full rounded-2xl border border-gray-300 bg-white py-3 pl-11 pr-4 outline-none transition focus:border-[#17332d]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className="mb-3 block text-sm font-medium text-[#17332d]">Zile lucrătoare</label>
                    <div className="flex flex-wrap gap-3">
                      {weekDayOptions.map((day) => (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => toggleWorkingDay(day.value)}
                          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                            availabilityForm.working_days.includes(day.value)
                              ? 'bg-[#17332d] text-white'
                              : 'bg-white text-[#17332d] ring-1 ring-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className="mb-3 block text-sm font-medium text-[#17332d]">Zile libere</label>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <input
                        type="date"
                        value={newDayOff}
                        onChange={(event) => setNewDayOff(event.target.value)}
                        className="rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                      />
                      <button
                        type="button"
                        onClick={addDayOff}
                        className="rounded-[1.5rem] border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-[#17332d] transition hover:bg-gray-50"
                      >
                        Adaugă zi liberă
                      </button>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      {availabilityForm.days_off.length === 0 ? (
                        <p className="text-sm text-[#67776d]">Nu ai încă zile libere salvate.</p>
                      ) : (
                        availabilityForm.days_off.map((day) => (
                          <div key={day} className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-[#17332d]">
                            <span>{new Date(day).toLocaleDateString('ro-RO')}</span>
                            <button type="button" onClick={() => removeDayOff(day)} className="text-[#8b4336]">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className="mb-2 block text-sm font-medium text-[#17332d]">Notă internă</label>
                    <textarea
                      value={availabilityForm.note}
                      onChange={(event) => setAvailabilityForm((current) => ({ ...current, note: event.target.value }))}
                      rows={3}
                      placeholder="Ex: Duminica răspundem doar la telefon, iar în zilele de sărbătoare confirmăm manual."
                      className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                    />
                  </div>
                </div>

                <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h2 className="text-2xl font-semibold text-[#17332d]">Calendar și activitate</h2>
                      <p className="mt-3 text-base text-[#64766d]">
                        Ai <span className="font-semibold">{organization.availability.summary.active_bookings}</span> rezervări active și{' '}
                        <span className="font-semibold">{organization.availability.summary.upcoming_experience_sessions}</span> sesiuni viitoare.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/dashboard/calendar')}
                      className="rounded-[1.5rem] bg-[#17332d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#24443d]"
                    >
                      Deschide calendarul
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!organization.permissions.can_manage_settings || isSavingAvailability}
                  className="inline-flex items-center gap-2 rounded-[1.5rem] bg-[#17332d] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#24443d] disabled:cursor-not-allowed disabled:bg-[#76867d]"
                >
                  <Save className="h-4 w-4" />
                  {isSavingAvailability ? 'Se salvează...' : 'Salvează disponibilitatea'}
                </button>
              </form>
            ) : null}

            {activeTab === 'account' ? (
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <form onSubmit={handleAccountSubmit} className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#7b8b83]">Contul meu</p>
                      <h2 className="mt-2 text-2xl font-semibold text-[#17332d]">Date personale</h2>
                    </div>
                    <div className="rounded-full bg-white px-4 py-2 text-sm font-medium text-[#17332d] ring-1 ring-gray-200">
                      {user?.guesthouse_role ?? 'host'}
                    </div>
                  </div>

                  <div className="mt-6 grid gap-5 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-medium text-[#17332d]">Nume</label>
                      <input
                        value={accountForm.name}
                        onChange={(event) => setAccountForm((current) => ({ ...current, name: event.target.value }))}
                        className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                        required
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-medium text-[#17332d]">Email</label>
                      <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[#55675f]">
                        <Mail className="h-4 w-4" />
                        <span>{user?.email ?? 'host@hodina.local'}</span>
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#17332d]">Telefon</label>
                      <div className="relative">
                        <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7b8c83]" />
                        <input
                          value={accountForm.phone}
                          onChange={(event) => setAccountForm((current) => ({ ...current, phone: event.target.value }))}
                          className="w-full rounded-2xl border border-gray-300 bg-white py-3 pl-11 pr-4 outline-none transition focus:border-[#17332d]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#17332d]">Limbă</label>
                      <div className="relative">
                        <Globe2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7b8c83]" />
                        <select
                          value={accountForm.locale}
                          onChange={(event) => setAccountForm((current) => ({ ...current, locale: event.target.value }))}
                          className="w-full rounded-2xl border border-gray-300 bg-white py-3 pl-11 pr-4 outline-none transition focus:border-[#17332d]"
                        >
                          <option value="ro">Română</option>
                          <option value="en">English</option>
                          <option value="ru">Русский</option>
                        </select>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-medium text-[#17332d]">Fus orar</label>
                      <div className="relative">
                        <Clock3 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7b8c83]" />
                        <input
                          value={accountForm.timezone}
                          onChange={(event) => setAccountForm((current) => ({ ...current, timezone: event.target.value }))}
                          className="w-full rounded-2xl border border-gray-300 bg-white py-3 pl-11 pr-4 outline-none transition focus:border-[#17332d]"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingAccount}
                    className="mt-6 inline-flex items-center gap-2 rounded-[1.5rem] bg-[#17332d] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#24443d] disabled:cursor-not-allowed disabled:bg-[#76867d]"
                  >
                    <Save className="h-4 w-4" />
                    {isSavingAccount ? 'Se salvează...' : 'Salvează contul'}
                  </button>
                </form>

                <div className="space-y-6">
                  <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
                    <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#7b8b83]">Accesul tău</p>
                    <div className="mt-5 space-y-4">
                      <div className="flex items-center gap-3 text-[#55675f]">
                        <Shield className="h-4 w-4" />
                        <span>{user?.guesthouse_role ?? 'host'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[#55675f]">
                        <Building2 className="h-4 w-4" />
                        <span>{guesthouse?.name ?? 'Hodina Guesthouse'}</span>
                      </div>
                      <div className="rounded-[1.5rem] border border-gray-200 bg-white p-4 text-sm text-[#5f7167]">
                        {[guesthouse?.city, guesthouse?.country].filter(Boolean).join(', ') || 'Moldova'}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
                    <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#7b8b83]">Confirmare email</p>
                    <div className="mt-4 rounded-[1.5rem] border border-gray-200 bg-white px-4 py-4 text-sm text-[#5f7167]">
                      {user?.email_verified
                        ? 'Contul este deja confirmat și gata de folosit.'
                        : 'Dacă nu ai găsit mesajul, îl poți retrimite dintr-un singur click.'}
                    </div>

                    {!user?.email_verified ? (
                      <button
                        type="button"
                        onClick={() => void handleResendVerification()}
                        disabled={isResendingVerification}
                        className="mt-5 inline-flex items-center justify-center gap-2 rounded-[1.5rem] bg-[#17332d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#24443d] disabled:cursor-not-allowed disabled:bg-[#76867d]"
                      >
                        <Mail className="h-4 w-4" />
                        {isResendingVerification ? 'Se trimite...' : 'Retrimite emailul'}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === 'security' ? (
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <form onSubmit={handleSecuritySubmit} className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#7b8b83]">Schimbă parola</p>
                  <h2 className="mt-2 text-2xl font-semibold text-[#17332d]">Accesul contului</h2>

                  <div className="mt-6 space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#17332d]">Parola actuală</label>
                      <input
                        type="password"
                        value={securityForm.current_password}
                        onChange={(event) => setSecurityForm((current) => ({ ...current, current_password: event.target.value }))}
                        className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#17332d]">Parola nouă</label>
                      <input
                        type="password"
                        value={securityForm.password}
                        onChange={(event) => setSecurityForm((current) => ({ ...current, password: event.target.value }))}
                        className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#17332d]">Confirmă parola nouă</label>
                      <input
                        type="password"
                        value={securityForm.password_confirmation}
                        onChange={(event) => setSecurityForm((current) => ({ ...current, password_confirmation: event.target.value }))}
                        className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingSecurity}
                    className="mt-6 inline-flex items-center gap-2 rounded-[1.5rem] bg-[#17332d] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#24443d] disabled:cursor-not-allowed disabled:bg-[#76867d]"
                  >
                    <KeyRound className="h-4 w-4" />
                    {isSavingSecurity ? 'Se salvează...' : 'Schimbă parola'}
                  </button>
                </form>

                <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#7b8b83]">Stare cont</p>
                  <div className="mt-5 rounded-[1.5rem] border border-gray-200 bg-white p-4">
                    <div className="flex items-center gap-3">
                      {user?.email_verified ? <ShieldCheck className="h-5 w-5 text-[#295646]" /> : <Mail className="h-5 w-5 text-[#8b4336]" />}
                      <div>
                        <p className="font-medium text-[#17332d]">{user?.email ?? 'host@hodina.local'}</p>
                        <p className="text-sm text-[#61736a]">
                          {user?.email_verified ? 'Email confirmat' : 'Email neconfirmat'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      )}

      {showMemberModal && organization ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 px-4 py-8">
          <div className="w-full max-w-xl rounded-[2rem] border border-gray-200 bg-white shadow-[0_30px_90px_-45px_rgba(23,51,45,0.55)]">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#7b8b83]">Adaugă utilizator</p>
                <h2 className="mt-2 text-2xl font-semibold text-[#17332d]">Acces nou în pensiune</h2>
              </div>
              <button onClick={() => setShowMemberModal(false)} className="rounded-full p-2 transition hover:bg-gray-50">
                <X className="h-5 w-5 text-[#6e7f75]" />
              </button>
            </div>

            <form onSubmit={handleMemberCreate} className="space-y-4 px-6 py-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#17332d]">Nume</label>
                <input
                  value={memberForm.name}
                  onChange={(event) => setMemberForm((current) => ({ ...current, name: event.target.value }))}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[#17332d]">Email</label>
                <input
                  type="email"
                  value={memberForm.email}
                  onChange={(event) => setMemberForm((current) => ({ ...current, email: event.target.value }))}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[#17332d]">Rol</label>
                <select
                  value={memberForm.guesthouse_role}
                  onChange={(event) => setMemberForm((current) => ({ ...current, guesthouse_role: event.target.value }))}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                >
                  {organization.role_options.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[#17332d]">Parolă temporară</label>
                <input
                  type="password"
                  value={memberForm.password}
                  onChange={(event) => setMemberForm((current) => ({ ...current, password: event.target.value }))}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[#17332d]">Confirmă parola</label>
                <input
                  type="password"
                  value={memberForm.password_confirmation}
                  onChange={(event) => setMemberForm((current) => ({ ...current, password_confirmation: event.target.value }))}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                  required
                />
              </div>

              <div className="rounded-[1.5rem] border border-gray-200 bg-white px-4 py-4 text-sm text-[#5f7167]">
                Contul nou va fi creat pe <span className="font-semibold">{guesthouse?.name ?? organization.guesthouse.name}</span> și va putea intra după confirmarea emailului.
              </div>

              <button
                type="submit"
                disabled={!organization.permissions.can_manage_team || isSavingMember}
                className="inline-flex w-full items-center justify-center gap-2 rounded-[1.5rem] bg-[#17332d] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#24443d] disabled:cursor-not-allowed disabled:bg-[#76867d]"
              >
                <Plus className="h-4 w-4" />
                {isSavingMember ? 'Se creează...' : 'Creează utilizator'}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
