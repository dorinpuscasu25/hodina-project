import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Mail, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { formatApiError } from '../lib/api';
import { useLanguage } from '../i18n/LanguageContext';
import type { AuthPayload } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  mode: 'login' | 'register';
  onClose: () => void;
  onModeChange: (mode: 'login' | 'register') => void;
  onSuccess: (payload: AuthPayload) => void;
}

export function AuthModal({
  isOpen,
  mode,
  onClose,
  onModeChange,
  onSuccess,
}: AuthModalProps) {
  const { language } = useLanguage();
  const { login, register } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    password_confirmation: '',
  });

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const payload =
        mode === 'login'
          ? await login(form.email, form.password)
          : await register({
              name: form.name,
              email: form.email,
              phone: form.phone || undefined,
              password: form.password,
              password_confirmation: form.password_confirmation,
              locale: language,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            });

      onSuccess(payload);
      setForm({
        name: '',
        email: '',
        phone: '',
        password: '',
        password_confirmation: '',
      });
    } catch (submissionError) {
      setError(formatApiError(submissionError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 px-4 py-8">
      <div className="w-full max-w-lg rounded-[2rem] border border-gray-200 bg-white shadow-[0_30px_90px_-45px_rgba(0,38,38,0.6)]">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#7b8b83]">
              {mode === 'login' ? 'Cont client' : 'Creează cont'}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[#17332d]">
              {mode === 'login' ? 'Intră în cont' : 'Înregistrează-te'}
            </h2>
          </div>
          <button onClick={onClose} className="rounded-full p-2 transition hover:bg-gray-50">
            <X className="h-5 w-5 text-[#6e7f75]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6">
          {error ? (
            <div className="rounded-[1.5rem] border border-[#efc4be] bg-[#fff4f1] px-4 py-3 text-sm text-[#944236]">
              {error}
            </div>
          ) : null}

          {mode === 'register' ? (
            <div>
              <label className="mb-2 block text-sm font-medium text-[#17332d]">Nume complet</label>
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                required
              />
            </div>
          ) : null}

          <div>
            <label className="mb-2 block text-sm font-medium text-[#17332d]">Email</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7b8c83]" />
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                className="w-full rounded-2xl border border-gray-300 bg-white py-3 pl-11 pr-4 outline-none transition focus:border-[#17332d]"
                required
              />
            </div>
          </div>

          {mode === 'register' ? (
            <div>
              <label className="mb-2 block text-sm font-medium text-[#17332d]">Telefon</label>
              <input
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
              />
            </div>
          ) : null}

          <div>
            <label className="mb-2 block text-sm font-medium text-[#17332d]">Parolă</label>
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
              required
            />
          </div>

          {mode === 'register' ? (
            <div>
              <label className="mb-2 block text-sm font-medium text-[#17332d]">Confirmă parola</label>
              <input
                type="password"
                value={form.password_confirmation}
                onChange={(event) =>
                  setForm((current) => ({ ...current, password_confirmation: event.target.value }))
                }
                className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#17332d]"
                required
              />
            </div>
          ) : null}

          <div className="rounded-[1.5rem] border border-gray-200 bg-white px-4 py-4 text-sm text-[#5f7167]">
            După creare vei primi email de confirmare. Rezervările și mesajele se activează imediat ce confirmi adresa.
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-[1.5rem] bg-[#17332d] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#24443d] disabled:cursor-not-allowed disabled:bg-[#76867d]"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {mode === 'login' ? 'Intră în cont' : 'Creează cont'}
          </button>

          <button
            type="button"
            onClick={() => onModeChange(mode === 'login' ? 'register' : 'login')}
            className="w-full text-center text-sm font-medium text-[#17332d]"
          >
            {mode === 'login' ? 'Nu ai cont? Creează unul acum.' : 'Ai deja cont? Intră în platformă.'}
          </button>
        </form>
      </div>
    </div>,
    document.body,
  );
}
