import { useState } from 'react';
import { LogOut, Menu, MessageCircle, Search, User, Globe, X } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { Language } from '../i18n/translations';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
  onNavigate: (page: string, data?: Record<string, unknown>) => void;
  onRequestAuth: (mode?: 'login' | 'register') => void;
  currentPage: string;
  showSearch?: boolean;
}

export const Header = ({ onNavigate, onRequestAuth, currentPage, showSearch = true }: HeaderProps) => {
  const { language, setLanguage, t } = useLanguage();
  const { isAuthenticated, user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const languages: { code: Language; name: string }[] = [
    { code: 'en', name: 'English' },
    { code: 'ro', name: 'Română' },
    { code: 'ru', name: 'Русский' },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onNavigate('listing', { query: searchQuery });
    }
  };

  const handleLogout = async () => {
    await logout();
    setUserMenuOpen(false);
    onNavigate('home');
  };

  return (
    <header className="sticky top-0 bg-white shadow-sm z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <button
              onClick={() => onNavigate('home')}
              className="flex items-center hover:opacity-80 transition-opacity"
              aria-label="Hodina"
            >
              <img
                src="/hodina-logo.png"
                alt="Hodina"
                className="h-8 w-auto sm:h-9"
              />
            </button>

            <nav className="hidden md:flex items-center gap-6">
              <button
                onClick={() => onNavigate('listing', { kind: 'experience' })}
                className="text-gray-700 hover:text-[#002626] transition-colors font-medium"
              >
                {t.nav.experiences}
              </button>
              <button
                onClick={() => onNavigate('listing', { kind: 'accommodation' })}
                className="text-gray-700 hover:text-[#002626] transition-colors font-medium"
              >
                {t.nav.destinations}
              </button>
            </nav>
          </div>

          {showSearch && currentPage === 'home' && (
            <form onSubmit={handleSearch} className="hidden lg:flex flex-1 max-w-lg mx-8">
              <div className="relative w-full">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.search.placeholder}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:border-[#002626] transition-colors"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
            </form>
          )}

          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate('become-host')}
              className="hidden md:block text-gray-700 hover:text-[#002626] transition-colors font-medium"
            >
              {t.nav.becomeHost}
            </button>

            <div className="relative">
              <button
                onClick={() => setLanguageMenuOpen(!languageMenuOpen)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Globe className="w-5 h-5 text-gray-700" />
              </button>

              {languageMenuOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg py-1 border border-gray-200">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code);
                        setLanguageMenuOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors ${
                        language === lang.code ? 'text-[#002626] font-medium' : 'text-gray-700'
                      }`}
                    >
                      {lang.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-2 border border-gray-300 rounded-full hover:shadow-md transition-shadow"
              >
                <Menu className="w-4 h-4 text-gray-700" />
                {isAuthenticated ? (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#002626] text-sm font-semibold text-white">
                    {user?.name?.charAt(0).toUpperCase() ?? 'U'}
                  </div>
                ) : (
                  <User className="w-5 h-5 text-gray-700" />
                )}
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 border border-gray-200">
                  {isAuthenticated ? (
                    <>
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="font-medium text-gray-900">{user?.name}</p>
                        <p className="text-sm text-gray-500">{user?.email}</p>
                      </div>
                      <button
                        onClick={() => {
                          onNavigate('messages');
                          setUserMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors text-gray-700"
                      >
                        {t.messages.title}
                      </button>
                      <button
                        onClick={() => {
                          onNavigate('bookings');
                          setUserMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors text-gray-700"
                      >
                        {t.account.myBookings}
                      </button>
                      <button
                        onClick={() => {
                          onNavigate('profile');
                          setUserMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors text-gray-700"
                      >
                        {t.account.myProfile}
                      </button>
                      <hr className="my-1" />
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-[#8b4336] hover:bg-[#fff3ef] transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        {t.account.logout}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          onRequestAuth('login');
                          setUserMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors text-gray-700"
                      >
                        Intră în cont
                      </button>
                      <button
                        onClick={() => {
                          onRequestAuth('register');
                          setUserMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors text-gray-700"
                      >
                        Creează cont
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 text-gray-700" />
              ) : (
                <Menu className="w-6 h-6 text-gray-700" />
              )}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="px-4 py-4 space-y-3">
            {showSearch && (
              <form onSubmit={handleSearch} className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.search.placeholder}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:border-[#002626]"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
              </form>
            )}
            <button
              onClick={() => {
                onNavigate('listing', { kind: 'experience' });
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left py-2 text-gray-700 hover:text-[#002626] transition-colors"
            >
              {t.nav.experiences}
            </button>
            <button
              onClick={() => {
                onNavigate('listing', { kind: 'accommodation' });
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left py-2 text-gray-700 hover:text-[#002626] transition-colors"
            >
              {t.nav.destinations}
            </button>
            {isAuthenticated ? (
              <>
                <button
                  onClick={() => {
                    onNavigate('messages');
                    setMobileMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 py-2 text-left text-gray-700 hover:text-[#002626] transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  {t.messages.title}
                </button>
                <button
                  onClick={() => {
                    onNavigate('profile');
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-left py-2 text-gray-700 hover:text-[#002626] transition-colors"
                >
                  {t.account.myProfile}
                </button>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left py-2 text-[#8b4336] transition-colors"
                >
                  {t.account.logout}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    onRequestAuth('login');
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-left py-2 text-gray-700 hover:text-[#002626] transition-colors"
                >
                  Intră în cont
                </button>
                <button
                  onClick={() => {
                    onRequestAuth('register');
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-left py-2 text-gray-700 hover:text-[#002626] transition-colors"
                >
                  Creează cont
                </button>
              </>
            )}
            <button
              onClick={() => {
                onNavigate('become-host');
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left py-2 text-gray-700 hover:text-[#002626] transition-colors"
            >
              {t.nav.becomeHost}
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
