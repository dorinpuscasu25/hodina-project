import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Building2, Menu, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import UserMenu from './UserMenu';

const navItems = [
  { name: 'Today', path: '/dashboard/today' },
  { name: 'Statistici', path: '/dashboard/statistics' },
  { name: 'Calendar', path: '/dashboard/calendar' },
  { name: 'Listings', path: '/dashboard/listings' },
  { name: 'Messages', path: '/dashboard/messages' },
  { name: 'Setări', path: '/dashboard/settings' },
];

export default function Navbar() {
  const location = useLocation();
  const { guesthouse, user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-5 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link to="/dashboard/today" className="flex items-center">
            <img src="/images/logo.png" alt="Hodina" className="w-36" />
          </Link>

          <div className="hidden items-center gap-2 rounded-full bg-white p-1 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  isActive(item.path)
                    ? 'bg-[#17332d] text-white shadow-sm'
                    : 'text-[#52655b] hover:bg-white hover:text-[#17332d]'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-3 rounded-full border border-gray-200 bg-white px-4 py-2 md:flex">
            <Building2 className="h-4 w-4 text-[#496259]" />
            <div className="text-sm">
              <p className="font-medium text-[#17332d]">{guesthouse?.name ?? 'Hodina Host'}</p>
              <p className="text-xs text-[#6d7f75]">{guesthouse?.city ?? 'Moldova'}</p>
            </div>
          </div>

          <button
            onClick={() => setIsMenuOpen((current) => !current)}
            className="flex items-center gap-2 rounded-full border border-gray-300 bg-white px-3 py-2 shadow-sm transition hover:shadow"
          >
            <Menu className="h-4 w-4 text-[#17332d]" />
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#17332d] text-white">
              {user?.name ? <span className="text-sm font-semibold">{user.name.charAt(0).toUpperCase()}</span> : <User className="h-4 w-4" />}
            </div>
          </button>

          <UserMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} onLogout={logout} />
        </div>
      </div>
    </nav>
  );
}
