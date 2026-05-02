import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthModal } from './components/AuthModal';
import { CookieBanner } from './components/CookieBanner';
import { Header } from './components/Header';
import { MobileBottomNav } from './components/MobileBottomNav';
import { AiChatWidget } from './components/AiChatWidget';
import type { AiChatMessage, AiSuggestion } from './components/AiPlanner';
import { HomePage } from './pages/HomePage';
import { LegalPage } from './pages/LegalPage';
import { ListingPage } from './pages/ListingPage';
import { ExperiencePage } from './pages/ExperiencePage';
import { BookingPage } from './pages/BookingPage';
import { BookingsPage } from './pages/BookingsPage';
import { ProfilePage } from './pages/ProfilePage';
import { BecomeHostPage } from './pages/BecomeHostPage';
import { MessagesPage } from './pages/MessagesPage';
import { GuesthousePage } from './pages/GuesthousePage';
import { buildClientPath, resolveCurrentPage, type ClientPage, type NavigationData } from './lib/routes';
import type { AuthPayload, ListingKind } from './types';

function ExperienceRoute({
  onNavigate,
  kind,
}: {
  onNavigate: (page: string, data?: NavigationData) => void;
  kind: ListingKind;
}) {
  const { identifier = '' } = useParams();

  return (
    <ExperiencePage
      listingIdentifier={identifier}
      listingKind={kind}
      onNavigate={onNavigate}
    />
  );
}

function BookingRoute({
  onNavigate,
  onRequestAuth,
  onNotice,
  kind,
}: {
  onNavigate: (page: string, data?: NavigationData) => void;
  onRequestAuth: (mode?: 'login' | 'register') => void;
  onNotice: (message: string | null) => void;
  kind: ListingKind;
}) {
  const { identifier = '' } = useParams();

  return (
    <BookingPage
      listingIdentifier={identifier}
      listingKind={kind}
      onNavigate={onNavigate}
      onRequestAuth={onRequestAuth}
      onNotice={onNotice}
    />
  );
}

function GuesthouseRoute({ onNavigate }: { onNavigate: (page: string, data?: NavigationData) => void }) {
  const { identifier = '' } = useParams();

  return <GuesthousePage guesthouseIdentifier={identifier} onNavigate={onNavigate} />;
}

function MessagesRoute({
  onNavigate,
  onRequestAuth,
  onNotice,
}: {
  onNavigate: (page: string, data?: NavigationData) => void;
  onRequestAuth: (mode?: 'login' | 'register') => void;
  onNotice: (message: string | null) => void;
}) {
  const [searchParams] = useSearchParams();
  const bookingId = Number(searchParams.get('booking'));

  return (
    <MessagesPage
      onNavigate={onNavigate}
      onRequestAuth={onRequestAuth}
      selectedBookingId={Number.isFinite(bookingId) ? bookingId : undefined}
      onNotice={onNotice}
    />
  );
}

function AppShell() {
  const { isAuthenticated, user } = useAuth();
  const { language, setLanguage } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [aiMessages, setAiMessages] = useState<AiChatMessage[]>([]);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);

  const currentPage = resolveCurrentPage(location.pathname);

  useEffect(() => {
    const params = new URLSearchParams(location.search);

    if (params.get('verified') === '1') {
      setNotice('Emailul a fost confirmat. Acum poți continua rezervările și mesajele.');
      params.delete('verified');

      navigate(
        {
          pathname: location.pathname,
          search: params.toString() ? `?${params.toString()}` : '',
        },
        { replace: true },
      );
    }
  }, [location.pathname, location.search, navigate]);

  useEffect(() => {
    if (user?.locale && user.locale !== language) {
      setLanguage(user.locale);
    }
  }, [language, setLanguage, user?.locale]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname]);

  const openAuth = (mode: 'login' | 'register' = 'login') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleNavigate = (page: string, data: NavigationData = {}) => {
    const nextPage = page as ClientPage;
    const targetPath = buildClientPath(nextPage, data);

    if (!isAuthenticated && (nextPage === 'bookings' || nextPage === 'messages' || nextPage === 'profile')) {
      setPendingPath(targetPath);
      openAuth('login');
      return;
    }

    navigate(targetPath);
  };

  const handleAiSuggestion = (suggestion: AiSuggestion) => {
    handleNavigate('experience', {
      id: suggestion.id,
      slug: suggestion.slug,
      kind: suggestion.kind,
    });
  };

  const handleAuthSuccess = (payload: AuthPayload) => {
    setIsAuthModalOpen(false);

    if (payload.requires_email_verification) {
      setNotice('Ți-am trimis emailul de confirmare. După confirmare se activează rezervările și mesajele.');
    } else {
      setNotice('Autentificarea a reușit.');
    }

    if (!pendingPath) {
      return;
    }

    const nextPath = pendingPath;
    setPendingPath(null);

    if (!payload.user.email_verified && (nextPath.startsWith('/account/bookings') || nextPath.startsWith('/account/messages'))) {
      navigate('/account/profile');
      return;
    }

    navigate(nextPath);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header
        onNavigate={handleNavigate}
        onRequestAuth={openAuth}
        currentPage={currentPage}
        showSearch={currentPage === 'home'}
      />

      {notice ? (
        <div className="border-b border-[#c8ddd3] bg-[#f5fbf8] px-4 py-3 text-sm text-[#295646]">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <span>{notice}</span>
            <button onClick={() => setNotice(null)} className="font-medium text-[#17332d]">
              Închide
            </button>
          </div>
        </div>
      ) : null}

      <main>
        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                onNavigate={handleNavigate}
                aiMessages={aiMessages}
                setAiMessages={setAiMessages}
                onAiSuggestionClick={handleAiSuggestion}
              />
            }
          />
          <Route path="/explore" element={<ListingPage onNavigate={handleNavigate} />} />
          <Route
            path="/experiences/:identifier"
            element={<ExperienceRoute onNavigate={handleNavigate} kind="experience" />}
          />
          <Route
            path="/stays/:identifier"
            element={<ExperienceRoute onNavigate={handleNavigate} kind="accommodation" />}
          />
          <Route
            path="/book/experiences/:identifier"
            element={<BookingRoute onNavigate={handleNavigate} onRequestAuth={openAuth} onNotice={setNotice} kind="experience" />}
          />
          <Route
            path="/book/stays/:identifier"
            element={<BookingRoute onNavigate={handleNavigate} onRequestAuth={openAuth} onNotice={setNotice} kind="accommodation" />}
          />
          <Route path="/guesthouses/:identifier" element={<GuesthouseRoute onNavigate={handleNavigate} />} />
          <Route
            path="/account/bookings"
            element={<BookingsPage onNavigate={handleNavigate} onRequestAuth={openAuth} onNotice={setNotice} />}
          />
          <Route
            path="/account/messages"
            element={<MessagesRoute onNavigate={handleNavigate} onRequestAuth={openAuth} onNotice={setNotice} />}
          />
          <Route path="/account/profile" element={<ProfilePage onNavigate={handleNavigate} onNotice={setNotice} />} />
          <Route path="/become-host" element={<BecomeHostPage onNavigate={handleNavigate} />} />
          <Route path="/terms" element={<LegalPage kind="terms" onNavigate={handleNavigate} />} />
          <Route path="/privacy" element={<LegalPage kind="privacy" onNavigate={handleNavigate} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <MobileBottomNav onNavigate={handleNavigate} currentPage={currentPage} />

      <AuthModal
        isOpen={isAuthModalOpen}
        mode={authMode}
        onClose={() => {
          setIsAuthModalOpen(false);
          setPendingPath(null);
        }}
        onModeChange={setAuthMode}
        onSuccess={handleAuthSuccess}
      />

      <CookieBanner onNavigate={handleNavigate} />

      <AiChatWidget
        messages={aiMessages}
        setMessages={setAiMessages}
        onSuggestionClick={handleAiSuggestion}
        isOpen={isAiChatOpen}
        onOpen={() => setIsAiChatOpen(true)}
        onClose={() => setIsAiChatOpen(false)}
      />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App;
