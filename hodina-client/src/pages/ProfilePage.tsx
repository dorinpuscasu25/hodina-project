import { useEffect, useState } from 'react';
import { Loader2, Mail, Phone, Save, Shield } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { apiRequest, formatApiError } from '../lib/api';
import { useSeo } from '../lib/seo';
import { useAuth } from '../contexts/AuthContext';
import type { Language } from '../types';

interface ProfilePageProps {
  onNavigate: (page: string, data?: Record<string, unknown>) => void;
  onNotice: (message: string | null) => void;
}

export const ProfilePage = ({ onNavigate, onNotice }: ProfilePageProps) => {
  const { t } = useLanguage();
  const { isAuthenticated, token, user, refreshProfile, resendVerification, logout } = useAuth();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    locale: 'ro' as Language,
    timezone: 'Europe/Chisinau',
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useSeo({
    title: 'Profilul meu',
    description: 'Gestionează datele personale și securitatea contului tău Hodina.',
    canonicalPath: '/account/profile',
    noindex: true,
  });

  useEffect(() => {
    setForm({
      name: user?.name ?? '',
      phone: user?.phone ?? '',
      locale: (user?.locale ?? 'ro') as Language,
      timezone: user?.timezone ?? 'Europe/Chisinau',
    });
  }, [user]);

  const handleProfileSave = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!token) {
      return;
    }

    setIsSavingProfile(true);
    setError(null);

    try {
      await apiRequest('/auth/me', {
        token,
        method: 'PATCH',
        body: form,
      });

      await refreshProfile();
      onNotice('Profilul a fost actualizat.');
    } catch (saveError) {
      setError(formatApiError(saveError));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSave = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!token) {
      return;
    }

    setIsSavingPassword(true);
    setError(null);

    try {
      await apiRequest('/auth/password', {
        token,
        method: 'PATCH',
        body: passwordForm,
      });

      setPasswordForm({
        current_password: '',
        password: '',
        password_confirmation: '',
      });
      onNotice('Parola a fost schimbată.');
    } catch (saveError) {
      setError(formatApiError(saveError));
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setError(null);

    try {
      await resendVerification();
      onNotice('Am retrimis emailul de confirmare.');
    } catch (resendError) {
      setError(formatApiError(resendError));
    } finally {
      setIsResending(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    onNavigate('home');
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20 md:pb-8">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-gray-200 bg-white px-8 py-12 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900">Intră în cont pentru profil</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-8">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 md:text-4xl">{t.account.myProfile}</h1>
          <p className="mt-2 text-gray-600">Gestionezi datele personale, limba contului și securitatea.</p>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-[#efc4be] bg-[#fff4f1] px-5 py-4 text-sm text-[#944236]">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <form onSubmit={handleProfileSave} className="rounded-2xl bg-white p-8 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900">Date personale</h2>
              <div className="mt-6 space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Nume complet</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-[#002626] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {t.account.email}
                    </div>
                  </label>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-700">
                    {user.email}
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {t.account.phone}
                    </div>
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-[#002626] focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Limbă</label>
                    <select
                      value={form.locale}
                      onChange={(event) => setForm((current) => ({ ...current, locale: event.target.value as Language }))}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-[#002626] focus:outline-none"
                    >
                      <option value="ro">Română</option>
                      <option value="en">English</option>
                      <option value="ru">Русский</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Fus orar</label>
                    <input
                      type="text"
                      value={form.timezone}
                      onChange={(event) => setForm((current) => ({ ...current, timezone: event.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-[#002626] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingProfile}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#002626] px-8 py-3 font-semibold text-white disabled:bg-gray-300"
              >
                {isSavingProfile ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                {t.account.saveChanges}
              </button>
            </form>

            <form onSubmit={handlePasswordSave} className="rounded-2xl bg-white p-8 shadow-sm">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-[#002626]" />
                <h2 className="text-xl font-bold text-gray-900">Securitate</h2>
              </div>
              <div className="mt-6 space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Parola actuală</label>
                  <input
                    type="password"
                    value={passwordForm.current_password}
                    onChange={(event) =>
                      setPasswordForm((current) => ({ ...current, current_password: event.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-[#002626] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Parola nouă</label>
                  <input
                    type="password"
                    value={passwordForm.password}
                    onChange={(event) => setPasswordForm((current) => ({ ...current, password: event.target.value }))}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-[#002626] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Confirmă parola</label>
                  <input
                    type="password"
                    value={passwordForm.password_confirmation}
                    onChange={(event) =>
                      setPasswordForm((current) => ({ ...current, password_confirmation: event.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-[#002626] focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingPassword}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#002626] px-8 py-3 font-semibold text-white disabled:bg-gray-300"
              >
                {isSavingPassword ? <Loader2 className="h-5 w-5 animate-spin" /> : <Shield className="h-5 w-5" />}
                Schimbă parola
              </button>
            </form>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-gray-500">Stare cont</p>
              <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-700">
                {user.email_verified
                  ? 'Emailul este confirmat și contul este complet activ.'
                  : 'Emailul nu este încă confirmat. După confirmare se activează rezervările și mesajele.'}
              </div>

              {!user.email_verified ? (
                <button
                  onClick={() => void handleResend()}
                  disabled={isResending}
                  className="mt-5 rounded-full bg-[#002626] px-6 py-3 font-semibold text-white disabled:bg-gray-300"
                >
                  {isResending ? 'Se trimite...' : 'Retrimite emailul'}
                </button>
              ) : null}
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-gray-500">Acces rapid</p>
              <div className="mt-4 space-y-3">
                <button
                  onClick={() => onNavigate('bookings')}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-left font-medium text-gray-700 transition-colors hover:border-[#002626]"
                >
                  {t.account.myBookings}
                </button>
                <button
                  onClick={() => onNavigate('messages')}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-left font-medium text-gray-700 transition-colors hover:border-[#002626]"
                >
                  {t.messages.title}
                </button>
                <button
                  onClick={() => void handleLogout()}
                  className="w-full rounded-xl border border-red-200 px-4 py-3 text-left font-medium text-red-600 transition-colors hover:border-red-400"
                >
                  {t.account.logout}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
