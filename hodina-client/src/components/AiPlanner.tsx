import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Loader2, Send, Sparkles, X } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { apiRequest, formatApiError } from '../lib/api';
import { formatCurrency, formatDuration } from '../lib/utils';

export type AiSuggestionKind = 'experience' | 'accommodation';

export interface AiSuggestion {
  kind: AiSuggestionKind;
  id: number;
  slug: string;
  title: string;
  short_description?: string;
  city?: string | null;
  category?: string | null;
  price_amount: number;
  currency: string;
  duration_minutes?: number;
  cover_image?: string | null;
}

export interface AiChatMessage {
  role: 'user' | 'assistant';
  content: string;
  suggestions?: AiSuggestion[];
}

interface AiPlanResponse {
  data: {
    reply: string;
    suggestions: AiSuggestion[];
  };
}

interface AiPlannerProps {
  variant: 'hero' | 'chat';
  messages: AiChatMessage[];
  setMessages: (updater: (prev: AiChatMessage[]) => AiChatMessage[]) => void;
  onSuggestionClick: (suggestion: AiSuggestion) => void;
  onClose?: () => void;
  initialPlaceholder?: string;
}

const SUGGESTION_PROMPTS: Record<'ro' | 'ru' | 'en', string[]> = {
  ro: [
    'Weekend romantic cu cazare la cramă',
    'Aventură cu prietenii în natură',
    'Tur gastronomic cu degustare de vinuri',
  ],
  ru: [
    'Романтические выходные с ночёвкой на винодельне',
    'Активный отдых с друзьями',
    'Гастрономический тур с дегустацией вин',
  ],
  en: [
    'Romantic weekend with a winery stay',
    'Outdoor adventure with friends',
    'Gastronomy tour with wine tasting',
  ],
};

export const AiPlanner = ({
  variant,
  messages,
  setMessages,
  onSuggestionClick,
  onClose,
  initialPlaceholder,
}: AiPlannerProps) => {
  const { language } = useLanguage();
  const [prompt, setPrompt] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const lang: 'ro' | 'ru' | 'en' = language === 'ru' ? 'ru' : language === 'en' ? 'en' : 'ro';

  const t = {
    title:
      lang === 'ro'
        ? 'Descrie călătoria ta. AI o planifică.'
        : lang === 'ru'
          ? 'Опиши путешествие. ИИ соберёт маршрут.'
          : 'Describe your trip. AI plans it for you.',
    subtitle:
      lang === 'ro'
        ? 'Spune-ne ce vrei să faci — vibe, persoane, buget — și AI alege din experiențele și cazările Hodina.'
        : lang === 'ru'
          ? 'Расскажи, что хочешь — настроение, компанию, бюджет — и ИИ подберёт варианты на Hodina.'
          : 'Tell us your vibe, people, and budget — AI picks from Hodina experiences and stays.',
    placeholder:
      initialPlaceholder ??
      (lang === 'ro'
        ? 'Ex: un weekend gastronomic cu degustare și o drumeție ușoară'
        : lang === 'ru'
          ? 'Например: гастрономические выходные с дегустацией и лёгким походом'
          : 'E.g. a gastronomy weekend with tasting and an easy hike'),
    askMore:
      lang === 'ro'
        ? 'Întreabă altceva'
        : lang === 'ru'
          ? 'Спросить ещё'
          : 'Ask follow-up',
    plan:
      lang === 'ro' ? 'Planifică cu AI' : lang === 'ru' ? 'Составить маршрут' : 'Plan with AI',
    send: lang === 'ro' ? 'Trimite' : lang === 'ru' ? 'Отправить' : 'Send',
    chatTitle:
      lang === 'ro'
        ? 'Asistent AI Hodina'
        : lang === 'ru'
          ? 'AI-ассистент Hodina'
          : 'Hodina AI assistant',
    chatHint:
      lang === 'ro'
        ? 'Continuă conversația sau cere alte sugestii.'
        : lang === 'ru'
          ? 'Продолжайте разговор или попросите другие варианты.'
          : 'Keep chatting or ask for different picks.',
    suggestions:
      lang === 'ro'
        ? 'Sugestii pentru tine'
        : lang === 'ru'
          ? 'Варианты для вас'
          : 'Picks for you',
    inspirations:
      lang === 'ro' ? 'Idei rapide' : lang === 'ru' ? 'Быстрые идеи' : 'Quick ideas',
    thinking:
      lang === 'ro' ? 'AI analizează...' : lang === 'ru' ? 'ИИ думает...' : 'AI is thinking...',
  };

  useEffect(() => {
    if (variant !== 'chat') return;
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isSending, variant]);

  const sendPrompt = async (rawPrompt: string) => {
    const trimmed = rawPrompt.trim();
    if (!trimmed || isSending) return;

    setError(null);
    setPrompt('');

    const history = messages
      .slice(-10)
      .map(({ role, content }) => ({ role, content }));

    setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
    setIsSending(true);

    try {
      const response = await apiRequest<AiPlanResponse>('/public/ai/plan', {
        method: 'POST',
        body: {
          prompt: trimmed,
          history,
          locale: lang,
        },
      });

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.data.reply,
          suggestions: response.data.suggestions,
        },
      ]);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void sendPrompt(prompt);
  };

  const renderSuggestionCard = (suggestion: AiSuggestion) => {
    return (
      <button
        key={`${suggestion.kind}-${suggestion.id}`}
        type="button"
        onClick={() => onSuggestionClick(suggestion)}
        className="group flex w-full items-start gap-3 rounded-2xl border border-gray-200 bg-white p-3 text-left transition-all hover:-translate-y-0.5 hover:border-[#002626] hover:shadow-md"
      >
        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100">
          <img
            src={suggestion.cover_image ?? 'https://placehold.co/200x200?text=Hodina'}
            alt={suggestion.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                suggestion.kind === 'experience'
                  ? 'bg-[#fff4f1] text-[#944236]'
                  : 'bg-[#e6f0ee] text-[#17332d]'
              }`}
            >
              {suggestion.kind === 'experience'
                ? lang === 'ro'
                  ? 'Experiență'
                  : lang === 'ru'
                    ? 'Впечатление'
                    : 'Experience'
                : lang === 'ro'
                  ? 'Cazare'
                  : lang === 'ru'
                    ? 'Жильё'
                    : 'Stay'}
            </span>
            {suggestion.city ? (
              <span className="truncate text-xs text-gray-500">{suggestion.city}</span>
            ) : null}
          </div>
          <p className="mt-1 line-clamp-2 text-sm font-semibold text-gray-900">
            {suggestion.title}
          </p>
          <div className="mt-1 flex items-center justify-between gap-2 text-xs text-gray-600">
            <span>
              {suggestion.kind === 'experience' && suggestion.duration_minutes
                ? formatDuration(suggestion.duration_minutes)
                : suggestion.category ?? ''}
            </span>
            <span className="font-bold text-[#002626]">
              {formatCurrency(suggestion.price_amount, suggestion.currency)}
            </span>
          </div>
        </div>
        <ArrowRight className="mt-1 h-4 w-4 flex-shrink-0 text-gray-300 transition-transform group-hover:translate-x-1 group-hover:text-[#002626]" />
      </button>
    );
  };

  if (variant === 'hero') {
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
    const heroSuggestions = lastAssistant?.suggestions ?? [];

    return (
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#002626] via-[#0a3a3a] to-[#17332d] p-6 shadow-2xl md:p-12">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#efc4be]/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-[#944236]/20 blur-3xl" />

        <div className="relative grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-white backdrop-blur">
              <Sparkles className="h-4 w-4" />
              <span>
                {lang === 'ro'
                  ? 'Planificare AI'
                  : lang === 'ru'
                    ? 'ИИ-планировщик'
                    : 'AI planning'}
              </span>
            </div>

            <h1 className="mb-4 text-3xl font-bold leading-tight text-white md:text-4xl lg:text-5xl">
              {t.title}
            </h1>

            <p className="mb-6 text-base text-white/80 md:text-lg">{t.subtitle}</p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <Sparkles className="pointer-events-none absolute left-4 top-4 h-5 w-5 text-[#efc4be]" />
                <textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  rows={3}
                  placeholder={t.placeholder}
                  disabled={isSending}
                  className="w-full rounded-2xl border-0 bg-white/95 py-3.5 pl-12 pr-4 text-gray-800 shadow-lg outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-[#efc4be] disabled:opacity-70"
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  {SUGGESTION_PROMPTS[lang].map((idea) => (
                    <button
                      key={idea}
                      type="button"
                      onClick={() => setPrompt(idea)}
                      className="rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 transition-colors hover:border-[#efc4be] hover:bg-white/10 hover:text-white"
                    >
                      {idea}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={!prompt.trim() || isSending}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#efc4be] px-6 py-3 font-semibold text-[#002626] transition-all hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Sparkles className="h-5 w-5" />
                  )}
                  {t.plan}
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </form>

            {error ? (
              <div className="mt-4 rounded-2xl border border-[#efc4be]/40 bg-white/10 px-4 py-3 text-sm text-[#efc4be]">
                {error}
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl bg-white/5 p-4 backdrop-blur-sm md:p-5">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col justify-center text-center">
                <Sparkles className="mx-auto mb-3 h-10 w-10 text-[#efc4be]" />
                <p className="text-sm font-semibold text-white">{t.inspirations}</p>
                <p className="mt-2 text-xs text-white/70">
                  {lang === 'ro'
                    ? 'Apasă pe o idee sau scrie ce vrei să faci.'
                    : lang === 'ru'
                      ? 'Нажми на идею или опиши свой план.'
                      : 'Tap an idea or describe your plan.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {lastAssistant ? (
                  <p className="rounded-xl bg-white/10 p-3 text-sm text-white/90">
                    {lastAssistant.content}
                  </p>
                ) : null}

                {heroSuggestions.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#efc4be]">
                      {t.suggestions}
                    </p>
                    {heroSuggestions.map(renderSuggestionCard)}
                  </div>
                ) : null}

                <p className="text-xs text-white/60">{t.chatHint}</p>
              </div>
            )}

            {isSending ? (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs text-white/80">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t.thinking}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#002626] text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{t.chatTitle}</p>
            <p className="text-xs text-gray-500">{t.chatHint}</p>
          </div>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-gray-50 px-4 py-4">
        {messages.length === 0 ? (
          <div className="rounded-2xl bg-white px-4 py-5 text-sm text-gray-700 shadow-sm">
            <p className="font-semibold text-gray-900">
              {lang === 'ro'
                ? 'Salut! Cu ce te pot ajuta?'
                : lang === 'ru'
                  ? 'Привет! Чем могу помочь?'
                  : 'Hi! How can I help?'}
            </p>
            <p className="mt-2 text-gray-600">{t.subtitle}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTION_PROMPTS[lang].map((idea) => (
                <button
                  key={idea}
                  type="button"
                  onClick={() => void sendPrompt(idea)}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-[#002626] hover:text-[#002626]"
                >
                  {idea}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] space-y-2 rounded-2xl px-4 py-3 text-sm shadow-sm ${
                message.role === 'user'
                  ? 'bg-[#002626] text-white'
                  : 'bg-white text-gray-800'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              {message.suggestions && message.suggestions.length > 0 ? (
                <div className="space-y-2 pt-1">
                  {message.suggestions.map(renderSuggestionCard)}
                </div>
              ) : null}
            </div>
          </div>
        ))}

        {isSending ? (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm text-gray-600 shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t.thinking}
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-[#efc4be] bg-[#fff4f1] px-4 py-3 text-sm text-[#944236]">
            {error}
          </div>
        ) : null}
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-gray-200 bg-white px-3 py-3"
      >
        <div className="flex items-end gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-[#002626]">
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void sendPrompt(prompt);
              }
            }}
            rows={1}
            placeholder={t.placeholder}
            disabled={isSending}
            className="max-h-32 flex-1 resize-none bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
          />
          <button
            type="submit"
            disabled={!prompt.trim() || isSending}
            aria-label={t.send}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#002626] text-white transition-colors hover:bg-[#003838] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
