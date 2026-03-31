import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatApiError } from '@/lib/api';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('host@hodina.local');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate('/dashboard/today');
    } catch (submissionError) {
      setError(formatApiError(submissionError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex items-center justify-center px-6 py-12 sm:px-10 lg:px-16">
          <div className="w-full max-w-md space-y-8">
            <div className="space-y-5">
              <img src="/images/logo.png" alt="Hodina" className="w-48" />
              <div className="space-y-3">
                <p className="inline-flex rounded-full border border-[#d5cfbf] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#4e665c]">
                  Host dashboard
                </p>
                <h1 className="text-4xl font-semibold tracking-tight text-[#17332d]">
                  Intră în contul pensiunii
                </h1>
                <p className="text-base leading-7 text-[#5c685f]">
                  Gestionezi listările, calendarul, rezervările și echipa direct dintr-un singur loc.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 rounded-[2rem] border border-[#dad2c5] bg-white p-7 shadow-[0_24px_80px_-48px_rgba(23,51,45,0.45)]">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-[#17332d]">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-[#17332d] outline-none transition focus:border-[#17332d]"
                  placeholder="host@hodina.local"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-[#17332d]">
                  Parolă
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-[#17332d] outline-none transition focus:border-[#17332d]"
                  placeholder="password"
                  required
                />
              </div>

              {error ? (
                <div className="rounded-2xl border border-[#efc1b8] bg-[#fff3f0] px-4 py-3 text-sm text-[#9d3d2d]">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="w-full rounded-2xl bg-[#17332d] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#22433b] disabled:cursor-not-allowed disabled:bg-[#6d7d76]"
              >
                {isSubmitting ? 'Se conectează...' : 'Conectare'}
              </button>

              <div className="rounded-2xl bg-white px-4 py-3 text-sm text-[#4f6359]">
                Demo: <span className="font-medium">host@hodina.local</span> / <span className="font-medium">password</span>
              </div>
            </form>
          </div>
        </div>

        <div className="relative hidden overflow-hidden lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#f5dcb7_0%,#d3ebe0_38%,#22433b_100%)]" />
          <div className="absolute inset-0 bg-[url('https://images.pexels.com/photos/6186817/pexels-photo-6186817.jpeg?auto=compress&cs=tinysrgb&w=1200')] bg-cover bg-center opacity-45" />
          <div className="relative flex h-full flex-col justify-between p-12 text-white">
            <div className="w-16 rounded-full border border-white/40 px-4 py-3 text-center text-sm font-semibold">
              HD
            </div>
            <div className="max-w-md space-y-4">
              <p className="text-sm uppercase tracking-[0.3em] text-white/80">Moldova stays</p>
              <h2 className="text-5xl font-semibold leading-tight">
                Pensiuni, experiențe și calendar într-un dashboard care chiar lucrează.
              </h2>
              <p className="text-lg leading-8 text-white/85">
                Confirmi rezervări, vezi locurile libere, coordonezi echipa și discuți cu oaspeții după confirmare.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
