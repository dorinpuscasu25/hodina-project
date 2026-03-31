import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Language, translations } from './translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations.en;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);
const LANGUAGE_KEY = 'hodina.client.language';

function resolveInitialLanguage(): Language {
  if (typeof window === 'undefined') {
    return 'ro';
  }

  const stored = window.localStorage.getItem(LANGUAGE_KEY);

  if (stored === 'en' || stored === 'ro' || stored === 'ru') {
    return stored;
  }

  const browserLanguage = window.navigator.language.slice(0, 2);

  if (browserLanguage === 'en' || browserLanguage === 'ro' || browserLanguage === 'ru') {
    return browserLanguage;
  }

  return 'ro';
}

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(resolveInitialLanguage);

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const value = {
    language,
    setLanguage,
    t: translations[language],
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
