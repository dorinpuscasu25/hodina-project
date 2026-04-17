import { useEffect, useState } from 'react';
import { Cookie, X } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

const STORAGE_KEY = 'hodina_cookie_consent_v1';

type Consent = 'accepted' | 'rejected' | 'customized';

interface StoredConsent {
  status: Consent;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

interface CookieBannerProps {
  onNavigate: (page: string, data?: Record<string, unknown>) => void;
}

export const CookieBanner = ({ onNavigate }: CookieBannerProps) => {
  const { language } = useLanguage();
  const [visible, setVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const persist = (consent: StoredConsent) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
    } catch {
      // ignore storage errors
    }
    setVisible(false);
  };

  const handleAcceptAll = () => {
    persist({
      status: 'accepted',
      analytics: true,
      marketing: true,
      timestamp: new Date().toISOString(),
    });
  };

  const handleRejectAll = () => {
    persist({
      status: 'rejected',
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString(),
    });
  };

  const handleSaveCustom = () => {
    persist({
      status: 'customized',
      analytics,
      marketing,
      timestamp: new Date().toISOString(),
    });
  };

  if (!visible) return null;

  const copy = {
    title:
      language === 'ro'
        ? 'Folosim cookie-uri'
        : language === 'ru'
          ? 'Мы используем cookies'
          : 'We use cookies',
    body:
      language === 'ro'
        ? 'Folosim cookie-uri esențiale pentru funcționarea platformei și, cu acordul tău, cookie-uri analitice și de marketing pentru a îmbunătăți experiența ta. Poți afla mai multe în Politica de confidențialitate.'
        : language === 'ru'
          ? 'Мы используем необходимые файлы cookie для работы платформы и, с вашего согласия, аналитические и маркетинговые файлы cookie для улучшения сервиса. Подробнее — в политике конфиденциальности.'
          : 'We use essential cookies to run the platform and, with your consent, analytics and marketing cookies to improve your experience. Read more in our Privacy Policy.',
    acceptAll:
      language === 'ro' ? 'Acceptă toate' : language === 'ru' ? 'Принять все' : 'Accept all',
    rejectAll:
      language === 'ro' ? 'Refuză toate' : language === 'ru' ? 'Отклонить все' : 'Reject all',
    customize:
      language === 'ro' ? 'Personalizează' : language === 'ru' ? 'Настроить' : 'Customize',
    save: language === 'ro' ? 'Salvează setările' : language === 'ru' ? 'Сохранить' : 'Save settings',
    essential:
      language === 'ro'
        ? 'Esențiale (necesare pentru funcționare)'
        : language === 'ru'
          ? 'Необходимые (всегда включены)'
          : 'Essential (always on)',
    analyticsLabel:
      language === 'ro' ? 'Analitice' : language === 'ru' ? 'Аналитика' : 'Analytics',
    analyticsBody:
      language === 'ro'
        ? 'Ne ajută să înțelegem cum folosești platforma.'
        : language === 'ru'
          ? 'Помогает понять, как вы пользуетесь сайтом.'
          : 'Helps us understand how the platform is used.',
    marketingLabel:
      language === 'ro' ? 'Marketing' : language === 'ru' ? 'Маркетинг' : 'Marketing',
    marketingBody:
      language === 'ro'
        ? 'Oferte personalizate și remarketing.'
        : language === 'ru'
          ? 'Персонализированные предложения.'
          : 'Personalised offers and remarketing.',
    privacy:
      language === 'ro'
        ? 'Politica de confidențialitate'
        : language === 'ru'
          ? 'Политика конфиденциальности'
          : 'Privacy Policy',
    terms: language === 'ro' ? 'Termeni' : language === 'ru' ? 'Условия' : 'Terms',
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-gray-200 bg-white shadow-2xl">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-1 items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#fff4f1]">
              <Cookie className="h-5 w-5 text-[#944236]" />
            </div>
            <div className="flex-1 text-sm text-gray-700">
              <p className="mb-1 font-semibold text-gray-900">{copy.title}</p>
              <p className="leading-relaxed text-gray-600">
                {copy.body}{' '}
                <button
                  onClick={() => onNavigate('privacy')}
                  className="font-medium text-[#002626] underline"
                >
                  {copy.privacy}
                </button>
                {' · '}
                <button
                  onClick={() => onNavigate('terms')}
                  className="font-medium text-[#002626] underline"
                >
                  {copy.terms}
                </button>
              </p>
            </div>
          </div>
          <button
            onClick={handleRejectAll}
            className="flex-shrink-0 rounded-full p-1 text-gray-400 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {showCustomize ? (
          <div className="mt-4 space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <label className="flex items-start gap-3 opacity-75">
              <input type="checkbox" checked disabled className="mt-1 h-4 w-4 rounded border-gray-300" />
              <div className="flex-1">
                <p className="font-medium text-gray-900">{copy.essential}</p>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300"
              />
              <div className="flex-1">
                <p className="font-medium text-gray-900">{copy.analyticsLabel}</p>
                <p className="text-xs text-gray-500">{copy.analyticsBody}</p>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300"
              />
              <div className="flex-1">
                <p className="font-medium text-gray-900">{copy.marketingLabel}</p>
                <p className="text-xs text-gray-500">{copy.marketingBody}</p>
              </div>
            </label>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          {showCustomize ? (
            <button
              onClick={handleSaveCustom}
              className="rounded-full bg-[#002626] px-5 py-2 text-sm font-semibold text-white hover:bg-[#003838]"
            >
              {copy.save}
            </button>
          ) : (
            <>
              <button
                onClick={() => setShowCustomize(true)}
                className="rounded-full border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:border-gray-400"
              >
                {copy.customize}
              </button>
              <button
                onClick={handleRejectAll}
                className="rounded-full border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:border-gray-400"
              >
                {copy.rejectAll}
              </button>
              <button
                onClick={handleAcceptAll}
                className="rounded-full bg-[#002626] px-5 py-2 text-sm font-semibold text-white hover:bg-[#003838]"
              >
                {copy.acceptAll}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
