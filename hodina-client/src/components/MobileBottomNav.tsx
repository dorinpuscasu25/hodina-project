import { Search, Heart, User, MessageCircle, Sparkles } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface MobileBottomNavProps {
  onNavigate: (page: string, data?: Record<string, unknown>) => void;
  currentPage: string;
}

export const MobileBottomNav = ({ onNavigate, currentPage }: MobileBottomNavProps) => {
  const { language } = useLanguage();

  const leftItems = [
    { icon: Search, label: language === 'ro' ? 'Caută' : language === 'ru' ? 'Поиск' : 'Explore', page: 'listing' },
    { icon: MessageCircle, label: language === 'ro' ? 'Mesaje' : language === 'ru' ? 'Чат' : 'Messages', page: 'messages' },
  ];
  const rightItems = [
    { icon: Heart, label: language === 'ro' ? 'Rezervări' : language === 'ru' ? 'Брони' : 'Bookings', page: 'bookings' },
    { icon: User, label: language === 'ro' ? 'Cont' : language === 'ru' ? 'Профиль' : 'Profile', page: 'profile' },
  ];

  const renderItem = ({ icon: Icon, label, page }: { icon: typeof Search; label: string; page: string }) => {
    const isActive = currentPage === page;
    return (
      <button
        key={page}
        onClick={() => onNavigate(page)}
        className={`flex flex-1 flex-col items-center justify-center py-2 transition-colors ${
          isActive ? 'text-[#002626]' : 'text-gray-500'
        }`}
      >
        <Icon className="mb-0.5 h-5 w-5" />
        <span className="text-[10px] font-medium">{label}</span>
      </button>
    );
  };

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="relative flex h-16 items-stretch">
        {leftItems.map(renderItem)}

        <div className="flex w-16 items-center justify-center">
          <button
            onClick={() => onNavigate('home')}
            aria-label={language === 'ro' ? 'Planifică cu AI' : language === 'ru' ? 'ИИ-планировщик' : 'AI planner'}
            className="absolute -top-5 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#002626] to-[#17332d] text-white shadow-xl ring-4 ring-white"
          >
            <Sparkles className="h-6 w-6" />
          </button>
        </div>

        {rightItems.map(renderItem)}
      </div>
    </nav>
  );
};
