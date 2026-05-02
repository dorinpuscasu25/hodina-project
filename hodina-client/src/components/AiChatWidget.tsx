import { useEffect, useState } from 'react';
import { MessageSquare, Sparkles, X } from 'lucide-react';
import { AiPlanner } from './AiPlanner';
import type { AiChatMessage, AiSuggestion } from './AiPlanner';
import { useLanguage } from '../i18n/LanguageContext';

interface AiChatWidgetProps {
  messages: AiChatMessage[];
  setMessages: (updater: (prev: AiChatMessage[]) => AiChatMessage[]) => void;
  onSuggestionClick: (suggestion: AiSuggestion) => void;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export const AiChatWidget = ({
  messages,
  setMessages,
  onSuggestionClick,
  isOpen,
  onOpen,
  onClose,
}: AiChatWidgetProps) => {
  const { language } = useLanguage();
  const lang: 'ro' | 'ru' | 'en' = language === 'ru' ? 'ru' : language === 'en' ? 'en' : 'ro';
  const [shouldRenderPanel, setShouldRenderPanel] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setShouldRenderPanel(true);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    if (window.matchMedia('(max-width: 640px)').matches) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const buttonLabel =
    lang === 'ro'
      ? 'Întreabă AI-ul Hodina'
      : lang === 'ru'
        ? 'Спросить ИИ Hodina'
        : 'Ask Hodina AI';

  return (
    <>
      {!isOpen ? (
        <button
          type="button"
          onClick={onOpen}
          aria-label={buttonLabel}
          className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full bg-[#002626] px-5 py-3.5 text-sm font-semibold text-white shadow-2xl transition-all hover:-translate-y-0.5 hover:bg-[#003838] md:bottom-6 md:right-6"
        >
          <span className="relative flex h-6 w-6 items-center justify-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-[#efc4be]/40" />
            <Sparkles className="relative h-5 w-5 text-[#efc4be]" />
          </span>
          <span className="hidden sm:inline">{buttonLabel}</span>
          <MessageSquare className="h-4 w-4 sm:hidden" />
          {messages.length > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#efc4be] text-[10px] font-bold text-[#002626]">
              {Math.min(messages.length, 99)}
            </span>
          ) : null}
        </button>
      ) : null}

      {shouldRenderPanel ? (
        <div
          className={`fixed inset-0 z-50 flex items-end justify-end transition-opacity sm:items-end sm:p-4 ${
            isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/40 sm:bg-black/30" />

          <div
            onClick={(event) => event.stopPropagation()}
            className={`relative flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl transition-transform sm:h-[640px] sm:max-h-[85vh] sm:w-[420px] sm:rounded-3xl ${
              isOpen ? 'translate-y-0' : 'translate-y-4'
            }`}
            onTransitionEnd={() => {
              if (!isOpen) setShouldRenderPanel(false);
            }}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-gray-500 shadow-md transition-colors hover:bg-white hover:text-gray-900 sm:hidden"
            >
              <X className="h-5 w-5" />
            </button>
            <AiPlanner
              variant="chat"
              messages={messages}
              setMessages={setMessages}
              onSuggestionClick={(suggestion) => {
                onSuggestionClick(suggestion);
                onClose();
              }}
              onClose={onClose}
            />
          </div>
        </div>
      ) : null}
    </>
  );
};
