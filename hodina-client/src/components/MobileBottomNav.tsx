import { Search, Heart, User, MessageCircle } from 'lucide-react';

interface MobileBottomNavProps {
  onNavigate: (page: string, data?: Record<string, unknown>) => void;
  currentPage: string;
}

export const MobileBottomNav = ({ onNavigate, currentPage }: MobileBottomNavProps) => {
  const navItems = [
    { icon: Search, label: 'Explore', page: 'listing' },
    { icon: MessageCircle, label: 'Messages', page: 'messages' },
    { icon: Heart, label: 'Bookings', page: 'bookings' },
    { icon: User, label: 'Profile', page: 'profile' },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.page;

          return (
            <button
              key={item.page}
              onClick={() => onNavigate(item.page)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive ? 'text-[#002626]' : 'text-gray-500'
              }`}
            >
              <Icon className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
