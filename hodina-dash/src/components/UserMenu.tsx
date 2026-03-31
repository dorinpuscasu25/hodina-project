import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { LogOut, Settings, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface UserMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => Promise<void>;
}

export default function UserMenu({ isOpen, onClose, onLogout }: UserMenuProps) {
  const navigate = useNavigate();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const { user, guesthouse } = useAuth();

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    function handleClickOutside(event: MouseEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleLogout = async () => {
    await onLogout();
    navigate('/login');
    onClose();
  };

  const menuItems = [
    {
      icon: <Settings className="h-5 w-5" />,
      text: 'Setări',
      action: () => navigate('/dashboard/settings'),
    },
  ];

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <>
      <div
        className={`fixed inset-0 z-[140] bg-black/18 backdrop-blur-[2px] transition-opacity duration-200 ${
          isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <div
        ref={sidebarRef}
        className={`fixed bottom-2 right-2 top-2 z-[150] flex w-[calc(100vw-1rem)] max-w-sm transform flex-col overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-[0_30px_90px_-45px_rgba(23,51,45,0.45)] transition-all duration-200 ${
          isOpen ? 'translate-x-0 opacity-100' : 'translate-x-[110%] opacity-0'
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold text-[#17332d]">Cont host</h2>
            <p className="text-sm text-[#6e7f75]">{guesthouse?.name ?? 'Hodina'}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 transition hover:bg-gray-50">
            <X className="h-5 w-5 text-[#6e7f75]" />
          </button>
        </div>

        <div className="border-b border-gray-200 px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#17332d] text-xl font-semibold text-white">
              {user?.name?.charAt(0).toUpperCase() ?? 'H'}
            </div>
            <div className="space-y-1">
              <p className="font-medium text-[#17332d]">{user?.name ?? 'Host'}</p>
              <p className="text-sm text-[#6e7f75]">{user?.email ?? 'host@hodina.local'}</p>
              <p className="text-xs uppercase tracking-[0.18em] text-[#8d9d94]">
                {user?.guesthouse_role ?? 'host'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-2 px-4 py-5">
          {menuItems.map((item) => (
            <button
              key={item.text}
              onClick={() => {
                item.action();
                onClose();
              }}
              className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition hover:bg-gray-50"
            >
              <div className="flex items-center gap-4">
                <span className="text-[#53655c]">{item.icon}</span>
                <span className="font-medium text-[#17332d]">{item.text}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="border-t border-gray-200 px-4 py-5">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-left transition hover:bg-[#fff0ed]"
          >
            <LogOut className="h-5 w-5 text-[#7b4336]" />
            <span className="font-medium text-[#7b4336]">Deconectare</span>
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
